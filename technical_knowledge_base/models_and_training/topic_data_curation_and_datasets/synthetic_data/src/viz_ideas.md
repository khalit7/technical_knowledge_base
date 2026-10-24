# Visualisation ideas: Synthetic data (2026-10-14)

Central question: what does model-written pretraining text buy, how do you check it, and when does reusing model output hurt?

## Built (score out of 14 on the methodology's questions; reproduce and computable count double)
| Idea | Where | Score | Why it earns its place | Data |
|---|---|---|---|---|
| Nemotron-CC step animation on real pages (crawl, bucket, segment, prompt, generate, publish), 5 prompt kinds | Reading 3 | 12 | Before/after on the same input from NVIDIA's own rows; copied-phrasing highlight shows what each prompt rewrites | Nemotron-CC rows + CC records matched by WARC-Record-ID |
| Cosmopedia prompt anatomy with flagged unsupported claims | Reading 2 | 10 | Shows seed vs instructions and two generator errors on real rows | Cosmopedia sample |
| Openings bars + predict-then-reveal (TinyStories "Once upon a") | Reading 2 | 10 | Template collapse is invisible to MinHash; measured | measure_sets.py |
| Prompt-fix measurement (told vs not told to avoid "Once upon a time": 1.2% vs 35.9%) | Reading 2 prose | 9 | Before/after of a prompt change on real data | cosmo_examples.py |
| WRAP Tables 1 and 2 bars, with the paper's self-disagreements | Reading 3 | 8 | Reproduces published table values; prose-vs-table check | arXiv 2401.16380 |
| Published synthetic shares (recipes vs sweeps) | Reading 5 | 8 | Separates "used" from "found best" | papers and cards, derived shares shown |
| Eight-set measures table; FineWeb-Edu pass-rate bars | Reading 6 | 10 | Measured; found that rephrasing keeps source variety and that transformations raise classifier scores | measure_sets.py, embed_sets.py |
| Rare-word survival calculator | Reading 7 | 8 | The collapse mechanism in one formula | derived |
| Bigram LM collapse animation (replace / keep 10% / accumulate) | Reading 7 | 12 | A real tiny LM on real text, Shumailov's two settings plus Gerstgrasser's; found the beam-search caveat | collapse_bigram.py |
| Generation cost calculator | Reading 9 | 8 | Presets reproduce published throughputs (WRAP, Cosmopedia, REWIRE, FinePhrase) | FinePhrase Table 10, WRAP 7.1 |
| Rephrasing lab: 5 real pairs with stats; WRAP four-style tour on running-example pages (Qwen3-4B on 200 pages, GPU, 2026-10-16) | Tab | 11 | Same document before/after in several styles | get_sources.py, run_rephrase.py |
| Collapse lab: categorical model, rank-frequency animation, four workflows, parity check against Python | Tab | 12 | Distribution tails over generations, replace vs accumulate vs subsample vs fresh; JS matches Python run | collapse_categorical.py |
| Diversity meter: 11 measures x 24 sets, detail view, measure-your-own-text at matched budget | Tab | 11 | Makes the budget-dependence of distinct-n concrete | measure_sets.py, budget_curves.py |

## Rejected
- Gaussian refit animation: already on the parent page (section 8); linked instead.
- Generator-size curve redrawn from BeyondWeb Fig. 9 or Kang et al. figures: only three printed points (BeyondWeb) or figures without tables (Kang); quoted as numbers instead.
- Embedding scatter (2-D projection) of sets: pretty but not measurable; the pairwise similarity number says the same.
- Perplexity histogram per generation (Shumailov Fig. 1 style): our toy samples at temperature 1, so the histogram does not move; stated in prose rather than drawn as a flat chart.
- Licence matrix as a tab: a table in Reading 8 is enough.
- Neural replace-vs-accumulate run (3.66M GPT on TinyStories, GPU hours): dropped 2026-10-15; it would restate Gerstgrasser et al.'s Table 2, which the Collapse lab quotes.

## What the methodology lacked
Rules for showing model-generated text: flag unsupported claims by hand and say so; prefer seeds from organisations; keep source pages' author boxes out (the QA example is cut before a staff bio).

## 2026-10-24 rebuild
- Built: hero static diagram (three lanes, gate, mix, collapse loop); MegaMath Table 6 bars (same pages, three forms); Shumailov et al. Figure 1 as a real image (CC BY 4.0), the paper's canonical figure.
- Moved inline: WRAP four-style stepper (section 3 opener), categorical collapse simulation (section 7). Removed: the Rephrasing lab's separate Nemotron-CC pair viewer (the section 3 stepper shows the same five pairs; its table is kept in a closed block).
- Rejected: a Self-Instruct animation (Post-training data already draws its filter step by step; linked).
