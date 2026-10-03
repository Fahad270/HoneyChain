#!/usr/bin/env python3
"""Bee colony acoustic trainer — queenright / queenless / swarming + wingbeat-intensity heads.

Production-grade, dependency-light: numpy + scipy + scikit-learn only
(no librosa / torch required). ESP32-portable features.

Usage:
  python train_bee_acoustic.py --data data/train --out models/bee_v1
  python train_bee_acoustic.py --manifest data/manifest.csv --out models/bee_v1 --lohocv
  python train_bee_acoustic.py --self-test   # CI smoke test, no downloads

Input layouts:
  A) folder-per-class: data/train/<label>/*.wav
  B) manifest CSV with columns: filepath,label,hive_id (hive_id optional)

Pipeline per clip (16 kHz mono, 4 s windows):
  STFT 25 ms / 10 ms -> 64 log-mel bins -> mean+std over time (128 dims)
  + 12 wingband scalars: RMS dBFS, energy in [200-300] worker hum,
  [400-550] queen piping, [300-450] whooping, [100-250] worker piping,
  [500-2000] queen harmonics, spectral centroid, queen/worker ratio,
  sub-100 Hz activity, 3-6 kHz hiss, zero-crossing rate, spectral flatness.
Model: StandardScaler -> MLPClassifier(128+12 -> 64 -> classes).
Eval: stratified 80/20 + optional leave-one-hive-out (needs hive_id).
Exports: model.joblib, labels.json, edge_thresholds.json (per-class band
means/stds + intensity baseline recipe for infer_edge.py / ESP32 firmware).
"""
import argparse
import csv
import json
import os
import sys
import wave
from pathlib import Path

import numpy as np

SR = 16000
WIN_SEC = 4.0
FRAME_MS, HOP_MS = 25, 10
N_MELS = 64
FMIN, FMAX = 50, 6000

BANDS = {
    "worker_hum_200_300": (200, 300),
    "queen_pipe_400_550": (400, 550),
    "whoop_300_450": (300, 450),
    "worker_pipe_100_250": (100, 250),
    "queen_harm_500_2000": (500, 2000),
    "sub_0_100": (0, 100),
    "hiss_3000_6000": (3000, 6000),
}


def read_wav_mono(path):
    with wave.open(str(path), "rb") as w:
        n, ch, sw, sr = w.getnframes(), w.getnchannels(), w.getsampwidth(), w.getframerate()
        raw = w.readframes(n)
    dtype = {1: np.int8, 2: np.int16, 4: np.int32}[sw]
    y = np.frombuffer(raw, dtype=dtype).astype(np.float64)
    if ch > 1:
        y = y.reshape(-1, ch).mean(axis=1)
    peak = np.max(np.abs(y)) or 1.0
    y = y / peak  # peak-normalise int PCM to [-1, 1]-ish
    if sr != SR:
        from scipy.signal import resample
        y = resample(y, int(len(y) * SR / sr))
    return y.astype(np.float32)


def stft_mag(y, n_fft=400, hop=160):
    from scipy.signal import stft
    _, _, z = stft(y, fs=SR, window="hann", nperseg=n_fft, noverlap=n_fft - hop,
                   nfft=512, boundary="zeros", padded=True)
    return np.abs(z)  # (freq, time)


def mel_filterbank(n_fft=512, n_mels=N_MELS):
    def hz2mel(f): return 2595 * np.log10(1 + f / 700)
    def mel2hz(m): return 700 * (10 ** (m / 2595) - 1)
    lo, hi = hz2mel(FMIN), hz2mel(FMAX)
    pts = mel2hz(np.linspace(lo, hi, n_mels + 2))
    freqs = np.linspace(0, SR / 2, n_fft // 2 + 1)
    fb = np.zeros((n_mels, len(freqs)))
    for i in range(n_mels):
        l, c, r = pts[i], pts[i + 1], pts[i + 2]
        left = np.clip((freqs - l) / (c - l + 1e-9), 0, 1)
        right = np.clip((r - freqs) / (r - c + 1e-9), 0, 1)
        fb[i] = np.minimum(left, right)
    return fb, freqs


_FB, _FREQS = None, None


def features_for_window(y):
    global _FB, _FREQS
    if _FB is None:
        _FB, _FREQS = mel_filterbank()
    mag = stft_mag(y)  # (F, T)
    mel = _FB @ mag  # (M, T)
    logmel = np.log10(mel + 1e-10)
    m_mean, m_std = logmel.mean(axis=1), logmel.std(axis=1)

    # band energies from linear magnitude spectrum
    def band_energy(lo, hi):
        m = (_FREQS >= lo) & (_FREQS < hi)
        return float((mag[m] ** 2).mean()) if m.any() else 0.0

    be = {k: band_energy(*v) for k, v in BANDS.items()}
    rms = float(np.sqrt(np.mean(y ** 2)) + 1e-12)
    rms_db = float(20 * np.log10(rms))
    qw_ratio = float(np.log10((be["queen_pipe_400_550"] + 1e-12) / (be["worker_hum_200_300"] + 1e-12)))
    centroid = float(((_FREQS[:, None] * mag).sum()) / (mag.sum() + 1e-12))
    zcr = float(((y[:-1] * y[1:]) < 0).mean())
    flat = float(np.exp(np.log(mag.mean(axis=1) + 1e-12).mean()) / (mag.mean() + 1e-12))
    scalars = np.array([
        rms_db, be["worker_hum_200_300"], be["queen_pipe_400_550"],
        be["whoop_300_450"], be["worker_pipe_100_250"], be["queen_harm_500_2000"],
        be["sub_0_100"], be["hiss_3000_6000"], centroid, qw_ratio, zcr, flat,
    ], dtype=np.float64)
    # log-compress energies (cols 1..7) for stable scaling
    scalars[1:8] = np.log10(scalars[1:8] + 1e-12)
    return np.concatenate([m_mean, m_std, scalars])


def windows(y):
    n = int(SR * WIN_SEC)
    if len(y) < n:
        y = np.pad(y, (0, n - len(y)))
    out = []
    for s in range(0, len(y) - n + 1, n):
        out.append(y[s:s + n])
    return out or [y[:n]]


def load_dataset(data_dir=None, manifest=None):
    items = []  # (path, label, hive_id)
    if manifest:
        with open(manifest, newline="") as f:
            for row in csv.DictReader(f):
                items.append((row["filepath"], row["label"], row.get("hive_id", "na")))
    else:
        for cls_dir in sorted(Path(data_dir).iterdir()):
            if cls_dir.is_dir():
                for p in sorted(cls_dir.glob("*.wav")):
                    items.append((str(p), cls_dir.name, "na"))
    if not items:
        raise SystemExit("no .wav files found — see DATASETS.md for layout")
    return items


def build_matrix(items):
    X, y, hives = [], [], []
    for path, label, hive in items:
        try:
            audio = read_wav_mono(path)
        except Exception as e:
            print(f"[skip] {path}: {e}", file=sys.stderr)
            continue
        for w in windows(audio):
            X.append(features_for_window(w))
            y.append(label)
            hives.append(hive)
    return np.array(X), np.array(y), np.array(hives)


def synth_clip(freq, dur=4.0, noise=0.05, seed=0):
    rng = np.random.default_rng(seed)
    t = np.arange(int(SR * dur)) / SR
    y = 0.6 * np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * 2 * freq * t)
    return (y + noise * rng.standard_normal(len(t))).astype(np.float32)


def self_test_matrix(n_per_class=40):
    X, y, hives = [], [], []
    spec = [("queenright", 240), ("queenless", 180), ("swarming", 260)]
    for label, f in spec:
        for i in range(n_per_class):
            amp = 1.3 if label == "swarming" else (0.55 if label == "queenless" else 1.0)
            q = 0.5 * np.sin(2 * np.pi * 480 * np.arange(int(SR * WIN_SEC)) / SR) if label == "queenright" else 0
            w = synth_clip(f, seed=i) * amp + q * 0.3
            X.append(features_for_window(w))
            y.append(label)
            hives.append(f"hive_{(i % 4) + 1}")
    return np.array(X), np.array(y), np.array(hives)


def train_evaluate(X, y, hives, out_dir, lohocv=False):
    from sklearn.neural_network import MLPClassifier
    from sklearn.preprocessing import StandardScaler, LabelEncoder
    from sklearn.pipeline import make_pipeline
    from sklearn.model_selection import StratifiedShuffleSplit
    from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

    le = LabelEncoder().fit(y)
    yi = le.transform(y)
    clf = make_pipeline(
        StandardScaler(),
        MLPClassifier(hidden_layer_sizes=(64,), activation="relu", max_iter=600,
                      early_stopping=True, n_iter_no_change=25, random_state=7),
    )
    sss = StratifiedShuffleSplit(n_splits=1, test_size=0.2, random_state=7)
    tr, te = next(sss.split(X, yi))
    clf.fit(X[tr], yi[tr])
    pred = clf.predict(X[te])
    print(f"classes: {list(le.classes_)}  n={len(y)}  dim={X.shape[1]}")
    print(f"holdout acc: {accuracy_score(yi[te], pred):.3f}")
    print(classification_report(yi[te], pred, target_names=list(le.classes_)))
    print("confusion:\n", confusion_matrix(yi[te], pred))

    loho_acc = None
    if lohocv and len(set(hives)) > 1:
        accs = []
        for h in sorted(set(hives)):
            m_tr, m_te = hives != h, hives == h
            if m_te.sum() == 0 or len(set(yi[m_tr])) < 2:
                continue
            c2 = make_pipeline(StandardScaler(),
                               MLPClassifier(hidden_layer_sizes=(64,), max_iter=600,
                                             early_stopping=True, n_iter_no_change=25, random_state=7))
            c2.fit(X[m_tr], yi[m_tr])
            a = accuracy_score(yi[m_te], c2.predict(X[m_te]))
            accs.append(a)
            print(f"  leave-{h}-out acc: {a:.3f} (n={m_te.sum()})")
        if accs:
            loho_acc = float(np.mean(accs))
            print(f"mean leave-one-hive-out acc: {loho_acc:.3f}  <- ship this number, not holdout")

    # refit on all data for shipping
    clf.fit(X, yi)
    return clf, le, loho_acc


def export_edge_thresholds(X, y, le, out_dir):
    # per-class mean/std of the 12 wingband scalars (last 12 cols) for firmware fallback
    scal = X[:, -12:]
    stats = {}
    for cls in le.classes_:
        m = scal[y == cls]
        stats[cls] = {"mean": m.mean(axis=0).tolist(), "std": (m.std(axis=0) + 1e-9).tolist(), "n": int(m.shape[0])}
    names = ["rms_db", "worker_hum", "queen_pipe", "whoop", "worker_pipe",
             "queen_harm", "sub_100", "hiss", "centroid", "qw_ratio", "zcr", "flat"]
    payload = {
        "scalar_names": names,
        "per_class": stats,
        "baseline_recipe": "per-hive 7-night median of worker_hum RMS; alert if 10-min median deviates >2 sigma for >30 min AND classifier posterior margin < 0.25",
        "sample_rate": SR, "window_sec": WIN_SEC, "mel_bins": N_MELS,
    }
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    with open(Path(out_dir) / "edge_thresholds.json", "w") as f:
        json.dump(payload, f, indent=2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=None)
    ap.add_argument("--manifest", default=None)
    ap.add_argument("--out", default="models/bee_v1")
    ap.add_argument("--lohocv", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()

    if a.self_test:
        X, y, hives = self_test_matrix()
    else:
        if not (a.data or a.manifest):
            ap.error("provide --data, --manifest, or --self-test")
        items = load_dataset(a.data, a.manifest)
        X, y, hives = build_matrix(items)

    clf, le, loho_acc = train_evaluate(X, y, hives, a.out, lohocv=a.lohocv or a.self_test)

    import joblib
    Path(a.out).mkdir(parents=True, exist_ok=True)
    joblib.dump(clf, Path(a.out) / "model.joblib")
    with open(Path(a.out) / "labels.json", "w") as f:
        json.dump(list(le.classes_), f, indent=2)
    export_edge_thresholds(X, y, le, a.out)
    with open(Path(a.out) / "metrics.json", "w") as f:
        json.dump({"n_windows": int(len(y)), "classes": list(le.classes_),
                   "leave_one_hive_out_acc": loho_acc, "feature_dim": int(X.shape[1])}, f, indent=2)
    print(f"[saved] {a.out}/model.joblib + labels.json + edge_thresholds.json + metrics.json")


if __name__ == "__main__":
    main()
