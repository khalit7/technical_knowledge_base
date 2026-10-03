# Reading tab visuals (overview version, 2026-10-04)

Two visuals, chosen because they carry the page's one idea and the choice between families:
- **One episode, every target** (`rd-one`), an animation: the same episode's target for S₀ under TD, two-step, Monte Carlo, the λ-return, dynamic programming, the policy-gradient weights, and a GRPO group, with five sliders. Its defaults reproduce the old page's worked numbers exactly (checked by `recompute.py` and `check_engine.mjs` over a grid of 244 slider settings).
- **Which family when** (`rd-tree`), a decision tree with 13 leaves (the old embed's Explore tree, extended), with the full table under it.

Everything else (the student MDP diagram, Monte Carlo sampler, bandit, value iteration against Q-learning, the bias-variance dial, deadly triad, maximisation bias, policy gradient with and without a baseline, PPO clip, GRPO group) moved with its section to `../for_children/reading_full/`, with scores, sources and checks in `../for_children/reading_full_checks/`.
