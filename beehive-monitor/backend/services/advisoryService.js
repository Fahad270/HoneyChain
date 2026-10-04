// L1 advisory service — retrieval with EXTRACTIVE answers (passage shown,
// no model rewrite). Safety lives here, in code, not in any model:
//  1. pre-LLM dosage router  -> static refusal + escalation (deterministic)
//  2. retrieval conditioned on the prediction, not only on user words
//  3. refusal when retrieval confidence is low (inspection checklist instead)
//  4. schema: prediction contract validated before anything else

const { CARDS } = require("../data/referenceCards");
const { validatePrediction } = require("./predictionContract");

const fs = require("fs");
const path = require("path");

// Expert-review log (handoff Workstream D): every refusal, escalation,
// checklist, and low-confidence answer is appended for later review.
// Fail-open: logging must never break an answer. Question text is truncated
// (200 chars) — enough for review, bounded for storage/PII.
const LOG_PATH = process.env.ADVISORY_LOG_PATH
  || path.join(__dirname, "..", "logs", "advisory_queries.jsonl");

function logQuery({ mode, prediction, question, retrievalConfidence = null }) {
  try {
    const row = {
      ts: new Date().toISOString(),
      mode,
      predictedClass: prediction && prediction.predictedClass,
      confidence: prediction && prediction.confidence,
      mock: Boolean(prediction && prediction.mock),
      question: String(question == null ? "" : question).slice(0, 200),
      retrievalConfidence,
    };
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, JSON.stringify(row) + "\n");
  } catch {
    /* logging is best-effort */
  }
}

// Anything asking for amounts/concentrations/periods of hive chemicals or
// drugs goes to the static card. English-first (+ minimal Hinglish); the
// dosage-intent eval set decides whether this list grows.
const DOSAGE_PATTERNS = [
  /\b(dose|dosage|how much|how many|quantity|quantities|concentration|dilut|ppm|percent|%|mg\b|ml\b|g\/l|withdrawal|residue period)\b/i,
  /\d+\s*(ml|mg|g|kg|ppm|%|litres?|liters?)\b/i,
  /(spray|feed|treat|apply|mix|dissolve).{0,40}(chemical|medicine|antibiotic|drug|acid|thymol|oxytet|amitraz|acaricide|formic|oxalic)/i,
  /(chemical|medicine|antibiotic|drug|acid|thymol|acaricide).{0,40}(spray|feed|treat|apply|mix|dose|how much)/i,
  /\b(kitna|kitni|matra|dawai|dawa|dava)\b/i,
  /कितन|दवा|दवाई|मात्रा|खुराक/i,
];

// Named treatments (or treatment-class words with intent verbs) are vet-only:
// the L1 layer has no card that answers them, so it must escalate, not improvise.
const DRUG_NAMES = /terramycin|oxytetracycline|tylosin|tylan|amitraz|apistan|apivar|fluvalinate|flumethrin|coumaphos|checkmite|fumagillin|fumadil|thymol|apiguard|apilife|formic|oxalic|menthol|perizin|bayvarol|klartan|paracetamol|aspirin|amoxicillin|penicillin|ivermectin/i;
const TREATMENT_INTENT = /use|using|used|apply|treat|feed|spray|give|safe|should|buy|need|recommend|remed/i;
const TREATMENT_CLASS = /antibiotic|acaricide|miticide|pesticide|insecticide|chemical|medicine|drug/i;


function isDrugMention(question) {
  const q = String(question || "");
  if (DRUG_NAMES.test(q)) return true;
  return TREATMENT_CLASS.test(q) && TREATMENT_INTENT.test(q);
}

const VET_ESCALATION = {
  headline: "Only your veterinarian or bee inspector can advise on named treatments.",
  body: "This system never recommends, compares, or judges chemicals or drugs — wrong advice kills colonies and contaminates honey. Take your hive ID, symptoms, and photos to your KVK, bee inspector, or veterinarian.",
  nextSteps: [
    "Quarantine the hive (no frame or equipment exchange) until advised.",
    "Note the exact product name your neighbour mentioned — your vet needs it to check resistance and approvals.",
    "Ask the vet for the label directions and keep them with your hive records.",
  ],
};

const REFUSAL = {
  headline: "I can't give chemical amounts or treatment doses.",
  body: "Doses, concentrations, and withdrawal periods come only from your veterinarian, bee inspector, or the product label — never from this screen. Wrong amounts kill colonies and contaminate honey.",
  nextSteps: [
    "Note your hive ID and symptoms.",
    "Contact your KVK / bee inspector / veterinarian for the approved treatment and its exact label directions.",
    "Quarantine the hive (no frame or equipment exchange) until advised.",
  ],
};

function isDosageIntent(question) {
  const q = String(question || "");
  return DOSAGE_PATTERNS.some((re) => re.test(q));
}

function tokenize(s) {
  return String(s || "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
}

// Retrieval conditioned on structure: the predicted class picks the candidate
// set; the user's words only rank within (or across, if prediction is unclear).
function retrieve(prediction, question) {
  const qTokens = new Set(tokenize(question));
  const classCards = CARDS.filter((c) => c.conditions.includes(prediction.predictedClass));
  if (!classCards.length) {
    // No card for this class (should not happen — every class has a card):
    // refuse to guess, hand over the inspection checklist.
    return { card: CARDS.find((c) => c.id === "inspection-checklist"), confidence: 0, fallback: true };
  }
  // Class-conditioned: rank only within the predicted class's cards.
  let best = classCards[0];
  let bestHits = -1;
  for (const card of classCards) {
    const hits = card.keywords.filter((k) => qTokens.has(k)).length;
    if (hits > bestHits) { bestHits = hits; best = card; }
  }
  return { card: best, confidence: 3 + bestHits };
}

function buildAdvisory({ prediction, question = "" }) {
  const v = validatePrediction(prediction);
  if (!v.ok) return { success: false, error: v.errors.join("; ") };
  const p = v.prediction;

  // Gate 1: dosage/chemical intent -> deterministic refusal (never retrieval).
  if (isDosageIntent(question)) {
    const out = {
      success: true,
      data: {
        mode: "refusal-dosage",
        headline: REFUSAL.headline,
        passage: REFUSAL.body,
        actions: REFUSAL.nextSteps,
        doNot: ["Do not follow any dose found online or from an AI chat."],
        citations: [],
        retrievalConfidence: 1,
        predictionEcho: p,
        reviewStatus: "deterministic-rule",
      },
    };
    logQuery({ mode: out.data.mode, prediction: p, question });
    return out;
  }

  // Gate 1b: named-treatment questions -> vet escalation (no card answers these).
  if (isDrugMention(question)) {
    const out = {
      success: true,
      data: {
        mode: "vet-escalation",
        headline: VET_ESCALATION.headline,
        passage: VET_ESCALATION.body,
        actions: VET_ESCALATION.nextSteps,
        doNot: ["Do not use a neighbour's treatment on your hives."],
        citations: [],
        retrievalConfidence: 1,
        predictionEcho: p,
        reviewStatus: "deterministic-rule",
      },
    };
    logQuery({ mode: out.data.mode, prediction: p, question });
    return out;
  }

  // Gate 2: abstain / unclear / no-signs -> guided inspection checklist.
  if (["abstain", "unclear", "no_disease_signs"].includes(p.predictedClass)) {
    const card = CARDS.find((c) => c.id === "inspection-checklist");
    const out = {
      success: true,
      data: {
        mode: p.predictedClass === "no_disease_signs" ? "no-signs" : "checklist",
        headline: card.title,
        passage: card.signs.join(" "),
        actions: card.whatToDo,
        doNot: card.doNot,
        citations: [card.source],
        retrievalConfidence: 1,
        predictionEcho: p,
        reviewStatus: card.reviewStatus,
      },
    };
    logQuery({ mode: out.data.mode, prediction: p, question });
    return out;
  }

  // Gate 3: structured retrieval; low confidence -> checklist, not a guess.
  const { card, confidence, fallback } = retrieve(p, question);
  if (!card) {
    const checklist = CARDS.find((c) => c.id === "inspection-checklist");
    const out = {
      success: true,
      data: {
        mode: "low-confidence",
        headline: "Not enough to go on — inspect before concluding anything.",
        passage: "No reference card matched confidently. " + checklist.signs.join(" "),
        actions: checklist.whatToDo,
        doNot: checklist.doNot,
        citations: [checklist.source],
        retrievalConfidence: confidence,
        predictionEcho: p,
        reviewStatus: checklist.reviewStatus,
      },
    };
    logQuery({ mode: out.data.mode, prediction: p, question, retrievalConfidence: confidence });
    return out;
  }
  const out = {
    success: true,
    data: {
      mode: fallback ? "checklist" : "advisory",
      headline: card.title,
      passage: card.signs.join(" ") + " " + card.escalate,
      actions: card.whatToDo,
      doNot: card.doNot,
      citations: [card.source],
      retrievalConfidence: confidence,
      predictionEcho: p,
      reviewStatus: card.reviewStatus,
    },
  };
  if (fallback) logQuery({ mode: out.data.mode, prediction: p, question, retrievalConfidence: confidence });
  return out;
}

module.exports = { buildAdvisory, isDosageIntent, retrieve, REFUSAL };
