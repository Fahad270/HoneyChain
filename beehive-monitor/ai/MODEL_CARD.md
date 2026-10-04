# HoneyChain Bee-Acoustic Model Card (2026-09-23/24)

## Task
Hive-state classification from in-hive audio for ESP32-S3 + INMP441:
`queenright` (healthy queen) / `queenless` (dead/absent queen) /
`nobee` (external noise — hold the queen verdict).

## Features (all models)
16 kHz mono, 4 s windows, 11 scalars: RMS dBFS, log-energy in
200–300 Hz (worker hum), 400–550 Hz (queen piping), 300–450 Hz
(whooping), 100–250 Hz (worker piping), 500–2000 Hz (queen harmonics),
0–100 Hz, 3000–6000 Hz, spectral centroid, queen/worker log-ratio,
zero-crossing rate. Standardized with a saved scaler.

## Ship artifacts (`ai/colab_run2/`, `ai/colab_run4/`)
| Artifact | What | Size | Gate |
|---|---|---|---|
| `bee_3class_int8.tflite` | 11→64→32→3 full-INT8, keras↔INT8 199/200 | 8032 B | diverse file test 32/36 = 0.889 |
| `mlp_3class.joblib` + `scaler3.json` | sklearn twin of the above (holdout 0.757 ≈ Keras 0.799) | 29 KB | `infer_edge.py --v3`, verified end-to-end |
| `dense4v2_int8.tflite` | binary multisite INT8 | 4616 B | leave-one-DATASET-out 0.49/0.50 (see limits) |
| `calibrate.py` + `mlp4v2.joblib` | per-apiary warm-start fine-tune | — | new site 0.32→0.73 @100 wins (full retrain 0.85) |

## Data
NUHIVE via Zenodo 1321278 (6 wavs, 3 hives, 548 wins) · AI-Belha HF
parquet (Portugal outside-hive phones, 30 clean clips + 8 transition) ·
OSBH Zenodo 321345 (308 files, 22,798 wins: Active/Swarm/Pre-Swarm/
Missing-Queen/Hatching/Varroa) · SBCM + BeeTogether via Kaggle
(4000 balanced wins, CSV/dir labels) · Gruber mp3 pair (foreign apiary).

## Honest limits (measured, not claimed)
- No universal cross-site model: leave-one-site/dataset-out is 0.04–0.56
  across every method tried (raw, z-norm, ratios, whitening, CORAL,
  quantiles). Site acoustics dominate queen signal in hand scalars.
- OSBH distress states (swarm, pre-swarm, missing-queen, hatching,
  varroa — 184 wins) all vote confident queenright: the model knows
  NUHIVE-flavored queenlessness only.
- Transition (requeening) hives read queenless-majority: alerts keep
  firing through instability (safe direction).
- Run 1 was 100% synthetic; run 4 v1 was tainted (BT never mounted).
  Neither is cited anywhere as evidence.

## Deployment protocol
Ship base MLP + `calibrate.py`. Technician records 5–30 min labeled audio
per apiary (50–400 windows); fine-tuned head deploys per site. ESP32 runs
the INT8 model; per-hive 7-night worker-band baseline drives the
low/high intensity flag in `infer_edge.py`.
