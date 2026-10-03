# TAINTED — DO NOT SHIP (run 4 v1, 2026-09-23)

BeeTogether never mounted in the kernel. All 3700 windows are SBCM audio:
"bt" windows (2164 queenright + 336 queenless) are SBCM clips relabeled by
path heuristic, and "sbcm" windows (1200) contain ZERO queenless.

Consequences:
- mlp_holdout 0.98 / tf_holdout 0.99: within-SBCM memorization.
- leave-sbcm-out 0.999: train and test are the SAME audio pool. Worthless.
- dense4_int8.tflite / mlp4.joblib: same-hive toys, not deployment models.

Kept only as a negative example. The valid rerun is kernels/run4 v2
(CSV/dir labels + fail-fast asserts) whose outputs land here on success.
