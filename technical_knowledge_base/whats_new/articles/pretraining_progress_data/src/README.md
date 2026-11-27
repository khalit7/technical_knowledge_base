# How this page is built

Page kind: article (`.claude/skills/explainer-page/page-kinds/article.md`), built 2026-11-27 from the reference folder `../../weight_space_programming/src/` (its README has the table of shared files), with `build.sh`, `mk_article.py`, `label_ledger.py` and the generic loop of `check_page.mjs` from `../../qorl_query_plans/src/` and `extract_article.py` from `../../transformers_from_memory/src/`.

## Build and check
```sh
python3 src/recompute.py                            # (from the page folder) writes inputs/recompute.json and parts/22_js_pd_data.js (window.PDD)
bash src/build.sh                                   # writes ../index.html; stops on a missing text fragment, an em-dash or an unexpanded macro
node <page>/src/check_page.mjs <page>/index.html    # from the repo root: every control, 390 dark, 920 and 1400 light; the widget at all 4 budgets and the embedded data against recompute.json; 19 prose numbers; the recipe table reproduced
python3 html_utils/ledger.py init <page> && python3 <page>/src/label_ledger.py && python3 html_utils/ledger.py check <page>
```
`inputs/article.txt` (the full text) is gitignored; re-extract it with `extract_article.py` (its docstring; Substack bounds `<div class="body markup"` to `<div class="post-footer"`) before changing a fragment. Without it, the build uses `fragments.json` and gives the same page (checked: identical hash).

## Inputs: the authors' own numbers
The post's seven figures are Datawrapper charts, and Datawrapper serves each chart's data as `https://datawrapper.dwcdn.net/<id>/<version>/dataset.csv`. Those CSVs are the only numbers the authors released (no code, checkpoints or run tables), saved in `inputs/` under the chart ids: four-corner curves (TrYq2), the 7 x 7 grid (KNa3I), recipe and corpus tables (CzRR5, k03qL), recipe curves on FineWeb-Edu (djBI7), corpus curves with OLMo-2 (lm6Jz), residuals (Cnl63). The versions the post embeds redirect to later versions with identical data (checked). Chart titles, intros and dates were read from each chart's page. No curve was read by eye.

## What recompute.py finds
- The headline reproduces exactly with linear interpolation in log compute: 3.72x, 12.02x, joint 15.07x (1.57x a year), so the 45x product against the 15x joint, and the conditional multipliers at one score (recipe 1.25x on Ultra-FineWeb, corpus 4.05x with OLMo-2). Shapley split: data 72%, recipes 28%.
- The recipe table reproduces to the printed digit; the corpus table does not (FineWeb-Edu 4.80 against 8.63, Ultra-FineWeb 5.40 against 8.66, RefinedWeb 1.81 against 2.62). Cause unconfirmed.
- The grid's additive fit: R^2 0.882 and residuals identical to the post's table; corpus 81% of variance, recipe 7% (F 3.46, p 0.008), residual sd 0.70 points against a seed sd of 0.60.
- A parametric bootstrap (ours: points independent, standard error = seed sd / sqrt 3, 4,000 draws, seed fixed): product over joint 3.0x (95% 1.8 to 4.4), recipe on the 2025 corpus 1.25x (1.01 to 1.51).
- Ho et al. 2024's 8.4-month halving as a yearly rate (2.7x, CI 1.8x to 6.3x) and over six years (380x).

## Departures from page-kinds/article.md
- **The live ingredient is the post's own figure, recomputed**: the four-corner curves with a reference-budget slider. It teaches what reading does not: a multiplier is a horizontal gap at one score, and it changes with the score (0.66x, 1.6x, 2.4x, 3.7x for the recipe). Kept inside Reading as a widget (no autoplay), opening on the post's own reference.
- **The hero is a finding of this page, not a figure of the post**: the square of corners with recomputed top and right edges. The post's headline numbers are on it, so it also summarises the post.
- **Two responses that were author replies are folded** into the critiques they answer (Patel's into Bakouch's, Han's X reply into GertLek's), to keep the section short.
- **The authors' open questions and the Ho et al. table sit in closed blocks**: the page's core had to fit under the post's own 12 minutes.

## Length judgement
Reading 11 minutes core plus 4 in closed details (measured 2026-11-27, `audit_pages.mjs`: 2,534 and 972 words), against the post's own 12 (2,795 words with footnotes). The post is short and dense; the page carries its argument in order and adds what the post lacks: the recomputed multipliers, the overlap in compute, the corpus table that does not reproduce, the comparison with Ho et al., and the responses. A first draft ran 19 minutes; the setup details, the two tables' data, the open questions and the Ho comparison table moved into closed blocks and the prose was condensed. Ledger: 143 units, core 80, depth 58, volatile 3, fat 2, problems 0.

## Sources read (27 November 2026)
The post and its Wayback copies of 8 September (19:10:19, a script shell; 19:10:58) and 9 September (identical text apart from the learning-rate formula's markup); the seven charts' data and pages; the Substack comments API (13 threads, 19 comments); the X posts of Patel (announcement and 11 November re-share), Bakouch, Soldaini, Patel's and Han's replies (text through a public mirror); Mint Research's Yesterday in AI of 9 September; Ho et al. 2024 (arXiv HTML, section 3.1); Anson Ho's Epoch essay of 25 February 2026; abstracts of arXiv 2511.21622, 2605.19407, 2504.11393, 2510.25771, 2501.00656; Colin Raffel's June 2026 post. Searched without result: code, checkpoints or tables on Hugging Face and GitHub; a Hacker News or LessWrong thread; any replication.
