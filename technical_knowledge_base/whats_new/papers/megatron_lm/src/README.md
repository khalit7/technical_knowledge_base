# Megatron-LM: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d8133ae92fbe90a1f308e, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from the paper method (`.claude/skills/explainer-page/page-kinds/paper.md`) and the Attention Is All You Need reference folder.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card (verdict linked to the evidence section), then the core sentence, the hero (one layer on 2 GPUs, `12_js_hero.js`), You need and new terms; Problem (memory calculator, formula closed), Idea (Eq. 1 to 3; predict question with a live split of real matrices), f and g with the layer step-through inline (Megatron against Option 1, with a prediction prompt; counter formulas closed), attention by heads (Table 7 closed), embeddings and the fused loss (calculator), duplicate-not-send (RNG details closed), combining with data parallelism (GPU-group picker), setup (data, recipe and hardware closed), results: scaling (Figure 5 predict question; 76% against 74% box; strong scaling; the communication-only model closed), GPT-2 (Table 3; evaluation closed), BERT (LayerNorm-placement predict and animation), How much of this to believe (two main caveats open, five closed), Why it matters (current use in a dated closed block), Connections. |
| The paper's tables, rebuilt | `t-tables` | Table 1 with parameter recount and fewest-GPUs column, Table 2 with the throughput its epoch time implies, Figure 5 / Table 7 / Table 8, Table 3, Table 4 with BERT recount, Table 5 sortable with distance from the best other model, Table 6 in a details block. |
| Then and now | `t-then` | Parallel layouts from 2019 to 2026 (Megatron-LM, GPT-3, PTD-P, MT-NLG, sequence parallelism, Llama 3, DeepSeek-V3, serving) as a step animation explained by its step list, with what changed and what survived. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from the paper method, and why

- **Live ingredient is a simulation, not a trained toy model.** Megatron-LM is a systems paper: its mechanism is how a layer's matrices are split and which collectives that needs, not something a toy model learns. The method's "systems" row (a before/after of the same workload with counters from the paper's own cost model) fits; nothing is trained, so there is no `train.py` or PyTorch check. The split itself is still run for real: the predict reveal multiplies real matrices both ways in the browser and shows the error.
- **Option 1's backward collectives are derived**, not taken from the paper (the paper only says Option 1 needs a sync before the GeLU). The tab says so.
- **The reading-time counter skips `<details>` blocks** (the data and recipe lists, the evaluation details): they are opt-in, so the "min to read" line counts the main prose. The page reads in about 20 minutes (with the evidence section) against the old page's 10, because it now owns every detail of the paper (the method's Lesson 5 says the same of the first paper page).
- **No "What it takes to use this" section**: the paper is a 2019 classic whose method is now standard, so Then and now covers adoption, as the method allows.
- **Figure 5 comes from the PDF**: the chart is missing from the arXiv HTML, its labels are text in the PDF (`inputs/figure5_labels.txt`, read with pdftotext and checked against the rendered page).

## Files

- `build.sh`, `mk_paper.py`, `check_page.mjs`, `save_live.py`, `mk_coverage.py`, `extract_paper.py` and the parts `00_top`, `01_css` (plus a few classes at the end), `05z_errbox.js.html`, `10_js_common.js`, `11_js_ui.js`: copied from the reference folder. Changes: the JS list in `build.sh` and the `<details>` exclusion in its reading counter; `mk_paper.py` takes the card's last link text from `paper.json`'s `run_label` and adds the `verdict` line to the card; `check_page.mjs` steps the `lnx`, `lay` and `thx` animations and drops the toy-model checks; `extract_paper.py` targets v4 and replaces em-dashes in extracts; `save_live.py` matches this page's text.
- `paper.json`, `tables.json` (Tables 1 to 8 and Figure 5's labels, values as printed), `recompute.py` (writes `inputs/recompute.json`): GPT-2 and BERT parameter recounts, memory per GPU under t-way TP (ZeRO's 16 bytes per parameter plus Korthikanti et al.'s activation formulas), the fewest GPUs that fit, throughput implied by Table 2's epoch times (Narayanan et al.'s FLOPs formula), 15.1 / (512 × 39) = 75.6%, Figure 5's implied PFLOP/s, Table 8 efficiencies, per-layer all-reduce bytes, logit against fused-loss communication, the WikiText103 normalisation.
- Parts: `03_paper.html`, `05_tables.html`, `06_then.html`; JS `12_js_hero.js` (the hero), `13_js_read.js` (memory, split demo, logits, GPU groups, Figure 5, LayerNorm animation), `23_js_run.js` (the layer step-through's data and counters, `window.MEG_LAY`, and the scaling model), `24_js_tables.js`, `27_js_then.js` (was `25_js_then.js`, renamed for the renderer); `25_js_s3.js` (renderer v2, skill template), `31_js_sc_lay.js` (Fig. 2) and `32_js_sc_gg.js` (Fig. 3), the 3D scenes. See the 2026-11-13 section below.
- `inputs/`: `paper_v4.txt` and `table_*.txt` (extract_paper.py from the arXiv HTML v4), `figure5_labels.txt`, `modern_extracts.txt` (the lines quoted from Narayanan et al., Korthikanti et al., MT-NLG, GPT-3, Llama 3, DeepSeek-V3, ZeRO, Nemotron-4, Megatron's cross_entropy.py, vLLM, TensorRT-LLM and SGLang), `recompute.json`.
- `live.md` (the Notion page as fetched on 2 October 2026, saved by `save_live.py` from the session transcript), `coverage.json` (61 items, all verified against the built page by `mk_coverage.py`), `viz_ideas.md`.

## Checks (2 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, 153 KB. `node .../src/check_page.mjs`: 334 actions, 0 problems (every control in light 920 and dark 390, the three animations stepped end to end, text at least 11 px). `python3 mk_coverage.py`: 61 of 61. `python3 recompute.py` prints every derived number.

## The 2026-10-24 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence and a hero figure (one transformer layer on 2 GPUs: local work blue, partial sums orange and dashed, the f and g all-reduces as bands), then "You need" (Distributed training, for data parallelism and all-reduce) and five new terms. The paper's figures are under arXiv's non-exclusive licence, not CC BY, so the hero is redrawn, not embedded.
- **The live ingredient moved inline.** The "Split a layer across GPUs" tab explained one mechanism, so its step-through now sits in "Method: the f and g operators", beside the claim it proves, with a prediction prompt (Option 1 sends 3.75 times the bytes; the answer is in a closed block). Its communication-only scaling model went to a closed block under Results: scaling. The tab is gone; `#t-run` links open the Reading tab at the step-through (`99_js_tabs.js`).
- **No autoplay.** `makeAnim` in `11_js_ui.js` no longer starts on scroll or on a mode switch; it waits on step 1 until the reader presses play or steps. `check_page.mjs` now fails if any animation moves before a click, and opens closed blocks to exercise their controls. `90_js_tabs.js` was replaced by the skill template `99_js_tabs.js` (storage key `megatron-tab`, keeping this page's `data-to` scrolling).
- **Owned elsewhere, linked**: what activation checkpointing trades and the pipeline bubble (Distributed training, sections 10 and 6), why pre-LN trains stably (Normalisation, residuals and stability), the ring all-reduce cost (Interconnects and scaling). This page keeps one sentence on what the paper did with each.
- **Closed**: the memory formula, the counter formulas, Appendix D's head-count numbers, Appendix B.2's RNG handling, hardware with the recipe, five of the seven evidence caveats, and current use (serving option names, the codebase, Nemotron) as one dated volatile block.
- **Cut as fat**: the closing recap of the results, the old reading-time line, three "Try" or tab-pointer lines, the animation-manners lines (16 units in the ledger, each with a note).
- British spelling (optimiser) in the prose; the header subtitle is now "Reading: 20 min, plus 6 in closed details.", read by `build.sh` from `reading.json` (measured with `html_utils/audit_pages.mjs`).

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core (230 words a minute) | 20.1 min | 19.8 min |
| Reading, closed details | 1.5 min | 6.0 min |
| Split a layer across GPUs (tab) | 3.1 min | removed (moved into Reading) |
| Tables, Then and now, Further reading | 7.6 min | 7.6 min |
| Visuals drawn in Reading (audit) | 3 | 6 |

Why about 20 minutes is right: the core now also carries the step-through and its prediction (formerly a 3-minute tab), so the reading the paper needs fell from about 23 minutes across two tabs to 20 in one, with every knowledge unit kept. What remains open is the paper's argument in its order (problem, the split, f and g, attention, embeddings, duplication, the hybrid layout, results, the two caveats that change how the headline reads, the verdict); appendices, formulas, extra caveats and current use are one click away.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
247 units: core 168, depth 55, owned 5, volatile 3, fat 16. 239 were drafted by `ledger.py init` from the page before this pass; 8 record the core sentence, the hero, the new terms, the 3.75 prediction and four owner links. `python3 html_utils/ledger.py check` prints problems 0.

## Checks (24 October 2026)
`checkpage.sh`: tabs 4, fail=0, emdash 0, errbox 1, clipped 0, 159 KB. `check_page.mjs`: 334 actions, 0 problems (including no movement before a click). `mk_coverage.py`: 61 of 61 (three keys updated for British spelling and the cut recap). `ledger.py check`: problems 0.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

Briefs `rebuild-page.md` and `layout-rollout.md`. Ownership: this page owns the paper (its method as the paper states it, its numbers and evidence). Tensor parallelism as a form is Distributed training's, whose Fig. 7 already draws the column-then-row split of one feed-forward block on two GPUs in 3D (forward only, with sequence parallelism beside it) and whose Fig. 14 draws Llama 3's and DeepSeek-V3's layouts as a mesh; its PyTorch API is Distributed PyTorch's. So the stages here draw only what the paper adds: the backward pass with both conjugate operators, the split the paper rejected and what each sends, at Table 1's sizes, and the 8.3B run's own 512-GPU layout (Figure 8). The f and g section links Distributed training's Fig. 7 for the plain forward split.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| The paper | core sentence, You need, New terms | split | Fig. 1, the hero, 2D static (one layer on 2 GPUs) | no |
| The paper | Problem | split | memory calculator (2D widget) | no |
| The paper | Idea | split | predict, then the live split of real matrices (2D widget) | no |
| The paper | Method: f and g | split | **3D** `stg-lay` (Fig. 2), two modes; controls and counters under the step list | yes, 9 and 11 |
| The paper | Attention by heads | full width | none (Fig. 1 shows it) | no |
| The paper | Embeddings and the loss | split | logit calculator (2D, log scale) | no |
| The paper | Duplicate, not send | full width | none | no |
| The paper | With data parallel | split | **3D** `stg-gg` (Fig. 3), GPU picker under the steps | yes, 4 |
| The paper | Setup | full width | none | no |
| The paper | Results: scaling | split, then the communication-only model full width (closed) | predict, then Figure 5 (2D bars) | no |
| The paper | Results: GPT-2 | full width | table | no |
| The paper | Results: BERT | split | predict, then Fig. 4, 2D `makeAnim`, two modes (lists shown with the reveal) | yes, 5 and 5 |
| The paper | Believe?, Why it matters, Connections | full width | none | no |
| The paper's tables, rebuilt | all | full width | tables and 2D charts | no |
| Then and now | intro and steps beside the card | split, then the tables full width | 2D `makeAnim` (layout card) | yes, 8 |
| Further reading | | unchanged | | |

**Fig. 2, one MLP block on t GPUs** (`31_js_sc_lay.js`): each GPU a lane in depth; the weights as glass plates drawn to the matrix's shape (rows up, columns across, the outline the whole matrix), each lane holding only its slice: Megatron's A by columns and B by rows (stacked in depth the slices tile A, and column block i of A meets row block i of B on the same GPU), Option 1's A and B both by rows. Slabs on each lane are what that GPU holds for one token (blue own slice, orange partial sum, grey full); dots along a lane are local work (forward and backward in two colours), dots between lanes the collectives at the gate the step names (f, g, and Option 1's extra "sync" before the GeLU), denser for 4H than for H; a column on the right stacks what each GPU has sent so far (ring formulas) against the other split's whole block (3.50H against 13.13H at t = 8). Steps about A or B move the camera in close on that plate. Data: Table 1's hidden sizes and the step data of the old 2D lanes (`window.MEG_LAY` in `23_js_run.js`: what each GPU holds, which collective, which gate), with the model, t, link and micro-batch chosen under the step list; the counters (collectives, bytes sent, link time against GEMM time, GeLU work) stay HTML.

**Fig. 3, the 8.3B run's 512 GPUs** (`32_js_sc_gg.js`): 32 DGX-2H slabs of 16 V100 cubes, numbered as in Figure 8; step 1 close on one server (two model-parallel groups, one per row), step 2 the f and g ring of one group over NVSwitch (4 all-reduces per layer, 288 per iteration for 72 layers, derived), step 3 all 32 servers (64 copies of the model, 8 sequences each of the batch of 512, derived), step 4 one data-parallel group's gradient ring through every server. The GPU slider (the old 2D picker, `13_js_read.js`) picks the GPU lit.

**Kept 2D, and why**: the hero (a schematic of a whole layer, attention included, on 2 GPUs: Distributed training's Fig. 7 already draws the feed-forward half in 3D, and the summary reads best flat), the memory and logit calculators (bars on a GB scale and a log byte scale), the split demo (heatmaps of real 3 x 16 outputs), Figure 5 and the communication-only model (numbers on an axis), the LayerNorm animation (a flat block diagram whose point is where one line branches off; given a step list and autoplay instead), the tables tab, and Then and now (a layout card with log-scale degree bars). No photo or figure is embedded: the paper is not CC BY (as before), and no openly licensed photo of a DGX-2H was looked for or used.

**Motion and lists**: `11_js_ui.js` now carries `makeAnim` with the 2026-11-06 motion rules (copied from the LoRA page): it plays once half in view, pauses off screen, stops for good on any control or at its last step, never moves under reduced motion, and marks its step list. The per-step captions (`#layStep`/`#layCap`, `#lnxStep`/`#lnxCap`, `#thxStep`/`#thxCap`) are gone; their text is now the step lists (`#sx-lay-meg`, `#sx-lay-row`, `#sx-lnx-b`, `#sx-lnx-a`, `#sx-thx`), the only place it lives (the JS keeps titles or only the per-step data it draws). Fig. 4's lists sit in `#lnx-steps`, hidden until the BERT prediction is answered, so they do not give the answer away. `99_js_tabs.js` is LoRA's copy of the template (storage key `megatron-tab`, a `data-to` link opens a closed block after its target) plus the old `#t-run` redirect to `#lay-h`. `05z_errbox.js.html` is the current template.

**Checks**: `check_page.mjs` no longer asserts that nothing moves before a click (motion is `check_stages.mjs`'s); it steps the two 2D animations. `check_stages.mjs` (new, from LoRA's): at 1400 and 920 light and 390 dark, both stages and both 2D animations play once in view, step to the end, have one list item per step in every mode, stop drawing off screen, every split is two columns at 1400, no errors, NaN or sideways scroll; under reduced motion nothing moves; and the numbers the step lists state are checked against `MEG_LAY` and Table 1 (the slices' sizes at the defaults, 2 against 4 collectives, 4(t - 1)/t against 15(t - 1)/t and 3.75 at t = 2, 4, 8, 4 x 72 = 288, 512 / 64 = 8, list lengths).

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 19.9 min (4,576 words) | 25.4 min (5,841) |
| The paper, closed | 6.0 min (1,378) | unchanged |
| The paper's tables, rebuilt | 3.6 min, plus 0.5 closed | unchanged |
| Then and now | 2.0 min (453) | 3.4 min (777) |
| Further reading | 2.0 min | unchanged |

The growth is the step lists: the layer step-through's twenty captions, the LayerNorm animation's ten and Then and now's eight were drawn by script and invisible to the audit (words a reader always read), and Fig. 3 adds four steps (about 220 words) that state the run's layout in numbers. Nothing was cut and the paper's argument keeps its order. Why about 25 minutes is right: as before the page owns every number of the paper and its evidence; the two stages now show the two spatial facts the old 2D drawings could only list (each GPU's slice of A and B and where the only collectives sit, forward and backward; and which 8 GPUs share a layer and which 64 share a gradient). Header: "Reading: 25 min, plus 6 in closed details." (`reading.json`).

**Ledger**: 247 units (core 168, depth 55, fat 16, owned 5, volatile 3); keys re-pointed on units 69 (the picker's text is now Fig. 3's step 4: "all-reduce their weight gradients once per step"), 173 and 175 (the 2D lanes' legend became Fig. 2's: "drawn to the model's shape (rows up, columns across", "orange a partial sum (full width but not yet the answer)"). `ledger.py check`: problems 0. `mk_coverage.py`: 60 of 61; the one missing item (the Notion Takeaway property's text) was already missing before this pass.
