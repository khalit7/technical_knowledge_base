# How this page is built

An article page (`.claude/skills/explainer-page/page-kinds/article.md`), copied from the reference folder `whats_new/articles/weight_space_programming/src/` with `mk_article.py` from `qorl_query_plans` and `extract_article.py` from `transformers_from_memory`.

## Build and check
```sh
python3 src/recompute.py                            # the pool check's numbers -> inputs/recompute.json
bash src/build.sh                                   # writes ../index.html; stops on a missing text fragment, an em-dash or an unexpanded macro
node src/check_page.mjs <page>/index.html           # from the repo root: every control, 390 dark, 920 and 1400 light; the pool widget against
                                                    # recompute.json; both animations autoplay, nothing moves under reduced motion; prose numbers
python3 html_utils/ledger.py init <page>; python3 src/label_ledger.py; python3 html_utils/ledger.py check <page>
```
`extract_article.py` here: URL and START/END set for blog.cloudflare.com (Astro: `<div class="article-content"` up to `<template id="heading-anchor-icon"`). The post has no heading ids, so every margin label is a text fragment.

## Files that are this page's own
| File | What it is |
|---|---|
| `recompute.py`, `inputs/recompute.json` | The pool check: SGLang v0.5.19's length rule (min(window − 1, pool − 1) − 5), pages reserved at 64 tokens (illustrative), the tokens a refused request writes. |
| `parts/22_js_ck_pool.js` | The hero widget (same rule as `recompute.py`, exposed as `window.CK_POOL` for the check). |
| `parts/23_js_ck_tl.js` | The timeline (static; every event also in the closed list under it). |
| `parts/24_js_ck_hand.js` | The handoff animation, three modes, step lists `sx-hand-*` in `20_read_b.html`. |
| `parts/25_js_ck_race.js` | The aborted-transfer race, two modes, step lists `sx-race-*` in `20_read_c.html`. |

## Departures from page-kinds/article.md
- **The evidence is the engine's code, not the author's.** A postmortem releases no data; the post's claims about SGLang were checked against SGLang's source at v0.5.19 (the last release without the fix), the fix pull requests and their tests, an earlier issue, and the maintainers' companion post. That is where the exact limit (681,274, not 681,280), the July report and "#38935 is not a correctness fix" come from.
- **A timeline figure** the post does not have: the order of events (public report, upstream fix, launch, report) changes the verdict, so it is drawn.
- **Two animations, one live widget, all in Reading** (no extra tab): the widget is the hero because the incident's core is one comparison of three numbers.
- **The responses include a related post that is not a reply** (LessWrong side channels), labelled as such, because it reaches the same lesson (a shared KV cache couples tenants) from working engines.

## Length judgement
Reading 13 minutes core plus 2 in closed details (measured 2026-11-27, `audit_pages.mjs`), against the article's own 16. The page carries the argument in the post's order, the code-level check of the mechanism, the evidence judgement, six responses and four visuals; the timeline as text, Cloudflare's hardening list and provenance are closed. Ledger: 197 units, core 134, depth 56, volatile 4, fat 3, problems 0.

## Sources read (27 November 2026)
The post (and five Wayback copies, 26 October 22:02 UTC to 16 November: identical text); its diagram (viewed, not stored); SGLang's companion post; issue #30233; PRs #36988, #38935, #38704, #46435, #45973; #38935's test file; SGLang source at v0.5.19 and v0.5.22; release dates v0.5.11 to v0.5.23; Cloudflare's 3 August post; the Cloudflare status incident; the Hacker News item and all comments (API); the LessWrong post and comments (GreaterWrong). Not found: the researcher's own report; Cloudflare's page size.
