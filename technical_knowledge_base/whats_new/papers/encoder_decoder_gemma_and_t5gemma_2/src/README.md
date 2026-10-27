# Encoder-Decoder Gemma and T5Gemma 2: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3d45c17b0d0d81a9a22ffaada508db5c, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built with `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the reference folder `../attention_is_all_you_need_transformer/src/`. One page covers two papers: Encoder-Decoder Gemma (arXiv 2504.06225v1, called T5Gemma at release) and T5Gemma 2 (arXiv 2512.14856v2).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The papers | `t-read` | Headline card (Takeaway verbatim, verdict, three headline numbers); the core sentence, the hero (Figure 1 and §3 redrawn as an HTML diagram), You need and New terms; Problem, Idea (the adaptation animation), Objectives and setup, Results (latency predict question and the generation-cost animation), Ablations (extra-compute predict question), T5Gemma 2 (merged attention with a predict question and live demo), T5Gemma 2 results (long-context predict question, capability chart), How much of this to believe, What it takes to use this, Why it matters, Connections. |
| Train the toy adaptation | `t-run` | Real PyTorch runs of every ablation at toy scale: adapted (bidirectional and causal encoder), scratch at two budgets, the decoder-only control, unbalanced pairs with three warmups; curves from the training log, a table beside the paper's numbers, the pretraining curves, and the first (flawed) run kept. |
| The tables and figures, rebuilt | `t-tables` | Tables 2, 3 and 4 of the first paper and Figures 2 to 4 decoded from their SVGs (open); the parameter recount, Figure 5, T5Gemma 2's Tables 1 and 3 and its Tables 4 and 5 in closed blocks; a "does not reproduce" box (open). |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **Two papers on one page** (as the Notion page was filed): `build.sh` has a second link macro (`{{text|bx:anchor}}`) and margin label (`[[B:anchor|label]]`) for T5Gemma 2, and `mk_paper.py` builds a two-paper card and Further reading.
- **The live ingredient is a set of trained toy runs plus two mechanism animations, not a model in the browser.** The paper is an adaptation recipe: its claims are comparisons between training runs (adapted against scratch, bidirectional against causal, warmup or not). The toy runs those comparisons for real (`train.py`); a forward pass in JS of one trained model would add nothing, so no weights ship and no `check_forward.py` is needed. The mechanism itself (which weights are copied, which are new) is the adaptation animation; why the 9B-2B is fast is the generation-cost animation.
- **No "Then and now" tab**: the line is a year old; EmbeddingGemma, the one downstream use, is in Why it matters.
- **Reading time** is measured by `html_utils/audit_pages.mjs` (230 words a minute, closed `<details>` apart) and written by hand into `reading.json`, which `build.sh` puts in the header subtitle.

## Files

- `save_live.py` (Notion fetch to `live.md`, verbatim), `extract_paper.py` (both arXiv HTMLs to `inputs/*_2504.06225v1.txt`, `inputs/t5gemma2_2512.14856v2.txt` and `inputs/*_tables.txt`), `mk_tables.py` (tables to `tables.json`, printed strings), `decode_figs.py` with `svgparse.py` (Figures 2 to 6 of the first paper from their vector SVGs to `inputs/figs.json`), `fetch_inputs.py` (configs and Hugging Face parameter counts to `inputs/configs.json` and `inputs/hf_params.json`).
- `recompute.py`: every derived number (parameter recounts with and without cross-attention, the T5Gemma 2 ablation recounts, all deltas quoted in the text, recomputed table averages, Figure 2 crossing points, Figure 4 ratios, Figure 6 Spearman from decoded points, capability deltas, long-context gaps). Writes `inputs/recompute.json`.
- `paper.json`, `mk_paper.py`: the card, Further reading and `window.PAPER` (tables, recompute, figures, toy report).
- `train.py`: the toy (see its docstring). `OMP_NUM_THREADS=2 uv run --with torch python train.py` runs everything (about 25 minutes on two threads); `train.py adapt` reruns only the adaptation runs from the saved checkpoints; `train.py overlap` measures held-out overlap. `model/` keeps `report.json` (every curve the page shows), `train.log`, `pilot1/` (the three task pilots) and `pilot2_pos0/` (the first full run, whose decoder positions restarted at 0). The two pretrained checkpoints (0.4 MB and 2.4 MB) are not kept, to stay under 1 MB: `train.py pre_small pre_big` regenerates them with the same seeds in about 3 minutes, then `train.py adapt` reruns the rest.
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the two animations stepped end to end with mid-animation screenshots in `../.shots/x-*.png`, the toy chart's lines. `mk_coverage.py`: `coverage.json`, every fact of `live.md` with where the page carries it, verified against the built page.
- `viz_ideas.md`: the visualisations chosen and rejected, with scores.

## Parts

HTML: `00_top`, `01_css` (the reference CSS plus a `details.more` style), `02_header`, `03_paper`, `04_run`, `05_tables`, generated `_gen_card` and `_gen_more`. JS: `10_js_common`, `_gen_data`, `11_js_ui` (copied unchanged: `fit`, `makeAnim`, predict-then-reveal, `placeLabels`, `legend`), `12_js_adapt` (adaptation animation), `13_js_merged` (merged attention demo), `14_js_cost` (generation-cost animation), `15_js_read` (numbers from recompute, predict reveals, capability chart), `23_js_toy`, `24_js_tables`, `99_js_tabs` (the explainer-page template since 2026-10-25, storage key `t5g-tab`).

## Light pass, 2026-10-25 (teaching contract)

- **Top**: the core sentence; the hero, the first paper's Figure 1 and §3 redrawn as an HTML diagram (Gemma 2 2B copied into an encoder that changes only its mask and a decoder that gains cross-attention, with the balanced and unbalanced initialisations and the continued training), built in HTML so it reflows at phone width; both papers are under arXiv's non-exclusive licence, so no figure of theirs is reproduced and no image is used; You need (Families and objectives, Distillation and small language models) and New terms.
- **Owned elsewhere** (OWNERS.md): the encoder-decoder family and UL2's mixture of denoisers are taught on Families and objectives (which already carries both, and this paper's results); Problem and Objectives keep one sentence each and link it.
- **Moved into closed `<details>`** (nothing deleted but fat): the rejected global-layers variant's recount (one open sentence keeps the 1.3-point cost), a dated block "Later, as of 25 October 2026" (EmbeddingGemma's MTEB ranking as of 23 September 2025; the Hub still lists only the three balanced pretrained T5Gemma 2 checkpoints). In the Tables tab the parameter recount, Figure 5, T5Gemma 2's ablations and its every-benchmark tables are closed blocks; a `data-to` link opens the block that holds its target.
- **No autoplay**: `makeAnim` (11_js_ui.js) waits on step 1 until play or a step, also after a mode switch; `check_page.mjs` fails if `adx` or `cdx` draws a frame when scrolled into view or after a mode switch, and opens every closed block before auditing a tab. Tabs use the template (`99_js_tabs.js`). Header: "Reading: 19 min, plus 3 in closed details." (`reading.json`).
- **Takeaway scoped** (paper.json, live.md, so the card): adaptation beats scratch on PT and IT from about 400M up (SuperGLUE only from XL), the 4.9 and 7.1 gains are single runs at similar inference FLOPs with about twice the parameters, and the RULER lead is for pretrained models, narrowing to 5.9 at 128K and reversing there after post-training (Table 5). The Notion property itself still has the old wording.
- **Length**: Reading core 4,178 words (18 min) plus 445 closed (2) before; 4,463 (19 min, including about 330 words of new top) plus 592 closed (3) after. Tables tab 1,231 open before, 685 open plus 570 closed after. Toy tab unchanged (5 min). The core stays near its length because the ledger is almost all core: two papers' method, results with numbers, ablations and an evidence judgement; the toy and table tabs are tools used across the page, so they stay tabs.
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 286 units, core 244, depth 32, owned 4, volatile 2, fat 4; `ledger.py check` problems 0. `mk_coverage.py`: three items updated; 65 of 65.
- Privacy: three author emails in the saved arXiv text are redacted; `extract_paper.py` now redacts any it meets and saves long dashes as `--`.

Rechecked 2026-10-25: `checkpage.sh` 4 tabs, 206 KB, emdash 0, errbox 1, clipped 0, fail=0; `check_page.mjs` 300 actions, 0 problems.
