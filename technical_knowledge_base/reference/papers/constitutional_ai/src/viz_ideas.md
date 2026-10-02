# Constitutional AI: visualisation ideas

Methodology: `html_utils/interactive-html-ideas.md` section 2. Scores are teaching value, data honesty, effort (inverted) and fit, each out of 5. Kind of paper (papers.md): **method on top of a model** (an RL recipe), so the live ingredient is a **trace replay**, and here the paper released its own traces.

## What the text needs to be understood

1. Where the human labels go in RLHF and where they go in CAI (the whole point of the paper).
2. What a critique and revision step concretely is, and that the principle is random per step.
3. Why CoT labels had to be clamped (a mechanism that is easy to state and hard to feel).
4. Whether "virtually never evasive" and the Goodharting boilerplate are real and how big.
5. What the constitution actually says.

## Built

| id | Idea | Score | Placement | Data and formula |
|---|---|---|---|---|
| P-constitutional_ai.1 | **Two pipelines, one animation** (CAI against HH RLHF): seven steps each, same layout, boxes outlined by who labels (people or model), counters of human harmlessness labels, AI labels, human helpfulness labels and principles written | 18 (5, 4, 4, 5) | Reading, Idea | §3.2, §4.2 counts; the HH counter uses the 44,849 comparisons of the released hh-rlhf harmless-base split (counted from the files), labelled as the closest public number since the paper gives none |
| P-constitutional_ai.2 | **Replay the released critique chains**: 18 prompts the paper prints (Appendix D, Appendix A's chain, §4.3's two Goodhart prompts), answer, four critiques and revisions step by step, the drawn principle shown at each step, a word-level LCS diff of every revision, counters for length and new words | 19 (5, 5, 4, 5) | Own tab (Replay the critiques) | `samples/*_SLMADISON.jsonl` verbatim |
| P-constitutional_ai.3 | **Four models, same prompt**: the median of each model's 17 released samples, tagged canned refusal or boilerplate | 17 (4, 5, 4, 4) | Replay tab, under the chain | `samples/*_{HRLHF,HHRLHF,RLMADISON,RLMADISON_COT}.jsonl`, sample 9 of 17 |
| P-constitutional_ai.4 | **Count the refusals**: a visible classifier (word limit slider, phrase toggle, dataset filter) over all 4,488 released answers; bars per model; a 66 × 17 grid per model (prompts by samples, sorted by the file's PM score) with tap-to-read rows; the full audit list of flagged strings | 19 (5, 5, 4, 5) | Own tab, short form as a predict-then-reveal in Results | `mk_data.py` regex, every match listed |
| P-constitutional_ai.5 | **Appendix D is the median**: position of each printed answer among the 17 sorted samples, 16 of 16 at position 9 | 15 (3, 5, 5, 2) | Count tab table | first 45 characters of each sample matched against the appendix text |
| P-constitutional_ai.6 | **Soft, hard and clamped labels**: real gradient descent of a single comparison's reward gap under the cross-entropy of each label type, with the logit(target) asymptote, slider for the feedback model's probability | 17 (5, 3, 4, 5) | Reading, Stage 2 predict-then-reveal | Bradley-Terry form; clamp ranges from §4.3; labelled illustrative |
| P-constitutional_ai.7 | **How much each revision rewrites**: new-word share per revision over the 66 chains, with mean lengths; the first rewrites about half, later ones still a third to two fifths | 15 (4, 4, 5, 2) | Reading, Stage 1 predict-then-reveal | LCS over words, `mk_data.py` |
| P-constitutional_ai.8 | **The constitution, verbatim**: both lists of 16 with draw counts from the released chains (χ² against uniform) and the anti-preachy RL principles outlined; a recomputed counts table; one real HHH evaluation item | 15 (3, 5, 5, 2) | Own tab (The constitution and the numbers), replacing the papers.md "tables" tab | repository JSON; `recompute.py` |

## Rejected

- **Rebuilding Figures 2 to 10.** The paper prints no Elo values or scores in text and no tables; the method forbids reading curves. Said on the page.
- **Running a feedback model on the 438 HHH questions.** Needs an LLM; the page has no network and a toy judge would not test the claim.
- **PM-score distributions per model from the released files.** The repository does not say which PM scored them and the scales differ by model; used only for order (which is what reproduces "median samples").
- **A toy RL loop where a policy Goodharts a hard-label PM.** Would be invented dynamics; the single-comparison loss demo shows the mechanism without pretending to be the paper's RL.
- **Then and now tab.** CAI's later history is a list of descendants (2023 constitution, Collective CAI, RLAIF vs RLHF, specific vs general principles, the open recipe, constitutional classifiers, the 2026 constitution), not a step-by-step morph of one design; it fits in Why it matters.

## What the methodology lacked for this page

- A rule for **released model samples**: when a paper ships samples, measuring them (counts, medians, diffs) is a stronger live ingredient than any illustrative trace, and the page should say which statistic the release supports (here order, not PM scale).
- A note on **content warnings** for red-team material shown verbatim.
