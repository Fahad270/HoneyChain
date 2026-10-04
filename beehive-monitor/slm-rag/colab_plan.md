# Colab execution plan: 0.5B HoneyChain tool-router (+ RAG rewriter later)

Target: private GGUF router (Q8_0 default, Q4_K_M challenger) trained on HoneyChain
tool schemas. Dosage/chemical safety STAYS on the deterministic pre-LLM router —
never trained into the model. Every stage ends in a logged artefact or it didn't happen.

## Tool schemas under training (from live routes — bake these in, don't zero-shot)
Read: get_hives, get_weather (`hiveRoutes.js`), verify_jar (`verifyBlock`),
get_twin (`getTwin`), predict_yield (`productivityController`), search_schemes (RAG),
find_centre (kvicDirectory), get_my_blocks (`getMine`, role-scoped server-side).
Write (confirm-gated, server re-checks JWT role via `canCreateStage`): log_extraction
(honey_extraction), pool_lot, log_processing/transport/packaging, issue_sale, file_rti.
Single call per turn, max 3-5 orchestrator steps, one retry on validation error, then human.

## Stage 0 — harness + golden set FIRST (local, no GPU)
1. Mock tool-backend executing all 13 tools against fixtures + JSON-schema validator.
2. Freeze golden set: ≥200 queries (tool choice + args-exact + paraphrases + role-refusals
   + dosage/Hinglish refusals scored at SYSTEM level) BEFORE any training run. No peeking.
3. Pin env (Unsloth version, torch, seed) in `bench/`; pre-register ship thresholds in
   `decision_log.md` (name-match, args-exact, refusal confusion matrix, p50 latency, peak RAM).

## Stage 1 — teacher distillation (Colab, any runtime)
1. Hand-write ~20 seed traces: slot-filling, intent change, no-tool chitchat, role-refusal
   (beekeeper asks to pool → refuse + explain steps 3-8 need KVIC), ASR-noise variants.
2. Teacher expands to 5-10k; filter 3-stage (parse → schema → LIVE execution on Stage-0
   harness); publish per-stage pass rates + 600-sample human spot-audit score.
3. Mix with xlam-60k subsample + Hermes-singleturn at declared ratio (domain:general ≤ 1:1).

## Stage 2 — QLoRA (Colab free T4, chunked)
PINNED STACK (2026-10-03, verified working on T4, Unsloth abandoned — its zoo
fights transformers 5.x both directions): transformers 5.17.0 + trl 1.13.0 +
peft 0.21.0 + bitsandbytes 4-bit. r16/a32/all-7-targets + lr 2e-4 cosine + 3 epochs
+ completion-only loss (+ abstain/negative items) + bs 2-4 × accum 4-8 + seq-len 1024-2048.
Pilot 500-step run first (train/eval loss both ways; ablation without general mix).
Save every N steps, push to Hub (free-tier disconnects), resume script ready.

## Stage 3 — export + A/B (Colab)
Merge → GGUF Q8_0 AND Q4_K_M (+ imatrix log) → score BOTH on frozen golden set →
ship winner only if it clears pre-registered thresholds. Expected: Q8_0 default.

## Stage 4 — system eval + deploy
Router+model confusion matrix (refuse-vs-answer), strict-match abstention, Hinglish subset,
p50 latency + peak RAM on CPU (8GB floor proxy), failure-injection (bad audio, empty
retrieval, malicious doc). Results → `claims.csv` VERIFIED rows + bench logs.

## Colab session checklist (user runs, agent stages cells one at a time, main thread)
GPU runtime → env pin cell → Stage-0 harness clone+test → teacher-distill cells →
filter-rate report → QLoRA pilot → full run (checkpointed) → export both quants →
golden-set scoreboard. If a session dies: resume cell, never restart blind.
