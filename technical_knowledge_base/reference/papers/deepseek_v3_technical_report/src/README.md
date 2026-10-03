# DeepSeek-V3 Technical Report: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d815fb8dac9ba1e35ab81, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built on the paper-page method (`html_utils/methods/papers.md`) with the FlashAttention folder's copies of the shared pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with the verdict; a box saying what is linked rather than rebuilt; Problem; Architecture (MLA, DeepSeekMoE, parameter breakdown recounted from config.json); Balancing (the bias rule, Table 5's evidence, predict: a batch-wise auxiliary loss, with §4.5.3's validation losses); MTP (Table 4's evidence, predict: 1.8× with a live acceptance-rate calculator); Infrastructure (layout, DualPipe with Table 2, all-to-all kernels, memory, serving, hardware wishlist); FP8 (framework, the four changes, storage and communication, Appendix B, predict: per-tensor E4M3 with 10⁵ outliers, run live); Pre-training; The bill (predict: how much of Llama 3.1 405B's 11× is work); Post-training; Results; How much of this to believe; What it takes to use this; Why it matters; Connections. |
| Quantise and accumulate | `t-fp8` | The live ingredient: two before/after animations with exact arithmetic. Scaling: per tensor, 1×128 tiles, 128×128 blocks, on a 32 × 512 activation matrix with outliers on channels or tokens, E4M3 or E5M2 (heatmap, then rounding outcome, then relative error; counters for scales, zeros, subnormals, median error). Accumulation: one dot product with 14-bit tensor-core accumulation against promotion every 128, under two readings of §3.5.2, with the register window and the running error. Then error against K for both readings and modes, and a "what reproduces" box. |
| Check the bill | `t-cost` | Table 1 with a price slider; utilisation (6ND, attention, MTP, BF16 or FP8 peak) against Llama 3.1 405B; GPU hours per unit of work; wall clock per stage; what the $5.576M leaves out. |
| The paper's tables, rebuilt | `t-tables` | Tables 4 and 5 as gains per benchmark at both scales; Tables 3 to 9 sortable with deltas against any column, best values marked and win/tie/loss counts (Table 3 with its caption's 0.3 tie rule); every recomputable number in the text checked (30 claims, 3 where text and tables disagree). |
| Further reading | `t-more` | Generated from `paper.json`. |

**Departures from papers.md, and why.**
- *Live ingredient.* V3 is several kinds of paper at once (architecture, systems, training recipe, a cost claim). A toy MoE would teach little that the DeepSeek lab page and Topic: llms do not already animate (MLA, bias balancing, DualPipe, EPLB), so as briefed the page links to those and runs what is specific to this report: FP8 numerics (the training-recipe kind: the rule run live on a small problem, old against new) and the cost claim (the empirical kind: recomputed from the paper's numbers and checked against an outside yardstick). No model is trained, so there are no weights.
- *Two "live" tabs.* The cost check gets its own tab because the bill is the claim most people know this paper for, and because the arithmetic is the strongest evidence in the "How much to believe" section.
- *No Then and now tab.* What followed (open-source week kernels, Transformer Engine's block-scaling recipe, MXFP8, V3's successors) is short and sourced in "Why it matters" and "What it takes to use this"; the lineage already lives on the DeepSeek lab page.
- *Reading length.* About 26 minutes against the old page's 12: the paper page owns the report's details (serving layout, storage formats, hyper-parameters, post-training pipeline). The Infrastructure serving paragraph and the FP8 storage paragraph could fold into details blocks if Khalid prefers a shorter read.

## What reproduces and what does not

- Table 1, the 180K hours per trillion tokens, 3.7 days, under two months, 671B and 37B (recounted from config.json: 671.03B, 37.55B; with the MTP module 684.49B against the README's 685B), the 3.2× bandwidth ratio and the 13-expert bound, the serving GPU counts: all reproduce independently (`recompute.py`, the checks table).
- The GPU hours are plausible: at 6 × active parameters × tokens V3 used 34.3% of the dense BF16 peak and Llama 3.1 405B 34.5% (40.7% for V3 with attention and the MTP module, 20.3% of the FP8 peak). Derived, not printed; agrees with planetbanatt's estimate.
- Text against tables: Arena-Hard "over 86%" against 85.5 printed; "about 10%" above Qwen2.5 72B on AIME and CNMO is 15.9 and 27.3 points; AlpacaEval's "20%" is 19.5 points.
- FP8: the simulator reproduces the mechanisms (outliers push ordinary values under E4M3's range with per-tensor scaling; 1×128 tiles confine it; 128×128 blocks fail on token outliers, Appendix B.2's hypothesis; promotion every 128 elements cuts accumulation error by one to two orders of magnitude). It does not reproduce the "nearly 2%" at K = 4,096 exactly: the two readings of §3.5.2 give 0.28% and 6.8% for uniform inputs. The paper gives neither distribution nor metric.
- The JavaScript simulator agrees with `fp8_sim.py` exactly on 283 numbers (`check_fp8.mjs`), and the page recomputes the error-against-K chart live and shows it matches 24 of 24 points.

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an unexpanded macro or an em-dash.
- `paper.json`, `mk_paper.py` (card, Further reading, `window.PAPER`; `where_label` extended to lettered appendices, A2.SS1 to Appendix B.1).
- `mk_tables.py`: `tables.json` from `inputs/table_*.txt`.
- `recompute.py`: parameters from `inputs/hf_config.json`, the bill, FLOPs and utilisation, MTP arithmetic, communication arithmetic, win counts, the text checks; writes `inputs/recompute.json`.
- `fp8_sim.py`: the reference FP8 simulator (exact doubles, no transcendental functions, so JS and Python agree bit for bit); writes `inputs/fp8_sim.json` (about 25 s). `check_fp8.mjs` (node, from `src/`) runs `parts/12_js_fp8core.js` against it and writes `inputs/check_fp8.json`.
- `save_live.py` copied the Notion fetch into `live.md`; `extract_paper.py` turned the arXiv HTML v2 and v1 into `inputs/paper_v2.txt`, `inputs/paper_v1.txt`, `inputs/table_*.txt` and `inputs/anchors_v2.txt`; `save_extracts.py` wrote `inputs/external_extracts.txt` (README, planetbanatt, Llama 3.1 model card and paper, NVIDIA H100, Transformer Engine, DeepGEMM).
- `check_page.mjs` (from the repo root with node): every control in light 920 and dark 390, both animations stepped through every mode and option, text at least 11 px, no NaN or errors, no sideways scroll. `shoot.mjs` screenshots one element for review.
- `mk_coverage.py`: writes and verifies `coverage.json` against `live.md` (77 items).

## Parts

HTML: `00_top`, `01_css` (FlashAttention's copy plus table styles and two colours for zero and subnormal), `02_header`, `03_paper`, `04_fp8`, `05_cost`, `06_tables`, generated `_gen_card`, `_gen_more`. JS: `10_js_common`, `_gen_data`, `11_js_ui` (reference, unchanged), `12_js_fp8core` (simulator, no DOM), `13_js_read`, `14_js_fp8tab`, `15_js_cost`, `16_js_tables`, `90_js_tabs`.
