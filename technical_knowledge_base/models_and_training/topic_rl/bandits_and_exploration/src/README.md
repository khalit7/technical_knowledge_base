Source of the interactive HTML on the Notion page "Bandits and exploration" (child of Topic: rl).

Build: `sh build.sh` writes `../index.html` (part order in the comment at the top of build.sh; the reading times replace RT_CORE and RT_DEPTH).
Data: `node make_data.mjs` writes `parts/22_js_bx_0data.js` (the hero, the regret chart's 200-run view and the A/B card, from the page's own engine, about 10 s); `node make_data.mjs --check` confirms the committed part equals a fresh run.
Checks: `python3 recompute.py && node check_engine.mjs` (Python reference against the page's engine; 48,927 values, 0 mismatches); `node src/check_page.mjs [light|dark] [width] [--testbed]` from the page folder drives every control in headless Chrome at 1400 light, 920 light and 390 dark (no arguments), checks that every 3D stage plays by itself once scrolled into view, reaches its last step, has one list item per step and does not move under reduced motion, checks the step lists' numbers against the engine, and screenshots into `../.shots/` (`--testbed` also runs all seven testbed figures); `sh html_utils/checkpage.sh <page folder>`. `recompute_output.txt` is the output of `python3 recompute.py --full` (2,000 testbed tasks in Python).

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

2026-10-24 (topic close of Topic: rl): Further reading quotes the root as "17 min, plus 2" and siblings and neighbours as their headers; section 2's gradient bandit block links Policy gradients sections 2 and 4; ledger keys that quoted old times re-keyed.

## The 2026-11-06 pass: split layout, 3D stages, explained step lists, autoplay
Khalid's standing rules of 2026-11-06 (`teaching/teaching-contract.md` "Page layout", `visuals/mechanics.md`, `visuals/three-d.md`), with the Attention Is All You Need paper page as the reference.
- **Split layout everywhere a section has a visual** (`parts/02_split.html`, the skill template, unchanged): text left, visual right and sticky from 1100 px. Full width: section 1 (no visual), "You need", new terms and the one-screen table, "Where bandits are used", the families table and its details, sections 7 and Mistakes, and the testbed tab's notes.
- **Three 3D stages** (`parts/25_js_s3.js`, the template, unchanged; one scene per file):
  - `32_js_sc_hr.js`, the hero (replaces the 2D `23_js_hero.js`): the three arms' evidence as piles of pulls (wins green), estimates as bars on a value scale, UCB's bonus as translucent blocks, Thompson's Beta(1 + wins, 1 + losses) posteriors as shapes with their 83 / 17 / 0.7% shares, then the bill as four regret walls over 10,000 pulls. Data: `BXD.hero` (unchanged `make_data.mjs` output).
  - `33_js_sc_bd.js`, section 3 (new): five strategies by five arms as a bar field (height: share of the row's pulls on that arm; a regret block per row), stepping through pulls 0, 5, 30, 100, 300 of seed 3 and animating pull by pull between them. Data: `BX.banditRun` on `BX.banditTable(3)`.
  - `34_js_sc_gx.js`, section 6 (replaces the 2D `26_js_gx.js` animation): the 14 x 7 gridworld with visits per cell as bars (log scale, fixed to the run's final maximum) and the episode's path walking over them, episodes 0, 1, 10, 50, 200, 500 of seed 1, one step list per mode (the chips swap the list and replay). Data: `BX.gxRun`. The 20-seed table moved into this file.
- **Step lists** (`ol.sx`) on the left of each stage, one item per step; the numbers they quote (pull counts, regrets, cells, episodes) are recomputed from the engine by `check_page.mjs` and fail it if they drift. The old caption carousels (script-drawn captions of the two animations) became these lists.
- **The 2D strategies animation became a pull-by-pull explorer** (`24_js_bd.js`, beside UCB and Thompson): it kept its estimates, UCB whiskers, sideways posteriors, regret curves, seeds and counters, but a scrubber and back and forward buttons replace `RD.anim` (300 one-pull steps cannot each have an explained list item; the overview now plays in the 3D stage). It opens on UCB at pull 40.
- **Motion:** `21_js_rd_common.js` and `99_js_tabs.js` are the current templates (storage key `rlband-tab`; this page's number helpers appended). The stages play when at least half in view, pause off screen, stop for good on any control or at the last step, never move under reduced motion. `RD.anim` is no longer used on this page.
- **Kept 2D**: the weights slider (a parameter against bar weights), the regret chart (log axis), the A/B before/after (two curves over visitors), the bandit/contextual/MDP ladder and the replay table (structure and a table), the testbed charts (learning curves). None has spatial structure that depth would show.
- **Predict prompts** moved out of the cards into the left column; the testbed tab is a split (controls and charts right, its notes and reproduction box left).
- `05z_errbox.js.html` ignores the browser's benign "ResizeObserver loop" notice: the template stage's ResizeObserver redraws and resizes its card in the same frame at some widths, which Chrome reports as an error event (seen at 1400 px).

### Length judgement
| | Before (2026-11-06 audit) | After |
|---|---|---|
| Reading, core (230 words a minute) | 23.5 min (5,413 words) | 27.9 min (6,428) |
| Reading, closed details | 8.8 min (2,018) | 8.8 min (2,018) |
| 10-armed testbed tab | 2.8 min (641) | 2.8 min (641) |
| Visuals drawn in Reading | 9 | 9 (3 of them 3D stages) |

The growth is the step lists: about 330 words for the hero, 390 for the strategies stage and 3 x 230 for the gridworld's three modes (a reader follows one mode at a time, so about 26 minutes is what one pass costs). What they say was partly script-drawn caption text before; the rest is the reading of each stage that the rules now require on the page. Nothing was re-condensed beyond removing what the lists duplicated (the hero's caption paragraph, the gridworld caption's per-mode settings).

### Ledger
`python3 html_utils/ledger.py check`: 284 units (core 209, depth 61, owned 3, fat 11), problems 0. No unit changed label; the key "set every Q to 1" now sits in the optimistic step list.

## The 2026-11-06 v2 pass: renderer v2 scenes
`25_js_s3.js` recopied from the template (renderer v2: glass, flows, contact shadows, camera per step); `02_split.html` and `05z_errbox.js.html` were already identical to the templates (the template errbox now carries the ResizeObserver filter).
- `32_js_sc_hr.js`: an agent ball in front; pulls stream from it onto the piles (step 1, dots in proportion to each arm's pulls) and the wins flow back into the estimates; greedy's and UCB's picks are single streams to A and B while the other arms recede; Thompson's posteriors are drawn on glass plates and the agent's pulls go to each arm in proportion to its share of draws; the bill glides in closer on the four walls. Estimate labels moved to the right of the bars (they collided with the value scale). 65 pile cubes without shadows.
- `33_js_sc_bd.js`: each stretch's pulls fall as dots onto the arms they went to (density by the stretch's share); the 30-box field has no shadows; at the bills the other arms recede so the best arm's column and the regret blocks stand out; camera lowered and bounds tightened (less empty card).
- `34_js_sc_gx.js`: the episode's path is a stream of dots walking it over a thin line; step 1 shows the starting Q table as a glass plate (at height 1 for optimistic starts); episode 1 is seen up close on the cells it visited (`view`); the 98-cell field has no shadows; the readout moved above the back of the grid (it overlapped the front bars).
- Step lists: one sentence each where the flows or the plate are new (hero step 1 and 4, strategies step 1, optimistic step 1); the gridworld note says orange dots. All quoted numbers unchanged (`check_page.mjs` recomputes them).
- The pull-by-pull explorer (`24_js_bd.js`) already follows the long-replay rule (a widget: no autoplay, no step list, opens on UCB at pull 40); its live caption explains the current pull and repeats no step list. The testbed tab has no replay.
- Reading, core: 6,485 words (28.2 min, header still 28); closed details unchanged (9). Ledger: problems 0.
