# Dynamic programming: visualisation ideas

The question the page keeps returning to: **given the model, how do the Bellman equations get solved exactly, how fast does the error shrink, and what does each method spend (sweeps, backups, model look-ups) to get there?** Every DP method is a choice of which backup to apply to which state when; the visuals make that choice and its cost visible on the same inputs.

## What already exists (so this page does not repeat it)

| Where | Visual | Consequence here |
|---|---|---|
| Topic: rl, Reading | One-episode targets animation; decision tree | Linked by name; not rebuilt |
| Topic: rl, Method atlas and Taxonomy | Value and policy iteration placed on every axis, with Bellman 1957 and Howard 1960 | Linked; history section consistent with the atlas rows |
| Topic: rl, `for_children/reading_full/` | Student MDP diagram (`rd-sm`), Monte Carlo sampler (`rd-mc`), 4 × 3 value iteration against Q-learning (`rd-gw`) | Reused here (adapted, checked again) |
| Topic: rl, `for_children/estimator_lab/` experiment 1 | Figure 4.1, DP against TD and MC | The DP side is rebuilt in the Sweep lab (same 92 of 96 result); the sampled side belongs to Model-free prediction and control |
| Old embed of this page | Corridor replay; gridworld VI against PI with sliders; sweep calculator; curse calculator; flashcards | Corridor and gridworld rebuilt with checked engines; calculators folded into the contraction widget and the curse card; flashcards rejected (every answer is in the text) |

## Candidates, scored

Scores 0 to 2: parameter to move (Q), reproduces a published figure (R, ×2), computable (C, ×2), shows what a sentence cannot (S), corrects a misconception (M), measures the central question (X), absent elsewhere (A), step animation against the method it replaced (N); build cost subtracted (B).

| # | Idea | Q | R×2 | C×2 | S | M | X | A | N | −B | Total | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Sweep lab**: 8 methods (PE sync/in place, PI, MPI-3, VI sync/in place/reverse, prioritised sweeping) on 4 worlds, two panels on one budget of model look-ups, greedy arrows (all ties), click a cell for its backup, error-against-look-ups chart with the γ^k bound | 2 | 4 (Figure 4.1 92/96; Silver V1 to V7 exact; AIMA 17.3 exact; all independently) | 4 | 2 | 2 (PI is not always cheaper; in-place order matters; VI's intermediate values are no policy's) | 2 | 2 | 1 | −2 | 17 | **built, own tab** ("across methods and worlds, what does each spend") |
| 2 | **Corridor, four ways**: sync VI, in place C→B→A and A→B→C, random-policy evaluation, one backup per step with the arithmetic | 1 | 4 (old page's tables, independently) | 4 | 2 | 1 (sweep order) | 2 | 1 | 2 | −1 | 16 | **built, Reading §10** (before/after animation) |
| 3 | **Contraction chart**: two VI runs from different starts on the 4 × 3 world, γ slider, gap against γ^k bound; sweeps-needed and stopping-bound tiles | 2 | 2 (66 and 688; 0.099) | 4 | 2 | 2 (small change is not small error; γ = 1 converges by termination) | 2 | 1 | 0 | −1 | 14 | **built, Reading §11** |
| 4 | **Student MDP with clickable Bellman equations** (reused) | 2 | 4 (Silver L2 tables; corrects 8.4 to 9.4) | 4 | 2 | 2 | 1 | 0 (built for the root's long tab, now only here) | 0 | 0 | 15 | **reused, Reading §3** |
| 5 | **VI against Q-learning on the 4 × 3 world** (reused) | 1 | 2 (AIMA 17.3) | 4 | 2 | 1 | 1 | 0 | 2 | 0 | 13 | **reused, Reading §15** |
| 6 | **Monte Carlo sampler of the student MRP** (reused) | 1 | 2 | 4 | 1 | 1 | 1 | 0 | 0 | 0 | 10 | **reused, Reading §2** (the exact value DP computes against sampled means) |
| 7 | **Gambler's problem** (Example 4.3): value per sweep and the set of optimal stakes, p_h select | 1 | 0 (curves only as an image: shape only) | 4 | 2 | 2 (many optimal policies from ties; bold play only when the coin is unfavourable) | 1 | 1 | 0 | −1 | 10 | **built, Sweep lab section** |
| 8 | **Curse-of-dimensionality calculator** (variables, values, actions → n, dense and sparse look-ups, m^n policies) | 2 | 0 | 4 | 1 | 1 (S&B's "over a thousand years" is 3.2 million) | 1 | 0 | 0 | 0 | 9 | **built, Reading §13** (small card) |
| 9 | LP view: constraints drawn for the corridor, feasible region | 1 | 0 | 4 | 1 | 1 | 0 | 2 | 0 | −2 | 7 | **rejected**: three-dimensional region on a phone; the LP's agreement with V* is stated and checked in recompute.py instead |
| 10 | Jack's car rental policy sequence (Figure 4.2) | 1 | 2 (shape: π4 optimal) | 2 (Poisson truncation conventions differ by implementation) | 2 | 1 | 1 | 1 | 1 | −2 | 9 | **rejected for now**: the figure is an image, its conventions are not fully stated; cited in text |
| 11 | RTDP animation on a racetrack | 1 | 0 (book table needs 25 runs of an unstated track) | 2 | 2 | 1 | 1 | 1 | 1 | −2 | 7 | **rejected**: belongs with trajectory sampling on Model-based RL and planning; numbers quoted in §14 |
| 12 | Flashcards and quiz (old embed) | | | | | | | | | | | **rejected**: every answer is in the text |

## Data and formulas

All inputs are the worlds' definitions (`parts/21_js_dpe.js`, `recompute.py`): Sutton and Barto Example 4.1 (book p. 76), Silver Lecture 3 shortest path, AIMA Figure 17.1 (0.8/0.1/0.1, −0.04, exits ±1), the Dyna maze layout from Zhang's reproduction code (chapter08/maze.py), the old page's corridor, Example 4.3. Derived numbers: k ≥ ln(1/ε)/ln(1/γ); γθ/(1 − γ); look-ups = Σ over backed-up states of (actions read × successors); 10^20/10^6 s in years.

## What the methodology lacked for this page

A fair unit of cost across algorithms whose steps differ in kind (an evaluation sweep, an improvement, a single prioritised backup). Model look-ups, with frames of one value-iteration sweep's worth, made the race honest; worth reusing for any page comparing iterative solvers.
