Source of the interactive HTML on the Notion page "Quantization and Precision" (child of Topic: llm-training-and-post-training). Storage key `quant-tab`.

Build: `sh build.sh` writes `../index.html` from `parts/` (01_head, 10_header, 20_read*.html, 3x_tab_*.html, every *.js in its own script, 99_js_tabs.js last).

## Tabs and parts (rebuilt 2026-10-23 to the teaching contract)
| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read.html` (styles, the idea in one sentence, hero, you need, new terms, in one screen, section 1 formats with the bit explorer), `20_read_b.html` (2 sharing a scale, 3 PTQ: GPTQ and AWQ), `20_read_c.html` (4 outliers: migration and rotation), `20_read_d.html` (5 QAT and ternary, 6 training in low precision, 7 serving and names, mistakes); JS: `21_js_qdata.js` (generated data), `21_js_rd_common.js` (the skill template, never autoplays), `22_js_qcore.js` (quantisers, `window.QF`), `22_js_qviz.js` (pure computations of the new visuals, `window.QV`), `23_js_rd_formats.js`, `23_js_rd_hero.js`, `24_js_rd_block.js`, `25_js_rd_layer.js`, `25_js_rd_migrate.js`, `26_js_rd_gptq.js`, `27_js_rd_rot.js`, `28_js_rd_train.js`, `29_js_rd_qat.js`, `31_js_bits.js` | sections 1 to 7 core; depth in closed `details.dp` blocks |
| Further reading `t-more` | `39_tab_more.html` | |

## Data pipeline and checks
Needs `uv`; downloads Qwen2.5-0.5B, about 1 GB, into the Hugging Face cache (not rerun on 2026-10-23):
- `uv run --with torch --with transformers --with numpy python probe_layers.py` (layer survey, used once to choose the layer)
- `uv run --with torch --with transformers --with numpy python quant_lab.py model.layers.8.self_attn.q_proj` (whole-layer results)
- `uv run --with torch --with transformers --with numpy python export_data.py` (writes parts/21_js_qdata.js)

Checks (all run on 2026-10-23, all pass):
- `uv run --with numpy python check_ref.py && node check_js.mjs`: JS quantisers against qformats.py (21,569 values, worst 5.6e-17).
- `../../../../../.venv/bin/python3 visuals_ref.py && node check_visuals.mjs`: the new visuals' JS (`22_js_qviz.js`) against numpy (53 values, worst 3.6e-15) and the eight prose numbers quoted from them.
- `python3 recompute.py | diff - recompute.txt`: every derived number (unchanged).
- `node src/check_page.mjs` (from the repo root): every control in 920 px light and 390 px dark with reduced motion, NaN/undefined scan, the three animations still on step 0 after scrolling into view, element screenshots into `../.shots/`.
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
240 units: core 161, depth 64, fat 12, owned 2 (TRACE and KV4-RL on `models_and_training/topic_rl/rl_for_llms`), volatile 1 (Unsloth Dynamic 3.0, `reference/tech_news/2026_08_24_tech_news`). 234 drafted by `ledger.py init`, 6 added by hand for script-rendered content (limits table, layer table, W8A8 bars, block counters, explorer presets, block calculator). Fat units carry a `note` (pointers to removed tabs, the old nav, a wind-up).

## Earlier history
`live.md` is the old Notion text, verbatim. Overlap fix (19 October 2026): GGUF types are owned by "Local and on-device inference" (3c65c17b0d0d81f7a144fe25d799e811, sections 3 and 4, Quant ladder tab) and the container by "Model formats" (section 4); float bit layouts and the measured loss-scaling mechanics by "Numerical computing for ML" (3f05c17b0d0d81d6af0be4a9a2edba8d, sections 2 to 4 and 11). Facts the owners lacked were moved there first; `mk_coverage.py` probes moved facts in the owner's built page.
2026-10-26 (final follow-up sweep): links to the merged Model formats page now point to Local and on-device inference section 3; its Further reading card removed and the Local card names the file formats.
