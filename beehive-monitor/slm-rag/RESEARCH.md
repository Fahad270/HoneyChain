# Consolidated research: 0.5B tool-router + RAG answerer (sanity-checked)

Method (2026-10-03): 4 parallel survey tracks → 2 independent sanity checkers
re-fetched every HF id/URL via API. Trust levels below reflect that process.
Corrections the checkers forced are marked [CORRECTED].

## 1. Training datasets (all HF ids re-verified live)

| Dataset | Size | License | Verdict |
|---|---|---|---|
| `Salesforce/xlam-function-calling-60k` | 60k single-turn, execution-verified (format+live exec+semantic), schema `{query, tools, answers}` | CC-BY-4.0, gated click-through | USE as primary general mix |
| `NousResearch/hermes-function-calling-v1` singleturn config (~1.8k) | `<tool_call>` JSON style, closest to Qwen router target | Apache-2.0 | USE (singleturn only) |
| `Team-ACE/ToolACE` (~11.3k exact) | multi-turn, `[Func(arg=..)]` syntax needs parser | Apache-2.0 | SAMPLE ~2-3k single-call-filtered |
| `glaiveai/glaive-function-calling-v2` (~113k) | legacy `<functioncall>` syntax, 2023, unverified quality | Apache-2.0 | SAMPLE ~5k clean single-call only |
| `Salesforce/APIGen-MT-5k` | 5k multi-turn | CC-BY-NC-4.0 — NON-COMMERCIAL, blocks prod routers | SKIP [CORRECTED: also, its "gated" copy is stale; currently ungated] |
| `Salesforce/xLAM-1b-fc-r` (model) | proof ~1B trains on xlam-60k alone (BFCL 78.94) | CC-BY-NC-4.0 at model layer [CORRECTED: model is NC even though its dataset is BY] | reference only, not a base |

## 2. Locked finetune recipe (0.5B QLoRA)

- Base (verified, Apache-2.0): `Qwen/Qwen2.5-0.5B-Instruct` via `unsloth/Qwen2.5-0.5B-Instruct-bnb-4bit`.
- r16 / alpha32 / all 7 linear targets / **lr 2e-4 cosine** / 3 epochs / completion-only loss / bf16.
  [CORRECTED: checker-2 found the 1e-5 LoRA figure uncited and likely undertrained — 2e-4 is the Unsloth-spec value. Pilot 500-step run must confirm.]
- Mix ratio declared up front: **domain:general ≤ 1:1**, plus ablation run without general mix (general data can drown 5-10k domain traces).
- 20 hand seeds → 5-10k teacher synthetics ONLY with 3-stage filter (JSON-parse +
  schema-conformance + live execution against a mock tool-backend built FIRST).
  Without the harness, Stage 1 distills hallucinations (APIGen lesson: 600-pt audit >95%).
- Free-T4 feasible (0.5B 4-bit ≈ 0.3-0.4GB weights, train total ~5-8GB < 15GB),
  but: checkpoint-every-N-steps + resume script + HF-hub pushes (idle-disconnect
  kills long runs), pinned env (Unsloth version, seed), export log for both quants.

## 3. Quantization + eval discipline

- Ship default **Q8_0** for ≤0.6B (file still ~0.5-0.7GB); A/B Q4_K_M on YOUR tools before downgrading.
  No published Q4-vs-Q8 tool-call delta exists at this scale — stated as a GAP, not a fact.
- Golden set **≥200 tool queries + held-out paraphrases, frozen before training**
  (n=20 has ±20pp noise; quant deltas are single-digit). Track name-match AND args-exact
  separately (names learn fast, args lag ~15pp per the one measured LoRA port — treat that number as untrusted until cited).
- Safety scored as a SYSTEM (deterministic router + model): confusion matrix on
  refuse-vs-answer, strict-match abstention; add abstain/negative training items
  (completion-only loss on positives alone teaches never-abstain; reasoning-distilled
  students abstain worse — do not use one).

## 4. Indic verdict (card-verified)

- `sarvamai/sarvam-1-v0.5`: base-only, **~2.5B params ("2B" naming correct, "3B" wrong [CORRECTED])**,
  custom non-commercial license — needs own SFT AND a license conversation. Not a v1 base.
- OpenHathi-7B/ Airavata-7B (llama2 license) and Krutrim-7B (custom license) are all too heavy
  for 8GB CPU realtime anyway. No verified Hindi/Hinglish tool-calling dataset exists on HF
  (negative result; log the search, don't overclaim it).
- v1: **English-first router + translation at the edges** (Devanagari normalize → EN in,
  fixed-glossary post-pass out). Tokenizer reality: Gemma-3 ≫ Qwen2.5 > SmolLM2 on Devanagari;
  revisit multilingual finetune only after logging ≥5k real Hinglish interactions.

## 5. RAG-side recipe (trust-graded)

- CONFIRMED direction: extractive literal-quote answers (Pleias arXiv:2504.18225),
  tiny index (MiniRAG arXiv:2501.06713), noise-contrastive preference tuning (ROSERAG —
  note spelling, ACL'25 Findings), abstention gates (FaithEval: small models weak on
  conflict; score strict-match abstention), retrieved-text-as-DATA boundary markers (BIPIA).
- UNTRUSTED until cited: MiniRAG 53.3→26.0, AbstentionBench −24%, LoRA-port 0.947/0.790.
  The five components have NOT been shown to compose on a 0.5B router — stack only with ablations.
- Our L1 (extractive passages + deterministic dosage router + checklist fallback) already
  implements the non-learned half of this recipe. The finetune adds ONLY constrained
  rewriting/translation, validated in code.

## 6. Open gaps (do not present as facts)

Q4-vs-Q8 tool-call delta at ≤0.6B; MiniRAG/AbstentionBench exact numbers; LoRA-port
exact-match gap replication; Hindi tool-call data (build own 2-5k via IndicTrans2 + spot-check).
