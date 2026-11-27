# How this page is built

The article method is `.claude/skills/explainer-page/page-kinds/article.md`; this `src/` is a copy of the reference article folder's (`whats_new/articles/weight_space_programming/`, with `mk_article.py` from `qorl_query_plans/` and `extract_article.py` from `transformers_from_memory/`), changed where the table says.

## Build and check
```sh
bash src/build.sh                                   # writes ../index.html; stops on a missing text fragment, an em-dash or an unexpanded macro
node src/check_page.mjs <page>/index.html           # from the repo root: every control, 390 dark, 920 and 1400 light, the toy against recompute.json, prose numbers
python3 src/label_ledger.py                         # after `python3 html_utils/ledger.py init <page>`; then `ledger.py check <page>`
```

## Files
| File | What it is |
|---|---|
| `extract_article.py` | `URL` and `START, END = '<main>', '</main>'` (danluu.com is plain HTML with the post inside `<main>`); writes `inputs/article.txt` (gitignored) and `inputs/anchors.txt` (the post's real heading ids, used by `ah:` links). |
| `decode_chart.py` | Reads the post's interactive chart (`/interactive/agentic-testing/average-cost-vs-perfect-37.html`, fetched to scratch, never the repo) into `inputs/chart.json`: each condition's printed label (cost, % fully correct, n at both efforts) and its 50% bootstrap ellipse converted to one standard deviation with the chart's axis ticks. |
| `inputs/astra_imap.json` | The follow-up post's IMAP chart data (its embedded chart-data JSON, snapshot 2026-09-18): 27 conditions, n, runs passed, cost. |
| `recompute.py` | Standard library only, exact: runs passed per cell, chi-square homogeneity, Fisher's exact test against Default with Holm's correction, minimum detectable difference, medium-against-xhigh correlation, the no-effect band and range distribution, the cost chi-square and the named cost gaps, the follow-up's IMAP homogeneity, and the Zstd Number_of_Sequences formula against the agents' version. Writes `inputs/recompute.json`, which `mk_article.py` ships as `window.ARTICLE.recompute`. |
| `article.json`, `mk_article.py`, `build.sh`, `label_ledger.py` | As in the reference folder; `DATA_EXTRA` ships `recompute.json`. |
| `parts/20_read_a..d.html` | The Reading tab in the post's order. |
| `parts/22_js_dl_figs.js` | Figs. 1, 2, 3 and 5 and the closed data table. |
| `parts/23_js_dl_toy.js` | Fig. 4, the no-effect toy (seeded mulberry32 draws; `window.DL_TOY` for the checks). |
| `check_page.mjs` | The reference loop plus: toy clicks at both efforts, the embedded data equal to `inputs/recompute.json`, the toy's chi-square equal to recompute's, reproducible draws, the mean spread of 400 drawn worlds against the exact expectation, and 19 prose numbers against the data. |

## Sources read (27 November 2026)
The post (full text) and its interactive chart; the follow-up "Test/verification technique effectiveness with Astra" (full text) and its IMAP and Pandoc charts' data; the language post `/pl-tokens/` (the Zstd eval setup and its appendix of setup bugs); the blog's feed (`atom.xml`: 7 September 2026 and 2 November 2026); the Hacker News threads of both posts through the item API (49605246: 191 points, 71 comments, submitted 8 September 02:58 UTC; 49599835: 7 points, 1 comment, 7 September; 50515035 for the follow-up: 91 points, 17 comments, 16 November) and the four smaller resubmissions of the follow-up (no comments); MacIver's post as quoted in the article (dated by its id: 7 September 14:15 UTC); the `hegeldev/hegel-skill` commit history (GitHub API); the Zstandard format document (Number_of_Sequences, jump table, block maximum size); arXiv 2509.20384's abstract page.

Publication date: the page is undated (a Hacker News commenter on the follow-up noticed the same). Used: the feed's pubDate, 7 September 2026, consistent with the first Hacker News submission (7 September 16:03 UTC), the post's "(September 2026)" and the follow-up's "That post was published in September, but the tests were run in August."

Could not be done: a diff against an archived copy. The Wayback Machine has no captures of danluu.com (the CDX index returns none and `id_` requests return 403), and archive.today served a captcha. The post's "Appendix: some responses" quotes a reply from the day of publication, so it was probably added after the first version. Nothing is released beside the post: no prompts, transcripts, hidden tests or scoring code; every count from reading runs is the author's.

## Departures from page-kinds/article.md
- **The evidence section is built on a recompute of the post's own chart.** The chart's accessible labels print every cell (cost, share, n), and its ellipses give the bootstrap spread; that was enough for exact tests the post does not run. Their result decides the verdict (the order is noise; the null and the cost findings hold).
- **The live ingredient is a null-world toy, not a model of the mechanism.** The open question about this post is whether its ranking means anything; drawing worlds where nothing differs, beside the real chart, answers it faster than any table.
- **A calculated figure the post does not have** (Fig. 3, panel B): the Number_of_Sequences bug over every count the 3-byte form can encode, which explains why easy tests miss it.
- **The author's follow-up is in the Since block, not in Responses**: it is new data on a newer model by the same author, volatile by nature; its IMAP numbers were recomputed (chi-square p = 0.30) and one sentence of the verdict points to it.

## Length judgement
Reading 23 minutes core plus 5 in closed details (measured 2026-11-27, `audit_pages.mjs`), against the post's own 56. The post spends most of its length on 30 per-condition sections; this page groups them into four families (one section each, keeping every count the post reports) and spends the time it saves on the evidence the post omits. Ledger: 228 units, core 167, depth 51, volatile 7, fat 3, problems 0.
