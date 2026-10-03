#!/usr/bin/env python3
"""Edge inference — classifier + wingbeat-intensity anomaly fusion.

Runs on a gateway (Pi) or laptop against INMP441 captures; the same band
logic ports 1:1 to ESP32-S3 firmware (see comments). Rule-first so a dead
model still raises depopulation / pre-swarm flags.

Usage:
  python infer_edge.py --wav capture.wav --model models/bee_v1 --hive hive_03
  python infer_edge.py --wav capture.wav --thresholds-only --model models/bee_v1
  python infer_edge.py --wav capture.wav --v3 --hive hive_03   # 3-class run-3 model
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from train_bee_acoustic import read_wav_mono, windows, features_for_window  # noqa: E402

SCALAR_NAMES = ["rms_db", "worker_hum", "queen_pipe", "whoop", "worker_pipe",
                "queen_harm", "sub_100", "hiss", "centroid", "qw_ratio", "zcr", "flat"]


V3_DIR = Path(__file__).parent / "colab_run2"
V3_LABELS = ["nobee", "queenless", "queenright"]


def load_v3():
    import joblib
    clf = joblib.load(V3_DIR / "mlp_3class.joblib")
    scaler = json.loads((V3_DIR / "scaler3.json").read_text())
    return clf, scaler


def load_bundle(model_dir):
    import joblib
    model_dir = Path(model_dir)
    clf = joblib.load(model_dir / "model.joblib")
    labels = json.loads((model_dir / "labels.json").read_text())
    thresh = json.loads((model_dir / "edge_thresholds.json").read_text())
    return clf, labels, thresh


def majority_vote(posteriors):
    import numpy as np
    mean_p = np.array(posteriors).mean(axis=0)
    return int(mean_p.argmax()), float(mean_p.max()), mean_p.tolist()


def intensity_report(worker_e, conf, baseline_db):
    """Shared wingbeat-intensity anomaly rule.

    worker_e: per-window worker-hum log-energies. Returns (flag, detail).
    Absolute 'normal dB' never transfers across boxes — always compare
    against the hive's own 7-night baseline median.
    """
    import numpy as np
    med = float(np.median(worker_e))
    detail = f"worker-band median logE={med:.2f}"
    flag = "normal"
    if baseline_db is not None:
        dev = med - baseline_db
        if abs(dev) > 0.3 and conf < 0.75:  # ~2x energy shift + weak margin
            flag = "HIGH_INTENSITY_SUSPECT_SWARM" if dev > 0 else "LOW_INTENSITY_SUSPECT_ABSENT_OR_WEAK"
            detail += f" (dev {dev:+.2f} vs baseline)"
    return flag, detail


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--wav", required=True)
    ap.add_argument("--model", default=None, help="v1 model dir (not needed with --v3)")
    ap.add_argument("--hive", default="unknown")
    ap.add_argument("--baseline-db", type=float, default=None,
                    help="per-hive 7-night median worker_hum log-energy; omit to report raw only")
    ap.add_argument("--thresholds-only", action="store_true")
    ap.add_argument("--v3", action="store_true",
                    help="use run-3 3-class model (nobee/queenless/queenright, 11 scalars)")
    a = ap.parse_args()

    import numpy as np
    if a.v3:
        clf, scaler = load_v3()
        y = read_wav_mono(a.wav)
        X12 = np.array([features_for_window(w) for w in windows(y)])
        X = (X12[:, -12:-1] - np.array(scaler["mean"])) / np.array(scaler["std"])
        proba = clf.predict_proba(X)
        idx, conf, mean_p = majority_vote(proba)
        status = V3_LABELS[idx]
        if status == "nobee":
            status = "nobee/external-noise — hold queen verdict, check mic"
        out = {"hive": a.hive, "status": status,
               "confidence": round(conf, 3),
               "posteriors": {l: round(p, 3) for l, p in zip(V3_LABELS, mean_p)},
               "model": "mlp_3class run-3"}
        worker_e = X[:, 1]  # worker_hum log-energy in 11-dim recipe
        flag, detail = intensity_report(worker_e, conf, a.baseline_db)
        out["intensity_flag"] = flag
        out["intensity_detail"] = detail
        print(json.dumps(out, indent=2))
        return

    clf, labels, thresh = load_bundle(a.model)
    y = read_wav_mono(a.wav)
    feats = [features_for_window(w) for w in windows(y)]

    X = np.array(feats)
    if a.thresholds_only:
        # firmware fallback: nearest per-class centroid on 12 scalars
        for i, f in enumerate(feats):
            dists = {c: float(np.linalg.norm(
                (f[-12:] - np.array(v["mean"])) / np.array(v["std"])))
                for c, v in thresh["per_class"].items()}
            print(f"window {i}: rule-vote {min(dists, key=dists.get)} dists={dists}")
        return

    proba = clf.predict_proba(X)
    idx, conf, mean_p = majority_vote(proba)
    status = labels[idx]

    # wingbeat-intensity anomaly: worker_hum scalar is log10 energy (index 1 of scalars)
    worker_e = X[:, -12 + 1]
    flag, detail = intensity_report(worker_e, conf, a.baseline_db)
    # heap-safe ESP32 note: quantise this file's band means to int8, 45 KB CNN target
    print(json.dumps({"hive": a.hive, "status": status, "confidence": round(conf, 3),
                      "posteriors": {l: round(p, 3) for l, p in zip(labels, mean_p)},
                      "intensity_flag": flag, "intensity_detail": detail}, indent=2))


if __name__ == "__main__":
    main()
