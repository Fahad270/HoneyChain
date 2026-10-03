# bench/ — scripts, configs, seeds, raw logs, hardware specs

Never present a number that is not backed by a raw log in this directory
plus a VERIFIED row in `../claims.csv`. If something could not run, mark it
`NOT RUN` and keep the harness.

Planned runs (Gate 1):
- ≥3 model families × 2 quantisations × 2 real devices (laptop CPU + Android phone)
- Tokenizer efficiency on own Hindi/English beekeeping text (measured, not card-quoted)
- Embedding models / rerankers / vector stores: footprint + latency @ 8GB
- Offline ASR/TTS on realistic noisy audio (deferred until slice 2 unless cheap)

## Bake-off candidates (hypothesis, re-check cards at run time)
Phone tier 0.5–1.5B / cluster tier 3–4B / Indic-specialised — instruction-tuned,
locally-hosted open weights only. Sarvam-class models enter only as a measured
candidate, never as the assumed primary (claims.csv #6).
