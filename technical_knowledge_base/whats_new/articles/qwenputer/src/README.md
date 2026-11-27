# How this page is built

Article method: `.claude/skills/explainer-page/page-kinds/article.md`. Built 2026-11-27 from the reference folder `../weight_space_programming/src/` (via the Raschka page's `mk_article.py`, which adds `more_note` and `companion`).

## Build and check
```sh
python3 src/recompute.py                            # from src/: writes inputs/recompute.json (toy reference outputs, benchmark counts and intervals)
bash src/build.sh                                   # writes ../index.html; stops on a missing text fragment, an em-dash or an unexpanded macro
node src/check_page.mjs <page>/index.html           # from the repo root: every control, 390 dark, 920 and 1400 light, toy against recompute.py,
                                                    # embedded chart data against inputs/recompute.json, prose numbers, autoplay and reduced motion
python3 src/label_ledger.py                         # after `python3 html_utils/ledger.py init <page>`; then `ledger.py check <page>`
```

## Files
| File | What it is |
|---|---|
| `extract_article.py` | The reference extractor; this site's bounds (`<div class="article-prose"` to `<section class="sub-card"`), the note numbers dropped and each margin note (`<span class="sidenote">`) put on its own line, so no fragment can span one. Headings carry ids, so margin labels use `ah:`. |
| `article.json` | Card, headline numbers, verdict, responses, follow-ups (`since`), resources, KB links, topics. |
| `mk_article.py` | Unchanged except `DATA_EXTRA`: the benchmark rows and the NUPA row from `inputs/recompute.json` for the chart. |
| `recompute.py` | The toy's reference arithmetic (six settings) and the benchmark counts, percentages (exact decimals) and Wilson 95% intervals. |
| `parts/20_read_a.html` | Card, idea in one sentence, You need, New terms, hero. |
| `parts/20_read_b.html` | The post's nine sections in order (Try it folded into section 9). |
| `parts/20_read_c.html` | How much of this to believe, responses, where it moves the KB, Since the article. |
| `parts/22_js_qp_hero.js`, `23_js_qp_toy.js`, `24_js_qp_bench.js` | The hero grid, the RAM toy, the chart. |
| `check_page.mjs` | The reference's generic control loop plus this page's checks. |
| `reading.json` | Minutes measured with `html_utils/audit_pages.mjs`. |

## Departures from page-kinds/article.md
- **The evidence section leans on the repository, not only on the post.** The post is short and cites no numbers beyond its chart; the released design log (`experimental/riscv/docs/rv32.md`) has every measurement and the commit history shows how the README's table changed. Each claim in "How much of this to believe" is checked against one of them (commits ca13310 back to 46ae3d5, 19 to 23 October; design log at 0cab570). This is the weight-space page's lesson ("read the released logs, not only the post") applied to code.
- **The live ingredient sits in Reading (section 2), as a step animation with parameter controls,** not a tab: it explains one mechanism at the point the text introduces it. The gate, write-strength and key controls redraw the current step instead of restarting the animation (they are parameters, not modes), so a reader at the read step can drag α and watch the readout.
- **Section 9 folds the post's "Try it"** (three shell commands) into one sentence; the commands are the post's and the reader is sent there.
- **No reply from the author** to the critiques was found; the responses are two Hacker News comments, one outside analysis and one news write-up. The brief described the AlphaSignal piece as a critique; read in full it is a news summary that repeats the post's framing and, in its body, notes the driver. It is listed as coverage.

## Length judgement
Reading 21 minutes core plus 3 in closed details (measured 2026-11-27, `audit_pages.mjs`), against the post's own 9. Long for the post, and right here: the post states its results in a few lines, and the page has to carry what makes them checkable (the update rule and its three conditions, the CPU's verification, what the driver does, the benchmark's sample sizes and provenance), which the post leaves to a 41 KB design log. The two closed blocks hold the numerics and the benchmark's history. Ledger: 206 units, core 148, depth 53, volatile 3, fat 2, problems 0.

## Sources read (27 November 2026)
The post (and its first Wayback copy, 28 October 14:03 UTC: identical text); its two follow-ups (hidden reasoning, oversight tools); the repository at 0cab570: `README.md`, `experimental/riscv/README.md`, `docs/rv32.md`, `docs/rv32-p3-status.md`, `chipformer/rv/chat.py` and `evalarith.py` (the lockstep check and the host-tool baseline), the commit list of 18 to 24 October and the README at f98888c and 9b05e65; the Hugging Face cards and configs of Qwen3.5-4B, Qwen3.5-4B-Qwenputer and the Filesystem model; the Hacker News item (Firebase API: 709 points, 147 comments, 117 comment texts read); the PyTorch Korea forum post (full text); AlphaSignal's write-up (the free part); Percepta's post (title and date only).
Not run here: the model itself (18.8 GB, a 24 GB GPU), so the benchmark and replay numbers are the author's. Left out, unverified: a Loom paper linked in the thread (the arXiv id did not resolve), the "nesformer" NES project and the Doom claims in later coverage.
