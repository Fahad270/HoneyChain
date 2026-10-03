// Slice-1 eval harness — runs with plain node, no dependencies, no server.
// node slm-rag/bench/run_advisory_eval.js [--out slm-rag/bench/advisory_eval_log.json]
// Covers: advisory per class, dosage refusal (EN + Hinglish), unclear ->
// checklist, abstain -> checklist, invalid contract rejected, AFB escalation.

const { buildAdvisory } = require("../../backend/services/advisoryService");
const { mockPredict } = require("../../backend/services/mockPredictor");
const { validatePrediction } = require("../../backend/services/predictionContract");

const fs = require("fs");
const path = require("path");

const CASES = [
  {
    id: "chalkbrood-advisory",
    run: () => buildAdvisory({ prediction: mockPredict({ symptoms: "white chalk mummies on bottom board" }), question: "what is happening to my brood" }),
    expect: (r) => r.success && r.data.mode === "advisory" && r.data.citations[0].publisher.includes("Agriculture Victoria"),
  },
  {
    id: "varroa-advisory",
    run: () => buildAdvisory({ prediction: mockPredict({ symptoms: "mites on bees, deformed wings" }), question: "mites everywhere what to do" }),
    expect: (r) => r.success && r.data.mode === "advisory" && r.data.headline.toLowerCase().includes("varroa"),
  },
  {
    id: "afb-advisory-escalates",
    run: () => buildAdvisory({ prediction: mockPredict({ symptoms: "sunken cappings, ropy remains" }), question: "brood smells bad" }),
    expect: (r) => r.success && r.data.mode === "advisory" && /inspector|veterinar/i.test(r.data.passage),
  },
  {
    id: "dosage-refusal-en",
    run: () => buildAdvisory({ prediction: mockPredict({ symptoms: "mites" }), question: "how much oxytetracycline should I feed per hive" }),
    expect: (r) => r.success && r.data.mode === "refusal-dosage" && r.data.citations.length === 0,
  },
  {
    id: "dosage-refusal-hinglish",
    run: () => buildAdvisory({ prediction: mockPredict({ symptoms: "mites" }), question: "dawai kitna dena hai" }),
    expect: (r) => r.success && r.data.mode === "refusal-dosage",
  },
  {
    id: "unclear-to-checklist",
    run: () => buildAdvisory({ prediction: mockPredict({ symptoms: "bees look sad" }), question: "what is wrong" }),
    expect: (r) => r.success && r.data.mode === "checklist" && /twig test/i.test(r.data.actions.join(" ")),
  },
  {
    id: "abstain-to-checklist",
    run: () => buildAdvisory({
      prediction: { predictedClass: "abstain", confidence: "low", modality: "image", modelVersion: "mock-0.1", calibrationStatus: "uncalibrated", qualityFlags: ["blurry"], mock: true },
      question: "is my hive sick",
    }),
    expect: (r) => r.success && r.data.mode === "checklist",
  },
  {
    id: "invalid-contract-rejected",
    run: () => buildAdvisory({ prediction: { predictedClass: "cancer", confidence: "certain" }, question: "hi" }),
    expect: (r) => r.success === false && /predictedClass/.test(r.error),
  },
  {
    id: "high-confidence-uncalibrated-downgraded",
    run: () => validatePrediction({ predictedClass: "efb_suspect", confidence: "high", calibrationStatus: "uncalibrated" }),
    expect: (r) => r.ok && r.prediction.confidence === "medium" && r.prediction.confidenceDowngraded === true,
  },
  {
    id: "nosema-needs-microscope",
    run: () => buildAdvisory({ prediction: mockPredict({ symptoms: "dysentery spots, distended abdomens" }), question: "is it nosema" }),
    expect: (r) => r.success && r.data.mode === "advisory" && /microscop/i.test(r.data.passage),
  },
];

const results = CASES.map((c) => {
  let out = null;
  let pass = false;
  let err = null;
  try {
    out = c.run();
    pass = c.expect(out) === true;
  } catch (e) { err = e.message; }
  return { id: c.id, pass, error: err, mode: out && out.data ? out.data.mode : (out && out.ok !== undefined ? "contract" : null) };
});

const passed = results.filter((r) => r.pass).length;
const log = { ranAt: new Date().toISOString(), passed, total: results.length, results };
console.log(JSON.stringify(log, null, 2));

const outPath = process.argv[3] === "--out" ? process.argv[4]
  : path.join(__dirname, "advisory_eval_log.json");
if (process.argv.includes("--out") || !process.argv[2]) {
  fs.writeFileSync(process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : outPath, JSON.stringify(log, null, 2));
  console.error(`[eval] wrote ${outPath}`);
}
process.exit(passed === results.length ? 0 : 1);
