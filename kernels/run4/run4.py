#!/usr/bin/env python3
"""HoneyChain Run 4 v2 (Kaggle infra): multisite queenright/queenless + INT8.

v1 was TAINTED: BeeTogether never mounted; both 'sources' were SBCM audio
and sbcm windows had zero queenless. v2 FAILS FAST unless both datasets
mount with real labels from CSVs/dirs (no blind path heuristics).

Outputs in /kaggle/working: metrics_run4v2.json, scaler4v2.json,
labels4v2.json, mlp4v2.joblib, dense4v2_int8.tflite, run4v2_feat.npz
"""
import os, glob, json
import numpy as np
import pandas as pd
import librosa
from scipy.signal import resample

SR, WIN, N_FFT = 16000, 4.0, 512
BANDS = {'worker_hum': (200, 300), 'queen_pipe': (400, 550),
         'whoop': (300, 450), 'worker_pipe': (100, 250),
         'queen_harm': (500, 2000), 'sub': (0, 100), 'hiss': (3000, 6000)}
FR = librosa.fft_frequencies(sr=SR, n_fft=N_FFT)
W = '/kaggle/working'
CAP = {'sbcm': 1500, 'bt': 2500}


def feats(y):
    G = np.abs(librosa.stft(y, n_fft=N_FFT, hop_length=160,
                            win_length=400, window='hann'))
    P = G ** 2

    def be(lo, hi):
        m = (FR >= lo) & (FR < hi)
        return float(P[m].mean()) if m.any() else 0.0

    e = {k: be(*v) for k, v in BANDS.items()}
    rms = float(np.sqrt((y ** 2).mean()) + 1e-12)
    cent = float((FR[:, None] * G).sum() / (G.sum() + 1e-12))
    zcr = float(((y[:-1] * y[1:]) < 0).mean())
    order = ['worker_hum', 'queen_pipe', 'whoop', 'worker_pipe',
             'queen_harm', 'sub', 'hiss']
    return np.array(
        [20 * np.log10(rms)] + [np.log10(e[k] + 1e-12) for k in order]
        + [cent, np.log10((e['queen_pipe'] + 1e-12)
                          / (e['worker_hum'] + 1e-12)), zcr],
        np.float32)


def load_mono(path):
    y, sr = librosa.load(path, sr=None, mono=True)
    if sr != SR:
        y = resample(y, int(len(y) * SR / sr)).astype(np.float32)
    return y


def windows_of(y):
    n = int(SR * WIN)
    return [y[s:s + n] for s in range(0, len(y) - n + 1, n)]


def tree(root, depth=2):
    print('== tree:', root)
    for dp, dn, fn in os.walk(root):
        if dp.count(os.sep) - root.count(os.sep) >= depth:
            dn[:] = []
            continue
        dn[:] = sorted([d for d in dn if not d.startswith('.')])[:20]
        au = sum(1 for f in fn if f.lower().endswith(
            ('.wav', '.mp3', '.ogg', '.flac', '.m4a')))
        print('  ', dp, f'dirs={len(dn)} audio={au} files={len(fn)}')
        for f in sorted(fn)[:6]:
            if f.lower().endswith('.csv'):
                print('     csv:', f)


tops = sorted([d for d in glob.glob('/kaggle/input/*') if os.path.isdir(d)])
print('INPUT TOPS:', tops)
all_audio, all_csv = [], []
for dp, dn, fn in os.walk('/kaggle/input'):
    dn[:] = [d for d in dn if not d.startswith('.')]
    for f in fn:
        p = os.path.join(dp, f)
        if f.lower().endswith(('.wav', '.mp3', '.ogg', '.flac', '.m4a')):
            all_audio.append(p)
        elif f.lower().endswith('.csv'):
            all_csv.append(p)
print('TOTAL audio:', len(all_audio), 'csvs:', all_csv[:10])


def find_mount(*keys):
    hits = [d for d in tops
            if all(k in d.lower() for k in keys)]
    if hits:
        return hits[0]
    return None


sbcm_root = find_mount('beehive-sounds') or find_mount('beehive') or \
    find_mount('sbcm')
bt_root = find_mount('to-bee-or-no-to-bee') or find_mount('bee-or-no')
# v2 lesson: datasets may nest under /kaggle/input/datasets — search deep
if sbcm_root is None:
    for c in all_csv:
        if 'all_data_updated' in os.path.basename(c).lower():
            sbcm_root = os.path.dirname(c)
            break
if bt_root is None:
    parents = {}
    for p in all_audio:
        parents.setdefault(os.path.dirname(p), 0)
        parents[os.path.dirname(p)] += 1
    cands = sorted(parents, key=parents.get, reverse=True)[:10]
    print('top audio dirs:', [(c, parents[c]) for c in cands])
    for c in cands:
        if 'to-bee' in c.lower() or 'beetogether' in c.lower() \
                or 'no-to-bee' in c.lower():
            bt_root = c
            break
print('SBCM root:', sbcm_root)
print('BT root:', bt_root)
if sbcm_root:
    tree(sbcm_root)
if bt_root:
    tree(bt_root)

X, Y, S = [], [], []


def add_windows(path, label, src, cap_left):
    try:
        y = load_mono(path)
    except Exception as e:
        print('   skip', os.path.basename(path), type(e).__name__)
        return 0
    n = 0
    for w in windows_of(y):
        X.append(feats(w))
        Y.append(label)
        S.append(src)
        n += 1
        if n >= cap_left:
            break
    return n


def norm_label(raw):
    """Map free-text queen state -> queenless/queenright/None."""
    if raw is None:
        return None
    if isinstance(raw, bool):
        return 'queenright' if raw else 'queenless'
    if isinstance(raw, (int, float)) and not isinstance(raw, bool):
        if int(raw) == 1:
            return 'queenright'
        if int(raw) == 0:
            return 'queenless'
        return None
    t = str(raw).strip().lower().replace('_', ' ').replace('-', ' ')
    if t in ('1', 'true', 'yes', 'y', 'present', 'queen'):
        return 'queenright'
    if t in ('0', 'false', 'no', 'n', 'absent', 'missing'):
        return 'queenless'
    neg = ['not present', 'absent', 'no queen', 'missing', 'queenless',
           'without queen', 'noqueen']
    pos = ['present', 'accepted', 'rejected', 'original', 'queenright',
           'with queen', 'queenbee']
    if any(k in t for k in neg):
        return 'queenless'
    if 'queen' in t and any(k in t for k in pos):
        return 'queenright'
    if t in ('qr',):
        return 'queenright'
    if t in ('nq',):
        return 'queenless'
    return None


# ---------- SBCM via metadata CSV (self-healing column match) ----------
assert sbcm_root, 'SBCM dataset did not mount — aborting'
csvs = glob.glob(os.path.join(sbcm_root, '**', '*.csv'), recursive=True)
print('SBCM csvs:', csvs)
# basename index of every audio file under sbcm_root (robust to path styles)
exts = ('.wav', '.mp3', '.ogg', '.flac', '.m4a')
audio_idx = {}
for dp, dn, fn in os.walk(sbcm_root):
    dn[:] = [d for d in dn if not d.startswith('.')]
    for f in fn:
        if f.lower().endswith(exts):
            audio_idx.setdefault(f.lower(), []).append(os.path.join(dp, f))
print('SBCM audio files indexed:', len(audio_idx))
sbcm_got = {'queenless': 0, 'queenright': 0}
for csv in csvs:
    try:
        df = pd.read_csv(csv)
    except Exception as e:
        print('  unreadable csv:', csv, type(e).__name__)
        continue
    print('  csv:', os.path.basename(csv), 'rows:', len(df),
          'cols:', list(df.columns))
    acol = next((c for c in df.columns
                 if any(k in c.lower() for k in ('file', 'path', 'audio',
                                                'clip', 'name'))), None)
    cand_lcols = [c for c in df.columns
                  if any(k in c.lower() for k in ('queen', 'label', 'state',
                                                 'status', 'class', 'target'))]
    # known codebook: SBCM 'queen presence' is 1=present / 0=absent
    exact = [c for c in df.columns if c.strip().lower() == 'queen presence']
    cand_lcols = exact + [c for c in cand_lcols if c not in exact]
    for c in cand_lcols:
        try:
            print(f'    col {c!r}:',
                  df[c].astype(str).str.strip().value_counts().head(8).to_dict())
        except Exception as e:
            print(f'    col {c!r} unreadable:', type(e).__name__)
    if not acol:
        continue
    # pick first label column yielding both classes
    picked = None
    for c in cand_lcols:
        m = df[c].map(norm_label)
        nq, nr = int((m == 'queenless').sum()), int((m == 'queenright').sum())
        print(f'    candidate {c!r}: queenless={nq} queenright={nr}')
        if nq > 50 and nr > 50:
            picked = c
            break
    if picked is None:
        continue
    colvals = df[acol].astype(str).str.strip()
    print(f'    e.g. csv names: {colvals.head(3).tolist()}')
    idxkeys = list(audio_idx.keys())
    print(f'    e.g. disk names: {idxkeys[:3]}')

    def normkey(s):
        s = s.strip().lower().replace('\\', '/')
        s = s.split('/')[-1]
        if '.' in s:
            s = s.rsplit('.', 1)[0]
        return s

    disk_norm = {}
    for k, v in audio_idx.items():
        disk_norm.setdefault(normkey(k), []).append(v[0])
    for _, row in df.iterrows():
        lab = norm_label(row[picked])
        if lab is None or sbcm_got[lab] >= CAP['sbcm'] // 2:
            continue
        nk = normkey(str(row[acol]))
        hit = None
        if nk in disk_norm:
            hit = disk_norm[nk][0]
        else:
            for dk, vv in disk_norm.items():
                if nk and (nk in dk or dk in nk):
                    hit = vv[0]
                    break
        if hit is None:
            continue
        sbcm_got[lab] += add_windows(hit, lab, 'sbcm',
                                     CAP['sbcm'] // 2 - sbcm_got[lab])
    if sum(sbcm_got.values()) >= CAP['sbcm']:
        break
print('SBCM windows:', sbcm_got)

# ---------- BeeTogether via subdirs (with layout dump) ----------
assert bt_root, 'BeeTogether dataset did not mount — aborting'
exts = ('.wav', '.mp3', '.ogg', '.flac', '.m4a')
sub_info = []
for dp, dn, fn in os.walk(bt_root):
    dn[:] = [d for d in dn if not d.startswith('.')]
    au = [f for f in fn if f.lower().endswith(exts)]
    if au:
        sub_info.append((dp, len(au), au[0]))
print('BT audio dirs:', len(sub_info))
for dp, n, sample in sub_info[:15]:
    print(f'  {dp} n={n} e.g. {sample}')
bt_got = {'queenless': 0, 'queenright': 0}
for dp, dn, fn in os.walk(bt_root):
    dn[:] = [d for d in dn if not d.startswith('.')]
    dlab = norm_label(os.path.basename(dp))
    for f in sorted(fn):
        if not f.lower().endswith(exts):
            continue
        lab = dlab or norm_label(os.path.splitext(f)[0])
        if lab is None or bt_got[lab] >= CAP['bt'] // 2:
            continue
        bt_got[lab] += add_windows(os.path.join(dp, f), lab, 'bt',
                                   CAP['bt'] // 2 - bt_got[lab])
        if sum(bt_got.values()) >= CAP['bt']:
            break
    if sum(bt_got.values()) >= CAP['bt']:
        break
print('BT windows:', bt_got)

assert sbcm_got['queenless'] > 50 and sbcm_got['queenright'] > 50, \
    f'SBCM labels incomplete: {sbcm_got} — aborting'
assert bt_got['queenless'] > 50 and bt_got['queenright'] > 50, \
    f'BT labels incomplete: {bt_got} — aborting'

X, Y, S = map(np.array, [X, Y, S])
print('TOTAL', X.shape, dict(zip(*np.unique(Y, return_counts=True))),
      '| src:', dict(zip(*np.unique(S, return_counts=True))))
np.savez(os.path.join(W, 'run4v2_feat.npz'), X_vec=X, y=Y, src=S)

# ---------- models ----------
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import StratifiedShuffleSplit
from sklearn.metrics import accuracy_score, confusion_matrix

classes = ['queenless', 'queenright']
yi = np.array([classes.index(c) for c in Y])
res = {'n': int(len(Y)), 'classes': classes,
       'counts': {f'{c}/{s}': int(((Y == c) & (S == s)).sum())
                  for c in classes for s in sorted(set(S))}}
sss = StratifiedShuffleSplit(n_splits=1, test_size=0.2, random_state=7)
tr, te = next(sss.split(X, yi))
mlp = make_pipeline(StandardScaler(),
                    MLPClassifier(hidden_layer_sizes=(64,), max_iter=800,
                                  early_stopping=True, n_iter_no_change=30,
                                  random_state=7))
mlp.fit(X[tr], yi[tr])
pm = mlp.predict(X[te])
res['mlp_holdout_acc'] = float(accuracy_score(yi[te], pm))
res['mlp_confusion'] = confusion_matrix(yi[te], pm).tolist()
print('MLP holdout:', round(res['mlp_holdout_acc'], 3))

import joblib
joblib.dump(mlp, os.path.join(W, 'mlp4v2.joblib'))
mu, sd = X[tr].mean(0), X[tr].std(0) + 1e-9
json.dump({'mean': mu.tolist(), 'std': sd.tolist()},
          open(os.path.join(W, 'scaler4v2.json'), 'w'))
json.dump(classes, open(os.path.join(W, 'labels4v2.json'), 'w'))

import tensorflow as tf
tf.random.set_seed(7)
Z = ((X - mu) / sd).astype(np.float32)
net = tf.keras.Sequential([tf.keras.Input((11,)),
                           tf.keras.layers.Dense(64, activation='relu'),
                           tf.keras.layers.Dense(2, activation='softmax')])
net.compile(optimizer=tf.keras.optimizers.Adam(3e-3),
            loss='sparse_categorical_crossentropy', metrics=['accuracy'])
cb = [tf.keras.callbacks.EarlyStopping(patience=25, restore_best_weights=True,
                                       monitor='val_accuracy')]
net.fit(Z[tr], yi[tr], validation_data=(Z[te], yi[te]), epochs=300,
        batch_size=64, callbacks=cb, verbose=0)
res['tf_params'] = int(net.count_params())
res['tf_holdout_acc'] = float(accuracy_score(
    yi[te], net.predict(Z[te], verbose=0).argmax(1)))
print('TF holdout:', round(res['tf_holdout_acc'], 3))


def rep():
    for i in range(0, len(Z), 5):
        yield [Z[i:i + 1]]


conv = tf.lite.TFLiteConverter.from_keras_model(net)
conv.optimizations = [tf.lite.Optimize.DEFAULT]
conv.representative_dataset = rep
conv.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
conv.inference_input_type = tf.int8
conv.inference_output_type = tf.int8
tfl = conv.convert()
open(os.path.join(W, 'dense4v2_int8.tflite'), 'wb').write(tfl)
res['tflite_bytes'] = len(tfl)

ref = net.predict(Z[:200], verbose=0).argmax(1)
it = tf.lite.Interpreter(model_content=tfl)
it.allocate_tensors()
id_, od_ = it.get_input_details()[0], it.get_output_details()[0]
qs, zp = id_['quantization']
s2, z2 = od_['quantization']
ag = 0
for i, x in enumerate(Z[:200]):
    q = np.clip(np.round(x / qs + zp), -128, 127).astype(np.int8)
    it.set_tensor(id_['index'], q[None, :])
    it.invoke()
    o = it.get_tensor(od_['index']).astype(np.float32)
    z = (o * s2 + z2).ravel()
    z = z - z.max()
    e = np.exp(z)
    if int((e / e.sum()).argmax()) == int(ref[i]):
        ag += 1
res['int8_agreement'] = [ag, 200]

loho = {}
for src in sorted(set(S)):
    a, b = S != src, S == src
    if b.sum() == 0 or len(set(yi[a])) < 2 or len(set(yi[b])) < 2:
        loho[str(src)] = {'acc': None, 'n': int(b.sum()), 'skip': True}
        continue
    m2 = tf.keras.Sequential([tf.keras.Input((11,)),
                              tf.keras.layers.Dense(64, activation='relu'),
                              tf.keras.layers.Dense(2, activation='softmax')])
    m2.compile(optimizer=tf.keras.optimizers.Adam(3e-3),
               loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    m2.fit(Z[a], yi[a], epochs=120, batch_size=64, verbose=0)
    q = float(accuracy_score(yi[b], m2.predict(Z[b], verbose=0).argmax(1)))
    loho[str(src)] = {'acc': q, 'n': int(b.sum())}
    print(f'leave-{src}-out: {q:.3f} (n={b.sum()})')
res['leave_one_dataset_out'] = loho

json.dump(res, open(os.path.join(W, 'metrics_run4v2.json'), 'w'), indent=2)
print('SAVED:', sorted(os.listdir(W)))
print(json.dumps(res, indent=2))
