# How this page is built

Page kind: article (`.claude/skills/explainer-page/page-kinds/article.md`), built 2026-11-27 from the reference folder `../../weight_space_programming/src/` (its README has the table of shared files).

## Build and check
```sh
python3 src/recompute.py                            # (from the page folder) writes inputs/recompute.json: the toy's and calculator's numbers
bash src/build.sh                                   # writes ../index.html; stops on a missing text fragment, an em-dash or an unexpanded macro
node <page>/src/check_page.mjs <page>/index.html    # from the repo root: every control, 390 dark, 920 and 1400 light; toy and calculator against recompute.json; prose numbers
python3 html_utils/ledger.py init <page> && python3 <page>/src/label_ledger.py && python3 html_utils/ledger.py check <page>
```
`inputs/article.txt` (the full text) is gitignored; re-extract it with `extract_article.py` (its docstring) before changing a fragment. Without it, the build uses `fragments.json` and gives the same page.

## What differs from the reference folder
| File | Change |
|---|---|
| `extract_article.py` | `URL`, `START`/`END` (`<article class="content">`), and `DROP`/`balanced()`: this site renders maths with KaTeX (the visual copy is dropped, the TeX annotation kept) and puts citations in sidenotes (each kept as its own `[note: ...]` block, so no fragment spans a note and its sentence). |
| `mk_article.py` | `DATA_EXTRA = {}`; the Further reading line about the article now reads `more_note` from `article.json` (the reference's text named that article's Setup boxes). |
| `check_page.mjs` | Generic loop kept; the toy and calculator are compared with `inputs/recompute.json` (worst relative difference printed) and 16 prose numbers with the same data. |
| `recompute.py`, `inputs/recompute.json` | This page's own: the NVFP4 and MXFP8 quantisers (E2M1, E4M3, E8M0; nearest with ties to even, and stochastic rounding as exact expectation and variance), the five backward operands, and the calculator's formulas. Self-tests in its docstring: 593.7 becomes 576 (the article's Figure 1) and 2.25 rounds stochastically to 2.25 in expectation (its section 4 example). |
| `parts/22_js_e4_figs.js`, `23_js_e4_toy.js`, `24_js_e4_calc.js` | Hero, MoE traffic diagram; the toy (a line-by-line port of `recompute.py`, same seeded generator); the calculator. |
| `parts/03_css.html` | `e4-` classes appended. |
| `real_edit.py`, `inputs/real_edit.json` | Not copied (that article's own measurement). |

## Departures from page-kinds/article.md
- **No code or logs, no discussion thread on the card.** The lab released no code, kernels or logs; the Hacker News thread could not be opened from the build machine (403, and the Algolia API returned nothing), so its size is quoted in the responses section from the knowledge base's research reading and not put on the card as a dated reading.
- **The responses are replications and a port, not rebuttals**, because none were found; the section says so, and says where a response is right (the released weights are 4- and 8-bit only).
- **The live ingredient measures what the post argues but never quantifies** (bias against noise of each way to hand a 4-bit tensor to the backward pass), on an illustrative tile, kept inside Reading (no tab), as a widget that opens on the article's own choice. No predict-then-reveal prompt: the table beside it gives every answer at once, and hiding it would cost more than the pause buys.
- **A second small widget, the calculator**, because the post's two headline numbers (8% speed, 2% efficiency) are never netted against each other, and "8% speedup" is ambiguous; it is derived, labelled by construction.
- **Mechanisms owned elsewhere are linked, not redrawn**: formats and the bit explorer, the Hadamard rotation (Fig. 8) and the recipe's layer diagram (Fig. 10) on Quantization and Precision; stochastic rounding's arithmetic on Numerical computing for ML.

## Length judgement
Reading 19 minutes core plus 3 in closed details (measured 2026-11-27, `audit_pages.mjs`), against the article's own 16. A first draft measured 23 and was condensed (restatements of the article cut, captions shortened, the response notes and the knowledge-base list cut to one sentence each) without losing a claim or number. The rest is right for this page: the article's argument in its order now takes about 12 minutes, and the page adds what the post lacks: the evidence judged, the four responses, the toy's bias and noise numbers and the netted cost. Ledger: 187 units, core 133, depth 47, volatile 5, fat 2, problems 0.

## Sources read (27 November 2026)
The post (fetched 27 November; metadata: published 13 November, modified 25 November) and three Wayback copies (14 November 13:12 UTC, the first; 15 November 07:45; 16 November 17:17), extracted and diffed: one change, a credit to TetraJet-v2 added in section 5. The Inkling 2 Small model card (Hugging Face); NVIDIA NeMo AutoModel's Inkling 2 Small page (search summary: layers 0 to 39 NVFP4 experts, 40 to 47 MXFP8); the two replication repositories (VizuaraAI/4bit-training-b200, created 15 November; saurabhghatnekar/looped-transformer-4bit, created 23 November; READMEs, GitHub API for dates); radixark/miles issue #4952 and its comment; OnixResearch/inference-lab issue #26 (a test harness, no results; not listed); Ziang Li's humans& post; the abstracts of arXiv 2607.24953 and 2611.15671 (the second measures inference drift, not training; not used); AlphaSignal and FourWeekMBA (press restating vendor figures). The knowledge base pages Quantization and Precision, Numerical computing for ML, RL for LLMs, Fair Cast, Mixture of experts, GPU architecture, Interconnects and scaling, Other notable providers, and the 2026-11-16 and 2026-11-23 issues.
Unconfirmed, left out: Inkling 2 Small's pretraining token count (8.4T appears only in press coverage) and GPU count; the Latent Space pick of the post (its AINews issue found covers the Inkling launch only).
