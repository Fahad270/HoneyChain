# Run 10 — corrective retrain (steady-hum miss fix), 2026-09-24, colab CPU

Pool: NUHIVE 941 (qr445/ql295/nb201 via .lab segments) + AI-Belha 563
(38 files, trans mapped queenless) + OSBH corrective x10 (missing queenless
30 wins, hatching nobee 70 wins). Total 1604.

- keras 11-64-32-3 fixed2: holdout 0.785, params 2947
- sklearn twin (128,64) no-early-stop: holdout 0.798
- INT8 bee_fixed_int8.tflite: 8032 B, keras<->INT8 195/200
  sha256 7ec2f466bba2c8474cacf52456bd00f8c01626d11d88016e082cbc1e7d3ca750

Gates (INT8 bytes): AI-Belha 30/30 (was 28/30), trans 8/8, missing.mp3
queenless 3/3 (was nobee 3/3 = the fixed miss), hatching.mp3 nobee 7/7 kept.
OSBH wildcards: actives qr 1.0/1.0 (was 0.83/0.76), Barcelona still ql (wall),
swarm/preswarm flipped to qr-borderline (unscored, no truth either way).
Caveat: AI-Belha scored overlaps training (same-pool confirmation, not a gate).

## Postscript (same day): peak-norm flaw + fix, no artifact change
Product predict.py used peak normalization; all ship artifacts were built with
full-scale (librosa.load) normalization. Fixed predict.py + new calibrate_site.py
to local librosa-STFT 11-scalars (no train-module scipy path). Proof on Colab:
stream==direct 75/75 votes; site-calibration on AI-Belha as new site lifts
0.426 -> 0.577 @100 windows with matching feats (was 0.484 -> 0.446 mismatched).
calibration_pool.npz (run4v2 400KB) bundled; librosa added to requirements.
