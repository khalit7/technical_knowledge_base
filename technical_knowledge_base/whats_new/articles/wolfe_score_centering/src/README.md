# How this page is built

Page kind: article (`.claude/skills/explainer-page/page-kinds/article.md`), built 2026-11-27 from the reference folder `../../weight_space_programming/src/` (its README has the table of shared files), with `mk_article.py`, `build.sh`, `label_ledger.py`, `check_page.mjs` and the template parts from `../../qorl_query_plans/src/` and `extract_article.py` from `../../transformers_from_memory/src/`.

## Build and check
```sh
python3 src/recompute.py                            # (from the page folder) writes inputs/recompute.json: the toy's exact values on a 0.1 grid of sigma, and the arithmetic checks
bash src/build.sh                                   # writes ../index.html; stops on a missing text fragment, an em-dash or an unexpanded macro
node <page>/src/check_page.mjs <page>/index.html    # from the repo root: every control, 390 dark, 920 and 1400 light; the toy against recompute.json (1,178 values); 16 prose numbers
python3 html_utils/ledger.py init <page> && python3 <page>/src/label_ledger.py && python3 html_utils/ledger.py check <page>
```
`inputs/article.txt` (the full text) is gitignored; re-extract it with `extract_article.py` (its docstring) before changing a fragment. Without it, the build uses `fragments.json` and gives the same page.

## What differs from the reference folder
| File | Change |
|---|---|
| `extract_article.py` | `URL`, Substack `START`/`END`, and `DROP` for Substack's embed cards for other posts and citation hover cards (none occur in this post, kept for safety). The post's maths are images, so the extract has the derivations' captions only; formulas were checked against the paper. Section ids start with `§` and are used as `ah:` margin labels. |
| `mk_article.py` | `DATA_EXTRA` ships the toy's fixed inputs (`inputs/recompute.json`'s `toy`) as `window.ARTICLE.toy`. |
| `check_page.mjs` | Generic loop kept; `window.SC_TOY.grid(sigma)` is compared with `recompute.json` at all 31 values of sigma (every estimator's drift, spread, path ratio, p(w given A) at steps 100 and 400, the frozen-sampler run and q(w given A)); worst difference 4.4e-16. 16 prose numbers against the same data. |
| `recompute.py`, `inputs/recompute.json` | This page's own: the toy, and checks of the article's and paper's arithmetic (the 100x ratio; 607,744 bytes and 20.4 TB of full log-probs; 1 - 1/G; the head-only centering identity, paper Eq. 10 and 12, to 1.1e-16; the gradient of the Eq. 14 loss by finite differences, to 1.9e-10). |
| `parts/22_js_sc_figs.js`, `23_js_sc_toy.js` | Hero (the loop) and the 30B chart; the toy (a port of `recompute.py`). |
| `parts/03_css.html` | Reference classes kept; this page's `sc-` classes (equation box, toy controls and table, prediction box). |

## Departures from page-kinds/article.md
- **An explainer over a paper, so the paper is read as the article's evidence.** Every formula, number and attribution was checked against arXiv 2609.20807v1 (including its appendices, seed counts and Table 1); the paper is the card's companion, its code the card's code link. The article is faithful; the page names its two small departures (it leaves out the 30B FP4 panel where score centering ties TIS, and states k = 32 more cautiously than the paper) and one code slip (`completion_mask` undefined).
- **"Labs use it" was traced.** The quote is from Nathan Lambert's RLHF Book (added 5 November 2026, no source given); what can be checked is framework support, found through GitHub's pull-request search and TRL's documentation, kept in the dated Since block.
- **Responses are mostly to the method, not the article**: the article has no critics, only ten comments; the substantive replies are the papers that test or extend score centering, each dated, one predating the article (Han and Hu, 15 October).
- **The live ingredient is the page's own toy** (no data is released with the article): an exact two-step policy that isolates drift on a token the reward ignores. It teaches what the derivations state but reading does not show: that group centring leaves drift, that clipping and masking reintroduce it, the cost of exact importance sampling in spread, the covariance-under-q residual, and the fixed-teacher against refreshed-teacher contrast. Kept inside Reading as a widget beside sections 4 to 6, opening at sigma = 0 beside a prediction prompt.
- **No archived copy** exists to diff; Substack's metadata records one edit six minutes after publication.

## Length judgement
Reading 22 minutes core plus 4 in closed details (measured 2026-11-27, `audit_pages.mjs`), against the article's own 38 (8,600 words of prose). That is longer than an owned-concept article page would be, and right here: no page in the knowledge base yet teaches drift or score centering (RL for LLMs owns the mismatch but only its importance-sampling fixes), so this page carries the mechanism until that integration lands, plus the evidence and responses. Condensed: the PPO-ratio aside and the method grid went into a closed block, the reader comments into one entry, the importance-sampling mechanics to their owner. Ledger: 206 units, core 146, depth 54, volatile 4, fat 2, problems 0.

## Sources read (27 November 2026)
The post (Substack HTML and its post API: published 2026-11-09 10:33 UTC, edited 10:39 UTC, 9,242 words by Substack's count, 38 likes, 13 restacks) and its 10 comments (comments API); no Wayback copy. The paper, arXiv 2609.20807v1 HTML in full, and its five SVG figures (legends only, rendered locally); martin-marek/score-centering (README, tree, commit history; MIT). rlhfbook.com chapter 6 (Score centering section) and the rlhf-book repository's history of that chapter. arXiv abstracts of 2610.22263, 2611.21791 (and its sections 5.2 and 5.3), 2611.27375, 2611.32810, and the four mismatch papers the article cites (2605.14220, 2510.26788, 2602.01826, 2510.11370). GitHub pull requests (verl 8010, slime 2405 and 2406, Miles 3621 and 3625, vLLM 59361, SGLang 42890, labs-molt 182, PrimeIntellect renderers 180, prime-rl 3927 and 4010, torchtitan 6378, open-instruct 2235) and TRL's AsyncGRPOTrainer documentation.
Not readable: the posts on X the article links. Unconfirmed: any frontier lab's statement that it trains with score centering.
