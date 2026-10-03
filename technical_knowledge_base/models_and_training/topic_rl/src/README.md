Source of the interactive HTML on the Notion page "Topic: rl".

Build: `sh build.sh` writes `../index.html` from `parts/`.

Shape (agreed with Khalid 2026-10-03): a full rewrite. Unlike other root pages, this root is meant to be a comprehensive read that gives a good understanding of RL on its own (Khalid: "the full page should give a reader a very good understanding of RL"), with the child pages for depth. Its spine is the page's own through-line, one target and many estimators. "RL foundations" is folded in. Tabs: Taxonomy (every axis RL methods are classified on; Khalid asked for it 2026-10-03), Estimator lab (classic tabular experiments run live, reproducing Sutton and Barto's figures), Method atlas (every method on one grid), Milestones and benchmarks, Further reading. The page's earlier embed (built outside the repo) is kept as `inputs/old_embed_topic-rl.html` for coverage.

Part ownership (parallel build): `20_read*`, `2x_js_*` and `39_tab_more*` Reading and Further reading (ids `rd-`); `32_*` lab (`lb-`); `31_*` taxonomy (`tx-`) and `33_*` atlas (`at-`), both by the atlas agent; `34_*` milestones (`ms-`). CSS scoped under each tab id.

## Reading tab and Further reading

**Departure from Part A of `html_utils/methods/topic_pages.md`:** Part A keeps a root's Reading tab "as short as possible while self-sufficient". On Khalid's instruction (2026-10-03) this root is instead a comprehensive read, about 60 minutes (13,500 words at 230 wpm, not counting the visuals), so that a reader who reads only this tab understands RL; the four children still own the details and each section ends with a "Go deeper" note pointing to them.

Outline: one screen (the spine table), then 1 what RL is, 2 the loop and the Markov property, 3 return and discounting, 4 the MDP in three steps, 5 V, Q and the Bellman equations, 6 agent components and the three axes (full axes in the Taxonomy tab), 7 bandits and exploration, 8 dynamic programming, 9 MC, TD, SARSA, Q-learning and importance sampling, 10 the bias-variance dial (n-step, TD(λ), GAE), 11 function approximation and the deadly triad, 12 DQN and its fixes, 13 policy gradients and actor-critic, 14 TRPO and PPO, 15 DDPG, TD3, SAC, 16 models and search, 17 imitation and offline RL, 18 RL for language models, then which family when, common mistakes, open problems.

Files: `parts/20_read.html`, `20_read_b.html` to `20_read_d.html`; JS `21_js_rd_engine.js` (all computations, no DOM), `22_js_rd_common.js` (animation controller and helpers), `23` to `29_js_rd_*.js` (one per group of visuals); `39_tab_more.html`. Checks: `python3 read/recompute.py && node read/check_engine.mjs` (independent Python against the page's engine, about 8,300 values) and `node check_read.mjs` (every control at 390 dark and 920 light). Visual choices, scores and rejected ideas: `read/README.md`. Coverage: `coverage.md` (this page and its old embed), `coverage_rl_foundations.md` (the folded-in page).
