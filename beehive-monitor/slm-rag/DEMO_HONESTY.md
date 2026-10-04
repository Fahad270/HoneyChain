# DEMO_HONESTY.md — what is real, simulated, mocked

Rule: every row must match a `claims.csv` VERIFIED row or be labelled
simulated/mocked HERE and on screen in the UI + README.

| Feature | Status | Notes |
|---|---|---|
| Productivity prediction (formula) | REAL | `backend/controllers/productivityController.js` — deterministic, explainable |
| Honey Ledger hash chain + QR + freeze | REAL | `backend/controllers/blockchainController.js` — app-level `is_frozen`, not on-chain immutability |
| Hive telemetry (Dashboard) | SIMULATED | `backend/data/mockHives.js` — label on screen until real sensors land |
| Disease vision AI (Claude) | MOCKED / OPTIONAL | `backend/controllers/diseaseController.js` — cloud dependency; violates air-gap. Local path TBD behind prediction contract |
| Acoustic queen-state model (INT8) | REAL with LIMITS | `ai/MODEL_CARD.md` — cross-site accuracy ~chance; per-apiary calibration protocol required |
| SLM + RAG advisory | REAL (L1 pilot) | `backend/services/advisoryService.js` + `backend/data/referenceCards.js` — 15 extractive reference cards (diseases, FSSAI 2.8.3 standards, KVIC/PMEGP/NBHM schemes, seasonal management); deterministic dosage router (EN+Hinglish+Devanagari dose units) + named-treatment vet-escalation; per-IP rate limits (100/10min); expert-review JSONL log (fail-open, gitignored). Harnesses 10/10 + brutal 18/18; HTTP e2e incl 429 + malformed-400. Content UNREVIEWED by domain expert (labelled in UI) |
| Deterministic Lab Report Checker | REAL | `backend/services/labReportChecker.js` — code-level numerical thresholds for FSSAI honey standards (moisture <=20.0%, sucrose <=5.0%, HMF <=80 mg/kg, reducing sugars >=65%, F/G >=0.95, SMR/TMR absent, C4 <=7.0%); exact regulation clause citations; biological risk explanations. Eval harness `run_lab_report_eval.js` 10/10 |
| Voice harvest logging | REAL (Slice 2 pilot) | `backend/services/voiceHarvestService.js` + `frontend/src/components/VoiceHarvestLogger.jsx` — voice/typed slot extraction, ASR noise/phonetic/Hinglish robustness, mandatory confirm-before-commit review modal, localStorage offline queue for airplane mode sync. Eval harness `run_voice_harvest_eval.js` 11/11 |
| Ledger anchoring (Vishvasya/NBF) | UNVERIFIED | Chain-agnostic adapter; no sandbox access assumed |

