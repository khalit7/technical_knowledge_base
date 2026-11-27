# How this page is built

Page kind: article (`.claude/skills/explainer-page/page-kinds/article.md`), built 2026-11-27 from the reference folder `../../weight_space_programming/src/` and `../../raschka_positional_embeddings/src/` (Substack extraction), with `mk_article.py` from `../../qorl_query_plans/src/` (fields `companion`, `more_note`, `since_label`).

## Build and check
```sh
python3 src/recompute.py                            # (from the page folder) Nanbeige config -> inputs/recompute.json, with self-tests
bash src/build.sh                                   # writes ../index.html; stops on a missing text fragment, an em-dash or an unexpanded macro
node <page>/src/check_page.mjs <page>/index.html    # from the repo root: every control at 390 dark, 920 and 1400 light; all 15 widget states against recompute.json; 13 prose numbers
python3 html_utils/ledger.py init <page> && python3 <page>/src/label_ledger.py && python3 html_utils/ledger.py check <page>
```
`inputs/article.txt` (the full text) is gitignored; re-extract it with `extract_article.py` before changing a fragment. Without it the build uses `fragments.json` and gives the same page (checked: identical hash).

## What differs from the reference folders
| File | Change |
|---|---|
| `extract_article.py` | URL; a second DROP pattern removes Substack's embedded card for another post (his KV-cache article) from the extract. |
| `mk_article.py` | `DATA_EXTRA` ships `inputs/recompute.json` as `window.ARTICLE.recompute`. |
| `recompute.py`, `inputs/nanbeige_config.json`, `inputs/recompute.json` | This page's own: parameters, FLOPs, KV cache and the hidden-depth bound per cache arrangement, integer arithmetic. Self-tests: 22 blocks, 2 loops, 3.15B non-embedding and 4.2B total (the report's 3B and 4B). |
| `check_page.mjs` | Generic loop kept; hero id; the widget compared with `recompute.json` for every passes x mode combination; prose numbers. |
| `parts/22_js_lt_hero.js`, `23_js_lt_toy.js`, `03_css.html` | Hero, widget, `lt-` classes. |

## Departures from page-kinds/article.md
- **A live ingredient on a page whose concept another page owns.** The calculator earns its place because it teaches the one thing neither the article nor the owner page has: hidden depth depends on which pass reads which keys (a cache per pass bounds it at layers x passes; a recurrent cache makes it grow with the answer). It is a widget (no autoplay) with a prediction prompt, and its numbers are calculations from a published config, labelled so.
- **The responses carry most of the evidence.** The article measures nothing about Astra; the system card it summarises, two LessWrong measurements, MBaert's argument and Westover and Kuhn's Dory experiment are the evidence its central claim is judged by.
- **The Substack comment thread is listed as one response**, since the author's replies there (to the controllability challenge, on early exits, and the 2 October addition) belong to the article's record. Commenters are not named.

## Length judgement
Reading 16 minutes core plus 3 in closed details (measured 2026-11-27, `audit_pages.mjs`), against the article's 28. First draft measured 22; the Astra impressions, the flexible-loop mechanisms (owned by Test-time compute and reasoning), the research survey and the response notes were condensed. Ledger: 173 units, core 118, depth 47, volatile 6, fat 2, problems 0.

## Sources read (27 November 2026)
The post and its first Wayback copy (9 September 13:59 UTC; differs by the video link and the 2 October ARC-AGI-3 sentence); the author's 2 September blog note (Wayback, 30 October); 75 Substack comments and replies (API); Hacker News item 49627370 (API, 171 items); on GreaterWrong: Arike (PLisnSFir8y5AHkmP, LqSZZAriGqgsGDQe3), RohanS (FsCkkoGsNmPzFKRhg), MBaert (LaR7joZu4QyaM7hqq), Westover and Kuhn (uxsDuWWHNTpKrsF6P) with comments; OpenAI's Astra announcement, system card CoT controllability section, ARC-AGI-3 harness post (29 July), GPT-6.2 announcement, Pachocki's "Perplexity and intelligence"; arXiv abstracts of 2607.22083, 2507.10524, 2609.01343, 2608.08888, 2506.18233; Nanbeige report section 2.1 (HTML v1); Huginn (2502.05171) sections 6.1 to 6.3; Nanbeige config.json; Ouro-2.6B-Thinking config.json and modeling_ouro.py. Knowledge base: Test-time compute and reasoning, Topic: llm-landscape, OpenAI: GPT family, the 2026-09-07 and 2026-09-14 issues.
Not checked: figure-only numbers (the 80% Luna and Sol tokens), Dory's model card.
