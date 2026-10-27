# Switch Transformers: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81a8b541c9babbf40c94, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from the reference paper page (`../../attention_is_all_you_need_transformer/src/`) and the method in `.claude/skills/explainer-page/page-kinds/paper.md`.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card (from `paper.json`, with the database Takeaway and the verdict), the idea in one sentence, the hero (the paper's Figure 2, CC BY), You need and New terms, then Problem, Idea (top-2 against top-1 animation), Capacity, Balancing loss (predict: the loss at collapse), Training tricks (predict: bfloat16 and the router softmax; Table 2 and 4 bars), Table 1 chart, Scaling (the paper's Figure 4), Downstream (Table 5 deltas), Parallelism (Figure 9 redrawn), Trillion scale (predict: Switch-C against Switch-XXL), Appendices, How much of this to believe, What it takes to use this, Why it matters, Connections. |
| Train a Switch layer | `t-run` | The live ingredient: two toy Switch layers trained side by side in the browser, six presets and every knob; the offline sweeps (3 seeds) and a reproduces / does not reproduce table. |
| The paper's tables, rebuilt | `t-tables` | Table 9 recounted from configurations (printed, Table 9 row, released gin file), Table 1, Table 5 with deltas, Tables 6 to 8 recomputed, Tables 2, 3, 4, 10, 11, and 22 checks on the paper's own numbers. |
| Then and now | `t-then` | Switch's eight recipe lines against GLaM, ST-MoE, MegaBlocks, Mixtral, DeepSeek-V3 and Qwen3, one step each, every cell sourced. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from `papers.md`, and why

- **The live ingredient is trained in the page, not shipped as weights.** The paper's mechanism is one layer (router, capacity, loss), and a toy Switch layer trains in about 5 seconds in plain JS, so the reader watches the training the paper is about (collapse without the loss, drops against capacity) instead of a frozen result. Everything is float64 and seeded, so the page reproduces the offline sweep exactly; the check is stronger than a forward-pass comparison: the loss, the capacity masks and every gradient match an independent PyTorch implementation (`check_grad.py`). No quantisation, so nothing to report there.
- **No generic MoE rebuild.** Topic: llms has a "Deeper: inside an MoE" tab with the generic router, capacity animation, global-batch balancing and expert parallelism; this page links it and builds only the paper's specifics (top-1 against top-2 on one batch, the f · P loss, selective precision, Table 9's arithmetic, Figure 9).
- **Then and now is a two-column step-through, not a morph.** The paper's legacy is a recipe (k, expert count and size, layers, scores, balancing, capacity, precision, extra losses), so each step compares one later source with Switch line by line; two columns fit a phone, seven would not.
- **"What it takes to use this" is kept although the method is now standard**, because the released checkpoints and gin files are still used and they differ from Table 9 in ways a user would trip over.
- **Reading length** (2 October): about 19 minutes plus 4 in expandable details (the old page was 10); superseded by the length judgement below. The paper is JMLR length and this page owns all of it; the fine-tuning protocol, the partly trained Switch-XXL numbers, the appendices and the pseudocode note are folded into details blocks. `build.sh` counts details and predict answers separately in the header.

## Files

- `build.sh`: the reference build (macros `ax:`, `n:`, `tab:`, margin labels, `@@CARD@@`), plus `mk_sweep_data.py`, and a reading time that counts `<details>` and predict reveals separately.
- `paper.json`, `tables.json` (the paper's 11 tables as printed strings; `check_tables.py` checks all 246 numeric cells against `inputs/table_*.txt`), `mk_paper.py` (card, Further reading, `window.PAPER`).
- `recompute.py` writes `inputs/recompute.json`: Table 9 parameters and FLOPs from the printed rows and from the released flaxformer gin files (`inputs/gin_*.gin`), ratios the text quotes, Table 9 gaps, Tables 5 to 8 derived numbers, the Table 3 t statistic, the bfloat16 example.
- The toy: `parts/20_js_switch_core.js` (the Switch layer, task, Adam, evaluation; runs in the page and in node), `dump_case.cjs` + `check_grad.py` (`node dump_case.cjs && uv run --with torch python check_grad.py`; writes `model/check_grad.json`, PASS), `sweep.cjs` (`node sweep.cjs`, about 2.5 minutes on one core; writes `model/sweep.json`), `mk_sweep_data.py` (writes `parts/20b_sweep_data.js`).
- `check_page.mjs` (from the repo root, `node technical_knowledge_base/whats_new/papers/switch_transformers/src/check_page.mjs`): every control in light 920 and dark 390, both animations stepped end to end with mid-animation screenshots, every Train preset trained to step 1,500 and compared with the sweep, extreme settings, SVG text at least 11 px, no NaN, errors or sideways scroll.
- `mk_coverage.py` writes `coverage.json` (58 items of `live.md`, each verified against the built page), `save_live.py` copied the Notion fetch verbatim into `live.md`, `extract_paper.py` turned the arXiv HTML v3 into `inputs/paper_v3.txt` and `inputs/table_*.txt`.
- `inputs/`: also `later_extracts.txt` (quoted passages from ST-MoE, GLaM, GShard, DeepSeek-V3, Mixtral, Qwen3, MegaBlocks, DeepSeekMoE), `modern_configs.json` (Hugging Face configs of Mixtral, DeepSeek-V3, Qwen3-30B-A3B, Kimi K2, gpt-oss-120b), `mtf_moe_extract.txt` (the Mesh TensorFlow lines for the loss and the jitter).
- `viz_ideas.md`: ideas built and rejected, with scores.

## Parts

HTML: `00_top`, `01_css` (the T5 page's CSS), `02_header`, `03_paper`, `04_run`, `05_tables`, `06_then`, generated `_gen_card`, `_gen_more`.
JS: `10_js_common`, `_gen_data`, `11_js_ui` (reference helpers; `fit` now measures the content width inside padding; `makeAnim` never autoplays since 2026-10-24), `12_js_charts` (bars, frames), `13_js_read` (animation, reveals, Reading charts, Figure 9), `20_js_switch_core`, `20b_sweep_data`, `21_js_run`, `24_js_tables`, `25_js_then`, `90_js_tabs`.

## Checks (2 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, about 179 KB. `check_page.mjs`: 304 actions, 0 problems. `check_grad.py`: PASS on 5 configurations. `check_tables.py`: 246 cells, 0 missing. `mk_coverage.py`: 58 of 58 verified.

## The 2026-10-24 rebuild (teaching contract, light pass for papers)

- **Top**: the core idea in one sentence under the headline card (which already had the verdict); the paper's own **Figure 2** (the Switch layer) as the hero, since JMLR publishes the paper under CC BY 4.0 (rendered from the vector PDF; on phones only its right half, the layer itself); a "You need" line (Mixture of experts, T5) and New terms.
- **A visual beside every core claim**: Scaling had none (its figures print no values); the paper's **Figure 4** now sits beside the 7.5x and 7x claims, panels stacked on phones. The other visuals (top-1 against top-2 animation, Table 1, 2, 4, 5 charts, Figure 9 redrawn, predict reveals) are unchanged. Images and licences: `../img/CREDITS.md`.
- **No autoplay**: `makeAnim` in `11_js_ui.js` (the fixed copy RAG uses) waits on step 1 for `rta` and `thn`; `check_page.mjs` fails if either draws a frame in 1.5 s on screen before any click. The page keeps its own `90_js_tabs.js` (no autoplay, no storage) and `makeAnim` instead of the templates' `99_js_tabs.js` and `RD.anim`; the Train tab never started by itself.
- **Closed blocks** (depth, not lost): the dispatch tensor and all-to-all shapes (Eq. 7); distillation across teacher sizes and after fine-tuning (Tables 7, 8); the seven internal inconsistencies (one open sentence names the one that matters); the current frontier list (dated, October 2026). The duplicated Switch-Base+ heads paragraph was folded into the inconsistencies.
- **Owners linked**: Distributed Training for the cost of each parallelism and the all-to-all, Quantization and Precision for the bfloat16 format, Distillation and Small Language Models for distillation in general. The generic MoE layer was already delegated to Mixture of experts.
- Header: "Reading: N min, plus M in closed details." from `reading.json` (the rendered-DOM count of `html_utils/audit_pages.mjs`); `mk_coverage.py` now looks for that line.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| The paper, core | 4,894 words, 21.3 min | 5,079 words, 22.1 min |
| The paper, closed details | 534 words, 2.3 min | 787 words, 3.4 min |
| Train, Tables, Then and now, Further reading | 817 + 251 closed, 1,625, 366, 556 | unchanged |
| Visuals in The paper (audit count) | 6 | 8 |

Why about 22 minutes is right: the page owns the whole JMLR-length paper, and every open section is the argument in the paper's order with its numbers. The new top (core sentence, hero caption, terms: about 1.3 minutes) is offset only partly by what moved into closed blocks (about 1.1 minutes), because the rest is the evidence the verdict rests on (Table 1's margins, the downstream wins and exceptions, the trillion-scale anomaly).

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
237 units: core 202, depth 31, owned 1 (the cost of data and model parallelism at Distributed Training, key "all-reduce of the gradients"), fat 3 (the old reading-time crumb, the tab names, the old reduced-motion sentence). Keys proposed by a script (a 4 to 6 word window of each unit found in the built page; depth when found only inside closed blocks) and set by hand for the unit whose paragraph moved.

## Checks (2026-10-24)
`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, 185 KB (images 133 KB beside it in `img/`). `check_page.mjs`: 304 actions, 0 problems (with the no-autoplay check). `check_tables.py`: 246 cells, 0 missing. `mk_coverage.py`: 58 of 58. `ledger.py check`: problems 0. The toy, `check_grad.py` and the sweep are untouched.
