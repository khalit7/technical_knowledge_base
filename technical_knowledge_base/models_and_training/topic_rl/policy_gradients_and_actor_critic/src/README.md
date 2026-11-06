# Source of "Policy gradients and actor-critic: from REINFORCE to PPO and SAC"

Child page of Topic: rl (Notion 3ee5c17b0d0d8101a262d3620e75747c), new on 2026-10-04. Build: `sh build.sh` writes `../index.html` from `parts/`.

## Where the content comes from
The old page "Deep RL: from DQN to PPO to MuZero" (Notion 3c65c17b0d0d8180b808c8c0cf8ddbe6) is split three ways; this page takes its policy-gradient and actor-critic part. `live_deep_rl.md` is that page as fetched read-only (copied from `../../value_based_deep_rl/src/live_deep_rl.md`; a fresh fetch on 2026-10-04 returned the same content, last edited 2026-09-30, apart from the signed embed URL). `coverage_deep_rl_share.json` (from `mk_coverage.py`) lists the 78 facts of it this page carries and where; the DQN family belongs to Value-based deep RL and AlphaGo to MuZero to Model-based RL and planning. The old page's interactive embed is in `../../value_based_deep_rl/src/inputs/old_embed_deep_rl.html`; its three explorers (baseline, GAE, PPO clip) and its quiz were rebuilt here.

Beyond the old page, every claim was checked against the primary sources (PDFs read in full): Sutton and Barto ch. 13, Williams 1992, Sutton et al. 1999, Greensmith et al. 2004, Kakade 2001, TRPO, GAE, A3C, the A2C blog (Wayback copy), PPO, Engstrom et al. 2020, Huang et al.'s 37 details, Andrychowicz et al. 2021, Henderson et al. 2018, Agarwal et al. 2021, DPG, DDPG, TD3 (paper and repo), SAC 2018a and 2018b, Stable-Baselines3 docs.

## Shape (since the 2026-10-24 rebuild)
`.claude/skills/explainer-page/page-kinds/topic-child.md` under the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`): one Reading tab and Further reading. Page prefix `rd` (Reading) and `co` (the short corridor cards), storage key `pgac-tab`.

| Part | What |
|---|---|
| `20_read_a.html` | styles, nav, the idea in one screen (core sentence, hero `rd-hero`, You need, new terms, the one-screen table); 1 why (short corridor drawn with J(p), `rd-jp`); 2 the theorem (reward-to-go grids `rd-rtg`); 3 REINFORCE |
| `20_read_b.html` | 4 baselines (`rd-pgc` before/after, `rd-bx`, Figures 13.1 and 13.2 rerun `co-fig`); 5 actor-critic (three learners on J(p), `co-ex`) |
| `20_read_c.html` | 6 GAE (`rd-ga`); 7 A3C and A2C (`rd-a3c`); 8 natural gradient (`rd-ng` slider) and TRPO |
| `20_read_d.html` | 9 PPO (four-case table, `rd-cl`, `rd-pp` with and without the clip); 10 implementation |
| `20_read_e.html` | 11 DPG and DDPG (off-policy loop `rd-oac`, DDPG/TD3/SAC modes); 12 TD3; 13 SAC (`rd-sa`); 14 continuous control; 15 which method when; Depth (misconceptions) |

## The 2026-11-06 pass: split layout, 3D stages (renderer v2), explained and autoplaying animations
- **Split layout** (`parts/02_split.html`, the template, unchanged, included after `01_head` in `build.sh`): every section with a visual is two columns, text left and the visual right and sticky. Split: the idea (Fig. 1 stage), You need and New terms (the two-dial map), 1 (corridor and J(p)), 2 (Fig. 2 stage), 4 three times (baseline animation, variance parabola, Figures 13.1 and 13.2), 5 (three learners), 6 (GAE), 7 (A3C/A2C), 8 (natural-gradient slider; TRPO below it full width), 9 twice (clip against ratio, ten epochs), 11 and 12 together (Fig. 11 stage), 13 (max-entropy widget). Full width: the one-screen table, the two parameterisations, 3, the PPO case table and full loss, 10, 14, 15, Depth.
- **Three 3D stages** (`parts/25_js_s3.js`, template v2, unchanged; scenes `30` to `32`), each drawing numbers the page already has:
  - Fig. 1 hero (`30_js_sc_hero.js`): one update of a softmax policy on section 4's worked example (rewards 1, 2, 6; score (+0.67, −0.33, −0.33); weight 1 against 1 − 3 = −2; the exact gradient (−0.67, −0.33, +1) with the spread of single samples as glass, variance 7.56 against 1.56; one step of η = 0.5 to (0.22, 0.26, 0.51), ratio 1.54, against PPO's clip band as two glass plates). From `PGE.pgStats` and `PGE.softmax`; `window.PG3.hero` exposes them and `checks/check_page.mjs` compares them with the step list. The 2D two-dial figure (formerly the hero) stays as a static map beside New terms.
  - Fig. 2 (`31_js_sc_rtg.js`, section 2): the 4 × 4 causality grid as signed bars, the lower triangle turning to glass, row weights 2 → 2, 1, 1, −1. Replaces the 2D grids.
  - Fig. 11 (`32_js_sc_oac.js`, sections 11 to 13): the off-policy loop as parts in space (networks as glass plates, twin critics for TD3 and SAC), one hop of data per step as a flow, the camera framing the two parts each step joins; DDPG/TD3/SAC chips replay it. Replaces the 2D diagram; its mode captions moved to the left column.
- **Long replays grouped** (`RD.stretch` in `22_js_rd_extra.js`, on top of the template `RD.anim`): the 60-update baseline run in 5 stretches, the three corridor learners (100 frames) in 8, GAE in 4 (the 8-step chain fills Â₆ to Â₁ in step 3), PPO's ten epochs in 4. Each stretch plays its frames when stepped forward; the step lists' numbers for the reader's seed and offset are filled by script into spans (the static text holds the defaults). The corridor's "learners shown" toggle was removed (all three always show).
- **Motion**: `21_js_rd_common.js` and `99_js_tabs.js` are the templates (key `pgac-tab`; `build.sh` now writes `data-to` for in-page tab links); everything plays once at least half in view, pauses off screen, stops on any control or at its last step, never moves under reduced motion.
- **Checks**: `checks/check_page.mjs` now runs 1400 light too, asserts the split is two columns, each 2D animation and stage autoplays in view with one list item per step, every stage step, and nothing moving under reduced motion (inverted from the old no-autoplay assertion). Last run (after the caption cut): 1008 probes, 0 fails; `recompute.py` 306 checks, 0 fails (engine unchanged); `checkpage.sh` fail=0, emdash 0, errbox 1, clipped 0.

Length: Reading core 39.1 min before (8,999 words), 44.0 after (10,128); closed details 9.1, unchanged; Further reading 3.8, unchanged. The growth is the six step lists (31 items), which carry the numbers each step draws so the visuals can be read without playing. The live captions under the four 2D animations were removed (their text is in the step lists); what remains is a one-line readout of what depends on the reader's seed, offset or sliders (the baseline run's draws, the corridor learners' mean reward, GAE's arithmetic), and PPO's has none (its stats show the ratios). Visuals inline (audit, SVG only): 21 before, 22 after, plus 3 stages on canvas. Ledger: 352 units, core 270, depth 44, fat 38, owned 0, problems 0, no re-keying needed.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core sentence (push up each action's log-probability in proportion to how good it was; methods differ in the weight and in how far one batch may move the policy) and a static hero of exactly those two dials, each box jumping to its section; "You need" (TD and importance sampling, replay and target networks, the gradient bandit); seven new terms. The one-screen table stays: it is the comparison the page elaborates.
- **The Short corridor tab moved inline**, because each of its cards proves one claim: J(p) and the optimum in section 1 (now drawn as a static figure with the corridor itself), Figures 13.1 and 13.2 rerun beside the learned-baseline claim (section 4), the three-learner animation beside "when the critic is too poor" (section 5). Its "what reproduces" box became a closed block; its intro, which restated section 1, was deleted. The reruns now compute when the card first comes near the screen (computation only; nothing moves).
- **Mechanisms with no visual got one**: reward-to-go grids (causality, section 2), A3C against A2C on one clock (section 7), a natural-gradient slider whose defaults land on the prose numbers (section 8), the off-policy actor-critic loop with DDPG, TD3 and SAC modes (sections 11 to 13). Every card has a one-line title saying what to notice; prediction prompts sit before the baseline, PPO and SAC widgets.
- **No autoplay**: `22_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `pgac-tab`, plus `data-sec` links); this page's number helpers moved to `22_js_rd_extra.js`. `checks/check_page.mjs` fails if any animation is past step 0 or playing after scrolling through the page.
- **Condensed**: the four-advantage list became one paragraph; the PPO case bullets that restated the table and the widget were cut to the one claim they add (a wrong-way move is never clipped); paper settings (PPO, DDPG, TD3, SAC, SB3), Engstrom's per-task numbers, Kakade's quotes, TRPO's bound and sampling schemes, the 13 implementation details, Andrychowicz's recommendations, the GAE paper's ranges, robot results and the Exercise 13.1 derivation moved into closed blocks.
- **Deleted as fat**: the "Check yourself" quiz (the contract has no quizzes; the one answer not said elsewhere, why replay suits DQN and SAC but not A2C, moved to the Depth block), the "Where this goes next" heading (its links joined section 15), pointers to the removed tab, and sentences a visual now carries.
- **Mistakes**: the eleven misconceptions are one closed block; each restates a section, so none stays in the core.
- **Fonts**: every SVG label is now at least 11 px (was 9.5 to 10.5 in several widgets).
- **Real images**: none. A mechanism page with no physical object; the canonical figures (Sutton and Barto 13.1, 13.2) are rerun live rather than embedded.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 42.6 min | 39.1 min |
| Reading, closed details | 2.5 min | 9.1 min |
| Other tabs, core (Short corridor) | 3.1 min (plus 0.7 closed) | 0 (moved inline) |
| Core total, excluding Further reading | 45.7 min | 39.1 min |
| Further reading | 3.5 min | 3.6 min |
| Visuals inline in Reading (audit count) | 12 | 21 |

Why about 39 minutes is right: the page owns fifteen mechanisms (the theorem and its derivation, REINFORCE, baselines and the optimal baseline, actor-critic, GAE, A2C and A3C, natural gradient, TRPO, PPO and its implementation, DPG, DDPG, TD3, SAC and maximum entropy, continuous-control practice), each with a worked number, a picture and its formula, and roughly a sixth of the core words are captions, counters and legends of the eleven live widgets. The cut came from moving settings, provenance and per-item lists into closed blocks and deleting restatements and the quiz; the six new figures added about 3 minutes of captions. A further cut would have to drop a mechanism the page owns.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
352 units: core 270, depth 44, fat 38, owned 0. 344 were drafted from the old page by `ledger.py init`; 8 were added for the new hero, figures, terms and a prediction prompt (section "added 2026-10-24"). Fat units carry a `note` saying why. `coverage_deep_rl_share.json` (the 2026-10-04 migration's account of the old Notion page) is kept as history; its "where" fields name the old tab.

## Reused from Topic: rl (`../../src/for_children/`)
- `reading_full/` sections 13 to 15: prose, the policy-gradient with and without baseline animation (`rd-pgc`, engine functions `pgStats`, `pgRun`, `pgSpread` unchanged; its 86 of 200 figure re-verified) and the PPO ten-epoch animation (`rd-pp`, `ppoL`, `ppoRun` unchanged).
- The RD animation controller (`22_js_rd_common.js`, unchanged) and the page CSS (from Model-free prediction and control, with the Reading-only rules unscoped so the corridor tab can use them).

## New here
- Baseline explorer (`rd-bx`): exact variance against any constant baseline and the variance-minimising b*.
- GAE backward-recursion animation (`rd-ga`): the worked example and an 8-step chain with a wrong critic.
- Clipped objective against the ratio for both advantage signs (`rd-cl`).
- Maximum-entropy toy (`rd-sa`): soft-optimal policy, best Gaussian actor and SAC's automatic temperature on an illustrative 1-D reward, exact.
- Short corridor (a tab until 2026-10-24, now sections 1, 4 and 5): Example 13.1 exact, one run of three learners animated on J(p), Figures 13.1 and 13.2 rerun (100 runs x 1,000 episodes in the browser), plus a one-step actor-critic with an aliased critic.

## Files
`parts/`: `01_head.html`, `05z_errbox.js.html`, `10_header.html`, `20_read_a.html` to `20_read_e.html`, `21_js_pg_engine.js` (all computations, no DOM, window.PGE; `ngStep` added 2026-10-24), `22_js_rd_common.js` (skill template), `22_js_rd_extra.js`, `23_js_rd_base.js`, `24_js_rd_gae.js`, `25_js_rd_ppo.js`, `26_js_rd_sac.js`, `27_js_rd_cor.js` (the short corridor cards, formerly `31_js_cor.js`), `28_js_rd_figs.js` (hero, corridor and J(p), reward-to-go, A3C/A2C, natural gradient, off-policy loop), `39_tab_more.html`, `99_js_tabs.js` (skill template).

## Checks (run 2026-10-24)
- `cd checks && node dump_js.mjs && python3 recompute.py` (add `--full` to recompute the 600 corridor runs, a few minutes): independent Python of every engine function, same mulberry32 stream; the GAE check uses the k-step weighted-average form, the SAC check integrates numerically, the corridor values are solved by iteration. Since 2026-10-24 it also checks `ngStep` at 18 slider positions against Python and the prose numbers, the A3C/A2C caption (worker 3 computed on v4, applied as v9) and the reward-to-go weights. Last run: 312 checks with `--full`, 0 fails.
- `cd checks && node check_page.mjs`: every control at 390 dark and 920 light, the new figures and the off-policy loop's three modes, and no animation past step 0 or playing after scrolling through the page. Last run: 572 probes, 0 fails.
- `sh html_utils/checkpage.sh <page folder>`: tabs 2, emdash 0, errbox 1, clipped 0, fail=0.
- `python3 html_utils/ledger.py check <page folder>`: problems 0.

2026-10-24 (topic close of Topic: rl): Further reading quotes the root as "17 min, plus 2" and siblings and neighbours as their headers; ledger keys that quoted old times re-keyed.
