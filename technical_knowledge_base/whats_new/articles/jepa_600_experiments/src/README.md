# How this page is built

An article page (`.claude/skills/explainer-page/page-kinds/article.md`), copied from `../qorl_query_plans/src/` (build.sh, mk_article.py, label_ledger.py, check_page.mjs loop, template parts, 03_css.html) with `extract_article.py` from `../transformers_from_memory/src/`.

## Build and check
```sh
bash src/build.sh                                         # writes ../index.html; stops on a missing text fragment, an em-dash or an unexpanded macro
python3 src/recompute.py                                  # (from src/) the toy's routes and every derived number, to inputs/recompute.json
node src/check_page.mjs <page>/index.html [shots dir]     # from the repo root: every control, 390 dark, 920 and 1400 light; toy against recompute.json; prose numbers
python3 src/label_ledger.py                               # after `python3 html_utils/ledger.py init <page>`; then `ledger.py check <page>`
```
`extract_article.py` (URL and START/END set for haddyalchaer.com: the whole `<article class="wrap">`) writes `inputs/article.txt` (gitignored) and `inputs/anchors.txt`; fetch the post with a browser user agent (the site answers with early hints and blocks framing).

## Files of this page
| File | What |
|---|---|
| `article.json` | card, headline numbers, verdict, responses (Hacker News), follow-ups, resources, KB links, topics |
| `recompute.py`, `inputs/recompute.json` | the toy graph (illustrative geometry) and Dijkstra routes for every jump cost; the sign test, seed spread, z for 68% against 44%, the implied flow row |
| `parts/20_read_a/b/c/z.html` | Reading, in the post's order, then the evidence, responses and KB links |
| `parts/22_js_jw_figs.js` | hero and harder-test bars (numbers printed by the post) |
| `parts/23_js_jw_toy.js` | the toy: the same graph and search as recompute.py, `window.JW_TOY.route` for the check |

## Departures from page-kinds/article.md
- **The evidence section leans on LeWM's code, not the post**: the post releases nothing, so the training-set point (LeWM's evaluation samples from `pusht_expert_train`) and the success-test point (stable-worldmodel's Push-T `eval_state` scores pusher and block positions together) come from reading `config/eval/pusht.yaml`, `eval.py` and `envs/pusht/env.py`.
- **The post's figure data file was parsed as JSON, never run** (it is a script); it holds trajectories only, so every percentage is the post's printed label.
- **A toy instead of a recomputed figure**: with no released tables there is nothing to recompute; the toy teaches the one mechanism the post's method depends on (the jump cost) and the failure it leaves (goals against the flow), exactly and deterministically.

## Length judgement
Reading 10 minutes core plus 3 in closed details (measured 2026-11-27 with `audit_pages.mjs`), against the post's 11 minutes of prose (12 with figure labels). The argument itself takes about 4 minutes; the rest is the card, the evidence judgement and the responses, which the post cannot supply. Two condensing passes took it from 16 to 10 minutes; units moved to closed blocks, none deleted. Ledger: 140 units, core 81, depth 54, volatile 3, fat 2, problems 0.

## Sources read (27 November 2026)
The post and its three Wayback captures (13 November, text identical); its `figure-data.js`; the Hacker News item and all 50 comments (API); LeWorldModel arXiv 2603.19312v3 (abstract, sections 3 and 4, appendices D to G); lucas-maes/le-wm (`config/eval/pusht.yaml`, `config/eval/solver/cem.yaml`, `eval.py`); galilai-group/stable-worldmodel (`envs/pusht/env.py`, `docs/envs/pusht.md`); H-JEPA arXiv 2610.06805v2 (sections 4 and E, Table 7); arXiv metadata of LeJEPA, Search on the Replay Buffer, SPTM, DINO-WM and 2512.24497; the author's GitHub repositories (halcdev; none for this work).
Not reachable: Hacker News search (Algolia) and Reddit search from this machine. Unconfirmed: how the 460,000-state graph was built and whether test demonstrations were excluded.
