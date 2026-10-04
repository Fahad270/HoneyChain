#!/usr/bin/env python3
"""Featurize OSBH wavs with the HoneyChain 11-scalar recipe (scipy only).

State labels come from top-level folder names:
  Active / Missing Queen / Pre-Swarm / Queen Hatching / Swarm / Sick-Varroa
Writes ai/colab_run2/osbh_feat.npz (X_vec, y_state, y_queen, file).
y_queen maps Active->queenright, Missing Queen->queenless, else unknown.
"""
import glob
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from train_bee_acoustic import read_wav_mono, windows, features_for_window

BASE = os.path.join(os.path.dirname(__file__), 'data', 'osbh')
OUT = os.path.join(os.path.dirname(__file__), 'colab_run2', 'osbh_feat.npz')
QUEEN_MAP = {'Active': 'queenright', 'Missing Queen': 'queenless'}


def main():
    paths = sorted(glob.glob(os.path.join(BASE, '**', '*.wav'), recursive=True))
    print('files:', len(paths))
    X, ys, yq, fn = [], [], [], []
    for i, p in enumerate(paths):
        state = os.path.relpath(p, BASE).split(os.sep)[0]
        try:
            audio = read_wav_mono(p)  # resamples to 16 kHz mono
        except Exception as e:
            print(f'[skip] {p}: {e}')
            continue
        for w in windows(audio):
            f = features_for_window(w)
            X.append(f[-12:-1])  # 11 scalars, drop spectral flatness
            ys.append(state)
            yq.append(QUEEN_MAP.get(state, 'unknown'))
            fn.append(os.path.relpath(p, BASE))
        if (i + 1) % 25 == 0:
            print(f'  {i + 1}/{len(paths)} files, {len(X)} windows')
    X = np.array(X)
    print('TOTAL', X.shape)
    np.savez(OUT, X_vec=X, y_state=np.array(ys), y_queen=np.array(yq),
             fname=np.array(fn))
    print('saved', OUT)


if __name__ == '__main__':
    main()
