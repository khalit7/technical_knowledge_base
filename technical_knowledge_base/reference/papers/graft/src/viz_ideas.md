# Visual ideas: GRAFT

Scored 0 to 2 per criterion of `visuals/choosing.md` (quantity that moves, defaults reproduce a source x2, public inputs x2, beyond a sentence, corrects a misconception, central question, absent elsewhere, fits the concept).

| id | Visual | Score | Status |
|---|---|---|---|
| P-graft.1 | Hero stepper: one RL step, which adapter each kind of sample trains (unflagged, flagged, anchor, deploy), gradient arrows x0 / x1 / x2 | 11 | built (Reading, top) |
| P-graft.2 | Figure 2 (left) replayed per seed with a toggle "the truth" (all hacks, clean solve) against "what the developer sees" (proxy reward, flagged rate): the same runs, two views | 16 | built (Reading) |
| P-graft.3 | Figure 2 (right): adapter decomposition over training, decoded from the vector figure | 11 | built (Reading) |
| P-graft.4 | Figure 3 replayed: detectable against undetectable hack bars per environment and method, task score beside | 14 | built (Reading) |
| P-graft.5 | Figure 4 decoded, with and without the elicitation prompt | 10 | built (Reading) |
| P-graft.6 | Tabular toy running Algorithm 1 (six methods, monitor choice, recall, penalty, seed), truth and developer views, one run stepped with its answer mix | 14 | built (Train the toy) |
| P-graft.7 | Per-seed and per-environment tables, every check | 9 | built (tables tab) |
| P-graft.8 | Toy with shared hack features (bilinear adapters) to show absorption | 8 | rejected for now: a linear shared feature makes routing worse in on-policy RL (more undetected samples), and a nonlinear version would be a research result, not a teaching toy; stated as what the toy cannot test |
| P-graft.9 | Expected-gradient (infinite group) version of the toy | - | rejected after a prototype: with almost every sample rewarded 1 the group standard deviation goes to zero and the advantages blow up, which GRPO with finite groups does not do; replaced by sampled groups of 16 |
| P-graft.10 | Monitor-recall sweep (Figure 10) rebuilt | 8 | rejected: the recall-suite runs are in the bundle but the Reading already carries the claim; the toy's recall slider shows the mechanism |
| P-graft.11 | Banana example (Table 1) as a picture | - | rejected: a four-row table says it completely |
