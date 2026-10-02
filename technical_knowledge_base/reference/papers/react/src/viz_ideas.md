# ReAct: visualisation ideas

The question the paper keeps returning to: **what does a thought, an action that touches nothing, add to an agent that can already act, and what does it cost?** Every visual below shows that on the paper's own episodes or its own numbers.

Scored on the Methodology's questions (`html_utils/interactive-html-ideas.md` section 2): a parameter the reader moves; reproduces a published figure (counts double); computable from public data (counts double); shows what a sentence cannot; corrects a misconception; measures the central question; absent elsewhere; step-by-step animation against the method it replaced; minus build cost.

## Built (ids P-react.k, for the orchestrator to merge into the ideas log)

| # | Idea | What it shows, and what the reader does | Why it helps | Data and sources | Placement | Score |
|---|---|---|---|---|---|---|
| P-react.1 | **Replay the traces** (live ingredient) | Six of the paper's episodes (Figure 1 both panels, Figure 4, Figure 5, Table 10, Appendix D.1), each under every method the paper ran on it (Standard, CoT, Act, ReAct; ReAct against a human-edited ReAct), stepped turn by turn with play, step, scrub and speed; the paper's own green and red highlights kept | The before/after Khalid likes, on the paper's real inputs: Act reaching the right page and answering "yes", CoT's fluent hallucination, the keychain run fixed by editing two thoughts | `mk_traces.py`: Figures 1, 4, 5 transcribed, Table 10 and D.1 cut from the paper text | Own tab, and the Apple Remote episode inline in Idea | 13 |
| P-react.2 | **Context bar to scale** | Each step adds a segment to a bar of the model's whole context in words, coloured by who wrote it (exemplars, task, thought, action, observation), plus a bar of the episode alone and counters for model and environment words | Makes the factuality trade-off and the prompt overhead visible: CoT writes everything, Act mostly reads, and ReAct's 938 words of exemplars dwarf the episode | Appendix C word counts in `recompute.py` | Replay | 10 |
| P-react.3 | **The harness line that runs** | A shortened copy of the released notebook's loop beside the replay; the line executing at each step is lit (generate, env.step, append) and switches between the Wikipedia loop, the ALFWorld loop and the one-call Standard/CoT case | Shows that ReAct is a parse, act, append loop and that a thought is a step with no env.step | `inputs/repo_hotpotqa_loop.txt`, alfworld.ipynb | Replay | 9 |
| P-react.4 | Figure 2 rebuilt from SVG paths | Both panels redrawn from the line vertices of the arXiv figure files, converted with their own gridlines; Table 1 values as rings; table of figure against table | Reproduces the figure to 0.01 point and finds FEVER CoT at 59.3 against Table 1's 56.3, and the back-off rule behaving differently at one sample on the two tasks | `inputs/fig2_*.svg`, `recompute.py` | Tables tab | 11 |
| P-react.5 | Figure 3 rebuilt from SVG bars | Prompted against fine-tuned HotpotQA EM by size, values recovered from the bar heights | The "finetuning flips the ranking" result with numbers the paper never printed; corrects "62B fine-tuned beats all 540B prompting" (not CoT-SC or the combinations) | `inputs/fig3_finetune.svg` | Reading (predict reveal) and Tables tab | 10 |
| P-react.6 | Table 1 noise test | Gap of every method against a chosen baseline with its binomial standard error and z (n = 500 labelled as an assumption) | Shows the HotpotQA orderings are under one standard error | Table 1, released code's 500-question runs | Tables tab and How much to believe | 9 |
| P-react.7 | Three sources, three numbers | Table 1, Table 5 and the code README side by side for the same model and task, disagreements marked | The paper's numbers disagree with each other (27.4, 29.4, 29.4; 60.9 and 62.2; 30.8 and 30.4) | Tables 1, 5, `inputs/repo_README.md` | Tables tab | 8 |
| P-react.8 | Table 2 with its examples and arithmetic | Click a failure mode for the paper's Appendix E.1 example; a check that the ReAct failure column (sums to 99, odd percentages) cannot come from 50 trajectories | Turns the most-cited table into examples and finds its inconsistency | Table 2, Appendix E.1 | Tables tab; splits inline in Reading | 9 |
| P-react.9 | Then and now: one step, six wire formats | Thought 2, Act 2, Obs 2 of the Apple Remote episode written as 2022 prompt text, LangChain's format, function calling JSON, tool_use blocks, interleaved thinking, a harness loop; who writes the thought, who parses, what it is learned from | What survived (the loop) and what was replaced (parsing, exemplars, imitated thoughts), on the same input | `inputs/later_extracts.txt` | Own tab | 9 |
| P-react.10 | Predict, then reveal (three) | ReAct against CoT on HotpotQA (CoT wins); the worst method on PaLM-8B prompted (ReAct); whether the worst ReAct prompt beats the best Act prompt on ALFWorld (yes, 48 against 45) | Belief elicitation where intuition fails | Tables 1, 3, Figure 3 | Reading | 9 |

## Rejected

| # | Idea | Why not |
|---|---|---|
| P-react.11 | A live agent on a mini Wikipedia built in the page | The page has no network and no model; a scripted "agent" would be an invented trace dressed as a live one. The paper's own trajectories teach the same thing honestly. |
| P-react.12 | A toy model trained to emit thoughts | ReAct's claim is about a 540B model's few-shot behaviour; a toy trained to imitate traces would test nothing the paper claims, and a toy's "thoughts" would be decoration. |
| P-react.13 | Per-task ALFWorld weighting check | Needs the number of games per task type in the 134, which neither the paper nor the code prints; the page states the best-of-6 caveat without it. |
| P-react.14 | Token counts instead of words | A tokenizer cannot run in the page without shipping its vocabulary; words keep the ratios, and the page says so. |

## What the methodology lacked for this page

A rule for figures shipped as vector graphics: reading line vertices and bar tops from the paper's own SVG, calibrated with its gridlines and printed ticks, is exact and should be preferred to "transcribe printed labels only" when the arXiv HTML provides SVG figures.
