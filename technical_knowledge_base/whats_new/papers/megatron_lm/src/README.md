# Megatron-LM: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d8133ae92fbe90a1f308e, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from the paper method (`.claude/skills/explainer-page/page-kinds/paper.md`) and the Attention Is All You Need reference folder.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card (verdict linked to the evidence section), then the core sentence, the hero (one layer on 2 GPUs, `12_js_hero.js`), You need and new terms; Problem (memory calculator, formula closed), Idea (Eq. 1 to 3; predict question with a live split of real matrices), f and g with the layer step-through inline (Megatron against Option 1, with a prediction prompt; counter formulas closed), attention by heads (Table 7 closed), embeddings and the fused loss (calculator), duplicate-not-send (RNG details closed), combining with data parallelism (GPU-group picker), setup (data, recipe and hardware closed), results: scaling (Figure 5 predict question; 76% against 74% box; strong scaling; the communication-only model closed), GPT-2 (Table 3; evaluation closed), BERT (LayerNorm-placement predict and animation), How much of this to believe (two main caveats open, five closed), Why it matters (current use in a dated closed block), Connections. |
| The paper's tables, rebuilt | `t-tables` | Table 1 with parameter recount and fewest-GPUs column, Table 2 with the throughput its epoch time implies, Figure 5 / Table 7 / Table 8, Table 3, Table 4 with BERT recount, Table 5 sortable with distance from the best other model, Table 6 in a details block. |
| Then and now | `t-then` | Parallel layouts from 2019 to 2026 (Megatron-LM, GPT-3, PTD-P, MT-NLG, sequence parallelism, Llama 3, DeepSeek-V3, serving) as a step animation, with what changed and what survived. |
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
- Parts: `03_paper.html`, `05_tables.html`, `06_then.html`; JS `12_js_hero.js` (the hero), `13_js_read.js` (memory, split demo, logits, GPU groups, Figure 5, LayerNorm animation), `23_js_run.js` (the layer step-through and the scaling model, both now in the Reading tab), `24_js_tables.js`, `25_js_then.js`.
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
