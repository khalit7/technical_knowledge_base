# Visualisation ideas: Offline RL and imitation

Question the page keeps returning to: what goes wrong when a policy is learned from data it did not collect, and how each method stops it.

| # | Idea | What it shows | Score (/10) | Data and formulas | Placement | Status |
|---|---|---|---|---|---|---|
| OF1 | BC against DAgger on a lane-keeping road, animated | The exact state distribution step by step, one sampled car (same random draws for both learners), the labelled states and the probability mass on unlabelled states; counters against εt² | 9 (mechanism, before/after, exact, reproduces the quadratic bound) | Ross et al. 2011 Theorem 2.1, Algorithm 3.1; exact propagation; recompute.py | Reading §2 | built |
| OF2 | Cost against horizon, log-log | Exact J for BC and DAgger for T = 5 to 320 against εT² and εT | 8 (makes T² against T measurable; shows BC's bend back to slope 1) | same engine | Reading §2 | built |
| OF3 | Extrapolation error, four learners on one dataset, animated | Fitted Q iteration on a 1-D action: naive Q runs off the data, BCQ-style band, CQL(H) lower bound, IQL expectile; believed against true value per iteration; naive faint for comparison | 9 (the central mechanism of offline RL, before/after, exact) | Fujimoto et al. 2019 §3; CQL Eq. 2 and Theorem 3.2; IQL Eq. 4 to 7 | Reading §6 | built |
| OF4 | D4RL results tab | Six printed tables one at a time (CORL last, best, offline to online; IQL; CQL; D4RL), sortable, domain filters; one method on one dataset across tables | 8 (benchmark data, never spliced; exposes version and printing differences) | text extracts in inputs/, parse_tables.py | Own tab | built |
| OF5 | MaxEnt IRL on a gridworld (recover a reward from demonstrations) | | 5: costly to build exactly in the page, and IRL is secondary here; text and links suffice | | none | rejected |
| OF6 | GAIL discriminator toy | | 4: an adversarial game is not reproducible exactly at page scale and would be illustrative only | | none | rejected |
| OF7 | Decision Transformer on a stochastic toy (luck against skill) | | 6: good idea for the debate, but a sequence model cannot be trained in-page; Paster et al.'s argument is stated instead | | none | rejected (candidate for later) |
| OF8 | Off-policy evaluation variance (IS weights against horizon) | | 5: the importance-sampling blow-up is already on Model-free prediction and control | | none | rejected (linked) |
| OF9 | Hero: the state-action plane (2026-10-24) | The data band; a learner drifting off it in state (compounding error) and a max over actions leaving it in action (extrapolation error); each fix labelled where it acts, labels jump to sections | 9 (the whiteboard picture of the page; static annotated diagram) | none (conceptual, no numbers) | Reading top | built |
| OF10 | IRL and GAIL outer loop (2026-10-24) | Demonstrations, fit a reward or discriminator, an RL inner loop in the environment, rollouts, repeat | 7 (structure; shows why none of the family is offline) | Abbeel and Ng 2004, Ziebart et al. 2008, Ho and Ermon 2016 | Reading §4 | built (replaces OF5 and OF6 as the visual of this section) |
| OF11 | Expectile slider (2026-10-24) | One slider τ over the IQL learner's Q at the 30 data actions (seed 1): the expectile moves from the mean to the maximum and never passes it | 8 (one parameter, exact, on the page's own toy) | IQL Eq. 4; the engine's exact expectile | Reading §9 | built |
| OF12 | Decision Transformer tokens (2026-10-24) | (return-to-go, state, action) triples in training; the requested return reduced by each reward at test time (90, 87, 82 illustrative) | 7 (structure plus the one step that is easy to misread) | Chen et al. 2021 | Reading §10 | built |
| OF13 | Real image (ALVINN's Navlab, a QT-Opt grasping cell) | | 3: a mechanism page; a photo would decorate, and no clearly licensed QT-Opt image was looked for | | none | rejected |

What the methodology lacked for this page: a rule for toy value-function experiments that a theorem's conditions be met by construction (CQL's bound needs mu = pi), and said so, rather than tuned until the picture looks right.
