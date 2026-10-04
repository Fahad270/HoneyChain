const express = require("express");
const router = express.Router();
const { getCards, postMockPredict, postAsk, postCheckLabReport, postVoiceHarvest } = require("../controllers/advisoryController");
const { rateLimit } = require("../utils/rateLimit");

// Public read-only retrieval, but still throttled per IP so one client
// can't spin the (future) SLM sidecar or fill the review log as a DoS.
const askLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 100 });
const predictLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 100 });
const labLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 100 });
const voiceLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 100 });

router.get("/cards", getCards);
router.post("/predict-mock", predictLimiter, postMockPredict);
router.post("/ask", askLimiter, postAsk);
router.post("/check-lab-report", labLimiter, postCheckLabReport);
router.post("/voice-harvest", voiceLimiter, postVoiceHarvest);

module.exports = router;


