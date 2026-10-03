# Continued Pretraining (CPT): visualisation ideas

The question the page keeps returning to: **when you continue a finished base model on new data, how much of what it knew do you lose, and what buys it back at what cost to the new domain?** Every visual below makes one part of that measurable.

Existing visuals on the old page: none (text only). Neighbouring pages already own: the anneal and its toy (Pretraining), LoRA's learn-less-forget-less chart (PEFT), long-context extension (Positional Encodings), dollar figures for Thomson Reuters (parent Price list). Those are linked, not rebuilt.

Scoring as in `html_utils/interactive-html-ideas.md` section 2 (0 to 2 each; reproduces and computable count double; animation point; build cost subtracted).

| # | Idea | Moves | Reproduces | Computable | Beyond prose | Misconception | Central | Novel | Anim | Cost | Score | Placement | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 | **One base, two continuations, animated**: the toy's CPT run step by step, English and German loss on one axis, toggle no replay / 25% replay / peak 0.1×, counters (German read, English replayed, both losses against the base), seed band, retrained-on-both reference, samples at the end | 2 | 1 (qualitative, independent) | 2×2 | 2 | 2 (the "re-warm drives most forgetting" claim) | 2 | 2 | 2 | −2 | 15 | Reading, Forgetting | built |
| C2 | **Forgetting against adaptation**: Ibrahim et al. Tables 2, 4, 12 as two lines (replay share, LR peak) in old-loss against new-loss space, union star, new-data-only point; four sets (405M German, 405M SlimPajama, 10B SlimPajama, the toy's 3 × 3) | 2 | 2×2 (by construction, transcribed) | 2×2 | 2 | 2 | 2 | 2 | 0 | −1 | 17 | Reading, The two levers | built |
| C3 | **CMR law as a calculator**: model size and CPT tokens, predicted CMR with the four published values; extrapolation shaded | 2 | 2×2 (independently from Table 5's coefficients: 29.8, 34.9, 41.4, 47.8) | 2×2 | 1 | 1 (the T = 250 / 500B unit slip) | 2 | 2 | 0 | −1 | 15 | Reading, Choosing the mix | built |
| C4 | **D-CPT usage 1**: general-loss rise against domain share from Table 5, movable tolerance, interpolated crossing (0.9245 at 3% against the law's 0.924) | 2 | 2×2 (independently, from measured rows) | 2×2 | 1 | 1 (two "optimal ratios" disagree) | 2 | 2 | 0 | −1 | 15 | Reading, Choosing the mix | built |
| C5 | **Recipes compared**: 18 recipes (14 CPT, 3 own mid-training, BloombergGPT), sortable, filter by kind, detail card per row with quote-level source; scatter of general share against LR-peak ratio (log) | 1 | 1 | 2×2 | 2 | 1 | 2 | 2 | 0 | −1 | 13 | Own tab | built |
| C6 | **Replay toy tab**: the 3 × 3 grid of peak × replay, curves per seed or mean, pretraining-and-CPT view, samples, findings recomputed from the runs | 2 | 1 | 2×2 | 2 | 2 | 2 | 2 | 0 | −2 | 14 | Own tab | built |
| C7 | Three schedules across two datasets (cosine and re-warm, stay at minimum, infinite) | 1 | 0 | 2×2 | 1 | 1 | 1 | 1 | 0 | 0 | 9 | Reading, Schedules | built (small, labelled illustrative phase lengths) |
| C8 | Toy run with an infinite schedule against cosine re-warm | 2 | 0 | 2×2 | 1 | 0 | 1 | 2 | 1 | −2 | 9 | | rejected for now: Ibrahim tested infinite schedules only without a shift; a toy result would be the only evidence on the page and easy to over-read |
| C9 | Refit the CMR law live from the toy's runs | 1 | 0 | 1 | 1 | 0 | 1 | 2 | 0 | −2 | 4 | | rejected: the toy has three replay shares, too few points for a 3-parameter power law plus the trajectory condition |
| C10 | D-CPT full law L(N, D, r) calculator | 2 | 0 | 0 | 1 | 0 | 2 | 2 | 0 | −1 | 6 | | rejected: the paper publishes no fitted coefficients (E, A, B, C, α, β, γ, η, ε), only fit quality tables |
| C11 | Gupta et al. warmup-length curves redrawn | 1 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | 0 | 4 | | rejected: figures only, no printed values (method forbids reading curves) |
| C12 | Cost of a CPT run (Thomson, Neon) as a chart | 1 | 1 | 1 | 0 | 1 | 1 | 0 | 0 | 0 | 5 | | rejected: owned by the parent Price list; a training-bill tab is a pattern Khalid removed |
| C13 | Tokenizer extension: fertility before and after (Swallow 56.2%) | 1 | 1 | 1 | 1 | 0 | 0 | 1 | 1 | −1 | 5 | | rejected: belongs to Tokenizers; one sentence and a table row carry it |
| C14 | Re-doing the Pretraining page's anneal toy | | | | | | | | | | | | excluded by the brief |

## Data and formulas
- Ibrahim et al. 2024, arXiv HTML v4: Tables 2, 3, 4, 6, 12, 14; extract in `inputs/ibrahim2024_extract.txt`. Derived: share of forgetting removed = (L_old(0%) − L_old(r)) / (L_old(0%) − L_old(base)); re-warm share of forgetting = (L_old(re-warm) − L_old(constant)) / (L_old(re-warm) − L_old(base)) = 0.34 / 1.39 = 24% (German), 0.02 / 0.27 = 7% (SlimPajama). The base's German loss is not reported (Table 3 and 12 repeat its SlimPajama value, 2.70, in the German block).
- CMR (Gu et al. 2024, arXiv 2407.17467v2): Table 5 coefficients, R = α₄ T^s₄ + β₃, T in units of 0.2B tokens (T = 100 is the paper's 20B; 10,000 × 512 × 4,096 = 20.97B). Table 2 power-law fit L(R) = αR^s + β on four ratios predicts the 25% row within 0.01% (paper's own predictions within 0.05%). Extract `inputs/cmr2024_extract.txt`.
- D-CPT (Que et al. 2024, arXiv 2406.01375): Table 5 rows; crossing interpolated linearly; extract `inputs/dcpt2024_extract.txt`.
- Recipes: `inputs/recipes.json` (curated), `inputs/recipes_research.md` (verbatim quotes and anchors per recipe).
- Toy: `toy/train.py`, `toy/runs/`; packed by `recompute.py` into `parts/20_js_data.js`; summary in `inputs/recompute.json`.

## Inspiration
Ibrahim et al. Figures 4 and 5 (loss curves for both datasets during CPT) suggested plotting both loss families on one axis; the Pretraining page's anneal toy gave the toy format (character model, three seeds, CPU).

## What the methodology lacked for this page
Nothing structural. One rule worth adding: when a paper's own tables repeat a value in a block where it does not belong (Ibrahim's 2.70 in the German rows), say which baseline is missing rather than plotting it.
