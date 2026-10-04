# Bee acoustic model — train, evaluate, ship to ESP32

## Install (local venv, never --break-system-packages)

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r ai/requirements.txt
```

## Smoke test (no downloads, proves pipeline end-to-end)

```bash
python ai/train_bee_acoustic.py --self-test --out /tmp/opencode/bee_v1
```

Expect: holdout acc ~1.0 on synthetic tones + mean leave-one-hive-out acc
printed. Real data will be lower — ship the leave-one-hive-out number
(BeeTogether paper shows holdout inflates by generalising within-hive).

## Real training

```bash
# 1. download per ai/DATASETS.md, then either layout:
#    data/train/queenright/*.wav data/train/queenless/*.wav data/train/swarming/*.wav
python ai/train_bee_acoustic.py --data data/train --out models/bee_v1 --lohocv
#    or manifest CSV: filepath,label,hive_id
python ai/train_bee_acoustic.py --manifest data/manifest.csv --out models/bee_v1 --lohocv
```

Outputs in `models/bee_v1/`: `model.joblib`, `labels.json`,
`edge_thresholds.json`, `metrics.json`.

## Inference (gateway / laptop)

```bash
python ai/infer_edge.py --wav capture_16k_mono.wav --model models/bee_v1 --hive hive_03
python ai/infer_edge.py --wav capture.wav --model models/bee_v1 --thresholds-only  # no-sklearn fallback
# run-3 3-class model (nobee/queenless/queenright, needs ai/colab_run2/):
python ai/infer_edge.py --wav capture.wav --v3 --hive hive_03
```

## Per-apiary calibration (the deployment protocol)

Universal cross-site accuracy is chance-level (run 4 gate 0.49/0.50), so
each apiary gets a calibrated head. Technician records 5–30 min of labeled
audio on site; `calibrate.py` warm-starts the base MLP head on it:

```bash
python ai/calibrate.py --pool ai/colab_run4/run4v2_feat.npz --site bt --n-cal 100 --out models/site_bt
python ai/calibrate.py --self-check   # bt 0.32->0.73, sbcm 0.51->0.64
```

`--base` accepts a pre-trained pipeline only for applying (its `before`
metric is reported solely with `--pool`, where the base provably excluded
the site). Output: `site_model.joblib` + `calibration.json`.

Pass `--baseline-db <7-night median worker_hum logE>` to enable the
low/high wingbeat-intensity flag your teammate asked for.

## ESP32-S3 port (INMP441, 16 kHz mono)

1. Reimplement `features_for_window` band energies with fixed-point Goertzel
   filters at 240 Hz / 480 Hz / 360 Hz instead of full STFT to fit 45 KB INT8.
2. Quantise `edge_thresholds.json` per-class means to int8; ship per-hive
   baseline (7-night median), never a global dB constant.
3. Target: 4 s window, < 500 ms inference, SMS alert on
   queenless posterior > 0.7 for 3 consecutive windows OR intensity > ±2σ
   for > 30 min.
