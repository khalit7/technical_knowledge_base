Source of the interactive HTML on the Notion page "Bandits and exploration" (child of Topic: rl).

Build: `sh build.sh` writes `../index.html` (part order in the comment at the top of build.sh; the reading times replace RT_CORE and RT_DEPTH).
Data: `node make_data.mjs` writes `parts/22_js_bx_0data.js` (the hero, the regret chart's 200-run view and the A/B card, from the page's own engine, about 10 s); `node make_data.mjs --check` confirms the committed part equals a fresh run.
Checks: `python3 recompute.py && node check_engine.mjs` (Python reference against the page's engine; 48,927 values, 0 mismatches); `node check_page.mjs [light|dark] [width]` from the page folder drives every control in headless Chrome (and checks that no animation moves before the reader acts) and screenshots into `../.shots/`; `sh html_utils/checkpage.sh <page folder>`. `recompute_output.txt` is the output of `python3 recompute.py --full` (2,000 testbed tasks in Python).

Old text: none. The Notion page was new, with only a placeholder line, so there is no `live.md` and no `coverage.json`.

Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md` (a child page). Reading follows the subject's own order: one-screen table, the trade-off, action-value estimation, the strategies (with the five-strategy before/after animation), regret and the Lai and Robbins bound (live regret chart), contextual bandits and production uses, exploration in full RL (gridworld before/after animation, families of methods, Montezuma's Revenge table), exploration in LLM RL, common mistakes. One standalone tab, the 10-armed testbed, because "across all 2,000 tasks and all parameter settings" is a question of its own (Khalid's root lab rejected it there; it belongs here).

Reused from `../../src/for_children/` (the archived 60-minute root):
- `reading_full/20_read_b.html` section 7 (bandits): its prose (Silver's examples, ε-greedy probabilities and GLIE, optimistic initialisation, UCB, Thompson, deep exploration paragraph) rewritten and extended into sections 1, 3, 6, 7.
- `reading_full/24_js_rd_band.js` and `RDE.banditTable/banditRun`: the four-strategy animation, extended to five strategies (Thompson sampling with its posterior drawn per arm and its draws taken from the same pre-drawn table), UCB's bound whisker, and label de-overlapping; now `parts/24_js_bd.js` and `BX.banditTable/banditRun`.
- `reading_full/22_js_rd_common.js` (animation controller and helpers) copied as `parts/22_js_rd_common.js`; the root's `01_head.html`, `05z_errbox.js.html`, `99_js_tabs.js` (storage key changed).
- `estimator_lab/lab_src/viz_ideas.md` row LB-5 (the rejected 10-armed testbed and its text numbers 1.54, 91%, one third): built here as the testbed tab.

Engine (`parts/21_js_bx_engine.js`, mirrored line by line in `recompute.py`): mulberry32 random numbers as in the root; testbed runs use three independent streams per task (true values, reward noise, agent randomness) so methods share tasks and noise; Bernoulli regret runs; the gridworld.

Facts were checked against primary sources (Sutton and Barto 2020 PDF read with pdftotext; Auer et al. 2002; Lattimore and Szepesvári PDF; arXiv texts of the deep-exploration and LLM papers). Unconfirmed, and said so on the page or avoided: the verbatim Lai and Robbins statement (paywalled; the page uses Auer et al.'s restatement), the exact wording of the Nature Go-Explore paper (numbers taken from its arXiv preprint 2004.12919), whether Bing deployed adPredictor's posterior sampling (the paper says "can").

JS-only number (not in recompute.py, because a million Bernoulli pulls with Beta sampling is too slow in pure Python): Thompson's slope on arms 0.6 / 0.5 rising from 3.2 (10^3 to 10^4 pulls) to 4.2 (10^5 to 10^6), 20 runs, against the bound's 4.9. The engine itself is equal to Python on every value checked.

## The 2026-10-24 rebuild to the teaching contract
What changed and why (`.claude/skills/explainer-page/teaching/teaching-contract.md`):
- **Top**: the core idea in one sentence and a static hero (`23_js_hero.js`): three arms after 65 pulls with greedy's, UCB's and Thompson's choices on the same evidence, beside expected regret over 10,000 pulls on the far preset (greedy 650, epsilon-greedy 213, UCB1 170, Thompson 20; 200 runs). Then "You need" (Topic: rl, Dynamic programming for section 6), new terms, and the one-screen table (now with an A/B test row).
- **New visuals inline**: a one-slider weights chart in section 2 (`24_js_wt.js`: 1/n against a constant alpha over 20 rewards); in section 5 a static bandit, contextual bandit, MDP diagram, an illustrative replay-evaluation table, and a before/after of an A/B test (explore-then-commit) against Thompson sampling on the same 20,000 visitors (`27_js_ab.js`, 1,000 runs: 45 against 29 conversions lost; the A/B test ships the worse version with exact probability 2.15%, simulated 1.7%; at 4,000 visitors Thompson has 828 samples of the worse version against 2,000, interval 2.3 against 1.9 points).
- **Grown where the brief asked**: A/B testing was missing. Sourced from Lattimore and Szepesvari section 1.2 and chapter 6 (Theorem 6.1, eqs. 6.4 to 6.7, read from the book PDF) and Johari, Pekelis and Walsh (arXiv 1512.04922) for the peeking mistake.
- **Moved to closed blocks**: Bayes-optimal play and Gittins; the stochastic approximation conditions; gradient bandits (the general case is the policy-gradients sibling's); the finite-time bounds, worst-case and Bayesian regret; the per-paper details of section 6 and the Montezuma's Revenge table. Section 6 is now "in brief": three problems, the gridworld animation, and one table of seven families.
- **Section 7 condensed** to one paragraph: Yue et al., Cui et al. and DAPO are taught on RL for LLMs (ledger units owned there; keys pass@k, Clip-Cov, 0.28 checked on its built page).
- **Nothing moves before the reader acts**: `21_js_rd_common.js` is the skill template (plus this page's number helpers; the old file `22_js_rd_common.js` autoplayed on first view); `99_js_tabs.js` is the template with key `rlband-tab`. The regret chart no longer computes and fills in on scroll: its 200-run view is precomputed; 50 or 500 runs compute only when picked.
- **Mistakes**: "sample averages on a drifting problem" and "evaluating on logs from the old policy" are now carried by the weights card and the replay card; "peeking at an A/B test" added.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 26.1 min (5,993 words) | 23.5 min (5,413 words) |
| Reading, closed details | 2.0 min (452) | 8.7 min (2,010) |
| 10-armed testbed tab | 2.4 min | 2.4 min (unchanged) |
| Visuals drawn in Reading | 3 | 9 |

Why about 23 minutes is right: the page owns the whole of exploration, from the k-armed bandit through regret theory, contextual bandits and A/B tests to deep RL exploration. The core lost restatement and per-paper detail (to closed blocks) and gained the A/B section and six visuals with their captions; about 900 core words are captions and counters. Each core unit is needed to understand one strategy, the floor on regret, or where bandits run; what is optional (bounds, proofs, paper numbers, mistakes) is closed. `reading_extra.txt` holds the words drawn by script so the header matches the audit.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
284 units: core 209, depth 61, owned 3 (rl_for_llms: Yue et al.'s pass@k, Cui et al.'s entropy law and Clip-Cov, DAPO's 0.28), fat 11 (wind-ups, restatements, nav and tab labels, the old "Try" line replaced by a prediction prompt). 272 were drafted by `ledger.py init` from the old page; 12 were added by hand for the new content (section "added 2026-10-24").

## Images
None. This is a mechanism page; no physical object would teach anything here, and the canonical figures (Sutton and Barto 2.2 to 2.6) are reproduced live on the testbed tab rather than embedded.
