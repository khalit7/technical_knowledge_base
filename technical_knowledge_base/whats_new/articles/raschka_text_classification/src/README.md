# How this page is built

Page kind: article (`.claude/skills/explainer-page/page-kinds/article.md`), built 2026-11-27 from the reference folder `../../weight_space_programming/src/`, with `build.sh`, `label_ledger.py`, `check_page.mjs` and the template parts from `../../raschka_looped_transformers/src/`, `mk_article.py` from `../../qorl_query_plans/src/` and `extract_article.py` from `../../transformers_from_memory/src/`.

## Build and check
```sh
python3 src/recompute.py                            # (from the page folder) exact-decimal recompute -> inputs/recompute.json, with asserts
bash src/build.sh                                   # writes ../index.html; stops on a missing text fragment, an em-dash or an unexpanded macro
node <page>/src/check_page.mjs <page>/index.html    # from the repo root: 390 dark, 920 and 1400 light; figure labels inside their cards; 35 prose numbers against recompute.json
python3 html_utils/ledger.py init <page> && python3 <page>/src/label_ledger.py && python3 html_utils/ledger.py check <page>
```
`inputs/article.txt` is gitignored; re-extract with `curl -sL -A '<browser UA>' <url> -o <scratch>/post.html` then `python3 -I extract_article.py <scratch>/post.html <date>` from `src/`. Without it the build uses `fragments.json` and gives the identical page (checked: same hash). Archived Substack copies use `<div dir="auto" class="body markup"` and `<div class="post-footer ...`, so diffing them needs a looser START/END than the live page.

## What differs from the reference folders
| File | Change |
|---|---|
| `extract_article.py` | URL; Substack START/END; DROP removes `digestPostEmbed` cards. |
| `mk_article.py` | `DATA_EXTRA` ships `inputs/recompute.json`. |
| `recompute.py`, `inputs/recompute.json` | This page's own: Jev's run (accuracy, cost, tokens, standard error), the ladder with each test split, TypeSafe's confidence formula, RLCR rewards and expected reward, the illustrative per-option scores. |
| `parts/22_js_tc_figs.js` | The three figures (hero ladder, independence of irrelevant alternatives, RLCR reward). |
| `check_page.mjs` | Generic loop kept; figure-edge check for three SVGs; prose numbers from recompute.json. |

## Departures from page-kinds/article.md
- **Short, by design**, as the method says for an explainer of owned concepts: each section is the article's step plus what it adds or where it is wrong, with the mechanism linked to its owner.
- **No live ingredient.** The candidate (a calibration reliability-diagram toy) is already on Probability for ML and Evaluation metrics; the page's new teaching (per-option scoring obeys the independence of irrelevant alternatives, Jev does not) is carried by a static before/after with measured numbers.
- **The evidence comes mostly from outside the article**: TypeSafe's FAQ and docs, and three measurements (one published before the article) decide its guesses about Jev. Two responses predate the article and are labelled so.
- **Substack commenters are not named**; published authors (Hume, Orlov and Matveeva, the benchmark repository) are.

## Length judgement
Reading 15 minutes core plus 2 in closed details (measured 2026-11-27, `audit_pages.mjs`: 3,473 and 571 words), against the article's 36. A first draft measured 21; the history sections, the Jev API section and the response notes were condensed, and two reader comments already covered in the prose were dropped from the responses list. Ledger: 170 units, core 120, depth 44, volatile 4, fat 2, problems 0.

## Sources read (27 November 2026)
The post and seven Wayback copies (29 September 11:07 UTC to 14 November); 66 Substack comments and replies (API, post id 217935364); Hacker News item 49891203 and its comments (API); TypeSafe's launch post and FAQ, docs pages Confidence, Model jaggedness, Changelog and the llms.txt index; the RLCR paper (arXiv 2507.16806 HTML, Table 1, reward derivation); the notebooks behind the IMDb numbers (machine-learning-book ch08 and ch15_part2, deeplearning-models cnn_imdb, LLMs-from-scratch ch06 IMDb README and split script); the BTZSC pilot report; Archer Hume's "Jev's Architecture Unmasked"; Orlov and Matveeva's essay; the arXiv abstract of 2609.30216. Knowledge base: Other notable providers, LLM-as-judge, RL for LLMs, Classical ML, Sequence models, Families and objectives, Probability for ML, Evaluation metrics, the 2026-09-21, 09-28 and 10-19 issues.
Not checked: numbers only in the article's figures, TypeSafe's benchmark chart, the OpenAI DevDay recap.
