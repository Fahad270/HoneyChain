// Prediction contract (Workstream E) — the ONLY shape the disease layer may
// emit, whether the predictor behind it is the future VLM, the acoustic model,
// or the mock adapter. Unknown fields are rejected; abstain is first-class.

const CLASSES = [
  "varroa_suspect",
  "afb_suspect",
  "efb_suspect",
  "chalkbrood_suspect",
  "sacbrood_suspect",
  "nosema_suspect",
  "no_disease_signs",
  "unclear",
  "abstain",
];

const CONFIDENCES = ["low", "medium", "high"];

function validatePrediction(p) {
  const errors = [];
  if (!p || typeof p !== "object") return { ok: false, errors: ["prediction must be an object"], prediction: null };
  const out = {};
  if (!CLASSES.includes(p.predictedClass)) errors.push(`predictedClass must be one of: ${CLASSES.join(", ")}`);
  else out.predictedClass = p.predictedClass;
  if (!CONFIDENCES.includes(p.confidence)) errors.push(`confidence must be one of: ${CONFIDENCES.join(", ")}`);
  else out.confidence = p.confidence;
  out.modality = typeof p.modality === "string" ? p.modality : "unknown";
  out.modelVersion = typeof p.modelVersion === "string" ? p.modelVersion : "unknown";
  out.calibrationStatus = p.calibrationStatus === "calibrated" ? "calibrated" : "uncalibrated";
  out.qualityFlags = Array.isArray(p.qualityFlags) ? p.qualityFlags.filter((f) => typeof f === "string") : [];
  out.mock = p.mock === true;
  if (p.hive !== undefined) out.hive = String(p.hive);
  if (p.species !== undefined) out.species = String(p.species);
  // A high-confidence verdict from an uncalibrated model or a degraded input
  // is a contract smell — flag it, don't silently pass it.
  out.confidenceDowngraded = false;
  if (out.confidence === "high" && (out.calibrationStatus !== "calibrated" || out.qualityFlags.length > 0)) {
    out.confidence = "medium";
    out.confidenceDowngraded = true;
  }
  if (errors.length) return { ok: false, errors, prediction: null };
  return { ok: true, errors: [], prediction: out };
}

module.exports = { CLASSES, CONFIDENCES, validatePrediction };
