# QLoRA: Efficient Finetuning of Quantized LLMs: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d815a8f4edc33f9583671, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built on the paper method (`.claude/skills/explainer-page/page-kinds/paper.md`) from the reference folder's pieces, by way of the LoRA page's copies.

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

Parts: `00_top`, `01_css`, `05z_errbox`, `10_js_common`, `11_js_ui` and `build.sh` come from the reference folder (via LoRA); `99_js_tabs.js` is the explainer-page template (storage key `ql-tab`, a `data-to` link opens the closed block that holds its target); `22_js_engine.js` is the engine (codes, quantise, DQ, tournament decoding, Elo, bootstrap, Table 6), loaded by node for the checks; `13_js_read.js`, `23_js_quant.js`, `24_js_eval.js`, `25_js_tables.js` draw the tabs.

## Honesty notes

- Quantisation in quant_ppl.py and train_qlora.py is simulated (quantise, dequantise, compute in FP32 on CPU), not the bitsandbytes CUDA kernels with BF16 compute; the codes and the round-to-nearest rule are identical (check_engine reproduces the indices).
- The paged-optimizer animation's activations are an illustrative formula; only the static parts are the paper's figures.
- The human Elo uses one match per three-worker comparison (majority, no majority = tie), which reproduces Table 7 more closely than one match per vote; both are selectable.
- "huggingchat-33b" standing in for the Open Assistant 33B row of Table 6 is our inference from the file name.

## Light pass, 2026-10-25 (teaching contract)

- **Top**: the core sentence, the hero (the paper's own Figure 1, full finetuning against LoRA against QLoRA with paging to CPU; the paper is CC BY 4.0, so the figure is embedded from `img/fig1_finetuning_memory.webp` and credited, see `img/CREDITS.md`), You need (LoRA paper page, PEFT, Quantisation and precision) and New terms (NF4, DQ, paged optimizer, storage and computation type, Guanaco).
- **Owned elsewhere**: the general blockwise absmax recipe is now one sentence plus a link to Quantisation and precision, keeping what QLoRA did with it (B = 64); LLM-judge biases in general link to LLM-as-judge, while this paper's numbers (τ 0.43, κ 0.25 and 0.42, Elo 1,348 against 1,176) stay.
- **Moved into closed `<details>`** (nothing deleted but fat): Eq. 4 against the released code with the offset slider (one sentence stays), the Shapiro-Wilk rerun (one sentence stays), the FP8 against dynamic-map correction, the small-model experiments box, the 26 GB Alpaca correction, Table 6's duplicated row, the 1833 correction (joined the lemons block, with a one-sentence summary in the core), Table 8's weighting and the rest of section 9, the list of inconsistencies, the Guanaco 65B script settings, and a dated adoption block (framework support). In the Tables tab, the full claims list and the figure values are closed blocks; the sortable table browser stays open.
- **No autoplay**: `makeAnim` (11_js_ui.js) waits on step 1, also after a mode switch; `check_page.mjs` fails if `qb` or `pg` draws a frame before play or on a mode switch, and now opens every closed block before auditing a tab. Header: "Reading: 25 min, plus 8 in closed details." (`reading.json`, from audit_pages.mjs).
- **Length**: Reading core 28 min before (6,374 words) plus 3 closed, 25 after (5,649) plus 8 closed; other tabs 20 min before, 12 core plus 8 closed after (the Tables tab went from 2,106 words open to 295 open and 1,819 closed). What stays open is the paper's argument in its order (problem, the one equation, NF4, DQ, paging, all-layer LoRA, the 4-bit against 16-bit results, Guanaco, how the chatbots were judged, limits, the evidence judgement, use, why it matters), which this page owns; the two live tabs stay because each is a tool the whole Reading tab points into.
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 269 units, core 208, depth 54, owned 3, volatile 1, fat 3 (the old reading-time line, the tab labels, the old "stops off screen" autoplay note); `ledger.py check` problems 0.
- `mk_coverage.py`: the reading-time item now looks for the new header line; 47 of 47.

Rechecked 2026-10-25: `checkpage.sh` 5 tabs, 305 KB, emdash 0, errbox 1, clipped 0, fail=0; `check_page.mjs` 388 actions, 0 problems; `check_engine.mjs` PASS; `mk_coverage.py` 47 of 47.
