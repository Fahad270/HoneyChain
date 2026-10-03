#!/usr/bin/env python3
"""Per-apiary calibration from raw audio — the technician's tool.

Records a few labeled minutes on site, then:

    python calibrate_site.py --wav site_capture.wav --label queenright \\
        --site hive_03 --base calibration/base_model.joblib --out site_model/

--label is queenright or queenless (one label per call; run once per state
if you have both). Needs >= 25 labeled 4 s windows per state to be useful
(50-100 total is the verified range). Writes site_model.joblib +
calibration.json. See INTEGRATE.md section 3.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np

PRODUCT_DIR = Path(__file__).parent

sys.path.insert(0, str(PRODUCT_DIR.parent))
from train_bee_acoustic import SR, WIN_SEC  # noqa: E402 constants only

from calibrate import fine_tune  # noqa: E402

# Same librosa-STFT recipe as predict.py: the base was trained on it.
BANDS = {"worker_hum": (200, 300), "queen_pipe": (400, 550),
         "whoop": (300, 450), "worker_pipe": (100, 250),
         "queen_harm": (500, 2000), "sub": (0, 100), "hiss": (3000, 6000)}


def _band_features(y_16k):
    import librosa
    import numpy as np

    n_fft = 512
    fr = librosa.fft_frequencies(sr=SR, n_fft=n_fft)
    g = np.abs(librosa.stft(y_16k, n_fft=n_fft, hop_length=160,
                            win_length=400, window="hann"))
    p = g ** 2

    def be(lo, hi):
        m = (fr >= lo) & (fr < hi)
        return float(p[m].mean()) if m.any() else 0.0

    e = {k: be(*v) for k, v in BANDS.items()}
    rms = float(np.sqrt((y_16k ** 2).mean()) + 1e-12)
    qw = float(np.log10((e["queen_pipe"] + 1e-12) / (e["worker_hum"] + 1e-12)))
    cent = float(((fr[:, None] * g).sum()) / (g.sum() + 1e-12))
    zcr = float(((y_16k[:-1] * y_16k[1:]) < 0).mean())
    order = ["worker_hum", "queen_pipe", "whoop", "worker_pipe",
             "queen_harm", "sub", "hiss"]
    return np.array(
        [20 * np.log10(rms)] + [np.log10(e[k] + 1e-12) for k in order]
        + [cent, qw, zcr], np.float32)


def main():
    ap = argparse.ArgumentParser(description="Calibrate base model to one apiary")
    ap.add_argument("--wav", required=True, help="labeled on-site capture")
    ap.add_argument("--label", required=True, choices=["queenright", "queenless"])
    ap.add_argument("--site", required=True, help="hive/apiary id")
    ap.add_argument("--base", default=str(PRODUCT_DIR / "calibration" / "base_model.joblib"))
    ap.add_argument("--out", default="site_model")
    ap.add_argument("--labelfile", default=None,
                    help="defaults to base_labels.json next to --base")
    a = ap.parse_args()

    import joblib

    base = joblib.load(a.base)
    order = json.loads(Path(a.labelfile or Path(a.base).parent / "base_labels.json").read_text())
    code = {c: i for i, c in enumerate(order)}

    y = _read_mono_16k(a.wav)
    n = int(SR * WIN_SEC)
    full = [y[i:i + n] for i in range(0, len(y) - n + 1, n)]
    if len(full) < 25:
        raise SystemExit(f"only {len(full)} windows, need >= 25 of this label")
    X = np.array([_band_features(w) for w in full])
    y_cal = np.full(len(X), code[a.label])

    head = fine_tune(base, X, y_cal)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    joblib.dump({"scaler": base.named_steps["standardscaler"], "mlp": head,
                 "labels": list(base.classes_)},
                out / "site_model.joblib")
    json.dump({"site": a.site, "label": a.label, "n_cal": int(len(X))},
              open(out / "calibration.json", "w"), indent=2)
    print(f"calibrated {a.site} on {len(X)} {a.label} windows -> {out}/site_model.joblib")


def _read_mono_16k(path):
    import wave

    from scipy.signal import resample

    with wave.open(str(path), "rb") as w:
        n, ch, sw, sr = (w.getnframes(), w.getnchannels(),
                         w.getsampwidth(), w.getframerate())
        raw = w.readframes(n)
    dtype = {1: np.int8, 2: np.int16, 4: np.int32}[sw]
    y = np.frombuffer(raw, dtype=dtype).astype(np.float64)
    if ch > 1:
        y = y.reshape(-1, ch).mean(axis=1)
    y = (y / float(2 ** (8 * sw - 1))).astype(np.float32)
    if sr != SR:
        y = resample(y, int(len(y) * SR / sr)).astype(np.float32)
    return y


if __name__ == "__main__":
    main()
