// Voice Harvest Service — Slice 2 (Touchpoint 3 & Workstream F).
// Robust voice transcript slot extraction with strict confirm-before-commit gating.
// Rules:
// 1. Never commit without user confirmation.
// 2. Normalize spoken numbers, ASR phonetic noise, and Hinglish.
// 3. Return needs_clarification if required slots (hive_id, weight_kg) are missing.
// 4. Return needs_confirmation with a structured preview when slots are present.

const { validateCall } = require("./routerExecutor");

const WORD_TO_NUM = {
  zero: 0, one: 1, two: 2, three: 3, free: 3, tree: 3, four: 4, fore: 4,
  five: 5, fife: 5, six: 6, seven: 7, eight: 8, ate: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, twelf: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50,
  // Spoken Hinglish & Colloquial Hindi numerals
  ek: 1, do: 2, doh: 2, teen: 3, tin: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, che: 6, chhah: 6,
  saat: 7, sat: 7, aath: 8, ath: 8, nau: 9, no: 9, das: 10, dus: 10,
  gyarah: 11, gyara: 11, barah: 12, bara: 12, baarah: 12,
  terah: 13, tera: 13, chaudah: 14, chauda: 14, pandrah: 15, pandra: 15,
  solah: 16, sola: 16, satrah: 17, satra: 17, athrah: 18, athra: 18,
  unnees: 19, unnis: 19, bees: 20, bis: 20,
  // Devanagari
  एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5, छह: 6, सात: 7, आठ: 8, नौ: 9, दस: 10,
  ग्यारह: 11, बारह: 12, तेरह: 13, चौदह: 14, पंद्रह: 15, सोलह: 16, सत्रह: 17, अठारह: 18, उन्नीस: 19, बीस: 20,
};

const FLORAL_SOURCES = [
  { name: "mustard", patterns: [/mustard/i, /mustered/i, /sarson/i, /सरसों/i] },
  { name: "litchi", patterns: [/litchi/i, /lychee/i, /lichi/i, /लीची/i] },
  { name: "eucalyptus", patterns: [/eucalyptus/i, /safeda/i, /सफेदा/i] },
  { name: "sunflower", patterns: [/sunflower/i, /surajmukhi/i, /सूरजमुखी/i] },
  { name: "acacia", patterns: [/acacia/i, /kikar/i, /babul/i, /कीकर/i, /बबूल/i] },
  { name: "jamun", patterns: [/jamun/i, /जामुन/i] },
  { name: "multifloral", patterns: [/multifloral/i, /wild\s*forest/i, /forest/i, /jungle/i, /जंगली/i] },
  { name: "coriander", patterns: [/coriander/i, /dhaniya/i, /धनिया/i] },
  { name: "ber", patterns: [/ber\b/i, /sidr\b/i, /बेर/i] },
];

function parseNumber(text) {
  if (!text) return null;
  const direct = parseFloat(text);
  if (!Number.isNaN(direct)) return direct;
  const clean = text.toLowerCase().trim();
  if (clean in WORD_TO_NUM) return WORD_TO_NUM[clean];
  return null;
}

function extractHiveId(text, knownWeight = null) {
  if (!text) return null;
  const norm = text.toLowerCase();

  // Pattern 1: Latin order (Keyword + ID: "hive 3", "box 02", "peti 4", "बॉक्स 4")
  const latin = norm.match(/(?:(?:\b(?:hive|box|peti|chamber))|(?:बॉक्स|पेटी|हाइव))\s*[-_#]?\s*([a-z0-9\u0900-\u097F]+)/i)
             || norm.match(/\bh[-_]([0-9]+)\b/i);
  if (latin) {
    const rawVal = latin[1];
    const num = parseNumber(rawVal);
    if (num !== null) {
      return `HIVE-${String(num).padStart(2, "0")}`;
    }
    if (/^[0-9]+$/.test(rawVal)) {
      return `HIVE-${rawVal.padStart(2, "0")}`;
    }
    if (!/^(se|से|ka|ki|ke|me|में|ko|tha|thi|hai|from|of|to|is|was|the|a|an)$/i.test(rawVal)) {
      return `HIVE-${rawVal.toUpperCase()}`;
    }
  }

  // Pattern 2: Hindi order (ID + Keyword: "chaar number peti", "4 peti", "3 number box")
  const hindiOrder = norm.match(/([a-z0-9\u0900-\u097F]+)\s*(?:number|no\.?)?\s*(?:hive|box|peti|chamber|बॉक्स|पेटी|हाइव)/i);
  if (hindiOrder) {
    const rawVal = hindiOrder[1];
    const num = parseNumber(rawVal);
    if (num !== null && num !== knownWeight) {
      return `HIVE-${String(num).padStart(2, "0")}`;
    }
  }

  // Pattern 3: Contextual Prepositional Origin:
  // English: "from 3", "from hive 3"
  // Hindi/Hinglish: "3 se", "3 number se", "peti 3 se"
  const prepPatterns = [
    /\bfrom\s+(?:hive\s+|box\s+|peti\s+)?([a-z0-9\u0900-\u097F]+)/i,
    /([a-z0-9\u0900-\u097F]+)(?:\s*number|\s*no\.?)?\s+(?:se|से)\b/i,
    /\b(?:number|no\.?)\s*([a-z0-9\u0900-\u097F]+)/i,
  ];

  for (const pat of prepPatterns) {
    const m = norm.match(pat);
    if (m) {
      const candidate = m[1];
      const val = parseNumber(candidate);
      if (val !== null && val !== knownWeight) {
        return `HIVE-${String(val).padStart(2, "0")}`;
      }
    }
  }

  return null;
}

function extractWeight(text) {
  if (!text) return null;
  const norm = text.toLowerCase();

  // Match "12.5 kg", "twelve kilos", "8 kilo", "15 kilograms", "12 किलो", "bara kg", "barah kilo"
  const m = norm.match(/([a-z0-9\.\u0900-\u097F]+)\s*(?:kilos?|kg|kilograms?|किलो|किग्रा|लीटर|litres?)/i);
  if (m) {
    const rawVal = m[1];
    const parsed = parseNumber(rawVal);
    if (parsed !== null && parsed > 0 && parsed <= 500) {
      return parsed;
    }
  }
  // Match reverse phrasing like "kilos: 12", "weight was 12", "nikala 12"
  const rev = norm.match(/(?:weight|quantity|harvested|nikala|nikla|yield)\s*(?:is|of|was|tha)?\s*([a-z0-9\.\u0900-\u097F]+)/i);
  if (rev) {
    const parsed = parseNumber(rev[1]);
    if (parsed !== null && parsed > 0 && parsed <= 500) {
      return parsed;
    }
  }
  return null;
}

function extractFloralSource(text) {
  if (!text) return "multifloral";
  for (const src of FLORAL_SOURCES) {
    for (const pat of src.patterns) {
      if (pat.test(text)) return src.name;
    }
  }
  return "multifloral";
}

function extractDate(text) {
  if (!text) return new Date().toISOString().slice(0, 10);
  const lower = text.toLowerCase();
  if (/\byesterday\b|\bkal\b|\bबीता\s*कल\b/i.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  const isoMatch = text.match(/\b(202[0-9]-[0-1][0-9]-[0-3][0-9])\b/);
  if (isoMatch) return isoMatch[1];
  return new Date().toISOString().slice(0, 10);
}

function parseVoiceHarvest(transcript) {
  const text = String(transcript || "").trim();
  if (!text) {
    return {
      status: "needs_clarification",
      missing: ["hive_id", "weight_kg"],
      prompt: "No speech transcript detected. Please speak or type your harvest details (e.g. 'Log 12 kg mustard honey from hive 3 today').",
    };
  }

  const weight_kg = extractWeight(text);
  const hive_id = extractHiveId(text, weight_kg);
  const flower_source = extractFloralSource(text);
  const date = extractDate(text);

  const missing = [];
  if (!hive_id) missing.push("hive_id");
  if (weight_kg === null) missing.push("weight_kg");

  if (missing.length > 0) {
    let prompt = "";
    if (missing.includes("hive_id") && missing.includes("weight_kg")) {
      prompt = "Could not identify the hive ID or harvest weight. Please specify both (e.g. '12 kilos from hive 3').";
    } else if (missing.includes("hive_id")) {
      prompt = `Recorded ${weight_kg} kg ${flower_source} honey, but hive ID is missing. Which hive was harvested?`;
    } else {
      prompt = `Identified ${hive_id}, but harvest weight is missing. How many kilos of honey were extracted?`;
    }

    return {
      status: "needs_clarification",
      missing,
      extracted: { hive_id, weight_kg, flower_source, date },
      prompt,
    };
  }

  const call = {
    name: "log_extraction",
    arguments: {
      hive_id,
      weight_kg,
      flower_source,
      date,
    },
  };

  const validation = validateCall(call);
  if (!validation.ok) {
    return {
      status: "error",
      error: validation.reason,
      prompt: "Harvest arguments failed schema validation.",
    };
  }

  return {
    status: "needs_confirmation",
    verdict: "confirm",
    transcript: text,
    extracted: {
      hive_id,
      weight_kg,
      flower_source,
      date,
    },
    stagedCall: call,
    reviewCard: {
      title: "Confirm Harvest Record Before Ledger Minting",
      stage: "honey_extraction",
      fields: [
        { label: "Hive ID", key: "hive_id", value: hive_id },
        { label: "Harvest Weight", key: "weight_kg", value: `${weight_kg} kg` },
        { label: "Floral Source", key: "flower_source", value: flower_source },
        { label: "Harvest Date", key: "date", value: date },
      ],
      notice: "This record will be permanently cryptographically anchored on the HoneyChain ledger once confirmed. Verify details carefully.",
    },
  };
}

module.exports = { parseVoiceHarvest, extractHiveId, extractWeight, extractFloralSource, extractDate };
