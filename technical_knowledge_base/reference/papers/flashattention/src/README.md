# FlashAttention: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81e4a3e8e7a2c4771381, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built on the paper-page method (`html_utils/methods/papers.md`) from the Attention Is All You Need and ZeRO folders.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with the verdict; Problem; the GPU's memory (A100 hierarchy chart, Algorithm 0, predict: more FLOPs but faster, with Figure 2's bars); Tiling (online softmax formula, predict and a live one-row demo with a "skip the rescale" toggle, Algorithm 1, Theorem 1 with the measured rounding error); Recomputation (Appendix B, the D_i trick, Rabe and Staats); IO complexity (Theorem 2, predict: double the SRAM, with Algorithm 1's exact count against M; Proposition 3); Block-sparse; Results; Limitations; How much of this to believe; Why it matters; Connections. |
| Run the kernel | `t-run` | The live ingredient: one forward pass on a real random 32 × 4 input, animated to scale for standard attention, FlashAttention (K, V outer) and FlashAttention-2's order (Q outer); HBM and SRAM drawn with one square per value, blocks flying in and out, counters (HBM traffic, N × N traffic, extra state, on-chip values, FLOPs, final max error), a followed row with its running m, ℓ and rescale factor; block size, masking and dropout, new input. Then the same counts at the paper's scale (Figure 2 by default) and the block-size lower-bound chart. |
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

HTML: `00_top`, `01_css` (ZeRO's copy of the reference CSS), `02_header`, `03_paper`, `04_run`, `05_tables`, `06_then`, generated `_gen_card`, `_gen_more`. JS: `10_js_common`, `_gen_data`, `11_js_ui` (reference, unchanged), `12_js_fa` (cost model and simulator; `window.__faCheck()`), `13_js_read`, `14_js_run`, `15_js_tables`, `16_js_then`, `90_js_tabs`.
