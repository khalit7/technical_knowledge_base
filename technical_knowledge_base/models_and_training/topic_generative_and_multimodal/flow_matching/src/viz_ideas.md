# Flow matching child page: visual ideas, built and rejected (2026-10-17)

The question the page keeps returning to: what exactly is a flow-matching network learning, and which of the knobs (path, coupling, rounds, distillation, time sampling, noise, grid) actually changes how many steps it needs? The root's Flow lab already answers "flow against diffusion at equal steps" with its own animations; nothing below repeats them.

Scores: parameter to move / reproduces a source / computable / beyond prose / corrects a misconception / central question, 0 to 2 each.

## Built
| idea | score | where |
|---|---|---|
| "Average the lines": a draggable point and a time slider; the 80 conditional lines through it weighted by posterior, their mean, the exact closed-form field and the trained network's arrow, each drawn to the predicted end point | 2/1/2/2/2/2 | Reading 1 |
| Loss decomposition by t: total target, irreducible floor, network's distance from the exact field (log) | 1/1/2/2/2/2 | Reading 1 |
| Exact field against trained networks by Euler steps (discretisation against learning error) | 1/0/2/2/2/2 | Reading 2 |
| Exact empirical field of the training set against the trained network on the same noise, with nearest training images, 1/4/10/50 steps | 2/1/2/2/2/2 | Reading 3 |
| Three exact paths table (straight, cosine VP, DDPM VP) with DDIM | 1/1/2/2/2/2 | Reading 4 |
| Minibatch OT travel distance by batch size, 2-D against images (one chart) | 2/1/2/2/2/1 | Reading 5 |
| OT-CFM trained at B = 1, 4, 16, 64, 256 (table) | 1/0/2/1/1/2 | Reading 5 |
| Reflow rounds tables, toy (4 rounds) and images (3 rounds) | 1/1/2/1/2/2 | Reading 6 |
| Distillation table, toy and images, beside Liu et al.'s row | 1/1/2/1/1/2 | Reading 7 |
| Timestep scheme table by budget | 1/1/2/1/2/1 | Reading 8 |
| SDE table (exact field) and the image model's ODE against SDE | 1/1/2/2/2/1 | Reading 9 |
| Production table with configs read from the Hub | 0/2/2/1/1/1 | Reading 11 |
| Real diffusers output: 4-step grids, the missing-mu ValueError | 0/2/2/2/2/1 | Reading 12 |
| 2-D flow playground: two panels, same noise, exact fields x paths x ODE/SDE x solvers, four RF rounds, three students, seven presets, step animation | 2/1/2/2/2/2 | tab |
| Steps ladder: every tiny model and sampler of the topic at equal NFE (FD, accuracy, diversity), same-noise grid by class, before/after animation by NFE budget | 2/1/2/2/1/2 | tab |
| Timestep explorer: SD3 densities with sliders and the toy's floor, recorded error-by-t curves per scheme, resolution shift calculator for real configs, SD3's ranking table | 2/2/2/2/1/2 | tab |

## Rejected
- A second "flow against diffusion" animation: the root's Flow lab section 4 owns it; the Steps ladder links it by adding rows instead.
- Training the image model with logit-normal t: a 15-minute run for a difference below the 1,000-sample FD noise (the root made the same call); the toy with exact fields shows the mechanism (where the error goes) better.
- Exact OT pairs on images with large B: measured cost reduction is 5% at B = 4,096, so a trained OT-CFM image model would teach nothing beyond the number.
- An LPIPS-distilled student: would need LPIPS weights and a second recipe; L2 shows the ordering.
- A 3-RF image student: a third pair pass (8 minutes) for a row the toy already has.
- MeanFlow or shortcut training on the toy: real candidates for a later round; they need a two-time network (t, r) and a JVP, more than a toy recipe change.
- An adaptive solver row: torchdiffeq not in the shared environment (as the root).

## What the methodology lacked here
- A rule for "the exact answer is computable": when the data are a Gaussian mixture or a finite set, the optimal network output has a closed form, and comparing against it separates learning error from everything else. It produced four of this page's best visuals (sections 1 to 3 and the playground). Worth adding: for any regression-trained generator, check whether the Bayes-optimal output is computable on the toy before training anything.

## 2026-10-24 rebuild
- Built: static three-panel hero (structure); solver error by NFE from the root's recording (parameter: NFE); the clock of section 6, lambda = a/(a + b) at four uniform steps per path (derived; shows "choosing a path is choosing a grid" in one picture); one-step against fifty-step strips behind a predict prompt; the root's convention-bug strips (real bad outputs).
- Moved inline: the Steps ladder (section 10) and the Timestep explorer (section 11); the playground engine also drives a before/after reflow card in section 8.
- Rejected: an animated hero (the change is not the point; a static diagram carries structure); a second flow-against-diffusion animation (the root's Flow lab had one; section 10's same-noise before/after replaces it); embedding Liu et al.'s Figure 1 (no open licence; redrawn as hero panel 3).
