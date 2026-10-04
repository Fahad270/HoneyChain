// Advisory controller — slice 1 (L1 extractive). No auth: read-only retrieval,
// same public posture as /ledger/verify. Nothing here writes to the ledger.

const { CARDS } = require("../data/referenceCards");
const { mockPredict } = require("../services/mockPredictor");
const { buildAdvisory } = require("../services/advisoryService");
const { checkLabReport } = require("../services/labReportChecker");
const { parseVoiceHarvest } = require("../services/voiceHarvestService");

function getCards(req, res) {
  res.json({ success: true, data: CARDS });
}

function postMockPredict(req, res) {
  const { symptoms = "", hive = null, species = null } = req.body || {};
  res.json({ success: true, data: mockPredict({ symptoms, hive, species }) });
}

function postAsk(req, res) {
  const { prediction, question = "" } = req.body || {};
  if (!prediction) return res.status(400).json({ success: false, error: "prediction (prediction-contract object) required" });
  const out = buildAdvisory({ prediction, question });
  if (!out.success) return res.status(422).json(out);
  res.json(out);
}

function postCheckLabReport(req, res) {
  const report = req.body || {};
  const out = checkLabReport(report);
  if (!out.success) return res.status(400).json(out);
  res.json(out);
}

function postVoiceHarvest(req, res) {
  const { transcript = "" } = req.body || {};
  const out = parseVoiceHarvest(transcript);
  res.json({ success: true, data: out });
}

module.exports = { getCards, postMockPredict, postAsk, postCheckLabReport, postVoiceHarvest };


