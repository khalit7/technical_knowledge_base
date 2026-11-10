Source of the interactive HTML on the Notion page "Reward Hacking" (deep-dive child of Topic: llm-training-and-post-training). Page prefix `rh`, storage key `rh-tab`. Built 2026-10-03; rebuilt 2026-10-23 to the teaching contract (editing only, no new runs).

Build: `python3 recompute.py` (writes `parts/20_js_data.js` and `inputs/derived.json`, prints every check), then `sh build.sh` (writes `../index.html`). The header's reading time is written by hand from `html_utils/audit_pages.mjs` (230 words a minute). Checks: `sh html_utils/checkpage.sh <page folder>`; from the repo root `node <page folder>/src/check_page.mjs` (every control in both themes under reduced motion, NaN / undefined / errors, link targets, nothing plays by itself) and `node <page folder>/src/check_stages.mjs [shots dir]` (about 3 minutes: the three stages and two transcript animations play once in view, reach their last step with one step-list item per step, stop off screen and under reduced motion, a mode toggle replays; the splits; the best-of-n step-list numbers against `inputs/derived.json`); `python3 html_utils/ledger.py check <page folder>`.

Data: `inputs/research_gao.md`, `inputs/research_coding.md`, `inputs/research_chat.md` are the verified source notes (verbatim quotes, URLs, what is unconfirmed). `live.md` is the old Notion page; `coverage.json` maps every fact in it (2026-10-03); `ledger.json` is the knowledge ledger of the 2026-10-23 rebuild.

## Tabs and parts
| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `02_split.html` (skill template, after `02_css.html`), `20_read_a` (core idea, hero, you need, new terms, "where the gap lives" table, sections 1 and 2), `20_read_b` (3 chat models, 4 coding agents), `20_read_c` (5 what the policy can reach, 6 detecting it), `20_read_d` (7 mitigations, 8 it generalises); JS `20_js_data.js` (generated), `21_js_rd_common.js` (skill template: plays once in view), `23_js_charts.js`, `24_js_trace.js`, `25_js_cot.js`, `25_js_s3.js` (renderer v2, skill template), `26_js_rd_gao.js` (the old curves tab, now section 2), `27_js_rd_figs.js` (hero, Wen dumbbell), scenes `28_js_sc_bon.js`, `28_js_sc_tests.js`, `28_js_sc_reach.js`; `99_js_tabs.js` (template, key `rh-tab`) | sections 1 to 8, depth in closed `details.dp` blocks |
| Case gallery `t-cases` | `31_tab_cases.html`, `31_js_cases.js` | 27 documented cases, filterable: a dataset used across the whole page, so it stays a tab |
| Further reading `t-more` | `39_tab_more.html` | |

## The 2026-10-23 rebuild: what changed and why
- **Top**: the core idea in one sentence, a schematic hero (proxy keeps rising, gold peaks and falls, where each defence acts), "You need", new terms, and a one-screen table of where the proxy-goal gap lives (proxy kind, what gets gamed, strongest measurement, defence, section).
- **The Over-optimisation curves tab moved inline** into section 2: it explains one mechanism. One control (reward-model size) plus the method switch; the KL marker, beta-source switch and alpha slider were removed. The RL half is kept but labelled "by construction" on the figure and in the stats; its provenance (figure-read coefficients, the 12% beta gap, what does not reproduce) and the every-size table are in a closed block. Judgement in `viz_ideas.md`: the RL curve earns its place as a shape (RL peaks at several times BoN's KL under either beta source), not as numbers.
- **Concrete, then picture, then formula** in section 2: the best-of-n riddle (Table 2), then the fitted curves, then the forms.
- **New visuals**: hero schematic; cleaning-robot table with the flipped row highlighted (section 1); Wen et al. false-positive dumbbell (section 3); nested "what the policy can reach" diagram with a measured case per layer (section 5).
- **Mitigations table now has a "What defeats it" column**, the part of the subject this page owns that the old table left implicit; the extra evidence per row is in a closed block.
- **Coding moves** became a table (move, what it looks like, where seen), merging the old bullet list with Baker et al.'s list.
- **No autoplay** (superseded 2026-11-10: animations now play once in view): `21_js_rd_common.js` is the skill template; the three steppers start on step 0 and mode switches no longer play.
- **Depth closed**: length bias in DPO/AlpacaEval/Arena, the GPT-4o incident detail, XSTest and rubric numbers, later Claude cards, sandbox/harness/tampering/spreading/evaluation-awareness detail, checker errors, MOLE and its correction, RH-Detect, the probe's numbers, inoculation variants.
- **Deleted as fat**: the "what lives where" box (the You need line and links carry it), pointers to the removed tab, headings and wind-ups, and the Common mistakes block, whose items restated sections 2, 5, 6, 7 and 8 (two items that added something, the answer extractor and "lists, length, copying", were folded into sections 4 and 7).

## Length judgement
| | Before (2026-10-19) | After (2026-10-23) |
|---|---|---|
| Reading, core | 33.5 min (7,711 words) | 25.8 min (5,940 words) |
| Reading, closed details | 1.0 min (235) | 10.0 min (2,290) |
| Over-optimisation curves tab | 3.5 min (814) | moved into Reading |
| Case gallery (a dataset, not a read) | 10.0 min | 10.0 min (unchanged) |
| Core total excluding Further reading and the gallery | 37.1 min | 25.8 min |
| Visuals drawn in Reading (audit count) | 2 | 6 |

Why about 26 minutes is right: the page owns a broad subject (the curve, four chat channels, coding and agent hacks at every layer a policy can reach, five detection methods, nine mitigations each with what defeats it, and the generalisation result), and each core unit is a measured number needed to judge one of them; about a fifth of the core words are captions and counters of the visuals. Per-case detail, provenance and secondary papers are now closed.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
326 units: core 229, depth 59, fat 38. 318 were drafted by `ledger.py init` from the old page (including the old curves tab); 8 were added by hand for the new top table, hero, reach diagram, Wen figure, script-rendered charts and the case gallery (keys in static captions). No unit is labelled owned: the RL algorithm detail (Dr. GRPO) stays a short correction here with a link to RL for LLMs.

## Departures from the page-kind shape
- The hero is schematic, not data: Gao et al. fit no proxy curve ("unable to obtain a satisfactory fit"), so drawing a measured proxy would invent it; the measured gold curves follow in section 2.
- The KL-leash animation stays on the parent root (linked); this page owns over-optimisation and has the measured curves, so the root could link here instead of drawing its own (reported).

## 2026-10-26 absorb
Section 4's sandbox case now names the filesystem ioctl that got around AppArmor (from Harnesses for training, which keeps one sentence plus a link).

## 2026-11-10: the split layout and three 3D stages (renderer v2)
The 2026-11-06 rollout (briefs `rebuild-page.md` and `layout-rollout.md`). Templates copied unchanged: `02_split.html`, `25_js_s3.js`, `21_js_rd_common.js`, `99_js_tabs.js` (key `rh-tab`). `build.sh` includes `02_split.html`, writes the em-dash test as `ED=$(printf ...)` and expands `{{text|#rh-...}}` as in-page links. Section ids `rh-s1` to `rh-s8` and the section numbers are kept (siblings link to "section 2"); new ids `rh-s2b`, `rh-s3d` and the like only wrap the splits.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea (core, you need, terms) | split | hero schematic, 2D static | no |
| Reading | Where the gap lives | full width | table | no |
| Reading | 1 Goodhart | split | cleaning-robot table, static | no |
| Reading | 2 The curve, one riddle | split | **3D** `stg-bon` (Fig. 1) | yes, 7 |
| Reading | 2 The fitted curves | split | Gao fits, 2D chart with size slider and method switch | no (a widget) |
| Reading | 3 Length / Format / Looking right | split each | Singhal scatter, Zhang bars, Wen dumbbell, 2D | no |
| Reading | 3 Sycophancy, refusing and rubrics | full width | none | no |
| Reading | 4 One buggy test | split | 2D `RD.anim` (transcript panes and counters), three model modes | yes, 6 |
| Reading | 4 Where each move cuts in | split | **3D** `stg-tests` (Fig. 2) | yes, 8 |
| Reading | 4 Three hacks as written | split | code toggle, static | no |
| Reading | 5 What the policy can reach | split | **3D** `stg-reach` (Fig. 3) | yes, 7 |
| Reading | 6 Detecting it (CoT monitor) | split | 2D `RD.anim`, two agent modes | yes, 4 |
| Reading | 6 other methods, 7 mitigation table | full width | table | no |
| Reading | 7 One PPO setup | split | PAR bars, 2D | no |
| Reading | 8 It generalises | split | MacDiarmid Fig. 9 bars, 2D | no |
| Case gallery | all | full width | filterable cards (a tool used across the page) | no |

**Stages and their data.** `stg-bon`: `RHD.BON_EX` (Gao et al. Table 2 via `recompute.py`): one column per n, proxy and gold as signed bars on a plinth, n samples streaming from the 1.2B policy through the proxy plate and only the kept answer reaching the gold plate; the last step draws the two lines through the bar tops. The step list's 14 numbers are static text that the scene rewrites from the data; `check_stages.mjs` fails if either differs from `inputs/derived.json`. `stg-tests`: no data; the chain every coding environment on the page uses (solution, tests, pytest with conftest.py, exit code, grader) as glass plates, the agent in front, a library and the person; each step is one row of the old moves table (now the step list, with its sources), the reward column full on every hack and the "solved" column empty. `stg-reach`: the six layers of the old nested diagram as rings around the policy, one object per ring, the camera pulling back one ring per step, each step's measured case from the step list as a short label; ring sizes are illustrative (said in the scene's header comment), only the order is the page's. The reward ring has its own red (before, the 2D diagram drew the scorer and the reward in the same orange).

**Changed**: the best-of-n 2D stepper (`22_js_bon.js`) became the stage, its script-drawn captions the step list; the "One buggy test" and CoT-monitor animations keep their panes but lose their per-step captions (now step lists, which name what each model or agent does, so no caption repeats them); a mode toggle replays. The moves table became the step list of `stg-tests`; the nested reach diagram and its list became `stg-reach` and its step list.

**Kept 2D**: the hero (a schematic curve), the Gao fits (curves on a square-root axis, reader-driven), the Singhal scatter, the format and PAR bars, the Wen dumbbell, the misalignment bars and every table: values on axes, which read best flat.

**No real image**: the page is about behaviour, not an object; the canonical figure (Gao et al. Figure 1) has no reuse licence, and the stage and the fitted curves draw its content.

**Length**: Reading core 6,465 words (28.1 min) before, 7,294 (31.7 min) after; closed 2,549 (11.1 min) unchanged; Case gallery 2,296 and Further reading 788 unchanged. The growth is the step lists of the five animations (about 900 words): the old steppers wrote their captions by script, invisible to the audit, and they are now static text on the left with no caption repeating them. The moves table and the reach list moved into step lists without growing; one duplicate sentence under the riddle was cut. Why about 32 minutes is right: as on 2026-10-23, the ledger is almost all core (239 core against 62 depth), and each core idea now has its picture with its steps spelled out.

**Ledger**: 339 units: core 239, depth 62, fat 38; problems 0. Two units added by hand for the new stages; unit 321 (the reach diagram) and unit 39 (the riddle note) re-keyed for the new text; units 287 and 296 (Further reading) re-keyed so no key contains a minutes number.
