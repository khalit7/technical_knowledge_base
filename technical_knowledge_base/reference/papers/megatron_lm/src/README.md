# Megatron-LM: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d8133ae92fbe90a1f308e, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from the paper method (`html_utils/methods/papers.md`) and the Attention Is All You Need reference folder.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card (ending with the verdict from `paper.json`, linked to the evidence section), then Problem (memory calculator: per-GPU memory for the Table 1 models against t), Idea (Eq. 1 to 3; predict question with a live split of real matrices), f and g, attention by heads, embeddings and the fused loss (communication calculator), duplicate-not-send and RNG, combining with data parallelism (GPU-group picker for Figure 8's 512 GPUs), setup (data and recipe in a details block), results: scaling (predict question with Figure 5 bars; the 76% against 74% box), GPT-2 (Table 3; evaluation details in a details block), BERT (predict question with the LayerNorm-placement animation, (a) against (b)), How much of this to believe (what holds up; weak scaling is not speedup; 76% against 74%; FLOP counting unstated; single runs; comparisons on different data; an unfinished 3.9B run; one pair of LayerNorm curves; verdict), Why it matters, Connections. |
| Split a layer across GPUs | `t-run` | The live ingredient: one MLP block on 2, 4 or 8 GPUs, forward and backward, Megatron (columns then rows) against Option 1 (rows, sync before GeLU), to scale per token, with collectives, bytes, link time and GeLU work as counters; then a communication-only scaling model against Figure 5 and Table 8, with a "does not reproduce" box. |
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

- `build.sh`, `mk_paper.py`, `check_page.mjs`, `save_live.py`, `mk_coverage.py`, `extract_paper.py` and the parts `00_top`, `01_css` (plus a few classes at the end), `05z_errbox.js.html`, `10_js_common.js`, `11_js_ui.js`, `90_js_tabs.js`: copied from the reference folder. Changes: the JS list in `build.sh` and the `<details>` exclusion in its reading counter; `mk_paper.py` takes the card's last link text from `paper.json`'s `run_label` and adds the `verdict` line to the card; `check_page.mjs` steps the `lnx`, `lay` and `thx` animations and drops the toy-model checks; `extract_paper.py` targets v4 and replaces em-dashes in extracts; `save_live.py` matches this page's text.
- `paper.json`, `tables.json` (Tables 1 to 8 and Figure 5's labels, values as printed), `recompute.py` (writes `inputs/recompute.json`): GPT-2 and BERT parameter recounts, memory per GPU under t-way TP (ZeRO's 16 bytes per parameter plus Korthikanti et al.'s activation formulas), the fewest GPUs that fit, throughput implied by Table 2's epoch times (Narayanan et al.'s FLOPs formula), 15.1 / (512 × 39) = 75.6%, Figure 5's implied PFLOP/s, Table 8 efficiencies, per-layer all-reduce bytes, logit against fused-loss communication, the WikiText103 normalisation.
- Parts: `03_paper.html`, `04_run.html`, `05_tables.html`, `06_then.html`; JS `13_js_read.js` (memory, split demo, logits, GPU groups, Figure 5, LayerNorm animation), `23_js_run.js` (layer animation and scaling model), `24_js_tables.js`, `25_js_then.js`.
- `inputs/`: `paper_v4.txt` and `table_*.txt` (extract_paper.py from the arXiv HTML v4), `figure5_labels.txt`, `modern_extracts.txt` (the lines quoted from Narayanan et al., Korthikanti et al., MT-NLG, GPT-3, Llama 3, DeepSeek-V3, ZeRO, Nemotron-4, Megatron's cross_entropy.py, vLLM, TensorRT-LLM and SGLang), `recompute.json`.
- `live.md` (the Notion page as fetched on 2 October 2026, saved by `save_live.py` from the session transcript), `coverage.json` (61 items, all verified against the built page by `mk_coverage.py`), `viz_ideas.md`.

## Checks (2 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, 153 KB. `node .../src/check_page.mjs`: 334 actions, 0 problems (every control in light 920 and dark 390, the three animations stepped end to end, text at least 11 px). `python3 mk_coverage.py`: 61 of 61. `python3 recompute.py` prints every derived number.
