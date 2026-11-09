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

## 2026-11-09 (layout rollout: split layout, renderer v2)
| # | Visual | Where | Decision |
|---|---|---|---|
| R6 | Five-layer cards | Reading, section 1 | **Replaced by Fig. 1, the 3D stage `stg-layers`** (`parts/27_js_sc_layers.js`): five pedestals rising left to right, a glass plate on each, outputs of one change flowing up layer by layer; one step per layer with its cost, what it catches and its page (the cards' own words), the human layer's stream back down to the judge (calibration), a golden-set grid on the gates, live traffic into online. The order is the page's; heights and sizes are a layout, not measured costs (said in the section and the ledger). The only 3D stage on the root: the stack is spatial (layers in order), nothing else here is. |
| R1 | Same failures, attributed | Reading, section 5 | Kept 2D (squares are counts: a grid reads best flat), now Fig. 2 in a split with its five steps written out in `ol#sx-att` (rewritten for each benchmark); plays once in view. |
| R5 | 2 points on 200 items | Reading, section 4 | **Retired as a chart**: Eval statistics Figs. 1 and 2 now draw the error bar and the paired comparison on real RACE-H data; the root keeps the numbers as a static table computed by `read/recompute.py` and links both figures. |
| hero | One reading, seven parts | Reading, top | Kept 2D static (a flow of named boxes reads best flat); a three-column snake layout added for the split's right column. |
| R12 | A 3D graders stage (program, judge, people side by side on one output) | none | Rejected: LLM-as-judge Fig. 1 and Agent evaluation Fig. 1 draw graders on real data; the root's table compares and links them. |
| R13 | A 3D calibration stage | none | Rejected: LLM-as-judge Fig. 3 (gold-slice correction) and Human evaluation Fig. 1 (agreement against chance) own it; linked from section 3. |
