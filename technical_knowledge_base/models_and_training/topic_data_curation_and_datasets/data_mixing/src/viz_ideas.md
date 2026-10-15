# Visual ideas: Data mixing, curricula and continued-pretraining ratios (prefix mx2)

Central question: given piles of different sizes and values, how many tokens of each, how many repeats, and in what order, and how good is the evidence behind each way of choosing?

Scores 0 to 2 on: parameter the reader moves; reproduces a published figure (counts double); computable from public data (counts double); shows what a sentence cannot; corrects a misconception; measures the central question; absent elsewhere; plus 1 for step animation against the method replaced. Build cost subtracted.

## Built

| # | Idea | Placement | Score | Data | Notes |
|---|---|---|---|---|---|
| 1 | Mixing-law fitter on RegMix's 1,088 released runs: linear and exponential law fitted in the browser, tested on 1M, 60M and 1B, recommended mixtures, coefficients | tab | 13 | sail-sg/regmix data/*.csv (MIT) | Reproduces Table 2 rho within 0.7 points independently; adds the Data Mixing Laws form RegMix did not fit (1B rho 98.76); exposes coefficient instability for tiny domains |
| 2 | DoReMi step by step: Algorithm 1 ported, toy power-law losses, excess, update, average; before/after main model | tab | 10 | illustrative losses, paper's rule | Toy agrees with recompute.py; measured mode pending (GPU) |
| 3 | Token-budget planner: pools, stages, weights to epochs and Muennighoff D'; same tokens in two orders animated | tab | 11 | OLMo 2 Tables 4/13, SmolLM3 configs, DeepSeekMath, published pool sizes | Presets reproduce Table 13 source % to rounding by construction |
| 4 | Temperature and UniMax on The Pile's 22 real sizes with epochs per domain | Reading s1 | 10 | Pile Table 1 | UniMax N=3 reproduces the Pile's own Wikipedia weight (both cap at 3 epochs) |
| 5 | Repetition curve D'(epochs) with marker and marginal value | Reading s2 | 9 | Muennighoff R*_D | Corrects the "few dozen repeats" claim |
| 6 | Four weightings of The Pile (Table 1, DoReMi baseline, DoReMi 280M, repo 120M) | Reading s3a | 9 | DoReMi Table 1, repo configs | Exposes the document-count baseline |
| 7 | Loader blend, random vs Megatron error-driven, animated before/after | Reading s4 | 8 | Megatron helpers.cpp 104 to 128 | |
| 8 | SmolLM3 stage mixtures to scale from configs | Reading s5 | 8 | smollm configs | grouping is this page's |
| 9 | Tables: RegMix refit, Aioli Table 2 coloured, SmolLM2 Table 3, OLMo 2 Table 13 with implied repeats | Reading | - | papers | |

## Rejected
- A CMR calculator: exists on the CPT page; linked instead.
- Re-drawing the Pretraining page's stage animation and OLMo 2 Table 11 split: linked.
- LightGBM in the browser: too heavy; predictions precomputed and embedded for Pile-CC.
- Data Mixing Laws' own figures: their points exist only as plotted images, not tables; replaced by the same functional form fitted on RegMix's released numbers.
- A real DoReMi run on CPU: training beyond a smoke test is GPU work under this topic's rules; scripted as pending.
- SmolLM2 preset in the planner: its stage-3 shares and some pool sizes exist only in a figure.

## What the methodology lacked
- A rule for "released raw runs": when a paper releases its experiment logs, refitting them (and fitting forms the paper did not try) beats transcribing its table; it also lets the page check claims (rank invariance) directly.
- Toys that run one published update rule on made-up curves need an explicit statement of which conclusions are by construction.
