// Mock predictor — deterministic stand-in for the untrained VLM.
// ALWAYS low confidence, ALWAYS labelled mock. Its only job is to let the
// advisory slice run end-to-end (Gate 2) before any real model exists.

const RULES = [
  { cls: "chalkbrood_suspect", re: /mumm|chalk|white.*(lump|pellet)|rattl/i },
  { cls: "afb_suspect", re: /rop|sunken|perforat|scale.*stuck|foul.*smell|tongue/i },
  { cls: "efb_suspect", re: /twist|yellow.*larv|rubber|granular|not.*rop|sour/i },
  { cls: "varroa_suspect", re: /mite|varroa|deform.*wing|k-wing|crawl/i },
  { cls: "sacbrood_suspect", re: /sac|canoe|watery/i },
  { cls: "nosema_suspect", re: /dysentery|distend|diarrh/i },
];

function mockPredict({ symptoms = "", hive = null, species = null } = {}) {
  const text = String(symptoms || "");
  const hit = RULES.find((r) => r.re.test(text));
  return {
    predictedClass: hit ? hit.cls : "unclear",
    confidence: "low",
    modality: "symptom-text",
    modelVersion: "mock-0.1",
    calibrationStatus: "uncalibrated",
    qualityFlags: [],
    mock: true,
    ...(hive ? { hive: String(hive) } : {}),
    ...(species ? { species: String(species) } : {}),
  };
}

module.exports = { mockPredict };
