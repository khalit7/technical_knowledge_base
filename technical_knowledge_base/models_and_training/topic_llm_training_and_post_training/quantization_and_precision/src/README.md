Source of the interactive HTML on the Notion page "Quantization and Precision" (child of Topic: llm-training-and-post-training). Storage key `quant-tab`.

Build: `sh build.sh` writes `../index.html` from `parts/` (01_head, 02_split, 10_header, 20_read*.html, 3x_tab_*.html, every *.js in its own script, 99_js_tabs.js last).

## Tabs and parts (rebuilt 2026-10-23 to the teaching contract)
| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read.html` (styles, the idea in one sentence and the hero in a split, in one screen, section 1 formats in two splits), `20_read_b.html` (2 sharing a scale with the Fig. 2 stage, 3 PTQ with the Fig. 4 GPTQ stage), `20_read_c.html` (4 outliers: the Fig. 6 stage, the migration explorer, the whole-layer W8A8 chart, the rotation widget), `20_read_d.html` (5 QAT, ternary, 6 training with the Fig. 10 stage, 7 serving and names, mistakes); JS: `21_js_qdata.js` (generated data), `21_js_rd_common.js` (template), `22_js_qcore.js` (quantisers, `window.QF`), `22_js_qviz.js` (pure computations behind the visuals, `window.QV`: hero, rot, gptq, scope, mig), `23_js_rd_formats.js`, `23_js_rd_hero.js`, `25_js_rd_layer.js`, `25_js_rd_migrate.js` (the migration explorer, a widget), `27_js_rd_rot.js`, `29_js_rd_qat.js`, `30_js_s3.js` (renderer v2, the template `25_js_s3.js` unchanged, renamed so it loads before the scenes), scenes `32_js_sc_scale.js`, `33_js_sc_gptq.js`, `34_js_sc_out.js`, `35_js_sc_tr.js`, `31_js_bits.js` | sections 1 to 7 core; depth in closed `details.dp` blocks |
| Further reading `t-more` | `39_tab_more.html` | |

## Data pipeline and checks
Needs `uv`; downloads Qwen2.5-0.5B, about 1 GB, into the Hugging Face cache (not rerun on 2026-10-23):
- `uv run --with torch --with transformers --with numpy python probe_layers.py` (layer survey, used once to choose the layer)
- `uv run --with torch --with transformers --with numpy python quant_lab.py model.layers.8.self_attn.q_proj` (whole-layer results)
- `uv run --with torch --with transformers --with numpy python export_data.py` (writes parts/21_js_qdata.js)

Checks (all rerun on 2026-11-10, all pass):
- `uv run --with numpy python check_ref.py && node check_js.mjs`: JS quantisers against qformats.py (21,569 values, worst 5.6e-17).
- `../../../../../.venv/bin/python3 visuals_ref.py && node check_visuals.mjs`: the visuals' JS (`22_js_qviz.js`) against numpy (98 values since 2026-11-10, worst 1.2e-15: the hero, the rotation, GPTQ, Fig. 2's five scopes on four rows and the migration on the slice) and eight prose numbers quoted from them.
- `python3 recompute.py | diff - recompute.txt`: every derived number (unchanged).
- `node src/check_page.mjs [shots dir]` (from the repo root): every control in 920 px light and 390 px dark with reduced motion, every stage step through its list, the migration explorer, the recipes, NaN/undefined scan, element screenshots.
- `node src/check_stages.mjs [shots dir]` (from the repo root, about 3 minutes; added 2026-11-10): the four stages play once in view at 1400 and 920 px light and 390 px dark, stop redrawing off screen, never move under reduced motion, step to their last step with one list item per step; scene labels neither overlap nor touch the card edge nor point outside it at 1400 px, on every step and mid-tween; splits two columns at 1400 px only; the step lists' static numbers equal what the scenes compute; a few numbers recomputed independently; the heaviest scene's frame time (about 4.5 ms).
- `python3 mk_coverage.py`: coverage.json against live.md (112 entries, 0 missing; probes updated for the new wording).
- `python3 html_utils/ledger.py check <page>` (from the repo root): problems 0.

## The 2026-10-23 rebuild: what changed and why
- **Top**: the core idea in one sentence (a low-precision number is a code times a shared scale; the loss depends on how many share it and whether an outlier sets it) and a new static hero on real weights: an ordinary block of Qwen2.5-0.5B's layer 8 q_proj in INT4 with the per-tensor scale (all 32 weights stored as 0, the step 8.5 times the block's largest weight) against its own scale (2 zeros, 10.1%). Then you need, new terms, and the old "At a glance" table as "In one screen".
- **Tabs folded into Reading.** The Bit explorer moved into section 1 beside the formats it explains (its limits table into a closed block, its block calculator into a closed block in section 2). The One real layer tab was split by claim: error against bits beside the scope claim (section 2, with a phone layout as sorted bars), a new weight-error against output-error chart beside GPTQ and AWQ (section 3), the W8A8 bars and SmoothQuant's α curve beside the SmoothQuant claim (section 4), the table and AWQ's α curve closed.
- **Mechanisms that had no visual got one** (computed in `22_js_qviz.js`, checked against `visuals_ref.py`):
  - GPTQ: a stepper of the paper's Algorithm 1 on one illustrative row of four weights (labelled illustrative): w2 rounds to −0.75 instead of −1.00 after column 1's error is pushed into it; output error 8.5% against 32.9% for round-to-nearest, weight error 13.0% against 12.4%. Illustrative because the shipped slice has 16 evaluation tokens only, and a Hessian from them would be in-sample.
  - Rotation: one real token before and after a 64 × 64 Hadamard rotation of the outlier slice (toggle-compare, token slider): largest over median channel peak 15.4 to 2.0, 4-bit per-token activation error 30.4% to 13.8%, product unchanged to 1e-15.
  - QAT: a static diagram of fake quantisation and the straight-through gradient.
  - Mixed precision, FP8 and NVFP4 training (now owned here per OWNERS.md): one linear layer's three matmuls with the format of each input under five recipes (fp16 mixed, bf16 mixed, Transformer Engine FP8, DeepSeek-V3 fine-grained FP8, NVFP4), each with its sourced caption.
- **Order**: formats, sharing a scale, PTQ, outliers, QAT and ternary, training, serving and names (mixed precision moved after the scaling sections because FP8 and NVFP4 training reuse per-tensor, per-block scales and Hadamard rotations).
- **Formats table** now lists fp32, tf32, bf16 and fp16 too (this page owns the formats ML uses; how bits encode a value stays linked to Numerical computing for ML, sections 2 to 4).
- **Closed (depth)**: format limits, the block calculator, the layer table and method notes, SmoothQuant's per-model α and speedup claim, rotation results, AWQ's α, QAT practice and the published-cost table, Bonsai's numbers and the BITCOS packing arithmetic, low-precision RL and STEPQuant, the names table outside GGUF, the dual 5090s note, two mistakes.
- **Mistakes**: "bf16 is more precise", "4-bit means 4 bits", "lower weight error is better", "integers beat floats" and "convert to MXFP4" were restated by the core and are now core sentences beside their visuals; "uploader's perplexity" and "quantise from the original" stay as closed items.
- **Stale pointer fixed**: the memory calculator is PEFT's (section "Memory: full fine-tuning, LoRA and QLoRA"), not the root's Machinery section; the "you need" line, the PEFT and root cards in Further reading say so.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `quant-tab`); the block and migration animations no longer start on a mode press.
- **Moved elsewhere**: TRACE, TRIAGE and KV4-RL details now live only on RL for LLMs (one pointer sentence kept); Unsloth Dynamic 3.0's details are a dated product fact (tech news 2026-08-24 carries the release; the docs stay in Further reading).

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 24.2 min (5,561 words) | 25.1 min (5,779) |
| Reading, closed details | 1.1 min (252) | 10.1 min (2,329) |
| Other tabs, core | Bit explorer 2.8 + One real layer 2.7 = 5.5 min | none |
| Core total, excluding Further reading | 29.7 min | 25.1 min |
| Visuals drawn in Reading | 3 | 12 |

Why 25 minutes is right: the page owns seven things (formats, scaling granularity, PTQ with GPTQ and AWQ, outliers with migration and rotation, QAT, mixed-precision, FP8 and 4-bit training, the serving stack and its names), each with its picture inline and its numbers. The core grew by one minute only although it absorbed the two tabs (5.5 minutes) and five new visuals: provenance, per-model tables, published-result tables, RL and recurrent-state news and the names table moved to closed blocks (closed time 1 to 10 minutes). About 640 of the core words (2.8 minutes) are script-written output: the bit explorer's rows, the animations' captions, counters and controls, and the chart labels, read while using them (counted on 2026-10-23).

## Knowledge ledger (`ledger.json`)
240 units: core 161, depth 64, fat 12, owned 2 (TRACE and KV4-RL on `models_and_training/topic_rl/rl_for_llms`), volatile 1 (Unsloth Dynamic 3.0, `whats_new/tech_news/2026_08_24_tech_news`). 234 drafted by `ledger.py init`, 6 added by hand for script-rendered content (limits table, layer table, W8A8 bars, block counters, explorer presets, block calculator). Fat units carry a `note` (pointers to removed tabs, the old nav, a wind-up).

## Earlier history
`live.md` is the old Notion text, verbatim. Overlap fix (19 October 2026): GGUF types are owned by "Local and on-device inference" (3c65c17b0d0d81f7a144fe25d799e811, sections 3 and 4, Quant ladder tab) and the container by "Model formats" (section 4); float bit layouts and the measured loss-scaling mechanics by "Numerical computing for ML" (3f05c17b0d0d81d6af0be4a9a2edba8d, sections 2 to 4 and 11). Facts the owners lacked were moved there first; `mk_coverage.py` probes moved facts in the owner's built page.
2026-10-26 (final follow-up sweep): links to the merged Model formats page now point to Local and on-device inference section 3; its Further reading card removed and the Local card names the file formats.

2026-10-26 (final follow-up sweep, second batch): the FP8 accumulation note links Numerical computing section 5 (why long sums in a narrow accumulator drift).

## 2026-11-10: the split layout and four 3D stages (renderer v2)
The 2026-11-06 rollout (briefs `rebuild-page.md` and `layout-rollout.md`). Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js` (as `30_js_s3.js`), `21_js_rd_common.js`, `99_js_tabs.js` (key `quant-tab`). `build.sh` writes the em-dash test as `ED=$(printf ...)`.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | Top (idea, you need, terms) | split | Fig. 1 hero, 2D static | no |
| Reading | In one screen | full width | table | no |
| Reading | 1 Formats | two splits, then the table full width | range bars 2D; bit explorer (tool) | no |
| Reading | 2 Sharing a scale | split | **3D** `stg-sc` (Fig. 2) | yes, 6 |
| Reading | 2 (whole layer) | split | Fig. 3 error against bits, 2D | no |
| Reading | 3 PTQ, GPTQ | split | **3D** `stg-gq` (Fig. 4) | yes, 5 |
| Reading | 3 AWQ | split | Fig. 5 weight against output error, 2D bars | no |
| Reading | 3 below 4 bits | full width | none | no |
| Reading | 4 Outliers, migration | split | **3D** `stg-out` (Fig. 6) | yes, 6 |
| Reading | 4 migration explorer | split | 2D widget (method, α) | no (widget) |
| Reading | 4 whole layer W8A8 | split | Fig. 7 bars and α curve, 2D | no |
| Reading | 4 Rotation | split | Fig. 8 one token before and after, 2D toggle | no |
| Reading | 5 QAT | split | Fig. 9 fake quantisation and STE, 2D static | no |
| Reading | 5 ternary | full width | none | no |
| Reading | 6 Training | split | **3D** `stg-tr` (Fig. 10), recipe buttons | yes, 4 |
| Reading | 6 rest, 7 Serving, mistakes | full width | none | no |
| Further reading | | unchanged | | |

**Stages and their data.** `stg-sc`: `QV.scope()`, rows 223, 222, 448 and 0, input columns 0 to 63, quantised by `QF.qgroup` (the port of `qformats.py`) per tensor, per row, per 32 (INT4), MXFP4 and NVFP4; `visuals_ref.py` recomputes every row error and zero count in numpy. `stg-gq`: `QV.gptq()` (the illustrative row, unchanged) and H = 2XᵀX of its six inputs. `stg-out`: `QV.mig('w8' | 'sq', 0.75)` and `QV.rot()` on the shipped slice (16 tokens x 64 channels, 8 output rows); α = 0.75 is the best α on the whole layer (`quant_lab.py`'s curve); `visuals_ref.py` recomputes the migration. `stg-tr`: the five recipes of the old chip table, each sourced in its caption; the grid cell counts on the plates are illustrative (said in step 1). The scenes write their numbers into the step lists (spans `data-sc`, `data-gq`, `data-out`); the static HTML carries the same numbers and `check_stages.mjs` fails if they differ. Labels stay hidden while the camera glides to another view and fade in after, so none points at a place it has left.

**Removed**: `24_js_rd_block.js` (the 2D five-scope animation with row and block selectors: the stage shows all four rows and two blocks at once), `26_js_rd_gptq.js` (the 2D stepper), `28_js_rd_train.js` (the 2D chip table); the migration animation became a widget (no steps, no autoplay: the stage teaches the mechanism, the widget explores α and AWQ), its computation moved into `QV.mig` so the stage and the widget share it and numpy checks it.

**Kept 2D**: the hero (two strips to scale, a flat comparison the stage then elaborates), the range bars (log axis), the bit explorer (a tool), error against bits (log scatter), the weight-error bars, the migration explorer (heat maps), the W8A8 bars and α curve, the rotation close-up (one token's 4-bit levels, a toggle), the QAT diagram (a flow). No real image: the page is about number formats and methods, not a physical object; nothing a photo would show is missing.

**Length**: Reading core 6,285 words (27.3 min) before, 7,209 (31.3 min) after; closed 2,360 (10.3 min) unchanged; Further reading 670 unchanged. Visuals inline 12 before, 13 after (four of them now 3D stages). The growth is the four step lists (about 900 words): the old animations wrote their captions by script, invisible to the audit; they are now static text on the left, with no per-step caption repeating them, and the MXFP4 paragraph was shortened where step 5 now carries it. Why about 31 minutes is right: as before, the ledger is mostly core (172 core against 65 depth), the page owns formats, scaling granularity, PTQ, outliers, QAT and low-precision training, and each mechanism now has its picture with its steps spelled out.

**Ledger**: 252 units, core 172, depth 65, fat 12, owned 2, volatile 1, problems 0. Six units added by hand for the stages' step lists; nine re-keyed for the new wording (the block and migration animations' captions); 21 Further-reading keys that contained a quoted reading time re-keyed on the words.

**Checks fixed honestly**: `check_page.mjs` no longer asserts that nothing plays (stages autoplay since 2026-11-06; `check_stages.mjs` checks autoplay and reduced motion); `check_visuals.mjs` checks the GPTQ prose in its new wording and Fig. 2's per-tensor step; `mk_coverage.py`'s probe for the Model formats link was stale since the 2026-10-26 sweep (the card had been removed then) and now probes the sentence that replaced it.
