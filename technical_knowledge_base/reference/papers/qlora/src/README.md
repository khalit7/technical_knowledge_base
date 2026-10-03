# QLoRA: Efficient Finetuning of Quantized LLMs: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d815a8f4edc33f9583671, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built on the paper method (`html_utils/methods/papers.md`) from the reference folder's pieces, by way of the LoRA page's copies.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with the verdict (from `paper.json`); Problem (780 GB predict question, memory bars); Idea (Eq. 5, one real block quantised by three types, animated); NF4 (the bitsandbytes recipe against Appendix E and Eq. 4, occupancy predict question, Appendix F rerun); Double quantisation (calculator, the FP8 against dynamic-map correction); Paged optimizers (animation); All-layer LoRA (Figures 2 and 4 from the vector PDFs behind a predict question); Does 4-bit match 16-bit? (Tables 2 to 4, our small-model results); Guanaco; the evaluation (Elo predict question with prompt-resampled intervals; Table 6's duplicated row); lemons; limits; How much of this to believe; What it takes to use this; Why it matters; Connections. Three long passages are folded into details blocks. |
| Quantise real weights | `t-quant` | Live ingredient 1: the quantiser on real LLaMA-7B weights; whole-matrix results (error, entropy, Shapiro-Wilk); Table 2 at small scale (quant_ppl.py); Table 3 at toy scale (train_qlora.py). |
| Rerun the tournament | `t-eval` | Live ingredient 2: the Elo tournament replayed from the released judgments with every knob, a prompt bootstrap, one ordering traced; Table 6 rebuilt from the released scores; order effects and agreement. |
| The paper's tables, rebuilt | `t-tables` | Every checkable number checked (recompute.py and recompute_eval.py), all 13 tables sortable with deltas from any row, the values behind Figures 2, 4 and 6. |
| Further reading | `t-more` | Generated from `paper.json`. |

**Why this shape (departures from papers.md).** QLoRA is two papers in one: a quantisation recipe and an evaluation study. Each half gets its own live ingredient, so there are two "run it" tabs instead of one. The training-recipe row of the method would suggest running the update rule live, but LoRA's update is already trained live on the LoRA page, so this page runs what is specific to QLoRA: the storage data types on real weights, and the paper's own Elo pipeline on its released judgments (the strongest evidence check on the page, because the raw data exists). No "Then and now" tab: the successors (AF4, LoftQ, QA-LoRA, fused kernels) are refinements that fit in one paragraph of "Why it matters", and the LoRA page's Then and now already places QLoRA in LoRA's lineage. Two small offline experiments (perplexity after quantisation, a toy QLoRA recovery run) replace the toy model of architecture papers.

## Data and scripts

All commands from `src/`; caches go to `$QLORA_CACHE` (default `/tmp/qlora_cache`), never into the repo. torch is never added to pyproject.toml.

| Script | What it does | Output |
|---|---|---|
| `save_live.py <transcript>` | copies the Notion fetch verbatim | `live.md` |
| `extract_paper.py <html>` | arXiv HTML v1 to text and tables | `inputs/paper_v1.txt`, `inputs/table_*.txt` |
| `extract_figs.py <dir>` | Figures 2 and 4 from the vector PDFs of the arXiv source (`https://arxiv.org/e-print/2305.14314`), Figure 6's printed labels | `inputs/fig_points.json` |
| `dtypes.py` | the 4-bit codes exactly as bitsandbytes builds them, the 8-bit dynamic map, an FP8 E4M3 grid, the Appendix E check | `inputs/dtypes.json` |
| `fetch_weights.py` (`uv run --with numpy --with scipy`) | range-fetches four whole LLaMA-7B matrices from huggyllama/llama-7b, measures every block, reruns Shapiro-Wilk, writes the browser sample | `model/weights_stats.json`, `inputs/weights_sample.json` |
| `fetch_eval.py` | downloads the released judgments (about 90 MB to the cache) and keeps a compact copy; decides answer order from answer ids (the trained systems' file names state it backwards) | `inputs/eval_compact.json` |
| `recompute_eval.py` | Elo (10,000 orderings), prompt bootstrap, Table 6, Table 12, order effects, κ, rank correlations | `inputs/eval_recompute.json` |
| `quant_ppl.py` (`uv run --with torch --with transformers --with pandas --with pyarrow`) | perplexity of small open models after round-to-nearest with each type | `model/quant_ppl.jsonl`, `model/quant_ppl.log` |
| `train_qlora.py` (same env) | Pythia-160M with LoRA on 16-bit and 4-bit bases, 200 steps each, 7 runs (5 settings, a second seed for two of them; full finetuning was dropped for CPU time) | `model/train_qlora.jsonl`, `model/train_qlora.log` |
| `recompute.py` | memory accounting, DQ, Elo arithmetic, table checks; run by build.sh | `inputs/recompute.json` |
| `mk_paper.py`, `mk_data.py` | card, Further reading, `window.PAPER`; packs all data into `parts/20_data.js` (`window.QD`) | `parts/_gen_*`, `parts/20_data.js` |
| `check_engine.py` then `node check_engine.mjs` | the browser engine against Python: NF4 values, 60 quantisations, DQ, Elo in a fixed order for all three tournaments, Table 6 | `model/check_engine.json` |
| `node check_page.mjs` (from the repo root) | every control in both themes and widths, a prompt bootstrap per judge, both animations stepped | console |
| `mk_coverage.py` | every fact of `live.md` checked against the built page | `coverage.json` |

Parts: `00_top`, `01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `90_js_tabs` and `build.sh` come from the reference folder (via LoRA); `22_js_engine.js` is the engine (codes, quantise, DQ, tournament decoding, Elo, bootstrap, Table 6), loaded by node for the checks; `13_js_read.js`, `23_js_quant.js`, `24_js_eval.js`, `25_js_tables.js` draw the tabs.

## Honesty notes

- Quantisation in quant_ppl.py and train_qlora.py is simulated (quantise, dequantise, compute in FP32 on CPU), not the bitsandbytes CUDA kernels with BF16 compute; the codes and the round-to-nearest rule are identical (check_engine reproduces the indices).
- The paged-optimizer animation's activations are an illustrative formula; only the static parts are the paper's figures.
- The human Elo uses one match per three-worker comparison (majority, no majority = tie), which reproduces Table 7 more closely than one match per vote; both are selectable.
- "huggingchat-33b" standing in for the Open Assistant 33B row of Table 6 is our inference from the file name.
