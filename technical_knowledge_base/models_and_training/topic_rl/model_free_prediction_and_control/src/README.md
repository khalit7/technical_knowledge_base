# Source of "Model-free prediction and control: Monte Carlo, TD, SARSA, Q-learning"

Child page of Topic: rl (Notion 3c65c17b0d0d81898a0cd4c05c744969; page prefix `rd`/`lb`/`mx`/`is`, storage key `mfpc-tab`). Build: `sh build.sh` writes `../index.html` from `parts/`. Built 2026-10-04; rebuilt 2026-10-24 to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), editing and one new derived visual, no heavy runs.

## Tabs and parts
Parts added 2026-11-06: `02_split.html` (the skill's split-layout CSS, unchanged), `25_js_s3.js` (the skill's 3D renderer and stage, unchanged), `37_js_sc_hero.js` and `38_js_sc_four.js` (the two scenes); `23_js_rd_four.js` and `25_js_rd_hero.js` were removed (see the 2026-11-06 section at the end).

| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read_a` (styles, nav, the idea in one screen: core sentence, hero, you need, new terms, the one-screen table; section 1 MC and TD with the random-walk rerun), `20_read_b` (2 the dial with the 19-state rerun; 3 control), `20_read_c` (4 SARSA, Expected SARSA, Q-learning with the cliff rerun; 5 maximisation bias with Example 6.7), `20_read_d` (6 off-policy MC and importance sampling with Examples 5.4 and 5.5; 7 function approximation and the deadly triad; 8 the map; closed depth: misconceptions, provenance) | sections 1 to 8 core, closed `details.dp` blocks for depth |
| Further reading `t-more` | `39_tab_more.html` | links to each rerun by section (`{{text|#t-read/<id>}}`), siblings, resources, papers |

JS: `21_js_mf_engine.js` (engine, no DOM, Node-loadable: four learners, lambda-return, two targets, fall chance, maximisation bias, blackjack, infinite variance, and since 2026-10-24 `bairdX`/`triadRun`), `22_js_rd_common.js` (the skill template, unchanged: `RD.anim` never autoplays), `22_js_rd_extra.js` (this page's number formatting, colour scale and the one-screen table's row jumps), `23_js_rd_four.js` (one episode, four learners), `24_js_rd_small.js` (lambda weights, two targets, fall chance), `25_js_rd_hero.js` (the static hero), `32_js_lab_a.js` to `_d` (the Estimator lab engine and helpers from Topic: rl, the random walk, 19-state walk and cliff; `U.anim` no longer autoplays), `34_js_mx.js`, `35_js_is.js`, `36_js_triad.js` (Baird's counterexample with the triad switches), `99_js_tabs.js` (the skill template with the storage key, plus one line so a `data-sec` link scrolls to its section).

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence (replace DP's expectation with a sample; the methods differ in how far the target looks and which next action it trusts), a static hero drawing exactly those two choices, "You need", new terms, then the one-screen table (kept: it is the comparison the whole page elaborates).
- **The five experiment tabs moved inline**, each beside the claim it proves, because each explains one mechanism: TD or Monte Carlo (section 1), n-step and TD(lambda) (section 2), Cliff walking (section 4), Maximisation bias (section 5), Importance sampling (section 6). Their intros, which restated the Reading prose, were deleted; their live check lists and "what reproduces" verdicts went into closed blocks under each chart; the shared "how these experiments are run" note became one closed provenance block. Each card has a one-line title saying what to notice, and a prediction prompt sits before the main ones.
- **New section 7, function approximation and the deadly triad** (this page owns it per the brief): semi-gradient TD(0), MC as true gradient descent, the TD fixed point bound (factor 100 at gamma 0.99), the w, 2w example (10, 11, 12.1, derived), Baird's counterexample, and a new visual: Baird's expected updates with three switches (linear features or a table, bootstrap or Monte Carlo target, off- or on-policy distribution); only the setting with all three legs grows (w8 335, w1 to w6 114, w7 6.85 after 1,000 sweeps, the shape of Figure 11.2 right). Checked in `checks/recompute.py`.
- **No autoplay**: `22_js_rd_common.js` is the skill template; the lab transport `U.anim` in `32_js_lab_b.js` now only resumes when the reader has pressed Play. `checks/check_page.mjs` scrolls through every animation in normal motion and fails if any is playing.
- **Condensed**: properties lists folded into the MC against TD table; loop-step lists, restated headings, pointers to old tabs and mnemonics deleted; history, convergence conditions, MC control (ES, GLIE MC, blackjack), trace kinds, n-step SARSA, off-policy n-step and tree backup, and the misconceptions moved into closed blocks.
- **Deleted as fat**: the "Which method" decision tree (the section 8 table says the same in one screen) and the "Check yourself" quiz (the contract has no quizzes; every answer restated a section). Both carried no unit not found elsewhere on the page.
- **Real images**: none. This is a mechanism page with no physical object; the canonical figures (Sutton and Barto 6.2, 6.5, 6.6, 7.2, 12.3, 12.6, 5.3, 5.4, 11.2) are rerun live rather than embedded.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 40.3 min | 30.6 min |
| Reading, closed details | 3.3 min | 8.6 min |
| Other tabs, core (five experiment tabs) | 15.2 min | 0 (moved inline) |
| Core total, excluding Further reading | 55.5 min | 30.6 min |
| Further reading | 3.4 min | 3.7 min |
| Visuals inline in Reading (cards) | 2 (plus 3 small widgets) | 13 |

Why about 31 minutes is right: the page teaches eight mechanisms (MC and TD, the n-step and lambda dial with traces, control with Q and GLIE, SARSA against Q-learning, maximisation bias, importance sampling, function approximation and the deadly triad, the DP map), each with a worked number, a picture and a formula, and about a sixth of the core words are captions, counters and legends of the nine live reruns. The cut from 55 minutes came from deleting the lab tabs' restated setups and the Reading tab's lists and recaps, not from dropping units; the new triad section added about 3 minutes.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
440 units: core 308, depth 63, fat 67, owned 2 (episode, return, V and Q vocabulary, owned by Topic: rl). 429 were drafted from the old page by `ledger.py init`; 11 were added for the new hero and section 7 (section "added 2026-10-24"). Fat units carry a `note` saying why. `coverage.json` (the 2026-10-04 migration's account of `live.md`) is kept as history; its "where" fields name the old tabs.

## Checks (run 2026-10-24)
- `cd checks && node dump_mf.mjs && python3 recompute.py`: Python port of `21_js_mf_engine.js` (bit for bit, or 1e-12) plus independent checks, now including the eight triad settings, Figure 11.2's shape and the prose numbers 335, 114, 6.85. All pass.
- `cd lab && node dump_js.mjs && uv run --with numpy python check.py`: the lab engine (unchanged). Pass.
- `cd checks && node check_page.mjs`: every control at 390 dark and 920 light, every triad setting, no animation playing after scrolling through. Pass (298 probes).
- `sh html_utils/checkpage.sh <page folder>`: tabs 2, emdash 0, errbox 1, clipped 0, fail=0.

## Reused from Topic: rl (`../../src/for_children/`)
Estimator lab experiments 2 to 4 (engine unchanged, so `lab/check.py` validates the identical engine), reading_full sections 9 and 10, the maximisation-bias widget, the Reading CSS. Experiment 1 (Figure 4.1) went to Dynamic programming.

## Departures from the page-kind shape, and why
- **No tool tabs**: every rerun explains one mechanism, so all sit in the Reading flow; only Further reading is a separate tab.
- **Section 7 overlaps Value-based deep RL**, which also draws Baird's counterexample (two distributions) and the w, 2w pair. The brief gives this page the triad; this page's visual switches each leg off in turn. Value-based deep RL should keep DQN's side (soft divergence on Atari, target networks, gradient-TD in practice) and link here for the triad itself.

2026-10-24 (topic close of Topic: rl): Further reading quotes the root as "17 min, plus 2" and siblings and neighbours as their headers; ledger units 23 and 25 re-keyed to the rebuilt root's vocabulary; ledger keys that quoted old times re-keyed.

2026-10-26 (final follow-up sweep): section 7 now states that with the on-policy distribution of updates convergence is guaranteed (§11.2), absorbed from Value-based deep RL's triad sentence.

## The 2026-11-06 pass: split layout, 3D stages, explained step lists, autoplay
Khalid's standing rules of 2026-11-06 (`teaching/teaching-contract.md` "Page layout", `visuals/mechanics.md`, `visuals/three-d.md`), with the Attention Is All You Need paper page as the reference and the sibling Bandits and exploration as the worked example. Nothing was re-condensed; the only text removed is what the step lists now carry (the hero's caption, the four-learner card's "watch the step" sentence and its per-step caption carousel).
- **Split layout** (`parts/02_split.html`, unchanged, included right after the head): text left, visual right and sticky from 1100 px. Splits: the hero; section 1 (worked example and formula | random-walk lab); section 2 twice (n-step and lambda-return | the lambda slider; traces, GAE and the depth block | the 19-state lab); section 4 three times (the transition and the targets | the three-target calculator; the four-learner stage; cliff walking, "which is right" and the depth block | the fall-chance card above the cliff lab); section 5 twice (the bias | the E[max] slider; Example 6.7 | the Figure 6.5 lab); section 6 twice (importance sampling | blackjack; infinite variance | Figure 5.4); section 7 (the triad | Baird's switches). Full width: "You need", new terms and the one-screen table, the MC against TD table and batch example, section 3 (no visual), section 8's tables, the depth section and Further reading.
- **Two 3D stages** (`parts/25_js_s3.js`, the template, unchanged):
  - `37_js_sc_hero.js`, the hero (replaces the static 2D `25_js_rd_hero.js`): the walk of section 1 as a lattice of states A to E across and time towards the viewer, value bars at the visited states, and each target as a bar on a shelf behind V(C): DP's two-successor average (0.5), Monte Carlo's return (1, and the update to 0.55), TD(0)'s 0 + V(D), the two-step return, and the lambda-return's 0.5, 0.25, 0.25 weights giving 0.625; then the cliff transition of section 4 with S′'s four action values as cost bars and the three targets (SARSA −101, Expected SARSA −7.475, Q-learning −5). Data: `MFE.lamReturn` and `MFE.twoTargets` with the calculator's defaults.
  - `38_js_sc_four.js`, section 4 (replaces the 2D `23_js_rd_four.js` animation and its learner toggle): the 3 x 6 cliff four times, one grid per learner, each cell with its four action values as bars (height grows with the square root of −Q), the same recorded episode walked on all four at once in seven explained stretches; the updated bars light up and the key pair (the step before the fall) is in the highlight colour. Data: `MFE.mDefault()` and `MFE.fourLearners` (seed 6, 14 steps, alpha 0.5, epsilon 0.1), as before. The per-step target table now sits under the step list and follows the stage.
- **Step lists** (`ol.sx`) on the left of both stages, one item per step; the numbers they quote (0.625, −101, −7.475, −5; −51.25, −28.12, −6.18, −5.59, −78.62, −79.80, −16.81, −10.91, −57.50, −32.25, −18.62, −113, the end values and total changes 53.0, 35.7, 29.6, 151.5) are recomputed from the engine by `checks/check_page.mjs`, which fails if they drift.
- **Motion:** `22_js_rd_common.js` and `99_js_tabs.js` are the current templates (storage key `mfpc-tab`; the tab links still honour `data-sec`). `RD.anim` is no longer used on this page. The five lab transports (`U.anim` in `32_js_lab_b.js`: random walk, 19-state walk, cliff, maximisation bias, blackjack) got the same rules: they play by themselves once at least half of the card (or half the window) is in view, pause off screen, stop for good on any control in the card except the speed, and at their last frame, and never move under reduced motion. They are frame-by-frame replays of hundreds of steps, so they keep their live caption (`lb-cap`) rather than a step list; each frame's caption says what that step does.
- **Kept 2D**: the lambda slider (a parameter against bar weights), the three-target calculator and the fall-chance card (calculators), the labs (one-dimensional walks of 5 and 19 states, a 4 x 12 grid shown as a policy map, and learning curves on linear and log axes), the E[max] slider (a curve), the blackjack and Figure 5.4 charts (log axes) and Baird's switches (a log-axis curve). None has spatial structure that depth would show better; the cliff lab's grid is spatial, but the four-learner stage already gives the cliff in 3D and the lab's job is its 500-episode learning curve.
- **Images**: still none (a mechanism page; the canonical figures are rerun live).

### Length judgement
| | Before (2026-11-06 audit) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 30.7 min (7,050 words) | 33.2 min (7,645) |
| Reading, closed details | 8.6 min (1,988) | 8.6 min (1,988) |
| Further reading | 3.9 min (889) | 3.9 min (889) |
| Visuals in Reading (audit count) | 21 | 20 (2 of them 3D stages; the hero's two drawings became one stage) |

The growth is the two step lists (about 330 words for the hero, 450 for the four learners), less the hero caption and the card sentences they replace. What they say was partly script-drawn caption text before (the four-learner carousel); the rest is the reading of each stage that the rules now require on the page. About 33 minutes is right for the same reason as before: eight mechanisms, each with a worked number, a picture and a formula.

### Ledger
`python3 html_utils/ledger.py check`: 440 units (core 308, depth 63, fat 67, owned 2), problems 0. Two keys moved with their sentences into the step lists: unit 102 ("real rewards are unbiased but carry every coin flip", hero step 3) and unit 176 ("is a random step down", four-learner step 3).

### Checks (run 2026-11-06)
- `cd checks && node dump_mf.mjs && python3 recompute.py`: all pass (engine unchanged). `cd lab && node dump_js.mjs && uv run --with numpy python check.py`: pass.
- `cd checks && node check_page.mjs`: pass, 395 probes at 390 dark, 920 light and 1400 light, plus a reduced-motion pass (nothing moves by itself). It replaces the old never-autoplay assertion with the 2026-11-06 rules and adds the step-list number checks and the 1400 px split check.
- `sh html_utils/checkpage.sh <page folder>`: tabs 2, emdash 0, errbox 1, clipped 0, fail=0.

## The 2026-11-06 v2 pass: renderer v2 scenes, labs as widgets
`25_js_s3.js` and `05z_errbox.js.html` recopied from the templates (renderer v2: glass, flows, contact shadows, camera per step; the errbox's ResizeObserver filter); `02_split.html` was already identical.
- `37_js_sc_hero.js`: value moves as streams of dots: the walk itself (step 1), both successors' values into DP's target (2), the return flowing back along the episode into Monte Carlo's target before C, D and E rise to 0.55 (3), V(D) and V(E) pulled back into the TD targets (4, 5), the three n-step returns into the lambda-return with dots in proportion to their weights 0.5, 0.25, 0.25 (6), the agent's move S to S′ (7), and S′'s action values into the three control targets (8: SARSA from down, Expected SARSA from all four in proportion to their epsilon-greedy chance, Q-learning from right). The camera moves in close on the steps about one target (2, 4, 5, 6, 8); the last step's targets sit in a row on a shelf behind S, seen from the front, with Expected SARSA's label under its bar (its top is level with Q-learning's) and the cliff labels hidden, so nothing overlaps at 1400 px. Side labels (t, A to E) show only in the full views; on a phone the long labels hide and only the value being read is labelled.
- `38_js_sc_four.js`: each learner's Q-table is a tinted glass plate under its cells; each TD learner's target streams from the next state (SARSA from the action taken next, Expected SARSA from the whole cell, Q-learning from the best action) into the bar it updates; Monte Carlo's return streams back along every cell the episode visited when it ends; the bars a transition changes stand out while the rest recede; 208 bars without shadows; steps 3 and 4 (one transition each) move the camera in and down on columns 1 to 4 of all four tables (a closer view would cut learners out of the comparison).
- Step lists: one clause each where the streams are new (hero steps 2, 3 and 8; four-learner steps 2 and 6). All quoted numbers unchanged (`checks/check_page.mjs` recomputes them).
- **Labs (`U.anim` in `32_js_lab_b.js`) follow the long-replay rule, case (b)**: frame replays of hundreds of steps are widgets the reader drives, so they no longer autoplay (a play the reader pressed still pauses off screen). Each opens on an informative frame, named by one sentence in the text on its left: the random walk after 10 walks (a point of the book's left graph), the 19-state walk on its last step (the final reward and the traces), the cliff on the tables after episode 500 (the two learned paths), maximisation bias after episode 100, blackjack on all 200 episodes. Their live captions stay (no step lists to repeat). `check_page.mjs` now fails if a transport plays by itself, checks each opening frame and that Play plays.
- Further reading's quoted times for the siblings updated to their current headers.
- Reading, core: 7,923 words (34.4 min, header 34; was 7,645, 33.2): the five opening-frame sentences, the step-list clauses, and the labs' live captions at their informative frames (longer than at frame 0). Closed details unchanged (9). Ledger: problems 0.
