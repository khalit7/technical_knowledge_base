# How this page is built

Page kind: article (`.claude/skills/explainer-page/page-kinds/article.md`), built 2026-11-27 from the reference folder `../../weight_space_programming/src/` (its README has the table of shared files), with `mk_article.py` from `../../raschka_positional_embeddings/src/` (the `companion` and `more_note` fields).

## Build and check
```sh
python3 src/recompute.py                            # (from the page folder) writes inputs/recompute.json: the toy's exact values, the GRPO example, headline arithmetic
bash src/build.sh                                   # writes ../index.html; stops on a missing text fragment, an em-dash or an unexpanded macro
node <page>/src/check_page.mjs <page>/index.html    # from the repo root: every control, 390 dark, 920 and 1400 light; the toy against recompute.json; 14 prose numbers
python3 html_utils/ledger.py init <page> && python3 <page>/src/label_ledger.py && python3 html_utils/ledger.py check <page>
```
`inputs/article.txt` (the full text) is gitignored; re-extract it with `extract_article.py` (its docstring) before changing a fragment. Without it, the build uses `fragments.json` and gives the same page (checked: identical hash).

## What differs from the reference folder
| File | Change |
|---|---|
| `extract_article.py` | `URL`, `START`/`END` (`<article class="research-prose">`, an Astro site); Shiki code blocks put each line in `<span class="line">`, now a line break. The reward formulas are KaTeX without TeX source, so the extract drops them; they were read from the rendered page. Margin labels use the post's real heading ids (`ah:`). |
| `mk_article.py` | The Raschka version; `DATA_EXTRA` ships `inputs/recompute.json` as `window.ARTICLE.recompute` (the toy's 20 runs). |
| `check_page.mjs` | Generic loop kept; the toy's `fooled(k, z)` is compared with `recompute.json` for k = 1, 3, 5, 7 and 31 tie zones (worst difference 5e-7, rounding of the JSON); 14 prose numbers against the same data. |
| `recompute.py`, `inputs/recompute.json` | This page's own. Self-tests: k = 3, z = 0.05 gives 307,392 of 775,200 draws (the post's "~40%"); 230 slow-median triples (the post's "230"); job-13b's CV 10.34% (the post's 10.3%); both four-rollout advantage tables of the post. |
| `parts/22_js_qp_figs.js`, `23_js_qp_toy.js` | Hero (every JOB evaluation, with the repeat-search band), the harness flow, the GRPO before/after; the toy (a port of `recompute.py`). |
| `parts/03_css.html` | Reference classes renamed to the `qp-` prefix; a range control and the prediction box added. |

## Departures from page-kinds/article.md
- **The repository is read as evidence and as a response.** The author's own results file for the headline run (experiment 033) states the caveats more plainly than the post (best-of-three is a search budget; JOB was inspected during development; repeated searches spread 1.33x to 1.47x); it is the card's companion and the first response. The Postgres configuration in the repository settles the Hacker News question about `random_page_cost` (the baseline ran at 4.0).
- **The live ingredient recomputes the post's own interactive figure exactly** instead of sampling it, and extends it to 1, 5 and 7 timings a side and any tie zone. It teaches what reading does not: the post's text and its caption disagree (20% against 40%), repetition helps slowly against a two-clump distribution (61%, 40%, 26%, 16%), which is why the fix was memory. Kept inside Reading as a widget (no autoplay), opening at one timing a side, with a prediction prompt for three and seven.
- **No "Since" news beyond the repository state and the Wayback comparison**: no follow-up, replication or reply was found.
- **The post's interactive figures are not redrawn** (search-space counter, calibration queue, cache animation, worker-lease timeline, identicons); their numbers are in the text.

## Length judgement
Reading 21 minutes core plus 3 in closed details (measured 2026-11-27, `audit_pages.mjs`), against the post's own 50 minutes of prose (58 with code and figure labels). The post teaches query planning from zero and walks through every experiment; the page links the planner material to its owner, keeps every result and setting in the post's order, and adds the evidence section, the responses and the toy. Ledger: 210 units, core 156, depth 49, volatile 3, fat 2, problems 0.

## Sources read (27 November 2026)
The post (and its first Wayback copy, 16 September 19:41 UTC; only an Acknowledgements section added since); job-13b's 20 runs from the post's figure data; the repository polyphilz/qorl (README; `src/qorl/evaluation/selection.py`; `docker/postgres/configs/001-pgconf-2gb-sb/pg.conf`; `docker/postgres/Dockerfile` (Postgres 18.6); `scripts/imdb/load.sql` (23 foreign-key indexes); experiments 032 and 033 READMEs and results; GitHub API: 51 stars, 2 forks, no issues); the Hacker News item 49731285 and its 141 visible comments (API); web searches for replications and critiques (only secondary restatements found); arXiv metadata of Flow-Loss (2101.04964) and Bao (2004.03814). Knowledge base: Query planning and performance, RL for LLMs, PEFT, the Topic: databases root, the 2026-09-21 issue.
Unconfirmed, left out: anything about the empero-ai distillation beyond the post's description (no model card was read).
