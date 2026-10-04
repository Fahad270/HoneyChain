# SIH 2026 PS 26021 — SLM + RAG layer (execution handoff 2026-10-02)

Canonical codebase: `beehive-monitor/` (React + Express + Mongo + TFLite acoustic).
Report-era defaults (Flutter/FastAPI/Postgres/ResNet-18) were dummy research scaffolding — ignored.

## Locked decisions (from human, 2026-10-02)
- Disease VLM: NOT trained yet. Build contract-first behind a prediction payload
  (class, confidence, calibration, modality, version, quality flags, abstain);
  ship with mock adapter, no accuracy figures until a real eval runs.
- Domain review: no SME available during prototype. Agent does rigorous
  source-grounded review (regulation text, ICAR/NBB docs, cited clauses) AND
  every safety-relevant card stays labeled "unreviewed by domain expert" in UI
  + `validators.md`. No "SME-validated" claims. Dosage/chemical queries go to
  deterministic refusal + escalation (pre-LLM router).
- Hardware floor: 8 GB (laptop CPU + one real Android phone for bake-off).
- Languages: English first, i18n-ready; translation service later.
- Models: locally hosted open-weights instruction-tuned, private fine-tune
  allowed. No Sarvam dependency; India-origin candidate only if it meets
  pre-registered bake-off thresholds on evidence.
- Corpus: agent runs deep research (public sources first: ICAR, NBB/NBHM, FAO,
  FSSAI/BIS texts); CBRTI data assumed non-existent until opened.
- Submission materials: humans handle deck/video. Agent focuses on code +
  honest artefacts (`DEMO_HONESTY.md` per feature: real / simulated / mocked).

## Vertical slice, clarified
"More the merrier" applies AFTER Gate 2, not before. A vertical slice = ONE
flow working end-to-end offline (UI → RAG/SLM service → cited answer, airplane
mode, failure injection handled). Order:
1. Slice 1: disease-conditioned advisory (mock prediction contract) — earns the
   layer's place per PS (disease usability).
2. Slice 2: voice-to-structured harvest logging with confirm-before-commit.
3. Then expand down the touchpoint list (lab checker, seasonal/flora, schemes,
   admin digest, parameterised admin Q&A, consumer QR Q&A).
Widening before slice 1 passes Gate 2 is how demos die. Each level of the
fallback ladder (L0 cards → L1 extractive → L2 rewrite/translate → L3 grounded
generation → L4 on-device) ships working before climbing.

## Gate 0 exit
`slm-rag/claims.csv` covers every externally-used fact; standards thresholds
from regulation text; hardware floor agreed (done: 8 GB).

## Gate 1 (Router & Model Choice) exit
- ModernBERT encoder non-autoregressive classifier (`laya-choice`) selected as intent router
  (cannot hallucinate tools by construction).
- Scaled up on 1,430 golden/verified rows (1,192 train, 238 val) -> 0.954 val accuracy on Kaggle 2xT4.
- 10-query empirical gauntlet: standard domain tools score 0.95-0.998 conf; all out-of-domain queries
  score sub-0.15 conf and are 100% safely intercepted by the pre-registered 0.6 confidence gate and
  pre-LLM regex dosage filter.
- Structural executor backstop (`routerExecutor.js`) passes 16/16 edge-case checks.

## Gate 2 (Vertical Slice) exit
- Slice 1 (Field Advisory): Class-conditioned extractive retrieval across 15 cited reference cards;
  pre-LLM dosage/chemical regex refusal (EN + Hinglish + Devanagari); named-treatment vet-escalation;
  automatic uncalibrated high-confidence downgrade in contract; expert-review log.
- Slice 2 (Voice Harvest Logging): Spoken/typed transcript slot extraction (`voiceHarvestService.js`),
  handling phonetic ASR noise ("twelf/mustered/free"), Hinglish ("aaj hive 5 se 8 kilo"), and Devanagari;
  mandatory confirm-before-commit modal in `VoiceHarvestLogger.jsx` before ledger minting;
  offline queue in localStorage for full airplane-mode operation with batch sync.
- Touchpoint 4 (Lab Report Checker): Deterministic numerical threshold evaluation in code
  (`labReportChecker.js`) for FSSAI Reg 2.8.3 (moisture <=20%, sucrose <=5%, HMF <=80 mg/kg, reducing sugars >=65%,
  F/G >=0.95) and 2020 Honey Direction (SMR/TMR absent, C4 <=7%); exact legal clause citations.
- Complete test suite: 5 benchmark harnesses with 65/65 test cases passing in <400ms (`run_all_evals.js`).

