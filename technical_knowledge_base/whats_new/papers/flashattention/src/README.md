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
- `check_page.mjs` (from the repo root with node): every control in light 920 and dark 390, the animation stepped through all three modes and every block size, text at least 11 px, no NaN or errors, no sideways scroll, and the simulator against `recompute.json`.
- `mk_coverage.py`: writes and verifies `coverage.json` against `live.md` (63 items).

## Parts

HTML: `00_top`, `01_css` (ZeRO's copy of the reference CSS), `02_header`, `03_paper`, `04_run`, `05_tables`, `06_then`, generated `_gen_card`, `_gen_more`. JS: `10_js_common`, `_gen_data`, `11_js_ui` (reference, unchanged), `12_js_fa` (cost model and simulator; `window.__faCheck()`), `13_js_read`, `14_js_run`, `15_js_tables`, `16_js_then`, `14b_js_hero` (the hero, static), `99_js_tabs` (the skill template, storage key `fa-tab`; replaced `90_js_tabs` on 2026-10-25). `04_run.html` was removed on 2026-10-25: its content is in `03_paper.html`.

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
