# QLoRA page: visualisation ideas

The question the paper keeps returning to: **can a model stored in 4 bits be finetuned as well as one stored in 16, and is the evidence for "as well as" (MMLU deltas, GPT-4 scores, Elo) strong enough to say so?** So the page needs two live ingredients, one per half of the paper: the storage side (NF4, DQ) run on real weights, and the evaluation side (the Elo tournament) rerun on the released judgments. The LoRA mechanics are not repeated: the LoRA page trains LoRA live.

Scores: the methodology's questions, 0 to 2 each: a quantity the reader moves (M), reproduces a published figure (R, counts double), computable from public data (C, counts double), shows what a sentence cannot (S), corrects a misconception (X), measures the central question (Q), absent from existing explainers (N), animation against the method it replaced (A). Build cost subtracted.

| # | Idea | Placement | M R C S X Q N A | Score | Status | Data and notes |
|---|---|---|---|---|---|---|
| P-qlora.1 | **Quantise real LLaMA-7B weights in the browser**: four real matrices (and two synthetic references), five 4-bit codes (NF4, FP4 E2M1, FP4 E3M0, Int4, AF4), block size 16 to 2,048, DQ on or off; histogram of weights over absmax with the code values, occupancy against 1/16, error, entropy, bits per weight; all types compared at once | Own tab | 2 2 2 2 2 2 2 0 | 2+4+4+2+2+2+2 = 18 | built | huggyllama/llama-7b safetensors, range-fetched (fetch_weights.py); codes exactly as bitsandbytes (dtypes.py); JS checked against NumPy (check_engine) |
| P-qlora.2 | **One block of 64 real weights through Int4, FP4 and NF4, animated**: absmax, rescale, the 16 values, snap, store; counters for values used and error | Reading, Idea | 1 1 2 2 1 2 1 2 | 15 | built | Khalid's before/after pattern on the paper's core mechanism |
| P-qlora.3 | **Rerun the Elo tournament** from the released GPT-4 and human judgments: judge and benchmark, K, orderings, ties, answer order, prompt subset, human majority or per vote; prompt bootstrap; one ordering traced; paper's values overlaid | Own tab | 2 2 2 2 2 2 2 0 | 18 | built | eval/ of artidoro/qlora (fetch_eval.py, 56 + 42 pairwise files, 2,240 HITs); reproduces Table 7's OA column within 2, Vicuna ranks exactly |
| P-qlora.4 | **Predict: how far could Elo 1,022 ± 1 move?** Reveal: prompt-resampled intervals (about ± 40) against Table 1 | Reading, evaluation | 0 2 2 2 2 2 2 0 | 16 | built | recompute_eval.py |
| P-qlora.5 | **Table 6 rebuilt from the released 10-point scores**, both orders, pooled mean, bootstrap interval | Tournament tab | 0 2 2 1 2 2 2 0 | 15 | built | finds the duplicated Open Assistant row, the swapped GPT-4 columns, and that the Mean is pooled; file names of the trained systems state the order backwards (decided by answer ids) |
| P-qlora.6 | **NF4 builder**: the bitsandbytes recipe with its offset as a slider, Appendix E overlaid, Eq. 4 read literally | Reading, NF4 | 2 2 2 1 2 1 2 0 | 16 | built | reproduces Appendix E to 1.1e-7; Eq. 4 cannot (infinite end terms); offset = 1 - (1/64 + 1/60) |
| P-qlora.7 | **Predict: does each NF4 value get 1/16 of the weights?** Reveal: occupancy and entropy for NF4, FP4, Int4 on a whole matrix | Reading, NF4 | 0 1 2 2 2 1 2 0 | 12 | built | fetch_weights.py; Yoshida 2023 |
| P-qlora.8 | **Paged optimizer animation**: regular against paged, 65B on 48 GB or 33B on 24 GB, eight mini-batches of different lengths, GPU and CPU columns to scale, OOM or eviction | Reading, Paged optimizers | 1 0 1 2 1 1 2 2 | 10 | built | static parts are Figure 6's labels; activations an illustrative formula, labelled; paging time not modelled |
| P-qlora.9 | **Memory bars behind the 780 GB predict question**: full 16-bit, 16-bit LoRA, QLoRA, by model and GPU | Reading, Problem | 2 2 2 1 1 2 1 0 | 15 | built | reproduces ">780 GB" at 12 bytes per parameter (783 GB); recount from configs |
| P-qlora.10 | **DQ calculator** (block sizes, model) with the measured error of the double-quantised constants, dynamic 8-bit against FP8 | Reading, DQ | 2 2 2 1 2 1 1 0 | 14 | built | reproduces 0.5, 0.127, 0.373 bits and "about 3 GB"; shows the code's 8-bit map is not FP8 |
| P-qlora.11 | **Figures 2 and 4 from the vector PDFs** behind "rank or layers?" | Reading, All-layer LoRA | 0 2 2 1 1 1 1 0 | 11 | built | extract_figs.py: marker translations mapped through gridlines |
| P-qlora.12 | **Table 2 at small scale**: perplexity of OPT-125M, Pythia-160M, OPT-350M, Pythia-410M, BLOOM-560M after round-to-nearest with each type | Reading, Results; quantiser tab | 1 2 2 1 1 2 2 0 | 15 | built | quant_ppl.py; NF4 best on every model, Int4 not the worst (unlike Table 2) |
| P-qlora.13 | **Table 3 at toy scale**: Pythia-160M with LoRA on 16-bit, NF4 + DQ, FP4 and Int4 bases, attention-only, a second seed (full finetuning dropped: too slow on CPU) | Reading, Results; quantiser tab | 0 1 2 1 1 2 2 0 | 12 | built | train_qlora.py, about 45 minutes of CPU on 2 threads |
| P-qlora.14 | Tables 3 and 4 as deltas from the 16-bit reference | Reading, Results | 1 1 2 1 1 2 0 0 | 10 | built | recomputed means: NF4 + DQ 52.99 against BF16 53.04 |
| P-qlora.15 | Every checkable number checked (memory, Elo arithmetic, table arithmetic, Table 8 weighting, 1833) and every table sortable | Tables tab | 0 2 2 1 2 1 1 0 | 12 | built | recompute.py, recompute_eval.py |
| P-qlora.16 | Shapiro-Wilk rerun on whole LLaMA-7B matrices | Quantiser tab, Reading NF4 | 0 2 2 1 2 1 2 0 | 13 | built | 5.9 to 6.5% in middle layers (paper 7.5%), 76 to 93% at the first and last |

Rejected:

| # | Idea | Why not |
|---|---|---|
| P-qlora.17 | A LoRA trainer in the browser | The LoRA page already has one; QLoRA's novelty is the storage type and the evaluation, not the update rule |
| P-qlora.18 | Figure 3 (zero-shot accuracy against total bits) redrawn | It is a raster image in the arXiv source with no printed values; reading curves is not allowed |
| P-qlora.19 | Real 4-bit QLoRA training of LLaMA in the page or offline | Needs a GPU and the bitsandbytes kernels; the toy on Pythia-160M tests the claim's direction |
| P-qlora.20 | A paging-time simulator | The paper gives no measurements of paging cost; any curve would be invented |
| P-qlora.21 | Then and now tab | QLoRA's successors (AF4, LoftQ, QA-LoRA, fused kernels) are refinements told in one paragraph, and the LoRA page's Then and now already places QLoRA in LoRA's lineage |
| P-qlora.22 | Category-level win rates of Guanaco against ChatGPT | 80 prompts over 9 categories is 8 to 10 prompts each: the intervals would swamp the differences; the prompt filter (drop coding and math) is enough |

What the methodology lacked for this page: a rule for evaluation-heavy papers whose raw judgments are released. Rerunning the authors' own aggregation from the raw judgments, and adding the resampling interval they did not report, was the strongest visual on the page and should be the default for any paper with released ratings, generations or traces.
