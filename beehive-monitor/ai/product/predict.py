#!/usr/bin/env python3
"""HoneyChain hive-state inference — the one entry point integrators need.

Short clip:
    from predict import HiveMonitor
    mon = HiveMonitor()  # loads product/gateway/ model
    print(mon.predict("capture.wav", hive_id="hive_03"))

Hours of audio (streams from disk, constant memory):
    print(mon.monitor("night.wav", hive_id="hive_03", baseline_db=-0.42))

CLI:
    python predict.py --wav capture.wav --hive hive_03 [--baseline-db -0.42]
    python predict.py --wav night.wav --hive hive_03 --long [--baseline-db -0.42]

Requires: numpy, scipy, scikit-learn, joblib (see ../requirements.txt).
Audio: 16 kHz mono wav recommended (other rates are resampled); 4 s windows.
Clips under 4 s are rejected — shorter than one full window.
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

PRODUCT_DIR = Path(__file__).parent
GATEWAY_DIR = PRODUCT_DIR / "gateway"

sys.path.insert(0, str(PRODUCT_DIR.parent))
from train_bee_acoustic import SR, WIN_SEC  # noqa: E402 constants only
from infer_edge import intensity_report, majority_vote  # noqa: E402

# Features MUST be librosa-STFT 11-scalars: every shipped artifact (twin,
# scaler, base, INT8) was built with them, and the calibration lift only
# reproduces with them (scipy-STFT lookalikes score near chance). Verified
# combo: wave read -> scipy resample -> librosa STFT -> shipped scaler.
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


def _full_windows(y):
    n = int(SR * WIN_SEC)
    return [y[i:i + n] for i in range(0, len(y) - n + 1, n)]

# Full-scale normalization (int16 -> /32768), exactly like the librosa.load
# calls the model was trained and evaluated with. NOT peak normalization:
# peak-norm shifts every log-energy band by the recording's own peak and
# moves inputs off the scaler the model was fit on.


def _read_mono_16k(wav_path):
    """Whole-file read for short clips. Returns float32 mono at 16 kHz."""
    import wave

    from scipy.signal import resample

    with wave.open(str(wav_path), "rb") as w:
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

MIN_WINDOWS = 1  # single full 4 s window is enough for one vote;
# a whole queen toot lasts ~5 s (Michelsen 1986; Bencsik 2017), worker pipes
# <1 s, whoops ~0.14 s — so one 4 s window already spans the key events.
# Clips under 4 s are rejected: padding them collapsed output to a fixed
# vector ([0.212, 0.212, 0.575]). Overlapping hops add nothing: re-voting the
# same toot gives correlated votes, false precision.


class HiveMonitor:
    """3-class hive-state classifier: queenright / queenless / nobee."""

    def __init__(self, model_dir=GATEWAY_DIR):
        import joblib

        model_dir = Path(model_dir)
        self.model = joblib.load(model_dir / "model.joblib")
        self.scaler = json.loads((model_dir / "scaler.json").read_text())
        self.labels = json.loads((model_dir / "labels.json").read_text())
        self._mean = np.array(self.scaler["mean"])
        self._std = np.array(self.scaler["std"])

    def _standardize(self, wide):
        # 11-dim recipe: the 12 wingband scalars minus spectral flatness.
        return (wide[:, -12:-1] - self._mean) / self._std

    def _decide(self, proba, hive_id, baseline_db, worker_e=None):
        idx, conf, mean_p = majority_vote(proba)
        status = self.labels[idx]
        note = ""
        if status == "nobee":
            note = "external noise — hold the queen verdict, check the mic"
        elif status == "queenless":
            note = "alert direction: requeening/transition hives also read queenless"
        if worker_e is None:
            flag, detail = "normal", "no baseline supplied"
        else:
            flag, detail = intensity_report(worker_e, conf, baseline_db)
        return {
            "hive": hive_id,
            "status": status,
            "confidence": round(conf, 3),
            "posteriors": {l: round(p, 3) for l, p in zip(self.labels, mean_p)},
            "note": note,
            "intensity_flag": flag,
            "intensity_detail": detail,
        }

    def predict(self, wav_path, hive_id="unknown", baseline_db=None):
        """Classify one short capture. Returns a plain dict (JSON-serializable).

        Uses complete 4 s windows only — no padding. One window votes;
        more windows just tighten the majority.
        """
        y = _read_mono_16k(str(wav_path))
        full = _full_windows(y)
        if not full:
            raise ValueError(
                f"{wav_path}: only {len(y) / SR:.1f}s of audio, "
                f"need >= {WIN_SEC:.0f}s for one full window"
            )
        wide = np.array([_band_features(w) for w in full])
        x = self._standardize(wide)
        out = self._decide(self.model.predict_proba(x), hive_id, baseline_db,
                           worker_e=x[:, 1])
        out["windows"] = int(len(x))
        return out

    def _iter_blocks(self, wav_path, block_s=300):
        """Yield standardized 11-dim feature blocks from disk, constant memory.

        Full-scale normalization (same as training), so streaming matches
        whole-file inference. Blocks overlap by one window: no 4 s window
        is ever split or padded.
        """
        import wave

        from scipy.signal import resample

        wav_path = str(wav_path)
        win_n = int(SR * WIN_SEC)
        carry = np.zeros(0, dtype=np.float32)
        with wave.open(wav_path, "rb") as w:
            ch, sw, sr = w.getnchannels(), w.getsampwidth(), w.getframerate()
            dtype = {1: np.int8, 2: np.int16, 4: np.int32}[sw]
            full = float(2 ** (8 * sw - 1))
            step = int(sr * block_s)
            while True:
                raw = w.readframes(step)
                if not raw:
                    if len(carry) >= win_n:
                        yield self._standardize(_wide(carry))
                    break
                b = np.frombuffer(raw, dtype=dtype).astype(np.float64)
                if ch > 1:
                    b = b.reshape(-1, ch).mean(axis=1)
                y = (b / full).astype(np.float32)
                if sr != SR:
                    y = resample(y, int(len(y) * SR / sr)).astype(np.float32)
                y = np.concatenate([carry, y])
                cut = (len(y) // win_n) * win_n
                if cut:
                    yield self._standardize(_wide(y[:cut]))
                    carry = y[cut:]
                else:
                    carry = y

    def monitor(self, wav_path, hive_id="unknown", baseline_db=None,
                block_s=300):
        """Classify hours of audio. Streams from disk; returns timeline + alert.

        Early warning fires on 3+ straight queenless windows (~12 s);
        confirmed needs queenless majorities in 2 straight 5-min blocks.
        """
        per_block = []
        votes, worker_all, t = [], [], 0.0
        for xb in self._iter_blocks(str(wav_path), block_s):
            proba = self.model.predict_proba(xb)
            idx, conf, _ = majority_vote(proba)
            wv = self.model.classes_[proba.argmax(axis=1)]
            votes.extend(wv.tolist())
            worker_all.extend(xb[:, 1].tolist())
            per_block.append({"t0_s": round(t, 1),
                              "status": self.labels[idx],
                              "confidence": round(conf, 3),
                              "windows": int(len(xb))})
            t += len(xb) * WIN_SEC

        ql = [v == "queenless" for v in votes]
        streak = best = 0
        for v in ql:
            streak = streak + 1 if v else 0
            best = max(best, streak)
        # Two tiers: early warning is 3 straight windows (~12 s, about two
        # toots); confirmed needs queenless majorities in 2 straight 5-min
        # blocks, because queen state changes over hours (queenless colonies
        # intensify within ~1 h, stabilize ~5 h), not seconds.
        block_ql = [b["status"] == "queenless" for b in per_block]
        confirmed = any(a and b for a, b in zip(block_ql, block_ql[1:]))
        if not votes:
            raise ValueError(f"{wav_path}: no complete 4 s windows found")
        import collections
        top = collections.Counter(votes).most_common(1)[0]
        overall, conf = top[0], round(top[1] / len(votes), 3)
        flag, detail = intensity_report(np.array(worker_all), conf, baseline_db)
        early = best >= 3
        alert = early or confirmed or flag != "normal"
        return {
            "hive": hive_id,
            "duration_s": round(t, 1),
            "windows": len(votes),
            "overall_status": overall,
            "overall_confidence": conf,
            "queenless_max_streak": best,
            "queenless_early_warning": early,
            "queenless_confirmed": confirmed,
            "alert": alert,
            "alert_reason": "; ".join(
                r for r in [
                    f"{best} consecutive queenless windows" if early else "",
                    "queenless majority in 2 straight 5-min blocks"
                    if confirmed else "",
                    detail if flag != "normal" else "",
                ] if r) or "none",
            "intensity_flag": flag,
            "intensity_detail": detail,
            "blocks": per_block,
        }


def _wide(y):
    """Feature matrix for audio the caller already normalized."""
    return np.array([_band_features(w) for w in _full_windows(y)])


def main():
    import argparse

    ap = argparse.ArgumentParser(description="HoneyChain hive-state inference")
    ap.add_argument("--wav", required=True)
    ap.add_argument("--hive", default="unknown")
    ap.add_argument("--baseline-db", type=float, default=None,
                    help="this hive's 7-night median worker-band log-energy")
    ap.add_argument("--long", action="store_true",
                    help="stream hours-long recordings with alert state")
    a = ap.parse_args()
    mon = HiveMonitor()
    if a.long:
        print(json.dumps(mon.monitor(a.wav, a.hive, a.baseline_db), indent=2))
    else:
        print(json.dumps(mon.predict(a.wav, a.hive, a.baseline_db), indent=2))


if __name__ == "__main__":
    main()
