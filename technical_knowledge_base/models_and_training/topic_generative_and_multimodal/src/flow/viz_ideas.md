# Flow lab: visual ideas, built and rejected (2026-10-17)

The question the lab keeps returning to: why does a flow model need fewer sampling steps than a diffusion model, and what does it take to get to one step? Every visual below measures a step count, a path shape or a convention.

## Built
| idea | score (0-2 each: parameter to move / reproduces a source / computable / beyond prose / corrects a misconception / central question) | where |
|---|---|---|
| Live 2-D toy: 400 particles flow from noise to a ring of 8 Gaussians; four models (random pairs, after reflow, minibatch OT, DDPM with DDIM); steps 1 to 64; Euler, Heun, midpoint; trails and the field's arrows; "before / after reflow" on the same noise. Real trained weights (int8, about 9 KB of text per model, width 48: the width-64 version scored the same and was 60% larger) run by the browser | 2/1/2/2/2/2 | section 1 |
| Pairs viewer: 60 noise-data pairs as lines, random against minibatch OT (Hungarian in the browser) against reflow (z, flow(z)); counts crossing lines | 2/0/2/2/2/2 | section 2 |
| Per-t validation loss of the image model (the loss floor is highest at t = 1, where the noise must be guessed) | 0/0/2/2/2/1 | section 2 |
| Integration error against a fine solution by NFE, log-log, four solvers (slopes are orders; Heun's endpoint problem visible) | 1/0/2/2/2/2 | section 3 |
| Toy recorded scores (on-mode share, W2, gap to the fine answer) by steps for the four models | 2/0/2/1/1/2 | section 3 |
| Flow against diffusion at equal NFE: chart and table with the Diffusion lab's DDPM, DDIM and DPM-Solver++ runs, three metrics | 2/0/2/2/2/2 | section 4 |
| Same noise, by steps: flow Euler, DDIM, DDPM and reflowed flow on the Diffusion lab's strip noise | 2/0/2/2/1/2 | section 4 |
| Before/after animation: four noises, ten steps, the sampler's position and its guess of the end, flow against DDIM against reflowed flow | 1/0/2/2/2/2 | section 4 |
| Reflow before/after table at 1 to 50 steps plus straightness | 1/1/2/1/2/2 | section 5 |
| Shift strips at 4 steps, guidance chart beside the Diffusion lab's, two convention bugs as strips | 1/1/2/1/2/1 | sections 6, 7, 9 |

## Rejected
- Training the toy in the browser: possible, but slower than embedding real weights, non-reproducible, and the page would show a different model from the one scored.
- An adaptive-solver (dopri5) row: torchdiffeq is not in the shared environment; installing it was not worth one row.
- Logit-normal versus uniform t training on the image model: a second 15-minute run for a difference likely below the noise of a 1,000-sample FD (the topic's cheap-runs rule); quoted from SD3 instead.
- A two-moons toy beside the ring: the Math page (section 18) already has two moons; one dataset keeps the embedded weights under the size budget.
- A diffusion stochastic (SDE) sampler for the flow model: would answer "is DDPM's advantage stochasticity?" but needs its own derivation and a section the root does not need; noted as not run.
- A full sampled-trajectory sheet at 50 steps: too many images for the budget; ten steps carry the same lesson.

## What the methodology lacked here
- A rule for "hypothesis found while building": plain Heun scored far worse than midpoint; a cheap follow-up run (`sample_extra.py`) tested the endpoint explanation instead of leaving the anomaly unexplained. Worth adding: when a measured result contradicts the textbook, run the cheapest test of one explanation and show it.
