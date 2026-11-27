# Visuals: built and rejected

## Built
- **Hero: the sampler-trainer loop with the drift/signal decomposition** under it, drift and signal in the page's two highlight colours. It is the whiteboard picture of the whole argument: the pull toward q every step, and q re-copied from p.
- **Online against offline, three reward modes** (a small table, paper Figure 2 read qualitatively): the puzzle the explanation solves. A table, not a chart, because the paper prints no values.
- **Toy: a token the reward ignores** (sections 4 to 6). One slider (the mismatch σ), exact expectations: the trainer's and sampler's filler-token probabilities, a table of drift, spread and path update for seven update rules, and 400 steps of the online loop against a frozen sampler. It shows in one place what the article says in five derivations: drift under +1/0 and group-centred rewards, none under score centering, drift returning under clipped or masked ratios, the spread of exact importance sampling, the covariance-under-q residual, and that a fixed teacher converges while a refreshed one compounds. Opens at σ = 0 (nothing to see) beside a prediction prompt.
- **30B results, printed numbers only** (bars by panel): shows that the separation is one panel, with seeds beside each bar.

## Rejected
- Redrawing the paper's training curves (Figures 1, 3, 4, 5): their text is glyphs and their values unprinted; reading curves by eye is not allowed, and the printed end points carry the argument.
- A sampled (Monte Carlo) version of the toy with noisy updates: the exact expectations make the bias visible without noise and let check_page.mjs compare every value with Python.
- A widget for the top-k tail model: the identity is exact (checked in recompute.py) and a sentence states it; a slider over k would only show an approximation the paper and its critic disagree about on real models, which a toy cannot settle.
- An importance-ratio distribution: RL for LLMs section 8 owns it, measured on real rollouts.
- Any 3D view: nothing here has spatial structure.
