# Visualisation ideas: Open recipes compared (tab t-recipes)

The question this tab measures: across every recipe a lab has written down, how do the training stages compare, and which of them do labs stay quiet about?

Scoring follows `html_utils/interactive-html-ideas.md` section 2: each question 0 to 2 (a parameter the reader controls; reproduces a stated figure, counted double; computable from public data, counted double; shows what a sentence cannot; corrects a misconception; measures the central question; absent elsewhere; can be animated as before/after), minus build cost.

| # | Idea | What it shows, what the reader does | Score | Data | Placement | Status |
|---|---|---|---|---|---|---|
| R-1 | The recipe grid | 20 rows x 13 columns grouped by stage; sort any column, filter by openness and by recipe type (from scratch or on another base), show a stage group, colour by disclosure or by magnitude (log scale per column); every cell opens its source, source date, quote, formula and notes; a Disclosed column (published or derived over the recipe cells that apply) | 15 | data/recipes.json; every number traced to a primary source (notes.md) | Own tab, the main visual | built |
| R-2 | Side by side | Tick 2 or 3 rows: one table with stages as rows, models as columns, plus each model's stage order | 11 | same | Below the grid | built |
| R-3 | Tokens per stage on one log axis | One row per recipe, a marker per stage whose tokens are stated or derivable (pretraining, mid-training, context extension, SFT tokens), hollow when inherited; follows the grid's filters | 12 | pt_tokens, mid_tokens, ctx.tok, sft.tok; caption recomputes pretraining / SFT tokens (1,250x to 6,222x; K2 Horizon 46x) | Below | built |
| R-4 | Which stages labs disclose | Per recipe column, stacked bar of published / derived / unconfirmed / inherited / not disclosed / not used over the rows shown, with an era switch (before 2025, 2025 on); right column: share disclosed where the stage applies | 12 | aggregated from the grid; sums back to the row count | Below | built |
| R-5 | Stage order | Each recipe's stages as chips in report order: shows R1's SFT, RL, SFT, RL; Llama 2 and 3's repeated rounds; DAPO's RL straight on a base; K2 Horizon's SFT after RL; Gemma 3's distillation in pretraining | 10 | seq field per row, from the reports | Below | built |
| R-6 | Where the compute goes, animated | One run's compute to scale, stage by stage, with the post-training stages magnified below; before/after toggles: DeepSeek-V3 against R1 on the same base (0.18% against 5.0%), Olmo 3 Think against 3.1 (17.6% against 24.3%); InstructGPT 2022 (1.75%). Play, pause, step, scrubber, speed; runs only on screen, reduced motion jumps without tweening | 14 | V3 Table 1, R1 Table 7, InstructGPT 5.1, Olmo 3 2.4 (durations to GPU-days, derived, assumption stated) | Below | built |
| R-7 | Post-training share bars | The five shares from R-6 side by side, with the caveat that only three families report per-stage compute | 9 | recompute.py | Below R-6 | built |
| R-8 | Corrections list | 13 commonly repeated figures against the primary source | 8 | notes.md | Below | built |
| R-9 | Stacked tokens-per-stage bars on a log axis | Stacking on a log scale misreads (the later, smaller stages vanish or the bar lies about sums) | 5 | | | rejected: R-3's markers show the same without the distortion |
| R-10 | Disclosure over time as a dated scatter (x date, y cells disclosed) | Labels collide at phone width, and the score mixes stage applicability; R-4's era switch shows the same trend with counts that sum back | 6 | | | rejected |
| R-11 | Data-mix sankey or pies across models | Mix categories are not comparable across labs (web vs "knowledge", synthetic vs rewrites), and half the rows give no proportions | 4 | | | rejected |
| R-12 | Tokens per parameter against Chinchilla | Belongs to the Scaling calculator tab (t-scale) | 7 | | | rejected: other tab's subject |
| R-13 | Dollar cost per run | Belongs to the Price list tab (t-price); this tab links there | 7 | | | rejected: other tab's subject |
| R-14 | Benchmarks against recipe size | Not like for like (different benchmark versions and harnesses per report), and benchmarks are not this page's axis | 3 | | | rejected |
