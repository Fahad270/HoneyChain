# HoneyChain bee-acoustic model — integrator guide

You need zero bee knowledge. Record 16 kHz mono hive audio, call one
function, get back `queenright` / `queenless` / `nobee`.

## 1. Gateway / laptop (5 minutes)

```bash
pip install numpy scipy scikit-learn joblib librosa
```

```python
from predict import HiveMonitor

mon = HiveMonitor()  # loads gateway/ next to predict.py
print(mon.predict("capture.wav", hive_id="hive_03"))
```

Clips under 4 s are rejected with a clear error (shorter than one window;
padding shorter audio collapsed output to a fixed vector).
Hours of audio stream from disk with constant memory:

```python
print(mon.monitor("night.wav", hive_id="hive_03", baseline_db=-0.42))
# {"overall_status": ..., "queenless_max_streak": ..., "alert": ..., "blocks": [...]}
```

Two alert tiers, from measured buzz timescales: early warning on 3+
straight queenless windows (~12 s, about two queen toots); confirmed on
queenless majorities in 2 straight 5-min blocks (queen state changes over
hours, not seconds). Timescale refs: toot ~5 s, quack bouts ~19 s, worker
pipes <1 s, whoops ~0.14 s (Michelsen 1986; Ramsey 2017; Fourer 2022).

```json
{
  "hive": "hive_03",
  "status": "queenright",
  "confidence": 0.91,
  "posteriors": {"nobee": 0.02, "queenless": 0.07, "queenright": 0.91},
  "note": "",
  "intensity_flag": "normal",
  "intensity_detail": "worker-band median logE=-0.42"
}
```

What the statuses mean:

| status | action |
|---|---|
| `queenright` | healthy queen, nothing to do |
| `queenless` | send the alert (also fires during requeening — safe direction) |
| `nobee` | external noise, **hold** the queen verdict and check the mic |

## 2. Wingbeat-intensity flag (colony strength, not queen state)

Pass your hive's 7-night median worker-band log-energy once you have it:

```python
mon.predict("capture.wav", hive_id="hive_03", baseline_db=-0.42)
```

`intensity_flag` becomes `LOW_INTENSITY_SUSPECT_ABSENT_OR_WEAK` or
`HIGH_INTENSITY_SUSPECT_SWARM` when the 10-minute median drifts ~2x in
energy with a weak classifier margin. There is no global "normal dB" —
every box needs its own baseline.

## 3. New apiary? Calibrate (required, 5–30 min of work)

The base model does **not** transfer across sites (measured: chance-level
on unseen apiaries). Each site gets a fine-tuned head:

```bash
# technician records a few labeled minutes on site, then from product/:
python ../calibrate.py --pool calibration/calibration_pool.npz --site <yoursite> --n-cal 100 --out site_model/
```

Expect ~0.7–0.85 on the new site after 50–100 labeled 4 s windows.
Ship `site_model/site_model.joblib` per apiary, keep the base untouched.
Note: ignore any sklearn version warning on load; it does not affect votes.

## 4. ESP32-S3 firmware (`esp/`)

- `esp32/queen_model.tflite` (8032 bytes) — full-INT8, 11→64→32→3.
- `esp32/feature_spec.json` — the 11 band features + alert rule.
- Reimplement bands with fixed-point Goertzel at 240/480/360 Hz;
  quantise `gateway/edge_thresholds.json` per-class means to int8.

## 5. Honest limits (read before promising anything)

- Unseen apiary without calibration: ~coin-flip. Calibrate. Always.
- Distant/stressed states (swarm, varroa, foreign compressed mics) tend
  to read `queenright` — the model knows one flavor of queenlessness.
- Full numbers: `../MODEL_CARD.md`.
