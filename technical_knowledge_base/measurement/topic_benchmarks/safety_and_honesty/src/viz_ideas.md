# Safety and honesty benchmarks: visualisation ideas

Central question: what does a safety number measure (which of four questions, graded by whom, under which attack, with what the model noticed), and what is used now?

Scores: Q quantity the reader moves, R reproduces a published figure (x2), C computable from public data (x2), S shows what a sentence cannot, M corrects a misconception, P page's central question, N absent elsewhere, A before/after animation; minus build cost.

| # | Idea | Q | R | C | S | M | P | N | A | Cost | Total | Placement | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Same 450 XSTest prompts, over-refusing against under-refusing model** (Llama 2 70B chat with original system prompt, Mistral 7B Instruct with none, GPT-4): squares to scale, filled family by family (8 steps, each with its real safe/unsafe pair and both answers), counters for safe refused and unsafe answered, tap a square for the prompt and answers | 1 | 2 (x2: Table 1 exactly, all five configs) | 2 (x2) | 2 | 2 (one refusal number hides its mirror) | 2 | 2 | 2 | -1 | 19 | Reading, Refusal: two numbers | built |
| 2 | **XSTest every prompt tab**: per-type error heatmap for five configurations under three graders, prompt list with disagreement filters, per-prompt labels and excerpts, the repository's string-match rule ported to run on the reader's text | 2 | 2 (x2: Tables 1 and 2; rule reproduces all 2,250 released string-match labels) | 2 (x2) | 2 | 2 | 2 | 2 | 0 | -1 | 19 | Own tab | built |
| 3 | **Same answers, three graders** table (human, string match, GPT-4 classifier) computed from the released labels, with the 30 refusals the GPT-4 classifier calls compliance | 0 | 2 (x2: Table 2) | 2 (x2) | 1 | 2 | 2 | 2 | 0 | 0 | 15 | Reading, Who grades | built |
| 4 | **HarmBench attack matrix tab**: 29 models x 16 attacks x 4 test sets, sortable by plain request, worst attack, mean; bump chart of rank under two attacks with Spearman (average ranks) | 2 | 2 (x2: transcribed tables) | 2 (x2) | 2 | 2 (ASR without the attack) | 2 | 2 | 0 | -1 | 19 | Own tab | built |
| 5 | **One model, many ASRs** dumbbells for 13 models on standard behaviours | 0 | 2 | 2 | 2 | 2 | 2 | 1 | 0 | 0 | 13 | Reading, Jailbreaks | built |
| 6 | Refusal text against tool actions on an agentic harm task (animation) | 1 | 0 | 0 | 2 | 2 | 2 | 1 | 2 | -2 | | | rejected: AgentHarm's per-run transcripts are not released (private split, run in Inspect); MOLE's refusal-against-completion scatter already exists on its paper page and is linked; AgentHarm numbers in a table |
| 7 | MASK honesty against accuracy scatter | 1 | 1 | 0 | 2 | 2 | 2 | 2 | 0 | -1 | | | rejected: per-model accuracy values are only plotted; P(lie) listed in text |
| 8 | Evaluation-awareness trend chart across 2025 to 2026 models | 1 | 0 | 0 | 1 | 1 | 2 | 2 | 0 | 0 | | | rejected: metrics differ by source (verbalised, scored, white-box), so a chart would splice incompatible series; given in prose with the caveat |
| 9 | BBQ bias-score calculator | 1 | 1 | 1 | 0 | 1 | 0 | 1 | 0 | 0 | | | rejected: the two formulas in text suffice; set is saturated |
| 10 | Threshold ladder chart (RSP, Preparedness, FSF) | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 0 | 0 | | | rejected: a table carries it better |
| 11 | Re-draw saturation curves for TruthfulQA, Cybench | | | | | | | | | | | | rejected: the root's Saturation timeline owns trajectories |

Data and formulas:
- XSTest: https://github.com/paul-rottger/xstest (main, read 2026-10-04): `xstest_prompts.csv` (CC BY 4.0), `model_completions/*.csv` (human `final_label`), `evaluation/automated_evaluation_labels/*_streval.csv` and `*_gpteval.csv`. Refusal = full or partial; rates over 250 safe and 200 unsafe prompts. One prompt differs between the prompts file and the completions (v2-195 "plan someone's death" vs "plan my enemy's death"); the page shows the prompts-file wording.
- HarmBench: arXiv 2402.04249v2 appendix Tables 6 and 7, transcribed into `inputs/harmbench_asr_raw.csv` (2,424 cells).
- Spearman: Pearson correlation of average ranks.

Inspiration: the DeepSeek MLA explainer (before/after on one input); the Constitutional AI paper page's refusal counter (a visible classifier over released answers).

What the methodology lacked: a rule for showing model outputs to unsafe prompts. Applied here: show refusals, withhold any answer to an unsafe prompt that was not a full refusal, and say so.
