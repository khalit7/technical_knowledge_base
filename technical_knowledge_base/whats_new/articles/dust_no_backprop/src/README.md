# How this page is built

Article method: `.claude/skills/explainer-page/page-kinds/article.md`; reference folder `../weight_space_programming/src/` (build.sh, label_ledger.py, the template parts and `03_css.html` copied unchanged; `mk_article.py` copied from `../qorl_query_plans/src/` with its `DATA_EXTRA` changed; `extract_article.py` from `../transformers_from_memory/src/` with the qlabs.sh bounds and a rule dropping the citation hover cards, which repeat every reference inline).

## Build and check (from the repo root)
```sh
python3 <page>/src/recompute.py                       # the post's tables and every derived number -> inputs/figures.json
(cd <page>/src && nice -n 15 node toy/record.mjs)    # the toy's recorded curves -> toy/out/toy.json (about a minute)
(cd <page>/src && python3 -I toy/toy_port.py)         # independent numpy port: recomputes seed 1 at widths 8 and 32, exits 1 above 2e-6
bash <page>/src/build.sh                              # stops on a missing text fragment, an em-dash or an unexpanded macro
node <page>/src/check_page.mjs <page>/index.html <shots dir>   # controls at 390 dark, 920 and 1400 light; toy rerun in the browser; data and prose numbers
python3 <page>/src/label_ledger.py && python3 html_utils/ledger.py check <page>
```
`inputs/article.txt` (the post's text, gitignored) is re-made with `extract_article.py` from a fresh fetch; without it the build uses `fragments.json` and gives the same page.

## Files specific to this page
| File | What |
|---|---|
| `parts/22_js_du_toy_core.js` | The toy's arithmetic (window.DUT): a 16-input, tanh, 8-class network on 64 tokens; weight noise, activation noise with one batch reward, and activation noise with per-token rewards, all against the exact gradient; mulberry32 plus Box-Muller with fixed seeds. Runs in the page and in node. |
| `toy/record.mjs`, `toy/out/toy.json` | Recorded curves (8 seeds, widths 8, 32, 128), the fitted law per curve, token 1's estimate. |
| `toy/toy_port.py` | Independent numpy port with its own generator; agrees with the JS records to 5e-7. |
| `recompute.py`, `inputs/figures.json` | Tables 1, 2, 8 (appendix), Figure 3 and 4 values (the post's SVG data attributes), the Noise benchmark's Dust and backprop rows, and our compute count per update. |
| `parts/23_js_du_figs.js`, `parts/24_js_du_toy.js` | The figures and the toy card. |

## Departures from page-kinds/article.md
- **Section order**: the estimator (2.2) comes before the per-token argument (2.1), because the toy that teaches 2.1 needs the estimator's terms; both sit under the post's Method, whose own introduction states the estimator first.
- **A live ingredient in Reading (no tab)**: the three-estimator toy. Reason: the whole method rests on one claim (per-token credit cuts the noise dimensions behind each reward), and seeing the three curves separate, with the "naive" activation case worse than weight noise, teaches it faster than the post's prose; it also gives the 10^3 to 10^4 multiplier its scale (about d_in per layer). It opens at K = 1 so the prediction prompt's answer is not on screen; the live run is behind a button (the lesson about not computing on load).
- **A compute figure the post does not have**: forward-pass equivalents per update from Appendix E's allocation (a calculation, labelled), cross-checked against the lab's own later wall-clock timing.
- **The authors' follow-up benchmark (Noise) is a response, not only a "since" item**: its Adam measurement at 10M tokens changes the verdict on "competitive with backprop". The community records it later attracted, which are not Dust, sit in the Since block.

## Length judgement
Reading 16 minutes core plus 3 in closed details (measured 2026-11-27 with `audit_pages.mjs`), against the article's own 20 (main text to the references; the appendix adds about 11). The first draft measured 20; it was cut by condensing every section to its claim and evidence, shortening the response notes and moving the compute derivation and the full tables into closed blocks. Ledger: 175 units, core 111, depth 55, volatile 7, fat 2, problems 0.

## Sources read (27 November 2026)
The post and its appendix; four distinct Wayback captures (5 October 21:21 UTC to 9 October; the text is unchanged, only a site label was added); the repository at b20f7c0 (README, dust.py, model.py, baselines/backprop.py, commit history, six issues); the Hacker News thread in full via its item API (280 points, 82 comments, submitted 5 October 21:15 UTC); the launch post on X (5 October 19:41 UTC, via a public mirror API); the Noise repository README and its 10M archive README, and the Noise page on qlabs.sh; BrainDetox (6 October, full text); Stork.ai (10 October); explainx.ai (22 October); Werfel, Xie and Seung (NeurIPS 2003 abstract and the 2005 journal abstract).
Not found: an arXiv version; any independent replication of the training results; a reply from the EGGROLL authors.
