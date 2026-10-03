# Visualisation ideas: Defaults across models (tab t-defaults)

The question this tab measures: for each building block of a training run, what did the landmark models actually use, when did each default change, and which of them did their makers never write down?

Khalid chose the shape (2026-10-03): one grid of what landmark models used for each building block, sourced from papers, official code and config.json files, with visuals beyond the grid chosen by the Methodology.

Scoring follows `html_utils/interactive-html-ideas.md` section 2: each question 0 to 2 (a parameter the reader controls; reproduces a stated figure, counted double; computable from public data, counted double; shows what a sentence cannot; corrects a misconception; measures the central question; absent elsewhere; can be animated as a before/after), minus build cost (0 to 2).

| # | Idea | What it shows, what the reader does | Score | Data | Placement | Status |
|---|---|---|---|---|---|---|
| DF-1 | **The defaults grid** | 21 models x 20 columns in 8 groups (activation, normalisation, initialisation, optimiser, learning rate, regularisation, stability, scale); sort any column (numeric columns by value, categorical by family), filter by era, show one group, colour by disclosure or by family; every cell opens its value, kind, dated source, verbatim quote, formula and caveats; model names open the row's report and paper page; a Disclosed column; column headers link to the child page that owns them | 16 | data/defaults.json (rows.py), every value traced in notes.md; 58 checks in recompute.py | Own tab, the main visual | built |
| DF-2 | **Side by side** | Tick 2 or 3 models: one table, building blocks as rows, differing rows in bold, kind and source under each value | 11 | same | Below the grid | built |
| DF-3 | **The 2012 recipe becomes the 2025 recipe** (before/after animation) | Pick a start and an end model (presets AlexNet to SmolLM3, Transformer to OLMo 2, GPT-3 to Kimi K2); each step swaps one of 14 blocks from the first recipe to the second, names the first model in the table to use the new family with its source, and counts blocks changed, blocks the end model never disclosed, and years apart. Play, pause, step, scrubber, speed; runs only on screen in the visible tab; under reduced motion it starts paused and steps without transitions | 14 | the grid's cells and families | Below the grid | built |
| DF-4 | **When each default flipped** | Five lanes (activation, norm type, norm placement, optimiser, schedule), one dot per model in date order coloured by family, hollow when not disclosed, pale when inherited or unconfirmed; tap a dot for its value and source; the lines underneath give the order of first use (ReLU, GELU, SwiGLU, GeGLU; post-LN, pre-norm, branch output, pre + post; SGD, Adam, AdamW, Adafactor, Muon; step, inverse sqrt, cosine, linear, WSD) | 13 | families in rows.py (this tab's grouping, said so) | Below | built |
| DF-5 | **Numbers that converged** | One numeric setting at a time (beta2 or momentum, Adam epsilon, norm epsilon, weight decay, peak LR, final LR, dropout, gradient clip, FFN width, init std) against the date, log axis where it spans decades; rings for derived, inherited or unconfirmed; the values listed in HTML, the silent models named; a caption per setting saying what converged (beta2 0.95, clip 1.0, decay 0.1, norm epsilon 1e-5 or 1e-6) and what did not (Adam epsilon) | 13 | the grid's n values | Below | built |
| DF-6 | **What labs disclose** | Per column or per model, stacked bars of published / derived / inherited / unconfirmed / not disclosed / does not apply over the rows the era filter shows; percentage published or derived over the columns that apply; bars sum back to the row count | 12 | aggregated from the grid | Below | built |
| DF-7 | **Corrections to common claims** | 13 claims against the primary source (AdamW in 2018, warmup in ResNet 2015, z-loss in Mesh TF, config init 0.02 against 0.006, the 4x FFN, Llama 3's 1% and its "8M sequences", T5's "exponential" decay, OLMo 2's branch-output norm, Gemma 3's soft-cap, SmolLM3's disabled z-loss, BERT's Adam, Adam epsilon) | 9 | notes.md | Below | built |
| DF-8 | Peak learning rate against model size, with a fitted power law | Rates are not comparable across optimisers, batch sizes, widths and schedules; a fit across them would invent a law the sources do not state | 5 | | | rejected |
| DF-9 | Radar chart per model across the 20 columns | Categorical columns have no magnitude to plot; radar areas mislead | 3 | | | rejected |
| DF-10 | Lineage graph (which model copied which recipe) | "Follows" is stated only for GPT-2, GPT-3, Chinchilla and Llama 3; the rest would be inferred | 5 | | | rejected: the inherited cells carry the stated links |
| DF-11 | Train each recipe live on a toy problem | Belongs to the Training lab tab (t-lab), which swaps components and trains live | 8 | | | rejected: other tab's subject |
| DF-12 | Data and compute per training stage | Owned by Open recipes compared on the training topic; linked, not repeated | 7 | | | rejected: other page's subject |
| DF-13 | Architecture morph (attention, positions, KV heads) | Owned by the Transformer paper page's "Then and now" tab and the LLM Architecture Gallery page; this tab keeps to training defaults plus the FFN and norm choices that sit in the training recipe | 7 | | | rejected: other pages' subject |
| DF-14 | Time-scaled x axis for the flip lanes | Built first: 2023 to 2025 holds 11 of 21 models, so the dots overlapped at both widths; replaced by date order with year separators | | | | replaced |

## Data and formulas

- Every derived value is recomputed in `recompute.py` from the published inputs or the saved configs (58 checks, all pass): FFN ratios from config.json, final learning-rate fractions (AlexNet 0.01/10^3, Transformer sqrt(4000/100000), T5 at 1M steps, DeepSeek-V3 7.3e-6/2.2e-4, Kimi K2 7e-6/2e-4), the Transformer's peak 512^-0.5 x 4000^-0.5 = 6.99e-4, batch tokens (SmolLM3 192 x 3 x 4096, OLMo 2 1024 x 4096 and its warmup 2000 x 1024 x 4096 tokens, DeepSeek-V3 15360 x 4096), CLIP's ln(1/0.07), and the cited config values (norm epsilons, Adam epsilons, init std, z-loss switches).
- The recompute caught one error in the draft: the Llama 3 "8M sequences of 8,192 tokens" reading is 65.5 billion tokens per step, not 65.5 trillion.
- No published figure is reproduced by a model here; the tab is a sourced record, so "reproduces a figure" is scored only where a stated number is recomputed from its parts (batch tokens, the 2.36M SmolLM3 batch, OLMo 2's warmup in tokens).

## Inspiration and existing work

- The training topic's Open recipes compared tab (t-recipes): the grid mechanics, disclosure colours and side-by-side table are reused so the two tabs read alike.
- The Transformer paper page's "Then and now" morph (PT5) and the BERT page's BERT to ModernBERT morph: the step-by-step swap of one component at a time, with a source per step. DF-3 applies it to training recipes across 13 years and any pair of models.
- Sebastian Raschka's architecture comparisons and the knowledge base's LLM Architecture Gallery: architecture deltas are theirs; this tab adds the optimiser, schedule and regularisation columns they leave out.

## What the methodology lacked for this tab

A rule for **config files as evidence**: a release config.json is reliable for architecture (activation, widths, norm epsilon) and unreliable for training (dropout fields, initializer_range, torch_dtype describe loading). DeepSeek-V3 (0.02 in config, 0.006 in the report) and SmolLM3 (a z-loss coefficient with the switch off) are the cases. Training configs published by the lab (OLMo 2, SmolLM3) and the released training code (BERT) are a different, stronger class of source. Proposed for section 2.
