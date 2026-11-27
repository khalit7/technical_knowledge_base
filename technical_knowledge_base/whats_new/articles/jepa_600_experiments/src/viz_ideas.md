# Visuals: built and rejected

## Built
- **Hero: every success rate on the standard 75-step test, by planner and physics** (learned predictor, simulator, memory graph). It carries the post's main point (changing the planner moves success far more than perfect physics) with the seed-noise caveat in the caption.
- **Toy: shortest routes through a memory graph of eight illustrative demonstrations**, jump cost on a slider and the goal with, across or against the flow. Computed exactly in the page (Dijkstra) and checked route by route against `src/recompute.py` (51 routes). Shows the jump-cost fix and why goals against the flow are hard for any memory of demonstrations.
- **Harder test by goal direction**, plain memory against transformed copies: the one figure where the post's numbers form a pattern worth seeing.
- **The paired 2x2 table of the pusher experiment** (9, 0, 30, 11): makes the sign test and the "60 points" legible at once.

## Rejected
- Replaying the post's recorded trajectories (its `figure-data.js` holds 24 hero episodes and two single runs): the post's own animations do this better, and they are a showcase of successes, not data that tests a claim.
- A Push-T simulator in the page: the claims are about the author's planners on tasks we cannot reproduce without his code; a simulator would teach the environment, not the evidence.
- A seed-noise simulator for the 38-of-250 flips: one number (a 2.5-point spread) says it.
- 3D anything: nothing here has spatial structure that depth would carry.
