# Attention Is All You Need (Transformer): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81999af7f16f8ed8ee9e, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. This is the first paper page and the **template for the other 62**: `html_utils/methods/papers.md` is the recipe, and the section "Reusing this skeleton" below says which files carry over unchanged.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card (generated from `paper.json`), then Problem, Idea (RNN against self-attention animation, Table 1), Method (attention with the √d<sub>k</sub> predict-and-reveal demo, multi-head, the block diagram, positional encoding with its heatmap and offset curve, training with the Equation 3 chart), Results (with the Table 3 predict question), Why it matters, Connections. Every section has an "in the paper" margin label linking the arXiv HTML anchor. |
| Run a Transformer | `t-run` | A real trained toy encoder-decoder (three variants) running in the browser: composer, translation checked against the rules, step-by-step greedy decoding, every attention map, before/after variants, an in-browser test, training curves. |
| The paper's tables, rebuilt | `t-tables` | Table 1 calculator, Table 2 chart, Table 3 explorer, the parameter recount, Table 4. |
| Then and now | `t-then` | The 2017 block morphing into a 2026 decoder-only block, one sourced change per step, with recounted parameters and KV cache; the changed and survived tables. |
| Further reading | `t-more` | Generated from `paper.json`: the paper, code, resources with times, connected KB papers, topics, the parent database. |

Why these tabs: the five suggested ones fitted the content as they were. "Run a Transformer" got its own tab because a real model needs room (composer, decoder, maps, variants); the tables tab exists because four tables and a recount would bury the Reading flow; "Then and now" is separate because the morph is about later papers, not this one.

## Files

- `build.sh`: runs `recompute.py` and `mk_paper.py`, assembles `parts/` (each JS part in its own `<script>`, tab wiring last, `#jsErr` box first), expands the link macros, fails on an unexpanded macro or an em-dash, and fills in the reading time and resources total. Macros: `{{text|url}}`, `{{text|n:<notion id>}}`, `{{text|ax:<anchor>}}` (the paper's arXiv HTML at an anchor), `{{text|tab:<tab>[:<element id>]}}`, `[[<anchor>|label]]` (margin label), `@@CARD@@`.
- `paper.json`: the paper's metadata, headline numbers, resources (with times), connected KB pages and topics. `tables.json`: the paper's tables transcribed (BLEU kept as printed strings).
- `mk_paper.py`: turns those into `parts/_gen_card.html`, `parts/_gen_more.html`, `parts/_gen_data.js` (`window.PAPER`).
- `recompute.py`: the base model's parameters and every Table 3 row from their configurations, training FLOPs by the paper's footnote method, the Equation 3 peak, the Table 1 crossover, the cost ratios in the text. Writes `inputs/recompute.json`.
- Toy model: `grammar.py` (the English to Lindu task), `train.py` (train every variant; `export` quantises and writes `parts/20_model_data.js`), `check_forward.py` (JS forward pass against PyTorch), `overlap.py` (sentence space, train/test overlap, accuracy on uniformly drawn sentences). `model/` holds the float and quantised checkpoints (about 1.3 MB in all), logs, `report.json`, `check_forward.json`, `overlap.json`.
  - `uv run --with torch --with numpy python train.py` (about 11 minutes per variant on a laptop CPU; torch is never added to pyproject.toml), then `... train.py export`, then `... check_forward.py`, then `... overlap.py acc`.
- `check_page.mjs` (run from the repo root with node): exercises every range, select, checkbox, button, segmented control, predict widget and chip in light 920 px and dark 390 px, steps both animations end to end, runs the in-browser test, and fails on SVG text under 11 px on screen, NaN/undefined/Infinity in visible text, errors or sideways scroll. Its screenshots of mid-animation states go to `../.shots/x-*.png`.
- `mk_coverage.py`: writes `coverage.json` (every fact of `live.md` with where the HTML carries it) and verifies each against the built page.
- `save_live.py` copied the Notion fetch verbatim from the session transcript into `live.md`; `extract_paper.py` turned the arXiv HTML into `inputs/paper_v7.txt` and `inputs/table_*.txt`.
- `inputs/`: the paper text and tables, `modern_configs.json` (Hugging Face configs for tied embeddings and FFN ratios), `modern_extracts.txt` (the lines quoted from GPT-2, GPT-3, PaLM, Liu et al., Xiong et al., RMSNorm, GLU variants, GQA), `recompute.json`.
- `viz_ideas.md`: the visualisations chosen and rejected, with scores; `html_utils/methods/papers.md`: the recipe for every paper page.

## Parts

HTML: `00_top`, `01_css` (the lab pages' CSS plus paper additions: hero card, margin labels, predict widget, chips), `02_header` (breadcrumb and tab bar), `03_paper`, `04_run`, `05_tables`, `06_then`, generated `_gen_card` and `_gen_more`.
JS: `10_js_common` (page copy of the shared helpers, tick text raised to 11 px), `_gen_data`, `11_js_ui` (reusable: `fit` for width-measured drawing, `makeAnim` step animation controller, predict-then-reveal, `placeLabels`, `legend`), `12_js_rnn`, `13_js_read`, `20_model_data` (generated weights), `21_js_lang`, `22_js_model` (forward pass, also run by node in the check), `23_js_run`, `24_js_tables`, `25_js_then`, `90_js_tabs`.

## Reusing this skeleton for another paper

Copy the folder layout and these unchanged: `build.sh` (edit only the HTML and JS lists), `mk_paper.py`, `check_page.mjs` (update the import depth if the folder depth differs, and the animation ids it steps), `parts/00_top.html` (title), `01_css.html`, `05z_errbox.js.html`, `10_js_common.js`, `11_js_ui.js`, `90_js_tabs.js`, `save_live.py`, `extract_paper.py`, `mk_coverage.py` (replace the item list). Write new: `paper.json`, `tables.json`, `recompute.py`, the tab HTML parts and their JS, and the paper's own live ingredient (a toy model like `train.py` here, a simulation, or refitted figures; see `html_utils/methods/papers.md`). The card, Further reading, margin labels, arXiv links and predict widgets then come for free.

## Checks (2 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, 5 tabs, 285 KB. `node .../src/check_page.mjs`: 310 actions, 0 problems. `check_forward.py`: PASS (identical translations 200/200 for each variant, logits within 1.1e-5, attention within 1.2e-6, grammar 200/200). `mk_coverage.py`: 60 of 60 items verified.
