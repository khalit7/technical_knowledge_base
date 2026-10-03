Source of the interactive HTML on the Notion page "Topic: rl".

Build: `sh build.sh` writes `../index.html` from `parts/`.

Shape (agreed with Khalid 2026-10-03): a full rewrite. Unlike other root pages, this root is meant to be a comprehensive read that gives a good understanding of RL on its own (Khalid: "the full page should give a reader a very good understanding of RL"), with the child pages for depth. Its spine is the page's own through-line, one target and many estimators. "RL foundations" is folded in. Tabs: Taxonomy (every axis RL methods are classified on; Khalid asked for it 2026-10-03), Estimator lab (classic tabular experiments run live, reproducing Sutton and Barto's figures), Method atlas (every method on one grid), Milestones and benchmarks, Further reading. The page's earlier embed (built outside the repo) is kept as `inputs/old_embed_topic-rl.html` for coverage.

Part ownership (parallel build): `20_read*`, `2x_js_*` and `39_tab_more*` Reading and Further reading (ids `rd-`); `32_*` lab (`lb-`); `31_*` taxonomy (`tx-`) and `33_*` atlas (`at-`), both by the atlas agent; `34_*` milestones (`ms-`). CSS scoped under each tab id.

## Reading tab and Further reading

**Shape (Khalid, 2026-10-04):** the Reading tab is a short intuitive overview, about 16 minutes (3,600 words at 230 wpm). This replaces the earlier "comprehensive read" departure from Part A (2026-10-03); Khalid: "The page shouldn't explain the concepts in depth, this is the children page's responsibility. It should give a quick overview or a quick intuitive explanation." Depth moves to the eight approved children (Bandits and exploration; Dynamic programming; Model-free prediction and control; Value-based deep RL; Policy gradients and actor-critic; Model-based RL and planning; Offline RL and imitation; RL for LLMs). The four without pages yet are named "coming soon" in Go deeper notes, which link the nearest existing child. The long version is archived in `for_children/reading_full/` with its checks in `for_children/reading_full_checks/`.

Outline: one screen; what RL is; the loop, state and return; the one idea (Bellman equation, spine table, the one-episode animation); the families (exploration, planning, learning from samples, deep value methods, policy gradients to PPO, model-based and search, offline and imitation, RL for LLMs), each with a Go deeper note; which family when (decision tree and table); common mistakes.

Files: `parts/20_read.html`, `20_read_b.html`; JS `21_js_rd_engine.js` (the widget's computations), `22_js_rd_common.js` (animation controller), `26_js_rd_one.js` (one episode, every target), `29_js_rd_tree.js` (decision tree); `39_tab_more.html`. Checks: `python3 read/recompute.py && node read/check_engine.mjs`, `node check_read.mjs`. Coverage: `coverage.md`, `coverage_rl_foundations.md` (each fact in the root, a root tab, or moved to a named child and archived).
