# Switch Transformers: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81a8b541c9babbf40c94, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from the reference paper page (`../../attention_is_all_you_need_transformer/src/`) and the method in `html_utils/methods/papers.md`.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card (from `paper.json`, with the database Takeaway and the verdict), then Problem, Idea (top-2 against top-1 animation), Capacity, Balancing loss (predict: the loss at collapse), Training tricks (predict: bfloat16 and the router softmax; Table 2 and 4 bars), Table 1 chart, Scaling, Downstream (Table 5 deltas), Parallelism (Figure 9 redrawn), Trillion scale (predict: Switch-C against Switch-XXL), Appendices, How much of this to believe, What it takes to use this, Why it matters, Connections. |
| Train a Switch layer | `t-run` | The live ingredient: two toy Switch layers trained side by side in the browser, six presets and every knob; the offline sweeps (3 seeds) and a reproduces / does not reproduce table. |
| The paper's tables, rebuilt | `t-tables` | Table 9 recounted from configurations (printed, Table 9 row, released gin file), Table 1, Table 5 with deltas, Tables 6 to 8 recomputed, Tables 2, 3, 4, 10, 11, and 22 checks on the paper's own numbers. |
| Then and now | `t-then` | Switch's eight recipe lines against GLaM, ST-MoE, MegaBlocks, Mixtral, DeepSeek-V3 and Qwen3, one step each, every cell sourced. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from `papers.md`, and why

- **The live ingredient is trained in the page, not shipped as weights.** The paper's mechanism is one layer (router, capacity, loss), and a toy Switch layer trains in about 5 seconds in plain JS, so the reader watches the training the paper is about (collapse without the loss, drops against capacity) instead of a frozen result. Everything is float64 and seeded, so the page reproduces the offline sweep exactly; the check is stronger than a forward-pass comparison: the loss, the capacity masks and every gradient match an independent PyTorch implementation (`check_grad.py`). No quantisation, so nothing to report there.
- **No generic MoE rebuild.** Topic: llms has a "Deeper: inside an MoE" tab with the generic router, capacity animation, global-batch balancing and expert parallelism; this page links it and builds only the paper's specifics (top-1 against top-2 on one batch, the f · P loss, selective precision, Table 9's arithmetic, Figure 9).
- **Then and now is a two-column step-through, not a morph.** The paper's legacy is a recipe (k, expert count and size, layers, scores, balancing, capacity, precision, extra losses), so each step compares one later source with Switch line by line; two columns fit a phone, seven would not.
- **"What it takes to use this" is kept although the method is now standard**, because the released checkpoints and gin files are still used and they differ from Table 9 in ways a user would trip over.
- **Reading length**: about 19 minutes plus 4 in expandable details (the old page was 10). The paper is JMLR length and this page owns all of it; the fine-tuning protocol, the partly trained Switch-XXL numbers, the appendices and the pseudocode note are folded into details blocks. `build.sh` counts details and predict answers separately in the header.

## Files

- `build.sh`: the reference build (macros `ax:`, `n:`, `tab:`, margin labels, `@@CARD@@`), plus `mk_sweep_data.py`, and a reading time that counts `<details>` and predict reveals separately.
- `paper.json`, `tables.json` (the paper's 11 tables as printed strings; `check_tables.py` checks all 246 numeric cells against `inputs/table_*.txt`), `mk_paper.py` (card, Further reading, `window.PAPER`).
- `recompute.py` writes `inputs/recompute.json`: Table 9 parameters and FLOPs from the printed rows and from the released flaxformer gin files (`inputs/gin_*.gin`), ratios the text quotes, Table 9 gaps, Tables 5 to 8 derived numbers, the Table 3 t statistic, the bfloat16 example.
- The toy: `parts/20_js_switch_core.js` (the Switch layer, task, Adam, evaluation; runs in the page and in node), `dump_case.cjs` + `check_grad.py` (`node dump_case.cjs && uv run --with torch python check_grad.py`; writes `model/check_grad.json`, PASS), `sweep.cjs` (`node sweep.cjs`, about 2.5 minutes on one core; writes `model/sweep.json`), `mk_sweep_data.py` (writes `parts/20b_sweep_data.js`).
- `check_page.mjs` (from the repo root, `node technical_knowledge_base/reference/papers/switch_transformers/src/check_page.mjs`): every control in light 920 and dark 390, both animations stepped end to end with mid-animation screenshots, every Train preset trained to step 1,500 and compared with the sweep, extreme settings, SVG text at least 11 px, no NaN, errors or sideways scroll.
- `mk_coverage.py` writes `coverage.json` (58 items of `live.md`, each verified against the built page), `save_live.py` copied the Notion fetch verbatim into `live.md`, `extract_paper.py` turned the arXiv HTML v3 into `inputs/paper_v3.txt` and `inputs/table_*.txt`.
- `inputs/`: also `later_extracts.txt` (quoted passages from ST-MoE, GLaM, GShard, DeepSeek-V3, Mixtral, Qwen3, MegaBlocks, DeepSeekMoE), `modern_configs.json` (Hugging Face configs of Mixtral, DeepSeek-V3, Qwen3-30B-A3B, Kimi K2, gpt-oss-120b), `mtf_moe_extract.txt` (the Mesh TensorFlow lines for the loss and the jitter).
- `viz_ideas.md`: ideas built and rejected, with scores.

## Parts

HTML: `00_top`, `01_css` (the T5 page's CSS), `02_header`, `03_paper`, `04_run`, `05_tables`, `06_then`, generated `_gen_card`, `_gen_more`.
JS: `10_js_common`, `_gen_data`, `11_js_ui` (reference helpers; `fit` now measures the content width inside padding), `12_js_charts` (bars, frames), `13_js_read` (animation, reveals, Reading charts, Figure 9), `20_js_switch_core`, `20b_sweep_data`, `21_js_run`, `24_js_tables`, `25_js_then`, `90_js_tabs`.

## Checks (2 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, about 179 KB. `check_page.mjs`: 304 actions, 0 problems. `check_grad.py`: PASS on 5 configurations. `check_tables.py`: 246 cells, 0 missing. `mk_coverage.py`: 58 of 58 verified.
