# Bee acoustic datasets — queen / worker / hive health (for INMP441 + ESP32-S3)

> Single-bee "queen vs worker wingbeat" clips do not exist as a clean public
> dataset. Hives record a colony chorus, not solo flights. Train on
> colony-level labels below; derive wingbeat-intensity rules from band energy
> (worker hum 200–300 Hz, queen piping 400–550 Hz), not from solo samples.

## 1. Use these first (hardware + label match)

| Dataset | Link | Size / format | Labels | Why it fits |
|---|---|---|---|---|
| SBCM — Smart Bee Colony Monitor | https://www.kaggle.com/datasets/annajyang/beehive-sounds | ~7100 × 60 s wav + temp/humidity/pressure, 21.7 GB | 4 queen states (absent / newly accepted / rejected / original) | Same sensor chain as your device: ESP32 + INMP441 + BME280. Start here. |
| BeeTogether (BT / TBON merged) | https://www.kaggle.com/datasets/chrisfilo/to-bee-or-no-to-bee | 17,295 clips, 6 hives | Queenright / queenless | Multi-hive merge of NUHIVE+OSBH. Use for leave-one-hive-out generalisation test (Bricout et al., Sensors 2024). |
| TBON processed | https://www.kaggle.com/datasets/yevheniiklymenko/beehive-buzz-anomalies | 3.38 GB segmented | Queen–NoQueen, Bee–NoBee | Pre-segmented version of above, faster to train. |
| NUHIVE | https://zenodo.org/records/2667806 | 96 h raw, 32 kHz stereo, 47.8 GB | Queenright / queenless, 2 hives controlled | Clean controlled counterpart to citizen-science OSBH. |
| OSBH subset | https://zenodo.org/records/321345 | ~0.8 GB, varied phones/mics | Queen–NoQueen, swarming, varroa | Noisy real-world hardware — good robustness split. |
| To Bee or Not to Bee (annotated) | https://zenodo.org/records/1321278 | 78 recs, ~12 h + .lab Bee/noBee | Bee / noBee + queen present/absent | Pre-annotated segments, matches DCASE-2018 paper (Nolasco & Benetos, arXiv:1811.06016). |
| UrBAN | https://doi.org/10.20383/103.0972 (FRDR) | 10 hives, 3171 h @16 kHz + temp/RH q15min, inspections CSV | Population (frames-of-bees), queenright/queenless/deadout, varroa, winter mortality | Largest longitudinal set. Use for population + winter-mortality heads, and per-hive intensity baselines. |
| BeeHive w/Queen vs w/o Queen (small) | https://www.kaggle.com/datasets/harshkumar1711/beehive-audio-dataset-with-queen-and-without-queen | small binary wav + example CNN notebook | queen present / absent | Quick smoke-test before the 20 GB downloads. |
| Honey-bee vs drone (1-s clips) | https://zenodo.org/records/10359686 | 10 000 bee + 1700 drone @44.1 kHz | bee / drone | Only set with worker-vs-drone contrast. Useful aux head, not hive health. |
| beehive Audio recordings (8 kHz) | https://zenodo.org/records/7052981 | 10 000 × 8.2 s @8 kHz | hive id / timestamp (weak labels) | Cheap augmentation pool. |

## 2. Pretrained reference (not training data)

- `NOSInovacao/AI-Belha-Classifier` (HF, MIT): YAMNet + FC head trained on SBCM,
  4 queen states, overall acc 0.73 / macro-F1 0.66. Queen-absent F1 0.58,
  original-queen recall 0.37 — do not ship as-is; fine-tune or distil.
  https://huggingface.co/NOSInovacao/AI-Belha-Classifier
- `DerrickLegacy256/bee-audio-classifier` (HF): 5-class MFCC + CNN baseline.

## 3. Frequency bands to implement (from literature, not tunable folklore)

- Worker hum: 255 ± 35 Hz (Woods); warble 225–285 Hz falls when queenless,
  replaced by lower "moaning".
- Queen piping / tooting: peak 400–550 Hz + elevated 500–5000 Hz band.
- Whooping / stop signal: 300–450 Hz. Swarming rise flagged at 255 ± 35 Hz.
- Queenless colonies intensify within ~1 h of queen removal, stabilise ~5 h
  (PMC10669568). Most discriminative energy < 1080 Hz; keep full 0–6 kHz for
  queen harmonics (Electronics 2022; Sensors 2020).

## 4. Download commands

```bash
# Kaggle (needs ~/.kaggle/kaggle.json)
kaggle datasets download -d annajyang/beehive-sounds -p data/sbcm --unzip
kaggle datasets download -d chrisfilo/to-bee-or-no-to-bee -p data/beetogether --unzip
kaggle datasets download -d yevheniiklymenko/beehive-buzz-anomalies -p data/tbon-proc --unzip
# Zenodo
curl -L -o nuhive.zip https://zenodo.org/records/2667806/export/hx  # use web UI for file list; record set is multi-file
wget https://zenodo.org/records/1321278/files/annotations.zip  # see record page for exact filenames
```

Expected layout for `train_bee_acoustic.py` (either works):

```
data/train/<class>/*.wav            # class = queenright | queenless | swarming ...
# or
data/manifest.csv                   # filepath,label,hive_id
```

## 5. If Kaggle/HF is not enough — YouTube fallback protocol

Scrape only as augmentation, never as sole source (codec + AGC + unknown
mic destroy absolute intensity calibration):

1. `yt-dlp -x --audio-format wav --postprocessor-args "-ar 16000 -ac 1" "<url>"`
   — search "queen piping beehive", "swarming hive sound inside", "queenless hive roar".
2. Keep only segments with continuous >10 s hive interior sound; discard
   narration/music via the TBON Bee/noBee head.
3. Label weakly (video title ≠ ground truth); have a beekeeper confirm
   queenless vs swarming per clip; store rater + date in manifest.
4. Re-calibrate: per-hive z-score intensity, never raw dB, because YouTube
   normalises loudness.

## 6. Wingbeat-intensity rule (what your teammate asked for)

Track per-hive baseline RMS in 200–300 Hz band over 7 quiet nights.
Alert when a 10-min median deviates > ±2σ for > 30 min, fused with the
classifier posterior (see `infer_edge.py`). Low intensity = depopulation /
queen loss / pesticide; high intensity = pre-swarm roar / robbing / thermal
stress. Absolute "normal dB" does not transfer across boxes — ship baselines,
not fixed thresholds.
