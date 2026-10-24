Source of the interactive HTML on the Notion page "Offline RL and imitation" (child of Topic: rl).

Build: `sh build.sh` writes `../index.html` (part order in the comment at the top of build.sh). The reading time in `10_header.html` and `39_tab_more.html` is measured with `html_utils/audit_pages.mjs` and written by hand.
Checks: `python3 recompute.py && node check_engine.mjs` (Python reference against the page's engine: 32,948 values including every distribution, cost and fitted value, 0 mismatches, worst relative difference 5e-10); `node src/check_page.mjs [light|dark] [width]` from the page folder drives every control in headless Chrome (and fails on autoplay) and screenshots into `../.shots/`; `node src/shot_el.mjs <id> ...` screenshots chosen Reading figures; `sh html_utils/checkpage.sh <page folder>`. `python3 parse_tables.py` regenerates `inputs/d4rl_tables.json` and `parts/30_js_d4rl_data.js` from the text extracts in `inputs/` and checks each table's printed averages against its rows.

Old text: none. The Notion page was new, with only a placeholder, so there is no `live.md` and no `coverage.json`.

Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md` under the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`). Page prefix `rd`, storage key `rloff-tab`. Tabs: Reading, D4RL results (kept: "across every dataset and method, as each paper printed it" is a tool of its own), Further reading.

| Part | What |
|---|---|
| `20_read_a.html` | styles, nav, the idea in one screen (core sentence, hero `rd-hero`, You need, new terms, the one-screen table `rd-spine`); 1 setting; 2 behaviour cloning (worked number, BC against DAgger `dv`, cost against horizon `hz`); 3 DAgger |
| `20_read_b.html` | 4 inverse RL and GAIL (one section; loop figure `rd-loop`); 5 preferences |
| `20_read_c.html` | 6 extrapolation error (four learners `xq`); 7 constraints; 8 CQL; 9 IQL (expectile slider `rd-ex`); 10 Decision Transformer (token figure `rd-dtA`) |
| `20_read_d.html` | 11 offline to online; 12 evaluation; 13 uses and limits; Depth (mistakes, closed) |
| JS | `21_js_of_engine.js` (exact engine, `window.OF`), `22_js_rd_common.js` (skill template, never autoplays), `22_js_rd_extra.js` (number helpers, colour scale, table row jumps), `23_js_chart.js`, `24_js_dv.js`, `25_js_xq.js`, `26_js_rd_figs.js` (hero, loop, DT tokens, expectile slider), `30_js_d4rl_data.js`, `31_js_d4rl.js`, `99_js_tabs.js` (skill template) |

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core sentence (a learner on a fixed dataset fails where it leaves the data: in states for imitation, in actions for offline RL) and a static hero of exactly that, the state-action plane with the data band, the two ways off it and each fix placed where it acts (labels jump to sections); "You need"; eight new terms. The one-screen table stays (rows now jump to sections); the "two failures" box was deleted (the core sentence and hero carry it).
- **Mechanisms with no visual got one**: the IRL/GAIL outer loop with its RL inner loop (section 4), an expectile slider on the page's own IQL fit (section 9), the Decision Transformer token diagram with the return-to-go at test time (section 10). Prediction prompts sit before the two animations and inside the slider card. Animation card titles now say what to notice.
- **Merged**: inverse RL and GAIL into one section (they share the loop); sections renumbered 1 to 13.
- **Condensed into closed blocks**: the construction of both toys (their long captions), the tightness of the T² bound, the no-regret reduction, apprenticeship and MaxEnt details, GAIL's objective and successors (AIRL, ValueDICE, IQ-Learn), Bradley-Terry written out, BEAR and BRAC, CQL's two theorems with Q-Transformer and MOPO/MOReL, AWR and AWAC, DT precursors, CORL's offline-to-online numbers, D4RL's datasets and table pitfalls, and the eight misconceptions (one Depth block).
- **Added**: a worked number before the T²ε bound (ε = 0.02, T = 60: 1.2 against 72 against 25.5 exact).
- **No autoplay**: `22_js_rd_common.js` and `99_js_tabs.js` are the skill templates; `check_page.mjs` now fails if either animation is past step 0 or playing after scrolling past it, and drives the slider.
- **Fonts**: SVG labels at 10 and 10.5 px raised to 11.
- **Real images**: none. A mechanism page with no physical object a photo would explain; recorded in `viz_ideas.md` (OF13).
- **Deleted as fat** (11 ledger units, each with a note): wind-ups, the old nav and pointer sentences, the "Try" lines restating section 8.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 34.0 min (7,819 words) | 29.3 min (6,746) |
| Reading, closed details | 1.3 min | 8.9 min |
| D4RL results | 6.1 min | 6.1 min (unchanged) |
| Further reading | 3.3 min | 3.3 min |
| Visuals inline in Reading (audit count) | 4 | 8 |

Why about 29 minutes is right: the page owns two failure modes and eleven methods (behaviour cloning, DAgger, inverse RL, GAIL, preferences up to the RLHF bridge, BCQ, TD3+BC, CQL, IQL, Decision Transformer, offline to online), plus evaluation and where the methods run; each now has its picture beside the claim, and about a sixth of the core words are the captions and counters of the two exact animations. The OWNERS.md note "Reading core about 16 min, thin page" predates the audit (the page was 34 min); the cut came from moving construction details, per-method provenance and the misconceptions into closed blocks, while the four new figures added about a minute of captions. A further cut would drop a mechanism the page owns.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
325 units: core 252, depth 62, fat 11, owned 0, volatile 0. 316 were drafted from the old page by `ledger.py init` (keys chosen as the longest phrase of each unit found verbatim on the rebuilt page, then reviewed); 9 were added for the new core sentence, hero, figures, worked number, terms and the script-rendered tables and counters (section "added 2026-10-24").

Reused from `../../src/for_children/`: `reading_full/20_read_c.html` section 17 (imitation and offline RL): its prose (the hospital example, BC, compounding error, DAgger, inverse RL and GAIL, Levine's definition, distribution shift, CQL, IQL, DT, and the on-/off-policy versus offline paragraph) rewritten and extended into what are now sections 1 to 4, 6, 8 to 10 and the first misconception. The animation controller came from `reading_full/22_js_rd_common.js` (replaced by the skill template on 2026-10-24), with `01_head.html`, `05z_errbox.js.html`, `23_js_chart.js` and `99_js_tabs.js` (now the skill template, storage key `rloff-tab`).

Engine (`parts/21_js_of_engine.js`, mirrored in `recompute.py`): mulberry32 random numbers as in the siblings; the lane-keeping MDP (27 states) with exact propagation of the state distribution and seeded DAgger rounds (5 rollouts per round, policy fixed within a round, beta_i = I(i = 1)); fitted Q iteration on a one-state self-loop task with a frozen-first-layer ReLU network (21 features, ridge 1e-3), solved exactly (normal equations; damped Newton for CQL(H)); IQL's exact expectile. All task and data parameters are illustrative and labelled so on the page.

Defaults reproduce: Ross and Bagnell's T²ε bound holds and its quadratic growth shows independently (cost rises 44 times from T = 5 to 40); DAgger's cost is about 2εT (recovery constant u about 2), independently. CQL's Theorem 3.2 (lower bound when mu = pi) holds in every run at beta = 1 and at the defaults, by construction of the setting (the soft maximum is taken at the policy's temperature); at alpha = 10 the bound is within the noise of 30 rewards (up to about 0.3 above). D4RL tables: values as printed; CORL's averages match the mean of its rows to 0.007; IQL's IQL locomotion total is 692.4 printed against 692.6 summed (rounding).

Findings shown on the page: the CQL paper's Table 1 and D4RL's Table 2 swap CQL's hopper- and walker2d-medium-expert values (111.0 and 98.7), and CQL's walker2d-medium-expert row repeats its walker2d-mixed baselines (which is right is marked unconfirmed); IQL's note that DT and one-step papers compared against v0 CQL numbers; RvS's AntMaze "v2" table includes v0 numbers flagged by an asterisk.

Unconfirmed or avoided: Ng and Russell's PDF does not extract as text, so their R = 0 degeneracy is stated from the paper's well-known §3 setup without a quote; the Nature Medicine guidelines comment is paywalled, so the page quotes Gottesman et al.'s arXiv paper instead.

2026-10-24 (topic close of Topic: rl): Further reading quotes the root as "17 min, plus 2" and siblings and neighbours as their headers; ledger keys that quoted old times re-keyed.
