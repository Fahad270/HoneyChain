#!/usr/bin/env python3
"""Per-apiary calibration: fine-tune the base queen model on a few minutes
of labeled on-site audio, then save a site-specific model.

Protocol (from run 5f curves): 50-100 labeled 4 s windows (3-7 min) lift a
new bt-like site 0.32 -> 0.85; harder sites need ~400 windows (~27 min).
Ship base model + this script; the KVIC technician records once per apiary.

Usage:
  python calibrate.py --pool colab_run4/run4v2_feat.npz --site bt \
      --n-cal 100 --out models/site_bt
  python calibrate.py --self-check   # reproduces run-5f curve endpoints locally

Deployment semantics: the base is always trained EXCLUDING the target
site (a shipped base that already saw the site would make 'before'
meaningless). Fine-tuning then adapts the head on --n-cal windows.
"""
import argparse
import json
import os

import joblib
import numpy as np
from sklearn.base import clone
from sklearn.metrics import accuracy_score


def fine_tune(base, X_cal, y_cal, iters=200):
    """Warm-start fine-tune of the MLP head on calibration windows.

    Scaler is the base scaler (site shift is carried by the head update).
    """
    mlp = clone(base.named_steps['mlpclassifier'])
    mlp.warm_start = True
    mlp.max_iter = iters
    mlp.fit(base.named_steps['standardscaler'].transform(X_cal), y_cal)
    return mlp


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pool', default=None,
                    help='training-pool npz with X_vec/y/src (base trains excluding --site)')
    ap.add_argument('--base', default=None,
                    help='pre-trained base joblib (must exclude --site; else use --pool)')
    ap.add_argument('--npz', default=None)
    ap.add_argument('--site', default=None)
    ap.add_argument('--n-cal', type=int, default=100)
    ap.add_argument('--out', default='models/site_model')
    ap.add_argument('--self-check', action='store_true')
    a = ap.parse_args()

    if a.self_check:
        from sklearn.neural_network import MLPClassifier
        from sklearn.preprocessing import StandardScaler
        from sklearn.pipeline import make_pipeline
        d = np.load('colab_run4/run4v2_feat.npz')
        X, Y, S = d['X_vec'].astype(np.float64), d['y'], d['src']
        rng = np.random.RandomState(7)
        rep = {}
        for tgt in ['bt', 'sbcm']:
            b = np.where(S == tgt)[0]
            idx = rng.choice(b, size=100, replace=False)
            te = np.setdiff1d(b, idx)
            base = make_pipeline(StandardScaler(),
                                 MLPClassifier(hidden_layer_sizes=(64,),
                                               max_iter=600, early_stopping=True,
                                               n_iter_no_change=25, random_state=7))
            base.fit(X[S != tgt], Y[S != tgt])
            before = float(accuracy_score(Y[te], base.predict(X[te])))
            head = fine_tune(base, X[idx], Y[idx])
            after = float(accuracy_score(
                Y[te], head.predict(base.named_steps['standardscaler'].transform(X[te]))))
            rep[tgt] = {'before': round(before, 3), 'after': round(after, 3)}
            print(tgt, rep[tgt])
        return

    if a.pool:
        from sklearn.neural_network import MLPClassifier
        from sklearn.preprocessing import StandardScaler
        from sklearn.pipeline import make_pipeline
        d = np.load(a.pool)
        X, Y, S = d['X_vec'].astype(np.float64), d['y'], d['src']
        keep = S != a.site
        base = make_pipeline(StandardScaler(),
                             MLPClassifier(hidden_layer_sizes=(64,),
                                           max_iter=600, early_stopping=True,
                                           n_iter_no_change=25, random_state=7))
        base.fit(X[keep], Y[keep])
        joblib.dump(base, os.path.join('/tmp', 'cal_base.joblib'))
        a.base, a.npz = os.path.join('/tmp', 'cal_base.joblib'), a.pool
        int_labels = False  # freshly trained on string labels
        order = None

    base = joblib.load(a.base)
    d = np.load(a.npz)
    X, Y, S = d['X_vec'].astype(np.float64), d['y'], d['src']
    # Kaggle bases were fit on int encodings; local bases on strings.
    # Normalize Y to whatever the base speaks.
    base_int = np.asarray(base.classes_).dtype.kind in 'iu'
    if base_int:
        labfile = os.path.join(os.path.dirname(a.base), 'labels4v2.json')
        order = json.load(open(labfile)) if os.path.exists(labfile) \
            else ['queenless', 'queenright']
        code = {c: i for i, c in enumerate(order)}
        Y = np.array([code[str(v)] for v in Y])

    def decode(p):
        return np.asarray(p)
    b = np.where(S == a.site)[0]
    rng = np.random.RandomState(7)
    idx = rng.choice(b, size=min(a.n_cal, len(b)), replace=False)
    te = np.setdiff1d(b, idx)
    if a.pool:
        before = float(accuracy_score(Y[te], decode(base.predict(X[te]))))
    else:
        # Pre-trained base may already have seen this site: a 'before'
        # measured here would be meaningless. Report post-calibration only.
        before = None
    head = fine_tune(base, X[idx], Y[idx])
    after = float(accuracy_score(
        Y[te], decode(head.predict(base.named_steps['standardscaler'].transform(X[te])))))
    os.makedirs(a.out, exist_ok=True)
    joblib.dump({'scaler': base.named_steps['standardscaler'], 'mlp': head,
                 'labels': list(base.classes_)},
                os.path.join(a.out, 'site_model.joblib'))
    json.dump({'site': a.site, 'n_cal': len(idx), 'before': round(before, 3),
               'after': round(after, 3)},
              open(os.path.join(a.out, 'calibration.json'), 'w'), indent=2)
    print(json.dumps({'site': a.site, 'before': round(before, 3),
                      'after': round(after, 3)}))


if __name__ == '__main__':
    main()
