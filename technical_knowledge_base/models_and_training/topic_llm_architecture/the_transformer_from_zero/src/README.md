# How this page is built

`sh build.sh` runs `make_page_data.py` (recorded outputs to `parts/22_js_tz_0data.js` and `page_text.json`),
concatenates `parts/`, expands `{{text|link}}` macros, then `fill.py` resolves the `[[...]]` placeholders (facts, code
snippets with their real line numbers, step outputs, file:line references), and prints the Reading time.
Prefix `tz` (Reading `tz-`, ablation figures in Reading `tza-`, Shapes and counts `tzd-`); storage key `tz-tab`.
`fill.py` also renders `[[shapes:key]]` (each step's tensors from `zero/out/steps.json`, as static text) and the sampling and
ablation tables are static HTML from `make_page_data.py`, so the ledger and the checks can read them.

## Tabs and parts (2026-10-23)
| Tab | Parts |
|---|---|
| Reading `t-read` | `02_split.html` (skill template: the split layout), `20_read_a` (styles), `20_read_b` (nav, the idea in one screen: core sentence, Fig. 1, you need, new terms, the nine-step table closed; sections 1 to 4), `20_read_c` (5 to 7), `20_read_d` (8, 9), `20_read_e` (10, 11), `20_read_f` (closed depth: mistakes, interview), `20_read_z`; JS `21_js_rd_common.js` (skill template), `22_js_tz_0data.js` (TZD, written by script), `23_js_tz_read.js` (predicts, training snapshots, sampling explorer), `24_js_tz_figs.js` (FFN to scale, KV-cache before/after, block matrices to scale), `25_js_s3.js` (skill template, renderer v2), `25_js_tz_abl.js` (ablation curves, before/after on the running sequence, samples), `26_js_tz_scene.js` (TZS, written by `make_scene_data.py`), `40_js_sc0kit.js` (shared scene pieces) and the six stages `41_js_sc_hero.js` to `46_js_sc_out.js` |
| Shapes and counts `t-drill` | `33_tab_drill.html`, `33_js_tzd_drill.js` (`window.TZDR.count` checked against `accounting.py`) |
| Further reading `t-more` | `39_tab_more.html` |
`shot_el.mjs` screenshots single figures (`node <page>/src/shot_el.mjs 390 dark <dir> t-read '#tz-hero-card'`).

## The code that produced every number
- `zero/gpt_zero.py`: the model, written in nine marked steps. With default switches it is the root's tiny GPT
  baseline exactly (same modules in the same order: seed 0 gives identical initial weights; the root's trained
  checkpoint gives identical logits). Switches `pos`, `resid`, `norm`, `attn`, `ffn`, `n_head`, `swiglu` are the ablations.
- `zero/steps.py` (CPU): each step's test on the running sequence -> `zero/out/steps.json` (shapes, printed output, code).
- `zero/mistakes.py` (CPU): real error messages, silent bugs on the trained model, the unshifted-target run -> `out/mistakes.json`.
- `zero/accounting.py` (CPU): parameters by hand vs the code for every variant; FLOPs by hand vs FlopCounterMode;
  the formula on 9 real configs vs Hub safetensors counts and local safetensors headers -> `out/accounting.json`.
- `zero/code_refs.py <nanoGPT> <transformers>`: file:line of each quoted pattern (nanoGPT 3adf61e, transformers v5.20.1).
- `train/train_zero.py` (MPS): the root's `src/data/train.py` loop (imports its batches and held-out windows) with this
  file's model. `train/eval_zero.py`: the root's eval.py for this model (`--tiny` loads tiny_gpt checkpoints; it
  reproduces eval.py's numbers and samples exactly on ref_baseline_s1500).
- `train/curve.py` (CPU): unigram and bigram cross-entropy floors from counts, snapshots of the Inside lab's baseline
  retrain (`$LA_SCRATCH/runs/in_snap`), sampling logits and samples -> `train/out/{curve,sampling}.json`.
- `train/collect_runs.py`: trimmed logs and evaluations of `tz_*` runs and four reference runs -> `train/out/runs/`.
- Checks: `check_data.py` (page data equals the recorded files, every step output and shape is on the page, prose numbers,
  the Shapes tab's JS equals accounting.py), `check_controls.mjs` (every control at 390 px dark and 920 px light; every
  animation scrolled into view with and without reduced motion stays paused on step 0).

## Runs (Apple M1 Pro, MPS, under the bench lock, one per hold; about 5 min each)
```
export LA_SCRATCH=<scratch>/la PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 OMP_NUM_THREADS=4
python train/train_zero.py --name tz_base
python train/train_zero.py --name tz_noresid --set resid=False      # also --lr 1e-3 as tz_noresid_lr1e-3
python train/train_zero.py --name tz_nonorm --set norm=False        # also --lr 1e-3 as tz_nonorm_lr1e-3
python train/train_zero.py --name tz_nopos --set pos=False
python train/train_zero.py --name tz_1head --set n_head=1           # and --seed 1 as tz_1head_s1
python train/train_zero.py --name tz_noffn --set ffn=False
python train/train_zero.py --name tz_noattn --set attn=False
python train/eval_zero.py <name> --device mps; python train/collect_runs.py
```
Then on CPU: `zero/steps.py`, `zero/mistakes.py`, `zero/accounting.py`, `train/curve.py`; `sh build.sh`; `python3 check_data.py`.

## The 2026-10-23 rebuild: what changed and why
Rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`); editing only, no new runs.
- **Top**: the core idea in one sentence; a hero (the whole tiny GPT as a static annotated SVG: every box with its shape and
  parameters, the residual stream through the block, and an orange tag per piece with the held-out loss when it is removed;
  each box links to its section); "You need"; eight new terms. The nine-step table and step 1's config code are a closed
  reference block.
- **Every mechanism has its visual inline**, chosen by kind: embedding (static, two lookups and a sum, measured labels);
  one head (a five-frame stepper: score, mask, softmax, mix, the edit test); the scale (static bars of measured largest
  weights); many heads (static shape diagram: split, transpose, scores, merge); FFN (toggle-compare to scale: GELU, SwiGLU
  at 8/3 D, Llama 3.1 8B at 3.5 D); block (static pre-norm diagram with the init numbers); loss (the shift drawn on the
  running sequence); training (the existing snapshot animation); sampling (new before/after stepper, recompute against a
  KV cache on the same 10 tokens, derived FLOPs; plus the existing temperature explorer); counting (toggle, one block's
  matrices to scale, tiny GPT against Llama 3.1 8B, which is the predict's answer drawn); ablations (the Ablation explorer's
  curves and before/after token map moved here).
- **Tabs**: Build it up removed (each step's code, shapes and test output now sit in its section: shapes as one static line,
  code and output in a closed block); Ablation explorer folded into section 11 (samples per prompt and the greedy column in
  a closed block); Shape drill (a quiz, which the contract retires) rebuilt as **Shapes and counts**, a tool used across the
  page: every stored weight of one layer with the checkpoint's shape, every activation, totals against the Hub, KV bytes and
  FLOPs per token, for ten configs, one variable (the model) plus the context length.
- **Depth**: all mistakes and the interview questions are in two flat closed blocks (nested summaries would count as core).
- **Never autoplays**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `tz-tab`); the
  check scrolls every animation into view with and without reduced motion and finds all paused on step 0.
- **Deleted as fat** (13 ledger units, each with a note): old header and tab bar, lead-in headings, pointers to the
  removed tabs, the drill's quiz mechanics and distractor list (the same mistakes are in the Mistakes block), a root
  logging-interval aside.

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 9,416 words, 41 min | 7,453 words, 32 min |
| Reading, closed details | 1,081 words, 5 min | 5,109 words, 22 min |
| Other tabs, core | Build 2.0 + Ablation 3.7 + Drill 1.8 + Further 3.0 = 10.5 min | Shapes and counts 3.3 + Further 2.9 = 6.2 min |
| Visuals drawn inline in Reading | 1 (plus the sampler) | 11 (audit count), 13 figures in all |

Why 32 minutes is right: the page owns the whole decoder (OWNERS.md), so it carries nine mechanisms, training, sampling,
counting and six ablations, each with its numbers, picture and test; the ledger is two thirds core (257 of 385). About a
seventh of the audited core is script-written figure text (two 255-token loss maps, step captions, counters), which is read
as a figure, not as prose. What made the old page long without teaching more (22 code listings and their outputs, the
nine-step table, six sample continuations, the greedy column, mistakes and interview) is closed and one click away; the
closed time grew to 22 minutes because of that code. Cutting further would mean dropping a mechanism's definition or its
evidence; the definitions of attention terms were kept because this page is their owner, but shortened.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
385 units: core 257, depth 115, fat 13, owned 0, volatile 0. 380 drafted by `ledger.py init` from the page before the
rebuild; 5 added by hand for script-written text of the retired tabs (the drill's explanations: Conv1D, fused kernels and
the scores matrix, chunked loss on the logits, the GQA k_proj mistake; the Build tab's causal-test caption), now written
as static text. Keys were found by script (the rarest number of the unit present on the page, else a phrase of four to six
words), then the weak ones (common numbers such as 256 or 2026) replaced by hand with distinctive phrases.

## Departures from the page-kind shape
- No Python/JS live model: each section shows the real file's code and real outputs (closed) instead (the AIAYN paper page
  already runs a toy transformer in the browser).
- Illustrative colours in two figures (the embedding vectors, the one-head grid's cells) carry structure only; both say so,
  and every number on them is measured.
- The root Block lab's walkthrough, FLOPs calculator and pre/post-norm runs are linked, not rebuilt; this page's
  baseline numbers are reproduced against them (2.2757 here, 2.2776 and 2.2811 there).

## 2026-11-10: split layout, six 3D stages on the trained model's own trace (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html`, `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `05z_errbox.js.html`, `99_js_tabs.js` (key `tz-tab`). `build.sh` adds `02_split.html` after the head; `make_page_data.py` now also writes `26_js_tz_scene.js` (TZS) through `make_scene_data.py` and the facts the step lists quote.
- **Data for the stages**: the root's `src/block/out/trace_ref_baseline_s1500.json` (root `trace.py`, CPU): the running sequence's token "o" at position 157 through every block of the trained checkpoint (which `gpt_zero.py` loads with identical logits), every intermediate vector, all 8 heads' scaled scores and weights in each layer, the final norm and the top 10 probabilities. Nothing new was run. Read-only use of a root file; no root file was changed.
- **Six stages** (`40_js_sc0kit.js` plus one file each), each with an `ol.sx` step list and no per-step caption:
  - Fig. 1 `stg-hero` (6): ids, the two tables, six blocks on one residual ribbon with the median stream norm 1.3 to 65.5, the tied table drawn again with an arc, p("x") and the loss, then every ablation's held-out loss at its piece. Replaces the static hero SVG (its section links are in the step list).
  - Fig. 2 `stg-emb` (5): row 79 and row 157 lifted out of the two tables as real signed bars, their sum, every "o" of the sequence reading the same row. Replaces the illustrative two-lookups SVG.
  - Fig. 3 `stg-att` (6): layer 1, head 4: LN(x) through Wq, Wk, Wv (256, 32) into q, k, v; the (T, T) score matrix on the floor with its causal triangle and row 157 as real columns: scores, mask, softmax (79% on the six earlier "x"), the weighted sum, the edit test. Replaces the structure-only 5-frame stepper (its captions are in the steps).
  - Fig. 4 `stg-heads` (5): one W_q for 8 heads, view, transpose into 8 lanes each with its real weights over 158 keys (height the square root of the weight), outputs, merge and W_o. Replaces the static split/merge SVG.
  - Fig. 5 `stg-blk` (6): "o" through block 1, every vector with its norm (1.33, 10.4, 1.83, 2.33, 15.6, 1,024 hidden, 53.0, 53.3), then six blocks. Replaces the static block SVG.
  - Fig. 6 `stg-out` (5): the shift, the last vector through the final norm, the tied table, softmax (75.85% on "x"), -ln p. Replaces the shifted-targets SVG (its caption is step 1).
- **2D kept, now in splits**: scale bars (3), FFN to scale (5), training snapshots (now 7 of the 12 snapshots, one step each, `sx-trn`; the three-phases paragraph became the list), KV cache before/after (now 5 of the 11 steps with a list per mode, `sx-kv0`, `sx-kv1`; its per-step caption removed), the sampler widget (9), one block's matrices to scale (10, with the Llama predict beside it), ablation curves and the before/after token map (11, `sx-abl`; its caption is now a numbers-only readout). Full width: section 1, the FLOPs part and real-config table of 10, the closed Depth block, Shapes and counts.
- **Correction**: the block prose said the traced token's norm grows from 1.3 to 65.5; 65.5 is the median token's, the traced "o" goes from 1.33 to 65.8 (both now stated).
- **Checks**: `check_stages.mjs` (new): stages play in view, step to the end with one list item per step, stop off screen, never move under reduced motion; the three 2D animations play in view and have one item per step in each mode; splits two columns at 1400 px only. `check_controls.mjs`: the never-autoplay assertion inverted. `check_data.py`: TZS equals a fresh `make_scene_data.py`; every number in the six stage lists and the training list against the data; the drill's script now goes to node on stdin (it is over Linux's 128 KB argument limit).
- **Ledger**: 385 units (core 257, depth 115, fat 13), problems 0; re-keyed units 154 and 158 (the snapshot animation's title and the phases sentence) and nine Further reading units whose key held a reading time (354, 366 to 371, 376, 377).
- **Length**: Reading core 7,455 to 9,165 words (32 to 40 min, `audit_pages.mjs`); closed details unchanged at 5,109 (22 min). The added words are the 40 step-list items and six figure notes that explain the stages step by step with the trained model's numbers (the scripted captions they replace were not counted); no section gained content otherwise. The length is right for the reason of 2026-10-23: the page owns the whole decoder, and every figure is now explained beside it.
