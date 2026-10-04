# Reading tab: visualisation ideas (Topic: evaluation-and-llm-judges)

Central question: before trusting an eval reading, what is the instrument, how noisy is it, how does it break, and has it been calibrated against people?

Scores 0 to 2 each: quantity moves with a control; defaults reproduce a published figure; inputs from public data; shows what a sentence cannot; corrects a misconception; measures the central question.

| # | Idea | Placement | Score | Status | Data |
|---|---|---|---|---|---|
| R1 | **Same failures, attributed** (before/after animation): the 250 answers by GPT-5.6-Sol rejected by four physics benchmarks' graders, first all counted as model failures, then reviewed and moved to grader error (95), benchmark error (143) and model error (12); per-benchmark select | Reading, How it breaks | 11 | built | Re-grading six physics benchmarks (arXiv:2609.13009) Appendix C via the paper page's tables.json; counts exact, order illustrative |
| R2 | **One judge, three protocols** (before/after animation): 80 near-identical pairs judged in one order, swapped, flips scored as ties, then pointwise; judge select GPT-4 / GPT-3.5 / Claude-v1; second mode: 20 math judgments under default, CoT and reference-guided prompts (14, 6, 3 failures) | Reading, Who grades | 11 | built | MT-Bench (arXiv:2306.05685v4) Tables 2, 4, 5; percentages x 80 give whole counts (recompute.py) |
| R3 | **Human-agreement ceiling bars**: random, expert-expert, GPT-4 single and pairwise vs experts, ties counted or not | Reading, Calibration | 9 | built | MT-Bench Table 5 (a) first turn, with vote counts |
| R4 | **Kappa against raw agreement**: two judges at 90% raw agreement, kappa 0.00 and 0.44 | Reading, Calibration | 8 | built | Cohen's formula; illustrative counts, labelled |
| R5 | **2 points on 200 items**: 95% intervals unpaired and paired, items needed | Reading, Statistics | 8 | built | derived formulas in caption; 10% discordance labelled as an assumption |
| R6 | Five-layer cards (cost, what each catches) | Reading, One screen | 6 | built (static) | old page map, layer descriptions |
| R7 | Sample-size calculator | none | | rejected: Khalid decided no sample-size calculator; the static interval figure carries the point and the Production child owns depth |
| R8 | Checklist grading animation (RocketEval) | none | | rejected: the RocketEval paper page already has a before/after against a CoT judge on released gradings; linked instead |
| R9 | Loglikelihood vs generative animation on MMLU | none | | rejected here: the Same model, many harnesses tab owns harness spreads; one sentence with the real Hugging Face numbers instead |
| R10 | Judge bias rates as charts | none | | rejected here: the Judge bias lab owns them; the Reading quotes MT-Bench's numbers in one paragraph |
| R11 | Mermaid map of the space redrawn | none | | rejected: it was a table of contents; the five-layer cards and the section nav replace it |

Inspiration: the DeepSeek MLA explainer pattern (same input, old method then new), Topic: benchmarks' RD animation controller (reused).
What the methodology lacked here: a rule for audits that publish counts but not per-item verdicts; handled by drawing exact counts with an "arrangement illustrative" note.
