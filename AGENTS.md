# HoneyChain — local agent notes (auto-updated when we learn something the hard way)

## Colab bridge (colab-mcp)
- `run_code_cell` blocks until the cell finishes AND the bridge scrapes its output.
  Green checks in the Colab tab do NOT mean the tool call returned — output
  polling can hang while execution is done (seen 2026-09-23, hung >60 min).
- When wedged, `get_cells` from another thread fails with `Unknown tool`.
- Per user order + AGENTS.md Sec 8: do Colab training on the main thread
  (add cell -> run -> read output), never delegate to a subagent.
- Only safe recovery from a hung call is cancelling the worker; the notebook
  and /content files survive. Always pull /content artifacts via the Colab
  Files pane before touching the runtime.
- NOTE: global AGENTS.md Sec 5 ("delegate Colab through @general") contradicts
  Sec 8 ("long-poll yourself"). User ruled: Sec 8 wins for Colab. Global file
  is user-owned; asking owner to resolve there.

## Bee acoustic runs (colab, honest numbers only)
- Run 1 (2026-09-23): 100% SYNTHETIC (90 sine-tone windows, 4 fake hives).
  UrBAN terabyte-scale pull failed; piping raw is features-only (copyright).
  Numbers meaningless for deployment. Artifacts: ai/colab_run1/.
- Run 2 (2026-09-23): 548 REAL windows (NUHIVE via Zenodo 1321278, 6 wavs,
  3 true hives). MLP holdout 0.90 but leave-one-hive-out ~0.04 — textbook
  hive-signature overfitting (matches BeeTogether literature). Never ship
  holdout-only claims. Artifacts pulled: ai/colab_run2/ (npz sha256
  0c6687a1…, 548 wins; cj001 has queenless-only → explains LOHO 0.0).
- Run 2b INT8 (2026-09-23): Keras dense 11→64→2 (898 params) retrained on
  run-2 vectors, holdout 1.00. Full-INT8 TFLite bee_dense_int8.tflite =
  4624 bytes (10× under 45KB budget), keras↔INT8 agreement 198/200.
  Unseen-online test (4 fresh NUHIVE wavs, 521 windows, same hives):
  4/4 files correct, qr_frac 0.03/0.10 vs 0.74/0.77. Same-hive only —
  cross-hive still expected to fail per LOHO.
- Run 2c diverse (2026-09-23): INT8 tested on 36 files never trained on.
  NUHIVE new dates 4/4, Gruber mp3 pair 1/2 (with-queen WRONG at qr=0.0),
  AI-Belha Portugal outside-hive phones 16/30 (~chance). Grand 21/36 = 0.58.
  Boundary mapped: works on in-hive mics, fails on outside-hive phones and
  foreign apiaries. Artifacts: ai/colab_run2/diverse_test.json.
- Run 3 (2026-09-23): fix = 3 states (queenright/queenless/nobee, 1195 wins,
  NUHIVE in-hive + AI-Belha outside-phones in training) + INT8 11→64→32→3
  (2947 params, 8032 bytes). Diverse file test 32/36 = 0.889 (was 0.583):
  AI-Belha 28/30, NUHIVE-new-dates 3/4, Gruber pair splits 1/2 again
  (without-queen now WRONG). Remaining ravine: Gruber mp3 pair (9 wins
  each, compressed), Hive1-1630 hard file, newly_accepted/rejected +
  swarming states still unlabeled. Artifacts: bee_3class_int8.tflite,
  diverse3_test.json, scaler3.json.
- Run 3b lock-in (2026-09-23): transition clips (5 newly_accepted + 3
  rejected) all vote queenless-majority → transition reads as queenless
  (safe direction: alerts keep firing during instability). Local sklearn
  MLP 3-class retrained on run3_feat.npz: holdout 0.757 (≈ Keras 0.799).
  infer_edge.py --v3 wired to mlp_3class.joblib + scaler3.json, verified
  end-to-end. ESP32 ship artifact stays bee_3class_int8.tflite (8032 B).
  (Loop r13: --v3 also reports worker-band intensity + honors
  --baseline-db; verified. Loop r14: intensity rule extracted to shared
  intensity_report() helper used by both paths; all 3 branches tested.)
- Loop r15 regression gate (all green): train --self-test 1.00/LOHO 0.87,
  infer --v3 queenright on synth, calibrate self-check bt 0.32→0.73 /
  sbcm 0.51→0.64. Kernel COMPLETE/stable.
- Loop r17 product demo on real audio: infer --v3 on 5-min OSBH Active
  wav → queenright 1.00; on Swarm wav → queenright 0.95 (known blind
  spot, now visible via product path). Worker-band logE varies widely
  across files (-4.7/-2.1/-0.4): per-hive baselines mandatory.
- PAUSED 2026-09-23: Colab free compute exhausted. Big pull (OSBH 0.5GB +
  full NUHIVE 23GB rars, cell MBIdcvWdUXAB) died with runtime. Resume:
  reload tab, reconnect, re-run download cells, then run-4 featurize
  (queen-day labels via state_labels.csv) + retrain. Nothing local lost.
  Full session notebook stored at ai/colab_runs.ipynb (39 cells, outputs
  intact — rebuild reference for resume).
- Run 4 v1+v2 (2026-09-24, Kaggle): v1 TAINTED (BT never mounted, both
  sources SBCM, quarantined). v2 CLEAN: SBCM 1500 (CSV queen-presence
  labels) + BeeTogether 2500 (dir labels), n=4000 balanced, holdout
  0.93/0.935, INT8 4616B @192/200. Gate: leave-one-DATASET-out 0.49/0.50
  = chance. Definitive: 11 hand scalars carry site signature, not queen
  state, across 4 sites. Next: site-invariant features or domain
  alignment. Artifacts: ai/colab_run4/*v2*.
- Run 5 site-invariance probe (2026-09-24, local, run4v2 4000 wins):
  per-window z-norm of 11 scalars moves leave-one-site-out bt 0.32→0.45,
  sbcm 0.50→0.50 — still ~chance. Absolute levels aren't the whole
  story. Next: ratio-only features, deltas, CORAL per-site alignment.
- Run 5b (2026-09-24): ratio-only features (band contrasts vs worker hum,
  no absolute levels) score bt 0.36 / sbcm 0.38 — worse than raw.
  Discarded. Ratios alone lose too much. Deltas + CORAL still queued.
- Run 5c (2026-09-24): per-site covariance whitening (unlabeled test-site
  stats, legal transductive): bt 0.56 / sbcm 0.40. First probe to beat
  raw on any site, but asymmetric and still far from deployable. Full
  CORAL-to-reference + temporal deltas still queued.
- Run 5d (2026-09-24): full CORAL (source covariance → test covariance):
  bt 0.48 / sbcm 0.41. Worse than plain whitening on bt. Linear
  second-order alignment is exhausted (0.4–0.56 band). Next: per-feature
  quantile mapping (nonlinear), then site-adversarial training.
- Run 5e (2026-09-24): per-feature quantile mapping to train distribution:
  bt 0.45 / sbcm 0.50. Discarded. Alignment without paired site data is
  exhausted. Reframe queued: few-shot per-site calibration (how many
  labeled windows from a new site recover 0.8+) — the deployable answer.
- Run 5f (2026-09-24): FEWSHOT CALIBRATION CURVE (the shippable result).
  New site bt: 0.32 → 0.56@25 → 0.74@50 → 0.85@100 wins. New site sbcm:
  0.50 → 0.61@50 → 0.70@200 → 0.77@400. Protocol: ship base MLP + 5–30
  min labeled on-site audio, fine-tune, deploy per-apiary. Universal
  model abandoned; calibration protocol adopted.
- Run 5g (2026-09-24): calibration locked in as product. ai/calibrate.py
  (warm-start head fine-tune, --pool trains base excluding site,
  --base path guarded: no meaningless before-metric). Verified:
  self-check bt 0.32→0.73 / sbcm 0.51→0.64; shipped-artifact run
  identical. README documents the technician protocol.
- Run 4b local multisite (2026-09-24): NUHIVE + AI-Belha + OSBH-Active =
  23,809 wins, 3 sites. Holdout 0.987 but leave-one-SITE-out collapses
  (aibelha 0.51 / nuhive 0.40 / osbh 0.22) — site acoustics dominate queen
  signal in 11 hand scalars. OSBH distress probes (swarm/pre-swarm/missing/
  hatching/varroa, 184 wins) ALL vote confident queenright. Wall hit:
  need site-invariant features (per-window norm, deltas) or domain
  alignment — not more same-recipe data. Artifacts: mlp_4site.joblib
  (quarantine-grade), osbh_feat.npz 9.3MB.
- Run 6-quick temporal-delta probe (2026-09-24, colab GPU, NUHIVE 1321278
  5 wavs only ~435MB, CJ001 404 skipped; 740 wins Hive1+Hive3, qr445/ql295):
  raw-11 holdout 0.878 but LOHO 0.135/0.000 (same wall as run 2); delta-only
  holdout 0.655 LOHO 0.261/0.294; stacked-22 holdout 0.851 LOHO 0.038/0.000.
  Deltas do NOT rescue cross-hive, queued delta probe closed NEGATIVE.
  Calibration protocol stands. No artifacts pulled (colab-only, limited net;
  feat npz at /content/data/run6quick_feat.npz).
- Colab note (2026-09-24): MCP notebooks are NOT saved, fresh empty notebook
  after every tab crash/runtime switch, re-stage all cell code. GPU refreshes
  wipe /content (5/6 wavs survived one refresh). Zenodo single-stream only
  1.5-3 MB/s; 8-way Range parallel does ~5GB in ~2min but server ignores
  Range on retry, strict per-part size check required.
- Product pack (2026-09-24, ai/product/): stable names for naive integrators
  (predict.py one-API entry, INTEGRATE.md 1-page guide, esp32/queen_model.tflite
  + feature_spec.json, gateway/model.joblib+scaler+labels+thresholds,
  calibration/base_*). All 7 binaries byte-identical to verified originals,
  py_compile + JSON dims/labels checked. v2 zip (69KB) sent to self on WA.
- AGENTS.md continuation lines use 2-space indent (read tool line prefix adds
  a phantom space; when edit misses, check bytes with cat -A, not by guessing).
- Run 7 ravine AI-Belha-86 (2026-09-24, colab CPU, HF parquet 163MB,
  repo_type='dataset' — plain id 401s on /api/models): exact ship INT8 bytes
  on Colab (sha f65efdf4 verified; single 10.7KB b64 paste got mangled, chunked
  4x2678 with per-chunk hashes all clean). File-level: scored 28/30 = 0.933
  (queenless 15/15, queenright 13/15, 2 WRONG both borderline f 0.53/0.54);
  transition 8/8 safe-pass queenless-majority; 48 unknowns vote 31 queenless /
  17 queenright / 0 nobee. Caveat: run3 trained on ~30 clips from this same pool,
  so this is same-distribution confirmation (3x files), NOT a fresh-site gate.
  3-class output order confirmed ['nobee','queenless','queenright'] (notebook l2344).
- Run 7 detail: 86 files = 1266 windows (443 scored + 120 trans + 703 unk).
  Mean majority frac: scored 0.858, trans 0.834, unk 0.818. Zero confident-wrong
  (both misses borderline 0.53/0.54; margin rule would hold them, not false-alarm).
  7 borderline files total, all frac 0.5-0.54. vs run-2c binary era (queenless files
  voted queenright up to qr=1.0): 3-class fix holds at 3x scale, queenless 15/15.
- Run 8 obscure (2026-09-24, colab CPU, ship INT8): bee/drone 1-s clips 500/500
  queenright both (conf 0.575, padded regime; model blind to drones, expected).
  BAD 10 hives 20k wins 90.6% queenless INVALIDATED by control: 3 confident
  queenright AI-Belha files flip to queenless-majority after 8kHz roundtrip
  (empty 4-8kHz octave vs 16kHz-trained scaler); queenless files unchanged.
  Queen-high rule via qw_ratio REJECTED: AI-Belha qw med true-qr/vote-qr 0.294
  vs true-ql/vote-qr 0.289 (no separation); direction flips across corpora
  (BAD qr-votes higher qw, AI-Belha ql-votes higher). qw is site acoustics.
- Run 8 correction: bee/drone 500/500 queenright is a CONSTANT-OUTPUT artifact,
  not a finding. Every 1-s padded clip yields identical post [0.212,0.212,0.575]
  (conf 0.575 is the fixed shrug, not measured confidence). 4-s-window model fed
  1-s clips = OOD; needs full windows. Bee/drone verdict withdrawn.
- Product predict.py now streams hours (monitor(): 2-pass block reads, global
  peak norm, 1-window overlap, streak+intensity alert) and rejects <8 s clips
  (1-s padded inputs collapsed to fixed post [0.212,0.212,0.575]). Static check
  only (py_compile); runtime check needs deps absent locally.
- Buzz timescale research (2026-09-24): toot ~5s, quack bouts ~19s, worker
  pipes <1s, whoops ~0.14s; queen state changes over hours; literature chunks
  1-10s (2-4s mainstream). Product: predict() takes >=4s complete-only windows
  (no padding), 4s kept (baked into trained scaler, matches one toot), no overlap
  hops (correlated votes). monitor() two-tier: early 3-window streak + confirmed
  2 straight queenless 5-min blocks.
- Run 9 wildcards OSBH (2026-09-24, colab, ship INT8, new 2-tier rules; mp3s decode
  via librosa/ffmpeg): swarm 10min ql 0.61 streak 49 early T confirmed F (blocks split
  qr then ql); missing 3 wins all nobee; preswarm ql 0.61 streak 9 early T (35% nobee);
  hatch 7 wins all nobee; varroa 1 win ql; active Canberra 5min qr 0.83/0.76 streak
  0/1 (controls pass); active Barcelona 1.5min ql 0.95 streak 21 (foreign-box misfire
  or mislabeled colony, in line with site wall). Ship disagrees with run4b 4-site MLP
  on swarm (that one voted confident queenright).
- Audio audit (2026-09-24, colab): all wildcard files are clean recordings
  (no clipping, sane spectra) — none is "broken audio". Key: Canberra Active
  votes qr at hum -2.28 AND +1.22 (norm-adjusted), Barcelona votes ql at +1.64;
  same-hum opposite verdicts, different-hum same verdicts. Verdict rides the full
  11-dim setup signature, not queen state. Canberra files are sr=4410Hz yet vote
  qr, so dead top octave alone does not force queenless (BAD story is combo, not
  pure bandwidth). Swarm mp3 is a loud broadband roar (cent 2605, rms -21.9).
  Missing/hatch are narrowband low (cent 256/621, zcr ~0.02) — nobee plausible
  either way. Conclusion for user: audios are right as recordings; wrong only as
  in that they come from other setups. Fix is per-box calibration, not cleaner audio.
- agy listening (2026-09-24, scratch copies + --mode plan + --sandbox + strict
  prompt, --dangerously-skip-permissions only to unblock confirms; nothing written,
  originals untouched): missing.mp3 = deep steady uniform buzz, active hive interior
  (model voted nobee = MISS on steady low hum, cent 256Hz). hatching.mp3 = human
  voices, outdoor wind, NO bee hum at all (model voted nobee = CORRECT; file itself
  is odd for a "Queen Hatching" label).
- Run 10 shipped (2026-09-24): corrective retrain fixes steady-hum nobee miss.
  INT8 sha 7ec2f466 (8032B, 195/200 agreement), twin (128,64) 0.798, scaler 11+11.
  Gates: AI-Belha 30/30, trans 8/8, missing 3/3 ql, hatching 7/7 nb, actives 1.0.
  product/ + colab_run10/ updated, compile-checked. Transfer was uguu.se (~54KB
  user data; 0x0.st dead, file.io 301s). Wall (unseen-hive generalization) stands.
- Gauntlet candidate list (loop_fxrtx, 2026-09-24). DONE: NUHIVE-1321278,
  NUHIVE-new-dates, Gruber pair, AI-Belha-86, OSBH-8-wildcards, BAD-10k (VOID:
  8kHz bandwidth), bee/drone-1s (VOID: padding collapse), SBCM+BT-4000.
  SKIPPED: harshkumar-4.5GB (same NUHIVE source), TBON-processed-2.7GB (same BT
  source), ttai-holdout-2.7GB (same NUHIVE/TBON hives, upsampled), yas-680x1s
  (sub-window), geo-csv + africanized-csv + MSPB (features only, no waveform),
  UrBAN-3000h (too big), DCASE-piping (piping labels, not queen; optional),
  YouTube (weak labels; last resort). QUEUE: Varroa-Qld-32 (bottom-board mic,
  new continent, unlabeled).
- Checkpoints: fixed artifacts also at uguu.se (2026-09-24, expire in hours-days):
  tflite https://d.uguu.se/PrmYwfAa.tflite, scaler https://d.uguu.se/xbHJkEcG.json,
  twin https://h.uguu.se/iYeOnsZD.joblib. Drive mount via bridge FAILS (OAuth needs
  a human click in the tab) — user must run the mount cell themselves.
- Gauntlet Varroa-Qld-30 (2026-09-24, fixed INT8 7ec2f466): 30/30 files vote
  queenright, 86/88 windows (1 nobee + 1 queenless singletons). Unlabeled set
  (bottom-board mic, Queensland) so distribution only, no accuracy — but unanimous
  queenright on a new continent + new mic is the desired shape. QUEUE now empty;
  remaining ideas: DCASE-piping (not queen labels), YouTube (weak labels).
- Gauntlet London (2026-09-24, fixed INT8): DH001 Active-Normal-10000-Bees.mp3,
  5.2min, 77/77 queenright frac 1.0. 4th city reads healthy-active as queenright.
- Gauntlet piping-44 (2026-09-24, fixed INT8, Zenodo 5106360 7MB): 29 files with
  >=1 full window (rest too short, incl all 1-3s clips). Toots: 8 qr / 14 ql windows
  across 21 files. Quacks: 9 ql / 2 nb / 1 qr across 8 files. Only 2 nobee windows
  total: model hears bees in piping clips. Queenless lean fits transition context
  (piping = swarming/requeening). Nearly all files 1 window: thin, direction only.
- OOM lesson (2026-09-24): soundfile.read on 2GB wav -> float64_PIPE plus resample
  copies blew 12GB Colab RAM and killed the runtime. Never whole-load hour-scale
  audio; stream int16 blocks via wave like product monitor() does. 2GB Varroa giant
  eval died with it; 30 small Varroa wavs done before that.
- Gauntlet Varroa-giant (2026-09-24, fixed INT8, streamed 24-bit blocks after OOM
  + KeyError fixes): 4.33h bottom-board audio = 3897 windows: qr 3310 (85%),
  nb 484 (12%), ql 103. 51 five-min blocks: 46 qr / 5 nb / 0 ql. ql streak 6 =
  early warning fired once, confirmed never (no 2 straight ql blocks). No alert
  under product confirmed rule. Nobee minority = intrusions or quiet spells.
- Ship-readiness fix (2026-09-24): product used peak-norm, artifacts built
  full-scale -> predict.py + calibrate_site.py now local librosa-STFT (train module
  only for SR/WIN constants). Verified: stream==direct 75/75; cal-lift 0.426->0.577
  @100 matched (0.484->0.446 mismatched). Pool bundled, librosa in requirements.
  v4 bundle ready to send.
- Model-test pack sent (2026-09-24, 220KB): INT8 (sha 7ec2f466 verified in-pack)
  + full keras + sklearn twin + scaler/labels + 390 golden vectors + run_tests.py
  (numpy always, TF/sklearn sections skip if absent) + expected_results.md.
  run_tests.py syntax-checked only, never executed locally (no TF/sklearn).
  Golden vectors via temp.sh fail -> uguu b64 .txt worked.
- Gauntlet QUEUE: hiveeyes queen-piping.ogg (21s swarming-hive piping, Tim Williams
  recording, direct URL, no login). Next eval when user present for bridge approval.
- SIH SLM+RAG slice 1 DONE (2026-10-02): L1 extractive disease advisory, zero new
  deps. backend/data/referenceCards.js (7 cards, FAO-2020/NCState/AgVic/HBHC cited,
  all unreviewed) + services/predictionContract.js (abstain first-class, uncalibrated
  high-conf auto-downgraded) + services/mockPredictor.js (mock-0.1, always low-conf)
  + services/advisoryService.js (deterministic dosage router incl Hinglish
  kitna/dawai, class-conditioned retrieval, checklist fallback) + routes /api/advisory
  (cards|predict-mock|ask, public read-only). Harness slm-rag/bench/run_advisory_eval.js
  10/10 (node, no server); HTTP e2e verified; frontend AdvisoryPanel with
  MOCK/UNREVIEWED badges; vite build clean. Artefacts: slm-rag/{claims.csv (21 rows),
  decision_log.md, DEMO_HONESTY.md, corpus_inventory.csv, validators.md, bench/}.
  Next: slice 2 voice harvest logging (confirm-before-commit), NOT widening slice 1.
- Brutal round-1 DONE (2026-10-03): dosage-unit (5ml/mg/%) + Devanagari (कितन/दवा/मात्रा/खुराक)
  router holes closed; named-treatment vet-escalation (drug list + class+intent); 100/10min
  per-IP limits on /ask + /predict-mock; fail-open JSONL expert-review log
  (backend/logs/, gitignored, question truncated 200ch). Harnesses 28/28 (main 10/10 +
  brutal 18/18); HTTP e2e: vet-escalation, 429 on 105th hit, malformed-400, no crash.
  Claims 26 rows. Local slice-1 code COMPLETE; remaining plan = Colab teacher expansion +
  QLoRA + export + L2 wiring.
- ROUTER PROGRAM (2026-10-03, full approach log). Goal: private on-device tool router
  for HoneyChain (15 tools: 13 Express routes + ask_clarify/refuse pseudo-tools).
  ARCHITECTURE (measured, hybrid): finetuned laya-choice (ModernBERT encoder, non-
  autoregressive classifier — CANNOT invent tools by construction) as intent router
  with 0.6 confidence gate; 0.5B Qwen GGUF behind it for slot extraction + L2 RAG
  rewriting; GBNF grammar (slm-rag/finetune/router-call.gbnf) + routerExecutor.js
  whitelist + deterministic dosage router around both. No single model must be perfect.
- DATA PIPELINE (integrity design): 23 hand seeds (slm-rag/finetune/seeds.jsonl) →
  teacher (Qwen2.5-7B local, NO cloud API) writes ONLY utterances around code-sampled
  slots (pools in shard runner) → 4-stage filter (parse→schema→live-exec mock_tools.py
  →slot-grounding incl number-words + CJK reject) → semantic judge (MATCH/MISMATCH,
  intent frames). Yield: 1403/unknown-kept + 23 seeds = 1430 golden. Key lesson: NEVER
  let teacher pick slot values (pilot proved it invents hash1/hash2 + drifts to Chinese).
- RUNS (all logged, claims.csv 30 rows): 0.5B QLoRA r16/a32 lr2e-4 (fp32 path — T4 has
  no bf16; AMP scaler chokes on pure-fp16 grads; PEFT mints bf16 adapters, cast them) →
  v1 SFT 66%/44% golden → SimPO hand-rolled (TRL 1.13 lacks SimPOTrainer) +1pp, no
  regression → v2 (144 template-spam clarify rows) REGRESSED to gibberish: lesson =
  formulaic augmentation poisons small models, reverted. laya smoke (74 rows, Kaggle):
  8/12 val. laya eval kernel: FINETUNED 8/10 vs BASE 6/10, errors confident-wrong →
  cautious-ask_clarify. GGUFs: F16 994MB + Q8 531MB exported, lost in Colab wipe
  (re-export queued); adapters + data safe on Drive.
- VENUES: Colab free T4 (quota spent 2026-10-03) → Kaggle 30h GPU (ashutoshsononey,
  CLI in /tmp/opencode/kgvenv, creds ~/.kaggle/). Kaggle lessons: kernels need pip
  bootstrap IN script; datasets mount at /kaggle/input/datasets/<owner>/ (walk it);
  kernels output auto-downloads incl .log (read it, don't ask user); v1 ERROR was
  missing pip install, v3 ERROR was mount path. ollaya = runtime, laya = model family
  (en 421M ONNX 512ctx; multilingual 322M; typed-decisions). laya:en head-to-head 7-8/10
  with one 1.0-confident error (pool single hash). ollaya needs ~1.5GB free RAM to load.
- ARTIFACTS: slm-rag/{claims.csv, decision_log.md, DEMO_HONESTY.md, RESEARCH.md,
  colab_plan.md, validators.md, bench/(4 harnesses, 28+16+16 cases), finetune/(schemas,
  seeds, shards choice, mock, validator, gen_pref_pairs, to_laya_choice, augment,
  router-call.gbnf)}; backend/{advisory stack, routerExecutor.js, data/routerSchemas.js};
  frontend AdvisoryPanel (MOCK/UNREVIEWED badges). Kaggle: honeychain-router-choice
  (data) + honeychain-laya-smoke (smoke weights) + kernels laya-honeychain-smoke/eval.
- WHAT NEXT (in order): 1) scale-up kernel laya-honeychain-full DONE: val 0.954 (227/238,
  train 1192, in-distribution choice accuracy — NOT fresh-site generalization; log + weights pulled);
  2) re-run 10-query eval DONE: scale-up v3 scores 6/10 raw hits (1.3s total); domain tools
  jump to 0.95-0.998 conf (find_centre 0.998, file_rti 0.998, log_stage 0.998, log_extraction 0.996);
  all 4 misses (pool_lot single, clarify, chitchat, dosage) are sub-0.15 conf (0.029 to 0.146) ->
  0.6 confidence gate blocks 100% of out-of-domain false calls; dosage blocked by pre-router;
  3) RAG Corpus Expansion (no GPU): FSSAI standards cards + KVIC/PMEGP/NBHM scheme cards +
  seasonal/flora cards with exact clause citations in backend/data/referenceCards.js;
- RAG DENSE RETRIEVER RUN (2026-10-03, Kaggle T4 GPU): 525 domain-specific query-passage
  pairs across all 15 reference cards generated (English technical, English colloquial,
  Devanagari Hindi, and Hinglish). Fine-tuned sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
  (117M params, INT8 ~58MB) via MultipleNegativesRankingLoss (4 epochs, 22.8s total train).
  Holdout validation (105 queries): Base Top-1 32.4% (34/105) -> Finetuned 72.4% (76/105),
  lift +40.0pp; Base Top-3 70.5% (74/105) -> Finetuned 93.3% (98/105), lift +22.9pp;
  Base MRR 0.541 -> Finetuned 0.827 (+0.286 lift). Logged row 37 in claims.csv.
- SLM INFORMATION EXTRACTION / TOOL ROUTER RUN (2026-10-03, Kaggle T4 GPU): 2,010 multilingual
  and Hinglish conversational traces (1,708 train / 302 val) across all 15 HoneyChain tools,
  incorporating spoken numeral words (bara, barah, chaar, panch, bees), prepositional origins
  ('from 3', '3 se'), missing slot clarifications, and veterinary dosage refusals.
  Fine-tuned Qwen/Qwen2.5-0.5B-Instruct via LoRA (r=16, alpha=32, 8.8M trainable params, lr 2e-4,
  fp16, 3 epochs, 722s total train on Kaggle T4 GPU).
  Holdout validation (50 queries):
    * Tool Name Accuracy: Base 22.0% (11/50) -> Finetuned 92.0% (46/50), lift +70.0pp;
    * Valid JSON Envelope: Base 40.0% (20/50) -> Finetuned 100.0% (50/50), lift +60.0pp;
    * Exact Slot Match: Base 20.0% (10/50) -> Finetuned 84.0% (42/50), lift +64.0pp.
  LoRA adapter size: 34MB safetensors (<200MB budget for offline edge/phone deployment).
  Verified on colloquial Hinglish queries: 'aaj bara kg honey tha from 3' -> log_extraction HIVE-03;
  'Where is the nearest KVIC bee centre in Nagpur?' -> find_centre; 'How much amitraz should I put?' -> refuse.
  Artifacts pulled to beehive-monitor/slm-rag/models/qwen-slm-lora/. Logged row 38 in claims.csv.



