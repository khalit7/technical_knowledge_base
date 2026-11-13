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

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

Briefs `rebuild-page.md` and `layout-rollout.md`. Ownership (OWNERS.md): this page owns the paper (its method, numbers, evidence and the two live tabs). LoRA as practised and QLoRA's memory calculator live on the PEFT page (its Fig. 2 draws LoRA on a real matrix and Fig. 5 the training state in 3D); quantisation formats and scale granularity on Quantisation and precision (Fig. 2 there shares scales on real rows). Nothing here rebuilds those: the four stages show what only QLoRA adds, on this page's own LLaMA-7B sample and Figure 6 labels.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| The paper | core sentence, You need, New terms | split | the paper's Figure 1 (image, CC BY 4.0) | no |
| The paper | Problem | full width | memory bars inside the predict reveal (2D) | no |
| The paper | Idea, Eq. 5 | split | **3D** `stg-eq5` (Fig. 2) | yes, 7 |
| The paper | Idea, one block of 64 (`s-block`) | split | Fig. 3, 2D `makeAnim`, three types sharing one list | yes, 6 |
| The paper | NF4 (with the Eq. 4 details and the occupancy predict question on the left) | split | **3D** `stg-nf4` (Fig. 4) | yes, 6 |
| The paper | Double quantisation | split, then the calculator full width | **3D** `stg-dq` (Fig. 5); DQ calculator (2D widget) | yes, 5 |
| The paper | Paged optimizers | split | **3D** `stg-pg` (Fig. 6), paged and regular modes | yes, 7 and 5 |
| The paper | LoRA on every layer | full width | Figures 2 and 4 inside the predict reveal (2D) | no |
| The paper | Does 4-bit match 16-bit? | split | Table 2 and Tables 3 to 4 cards (2D charts) | no |
| The paper | Guanaco, Lemons, Limits, Believe?, Use it, Why it matters, Connections | full width | none | no |
| The paper | How the chatbots were judged | full width | Elo intervals inside the predict reveal (2D) | no |
| Quantise real weights | intro beside the quantiser; Table 2 and Table 3 at small scale | split; whole-matrix table and result tables full width | 2D tool and charts | no |
| Rerun the tournament | intro beside the tournament; one ordering; Table 6 rebuilt | split; tables and agreement full width | 2D tool and charts | no |
| The paper's tables, rebuilt; Further reading | | full width, unchanged | tables | no |

**Fig. 2, Equation 5** (`31_js_sc_eq5.js`): the first 1,024 weights of the LLaMA-7B sample of layer 15's value projection (row 37, `QD.w[1]`), quantised to NF4 in blocks of 64 by the page's engine (`QE.quantise`), drawn as 16 rows of 64 bars standing on NF4's 16 terraces; the 16 block constants rebuilt with `QE.dq`; a BF16 copy (code value times rebuilt constant) above the stored codes; X, Y and the adapters L1, L2 as shapes only (no LLaMA adapter exists on the page); flows for the constants, the forward pass, the adapter path and the backward pass (gradients to the adapters only). Exposed as `window.QL_EQ5`.

**Fig. 4, NF4's levels** (`32_js_sc_nf4.js`): the same 1,024 weights as dots, raw then divided by their block's absmax (one dot per row lands on ±1: 16 of 1,024); the histogram of the normalised weights at the back against the N(0, 1) NF4 is built from (±1 at the released offset's quantile, 1.848 sd); Int4 and then NF4 levels as glass slats; NF4's bins as equal-area stripes (5.6% to 7.1% each); the dots snapping to the nearest level with a count per level against a fair share of 64 (14 to 106). The stage shows something the old page only said in a reveal: the real normalised blocks are narrower than the assumed normal (sd 0.37 against 0.54). `window.QL_NF4`.

**Fig. 5, double quantisation** (`33_js_sc_dq.js`): the 512 shipped FP32 constants of the same matrix on two 16 x 16 glass plates (blocks of 256), the mean subtracted, one c1 per plate, 8-bit rounding with `QE.dq` (error drawn 25 times larger), then the bill from `QE.constBits` and the recounted 65B parameters. `window.QL_DQ`.

**Fig. 6, memory to scale and paging** (`34_js_sc_pg.js`, replaces the 2D `pg` animation): LLaMA 65B three ways (the Problem section's accounting from `PAPER.rc.llama`), the paper's Figure 6 at four sizes against 24 and 48 GB planes, then 65B on one 48 GB GPU with CPU RAM beside it; the eight illustrative mini-batches play in four explained stretches (the long-replay rule), Adam's pages moving to the CPU and back; a regular-optimizer mode stops with out of memory at 2,048 tokens. Activations remain the illustrative formula stated in the caption. The old setup menu (33B on 24 GB) became a sentence in step 2 and the caption. `window.QL_PG`.

**Kept 2D, and why**: Fig. 3 (one block on a number line with ticks reads best flat; given a step list and autoplay instead of the caption box), the Problem's memory bars and Figure 2/4, Table 2 to 4 and Elo charts (numbers on axes), the DQ calculator, the Eq. 4 offset slider and the two live tabs (tools and charts), the tables tab.

**Motion and lists**: `11_js_ui.js` takes `makeAnim` from the LoRA page (the 2026-11-06 rules: plays once half in view, pauses off screen, stops for good on a reader control or at its last step, never moves under reduced motion, marks its step list); the per-step caption box of Fig. 3 is gone, its text is `#sx-qb`. `check_page.mjs` now asserts that `qb` plays when scrolled into view and replays on a type switch (inverted from never-autoplay); `check_stages.mjs` (new, from the LoRA page's) checks every stage and animation at 1400 and 920 light and 390 dark, reduced motion, the splits, and every number the step lists state against `QL_*` with independent recomputes from `QD`.

**Parts**: `02_split.html`, `25_js_s3.js`, `05z_errbox.js.html` are the skill templates unchanged; `99_js_tabs.js` the template (key `ql-tab`) plus opening the closed block that holds a `data-to` target. `build.sh` finds the repository root by path instead of asking git. Two CSS rules added at the end of `01_css.html` (an equation wraps in the left column; a wrapping segmented control keeps round buttons), as on the LoRA page.

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 24.7 min (5,678 words) | 31.6 min (7,278) |
| The paper, closed | 7.5 min | unchanged |
| Quantise real weights; Rerun the tournament | 4.1; 4.6 min | unchanged |
| Tables (core plus closed); Further reading | 1.3 plus 7.9; 2.2 min | unchanged |
| Visuals counted in Reading (audit) | 6 | 9 |

The growth is the step lists: four stages and Fig. 3 add about 1,600 words (7,278 against 5,678), of which Fig. 3's six captions and the paging animation's eight were drawn by script before and invisible to the audit (read by every reader who played them). The rest is new content the stages carry with real numbers (the narrower real distribution, the 8-bit error of the constants, the memory three ways). Nothing was cut and the paper's argument keeps its order. Header: "Reading: 32 min, plus 8 in closed details." (`reading.json`).

**Ledger**: 284 units (core 223, depth 54, fat 3, owned 3, volatile 1); 15 added for the step lists; keys re-pointed on units 75 (the paging sentence, reworded for Fig. 6) and 76 (the old setup menu, now the paged/regular chips). `ledger.py check`: problems 0.
