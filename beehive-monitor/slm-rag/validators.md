# Validators — who checked the gold answers in eval_set.jsonl

- No named domain expert is available during prototype (human-confirmed 2026-10-02).
- Until a mentor / KVK / ICAR / CBRTI contact reviews, every gold answer is
  status `unreviewed` and the UI must label safety-relevant content as such.
- Agent review performed: source-grounded against cited regulation/extension
  text only. That is NOT SME validation and must never be presented as such.

## Pre-registered bake-off thresholds (set BEFORE running — Gate 1)
TBD — fill before first bench run: groundedness, citation accuracy, correct
refusal rate (dosage-intent, multilingual+transliterated+code-mixed),
extraction field accuracy, p50 latency @ 8GB CPU, peak RAM.
