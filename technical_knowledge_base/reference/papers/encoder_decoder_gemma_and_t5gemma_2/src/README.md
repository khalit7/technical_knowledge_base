# Encoder-Decoder Gemma and T5Gemma 2: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3d45c17b0d0d81a9a22ffaada508db5c, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built with `html_utils/methods/papers.md`, starting from the reference folder `../attention_is_all_you_need_transformer/src/`. One page covers two papers: Encoder-Decoder Gemma (arXiv 2504.06225v1, called T5Gemma at release) and T5Gemma 2 (arXiv 2512.14856v2).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The papers | `t-read` | Headline card (Takeaway verbatim, verdict, three headline numbers), Problem, Idea (the adaptation animation), Objectives and setup, Results (latency predict question and the generation-cost animation), Ablations (extra-compute predict question), T5Gemma 2 (merged attention with a predict question and live demo), T5Gemma 2 results (long-context predict question, capability chart), How much of this to believe, What it takes to use this, Why it matters, Connections. |
| Train the toy adaptation | `t-run` | Real PyTorch runs of every ablation at toy scale: adapted (bidirectional and causal encoder), scratch at two budgets, the decoder-only control, unbalanced pairs with three warmups; curves from the training log, a table beside the paper's numbers, the pretraining curves, and the first (flawed) run kept. |
| The tables and figures, rebuilt | `t-tables` | Parameter recount (paper, configs, released weights), Tables 2, 3 and 4 of the first paper, Figures 2 to 5 decoded from their SVGs, T5Gemma 2's Tables 1, 3, 4 and 5, and a "does not reproduce" box. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **Two papers on one page** (as the Notion page was filed): `build.sh` has a second link macro (`{{text|bx:anchor}}`) and margin label (`[[B:anchor|label]]`) for T5Gemma 2, and `mk_paper.py` builds a two-paper card and Further reading.
- **The live ingredient is a set of trained toy runs plus two mechanism animations, not a model in the browser.** The paper is an adaptation recipe: its claims are comparisons between training runs (adapted against scratch, bidirectional against causal, warmup or not). The toy runs those comparisons for real (`train.py`); a forward pass in JS of one trained model would add nothing, so no weights ship and no `check_forward.py` is needed. The mechanism itself (which weights are copied, which are new) is the adaptation animation; why the 9B-2B is fast is the generation-cost animation.
- **No "Then and now" tab**: the line is a year old; EmbeddingGemma, the one downstream use, is in Why it matters.
- **Reading time** excludes three collapsed `<details>` blocks (the benchmark lists, two minor §6 findings, T5Gemma 2's sizes and setup), which a reader must open; `build.sh` says so. About 18 minutes for two papers against the old page's 9.

## Files

- `save_live.py` (Notion fetch to `live.md`, verbatim), `extract_paper.py` (both arXiv HTMLs to `inputs/*_2504.06225v1.txt`, `inputs/t5gemma2_2512.14856v2.txt` and `inputs/*_tables.txt`), `mk_tables.py` (tables to `tables.json`, printed strings), `decode_figs.py` with `svgparse.py` (Figures 2 to 6 of the first paper from their vector SVGs to `inputs/figs.json`), `fetch_inputs.py` (configs and Hugging Face parameter counts to `inputs/configs.json` and `inputs/hf_params.json`).
- `recompute.py`: every derived number (parameter recounts with and without cross-attention, the T5Gemma 2 ablation recounts, all deltas quoted in the text, recomputed table averages, Figure 2 crossing points, Figure 4 ratios, Figure 6 Spearman from decoded points, capability deltas, long-context gaps). Writes `inputs/recompute.json`.
- `paper.json`, `mk_paper.py`: the card, Further reading and `window.PAPER` (tables, recompute, figures, toy report).
- `train.py`: the toy (see its docstring). `OMP_NUM_THREADS=2 uv run --with torch python train.py` runs everything (about 25 minutes on two threads); `train.py adapt` reruns only the adaptation runs from the saved checkpoints; `train.py overlap` measures held-out overlap. `model/` keeps `report.json` (every curve the page shows), `train.log`, `pilot1/` (the three task pilots) and `pilot2_pos0/` (the first full run, whose decoder positions restarted at 0). The two pretrained checkpoints (0.4 MB and 2.4 MB) are not kept, to stay under 1 MB: `train.py pre_small pre_big` regenerates them with the same seeds in about 3 minutes, then `train.py adapt` reruns the rest.
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the two animations stepped end to end with mid-animation screenshots in `../.shots/x-*.png`, the toy chart's lines. `mk_coverage.py`: `coverage.json`, every fact of `live.md` with where the page carries it, verified against the built page.
- `viz_ideas.md`: the visualisations chosen and rejected, with scores.

## Parts

HTML: `00_top`, `01_css` (the reference CSS plus a `details.more` style), `02_header`, `03_paper`, `04_run`, `05_tables`, generated `_gen_card` and `_gen_more`. JS: `10_js_common`, `_gen_data`, `11_js_ui` (copied unchanged: `fit`, `makeAnim`, predict-then-reveal, `placeLabels`, `legend`), `12_js_adapt` (adaptation animation), `13_js_merged` (merged attention demo), `14_js_cost` (generation-cost animation), `15_js_read` (numbers from recompute, predict reveals, capability chart), `23_js_toy`, `24_js_tables`, `90_js_tabs`.
