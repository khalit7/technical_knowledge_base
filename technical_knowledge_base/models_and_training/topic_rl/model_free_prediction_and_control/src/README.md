# Source of "Model-free prediction and control: Monte Carlo, TD, SARSA, Q-learning"

Child page of Topic: rl (Notion 3c65c17b0d0d81898a0cd4c05c744969; page prefix `rd`/`lb`/`mx`/`is`, storage key `mfpc-tab`). Build: `sh build.sh` writes `../index.html` from `parts/`. Built 2026-10-04; rebuilt 2026-10-24 to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), editing and one new derived visual, no heavy runs.

## Tabs and parts
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
