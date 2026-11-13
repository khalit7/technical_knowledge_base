# FlashAttention: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81e4a3e8e7a2c4771381, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built on the paper-page method (`.claude/skills/explainer-page/page-kinds/paper.md`) from the Attention Is All You Need and ZeRO folders.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with the verdict; the core sentence and hero (standard against FlashAttention, HBM against SRAM); the kernel animation, the scale panel and the block-size chart (formerly the Run the kernel tab, see the light pass below); Problem; the GPU's memory (A100 hierarchy chart, Algorithm 0, predict: more FLOPs but faster, with Figure 2's bars); Tiling (online softmax formula, predict and a live one-row demo with a "skip the rescale" toggle, Algorithm 1, Theorem 1 with the measured rounding error); Recomputation (Appendix B, the D_i trick, Rabe and Staats); IO complexity (Theorem 2, predict: double the SRAM, with Algorithm 1's exact count against M; Proposition 3); Block-sparse; Results; Limitations; How much of this to believe; Why it matters; Connections. |
| The paper's tables, rebuilt | `t-tables` | Figure 3 rebuilt from appendix Tables 9 to 21 (pass, dropout, masking, memory; group toggles; read-off table), Figure 2 with the cost model, Tables 1 to 7 with recomputed columns, and every number in the text checked (27 claims). |
| Then and now | `t-then` | FA-1 to FA-4 as step cards (what the previous version left, loop picture, changes, headline, source), where it runs now, compiling IO-aware attention, using it today. |
| Further reading | `t-more` | Generated from `paper.json`. |

**Departures from papers.md.** The live ingredient is the systems kind, but it runs real arithmetic rather than only a cost model: the online softmax is the part people find hard, so the animation computes every tile and shows that the output matches the plain formula (max difference about 1e-15), while the counters follow the paper's own algorithms line by line. A third mode (FlashAttention-2's loop order) was added because the old page tells the reader to picture that order today; it doubles as the only animated part of Then and now, which is otherwise a set of sourced cards (the design did not change shape, only its mapping to each GPU). No toy model is trained: FlashAttention changes no outputs, so training would teach nothing. "What it takes to use this" is folded into Then and now's "Using it today", since the method is standard but still adopted directly (PyPI versions, licence, FA-3 and FA-4 betas). The Reading tab is 20 minutes against the old page's 12, because the paper page owns every detail (Appendix B's backward derivation and the evidence section are new).

## What reproduces and what does not

- Every printed speedup, ratio, lift and memory ratio in §4 and Appendix E recomputes from the tables (see the checks table), with two exceptions: §4's "1.8× over Megatron" (no row gives it; the table says 1.7×) and one Table 3 average (59.24 printed 59.3).
- Figure 2: the FlashAttention HBM figure is reproduced within 5% (4.61 against 4.4 GB) by counting Algorithms 1 and 4 with B_c = ⌈M / 4d⌉ for 192 KB of SRAM, a reconstruction; the standard figure is not reproduced by Algorithms 0 and 3 alone (25.2 against 40.3 GB) and only reaches 42.4 GB if masking and dropout are counted as separate passes; the GFLOPs column is about 12 times smaller than the matrix multiplies of the stated workload and is not explained.
- The page's JavaScript simulator and `recompute.py` are independent implementations of the same counts; `check_page.mjs` asserts they agree for block sizes 4, 8 and 16, with and without masking and dropout, and that the Figure 2 model matches to 1e-9.

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, assembles `parts/`, expands the link macros (see the reference folder), fails on an unexpanded macro or an em-dash.
- `paper.json`, `mk_paper.py` (card, Further reading, `window.PAPER`; `where_label` extended to appendix anchors).
- `mk_tables.py`: `tables.json` from the extracts (Tables 5 and 6 share one HTML figure, so they are parsed from the paper text).
- `recompute.py`: the HBM counts of Algorithms 0 to 4, Figure 2 reconstruction, FLOPs, an online-softmax exactness test, the toy counts, and the claim checks. Writes `inputs/recompute.json`.
- `save_live.py` copied the Notion fetch verbatim into `live.md`; `extract_paper.py` turned the arXiv HTML v2 into `inputs/paper_v2.txt` and `inputs/table_*.txt`; `inputs/later_extracts.txt` holds the quoted lines from FlashAttention-2, -3, -4, Mamba, PyPI, the repo README and usage.md, PyTorch, cuDNN, vLLM and the FlexAttention blog.
- `check_page.mjs` (from the repo root with node): every control in light 920 and dark 390, text at least 11 px, no NaN or errors, no sideways scroll, and the simulator against `recompute.json`.
- `check_stages.mjs` (from the repo root with node, 2026-11-13): both 3D stages at 1400 light, 920 light and 390 dark (autoplay on view, one list item per step in every mode, flows stop off screen, reader control stops autoplay, last step reached), every split two columns at 1400, reduced motion, and 43 numbers in the step lists and the block-size table against the simulator and Figure 2's table.
- `mk_coverage.py`: writes and verifies `coverage.json` against `live.md` (63 items).

## Parts

HTML: `00_top`, `01_css` (ZeRO's copy of the reference CSS), `02_split` (template, 2026-11-13), `02_header`, `03_paper`, `05_tables`, `06_then`, generated `_gen_card`, `_gen_more`. JS: `10_js_common`, `_gen_data`, `11_js_ui` (reference; its `makeAnim` is no longer used), `12_js_fa` (cost model and simulator; `window.__faCheck()`), `13_js_read`, `14_js_run` (the toy runs, the live readout under Fig. 2's step list, the scale panel and the block-size chart; `window.__kx`), `15_js_tables`, `16_js_then`, `25_js_s3` (renderer v2, template), `31_js_sc_hero` (Fig. 1), `32_js_sc_kx` (Fig. 2), `99_js_tabs` (the skill template, storage key `fa-tab`). `04_run.html` was removed on 2026-10-25 and `14b_js_hero.js` (the static 2D hero) on 2026-11-13.

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence and a hero (`14b_js_hero.js`, static): the idea of the paper's Figure 1 (left) redrawn as standard attention against FlashAttention, HBM band against SRAM box, with Figure 2's printed numbers (40.3 against 4.4 GB, 41.7 against 7.3 ms, 66.6 against 75.2 GFLOPs); the arrows are marked schematic. The paper is under arXiv's non-exclusive licence, so no figure is embedded. Then "You need" (Performance math, Memory hierarchy, Writing kernels) and the new terms.
- **Real image**: a CC0 near-infrared photo of a P100 package (die plus four HBM stacks on one interposer) beside the A100 hierarchy chart, captioned with what to notice and credited (`img/CREDITS.md`). No openly licensed A100 photo was found (the Commons A100 render is a vendor image of doubtful licence), so the P100, same layout, is used and named as such.
- **The Run the kernel tab moved into the Reading flow**: it explains one mechanism, so the animation (standard, FlashAttention, FlashAttention-2 order on the same input) now sits under Algorithm 1 in Tiling, the paper-scale panel under the IO complexity argument, and the block-size chart in a closed block there. The tab is gone; the card's link and Then and now's "run both orders" point at `#kx`.
- **Visuals inline**: Figure 2's bars, the online-softmax demo and the Theorem 2 curve left the predict reveals; each sits in a card right after its question.
- **No autoplay**: `makeAnim` patched as on LoRA; `reset()` in `14_js_run.js` no longer restarts at a mid-step; `90_js_tabs.js` replaced by the template. `check_page.mjs` fails if `#kx` draws a frame before a click, opens every closed block, and creates `.shots/` itself.
- **Owned elsewhere, a sentence kept and linked**: arithmetic intensity and the roofline (Performance math); FA-2 to FA-4 as kernels (Writing kernels); which library runs under SDPA today (Libraries and tensor cores).
- **Closed**: the backward pass's D_i trick, Rabe and Staats, the proof idea of Theorem 2, the training setups, Apex FMHA and the per-GPU speedups, the animation's counting rules and the scale panel's units; in the tables tab, Tables 1 to 7 (a jump from the tab's nav opens the block). Figure 3 and every number checked stay open.
- **Volatile**: where it runs (PyTorch, cuDNN, vLLM, integrations, MLPerf), TensorRT-LLM's own kernels, and the PyPI versions of FA-2, FA-3 and FA-4 moved to one dated closed block in Then and now, "Where it runs now, and the library versions (checked 3 October 2026)".
- Header: "Reading: 24 min, plus 3 in closed details." from `reading.json`. Author emails in `inputs/paper_v2.txt` redacted; `extract_paper.py` now redacts them.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 19.9 min (4,582 words) | 24.0 min (5,519) |
| The paper, closed | 0 | 2.8 min (654) |
| Run the kernel | 4.4 min (1,008) | folded into The paper |
| The paper's tables, rebuilt | 9.1 min | 5.6, plus 3.6 closed |
| Then and now; Further reading | 2.7; 1.8 min | 1.8 plus 1.1 closed; 1.8 |
| Visuals drawn in Reading (audit) | 1 | 9 |

Why about 24 minutes is right: The paper plus the old Run tab was 24.3 minutes of open text; it is now 24.0 in one flow, with the top (core sentence, hero caption, You need, new terms, photo caption, about 2 minutes) paid for by closing derivations, setups and per-GPU detail. What stays open is the paper's argument with the visual that proves each step beside it, and the evidence section the paper page owns.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
231 units: core 204, depth 17, owned 3, volatile 5, fat 2. 219 drafted by `ledger.py init` from the page as committed before the pass; 12 added (core sentence, hero, new terms, photo, three owner links, five script-drawn tools and tables). `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 4, 184 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 340 actions, 0 problems; the simulator still equals `recompute.py` (std 4,608, FlashAttention 2,496, FA-2 order 1,312 values; Figure 2 model 25.233 and 4.605 GB). `mk_coverage.py`: 63 of 63.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (after `01_css.html`), `25_js_s3.js`, `05z_errbox.js.html`, `99_js_tabs.js` (key `fa-tab`). `21_js_rd_common.js` is not used (no `RD.anim` on this page).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| The paper | Core sentence, You need, New terms | split | **3D** `stg-hero` (Fig. 1) | yes, 6 |
| The paper | Problem | full width | none | no |
| The paper | The GPU's memory (levels, kernels) | split | 2D log bars (hierarchy) and the P100 photo, stacked | no |
| The paper | Standard attention, predict 1 | split | 2D Figure 2 bars | no |
| The paper | Tiling: online softmax, predict 2 | split | 2D one-row widget (block size, new scores, skip the rescale) | no |
| The paper | Tiling: Algorithm 1, Theorem 1 | split | **3D** `stg-kx` (Fig. 2), modes standard (or with masking and dropout), FlashAttention, FA-2 order | yes, 5 / 7 / 6 / 6 |
| The paper | Recomputation | full width | none (two closed blocks) | no |
| The paper | IO complexity: Theorem 2, predict 3, Proposition 3 | split | 2D Theorem 2 curve (log-log) | no |
| The paper | The same counters at the paper's scale | split | 2D tool: sliders, bars, stats | no |
| The paper | Why bigger blocks stop helping (closed) | full width | 2D bound chart | no |
| The paper | Block-sparse, Results, Limitations, How much to believe, Why it matters, Connections | full width | none | no |
| Tables | Figure 3 rebuilt | split | 2D tool (notes left; controls, chart and read-off table right) | no |
| Tables, Then and now, Further reading | the rest | full width | tables, version cards | no |

**Stages and their data.**
- `31_js_sc_hero.js`, Fig. 1, the hero (replaces the static 2D hero): HBM as a large slab, SRAM as a small raised one; Q, K, V, S, P and O as glass plates to scale for N = 1,024, d = 64; standard attention's three kernels each with its streams (thick for N x N), FlashAttention's fused kernel with blocks and one tile on chip and the N x N plates faint (never stored), then Figure 2's bill as bars on white plinths, the camera moving in close. Numbers read from `PAPER.tables.f2` (66.6 and 75.2 GFLOPs, 40.3 and 4.4 GB, 41.7 and 7.3 ms) and §2.1; slabs and stream widths are schematic, said under the list.
- `32_js_sc_kx.js`, Fig. 2 (replaces the 2D kernel animation; the long replay is grouped by the long-replay rule): the toy run of `FA.simulate` (N = 32, d = 4, blocks of 8, seed 7) in three modes. Each matrix is a glass plate with one cell per value; reads and writes stream between HBM and SRAM, sized by the values moved; the S plate lights its tiles in the loop's order (column by column under Algorithm 1, row by row under FA-2's order); the running HBM count stands as a bar beside standard attention's whole run; the followed row's m, ℓ and four output values are bars on a plinth on the chip, with the rescale factor when its maximum rises. A FlashAttention step is one outer iteration and plays its four inner iterations. Every count in the step lists ("So far", "Whole run") and the block-size table (blocks of 4, 8 and 16, which replaces the block-size select) is checked against the simulator by `check_stages.mjs`; the counters and the followed row's numbers are a live readout under the list.
- Online softmax for one query block is drawn on Writing kernels (Fig. 6), which owns it; this page links to it and draws what the paper adds: the whole loop, both loop orders, and the HBM traffic Theorem 2 counts.

**Kept 2D**: the hierarchy (two log-scale bars: capacity and bandwidth differ by orders of magnitude); Figure 2's bars (three pairs of numbers); the online-softmax widget (one row of eight scores with a table); the Theorem 2 curve and the block-size bound (log axes); the scale panel (a tool with six controls); Figure 3 (log-log runtime curves) and the tables; Then and now's version cards (text cards with a toggle, no spatial structure).

**Motion.** Both stages play once at least half in view and stop for good on any reader control or at the last step; the mode toggle and the masking checkbox swap the list and replay; "New random input" redraws without replaying (the counts do not depend on the input, only the followed row's numbers). The per-step caption of the old animation moved into the step lists. `check_page.mjs` no longer asserts that nothing moves before a click; `check_stages.mjs` asserts autoplay instead.

## Length judgement (2026-11-13)
| | Before (2026-10-25) | After |
|---|---|---|
| The paper, core | 24.1 min (5,546 words) | 29.4 min (6,772) |
| The paper, closed | 2.8 min (654) | 3.1 min (707) |
| Tables; Then and now; Further reading | 5.6 + 3.6; 1.8 + 1.1; 1.8 | unchanged |
| Visuals in Reading (audit) | 9 | 9 (the two animations are now stages) |

The growth is the step lists: Fig. 1's (256 words) replaces a 120-word caption; Fig. 2's four lists (929 words) replace a caption drawn by script, invisible to the audit, and 711 of those words belong to the three modes hidden by default. A reader following the default mode reads about 26 minutes. Nothing was cut; the block-size table (new) replaces the block-size select. Header: "Reading: 29 min, plus 3 in closed details."

Ledger: 238 units (core 209, depth 18, owned 4, volatile 5, fat 2); 7 added (the two figures, their provenance, the FA-1 and FA-2 traffic claims, the block-size table, and the owner link to Writing kernels' Fig. 6, keyed on that page); keys re-pointed on 160, 165 and 227 (the old animation's wording). `ledger.py check`: problems 0.
