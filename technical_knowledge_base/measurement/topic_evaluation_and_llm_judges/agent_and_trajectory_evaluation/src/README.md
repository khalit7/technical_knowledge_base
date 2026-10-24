# Source of the Agent and trajectory evaluation page

Build: `python3 mk_inputs.py <scratch>` (reads the downloaded τ²-bench trajectory files and the re-grading outputs; writes `inputs/`), `python3 mk_data.py` (writes `parts/21_js_data.js`), then `sh build.sh` (writes `../index.html`).
Re-grading (done once, 2026-10-04): clone github.com/sierra-research/tau2-bench at 5bfa7e3, `uv sync`, then from its folder `uv run --with websockets python ../regrade.py ../gpt52_airline.json` (and telecom), `../null_env.py ../gpt52_retail.json`, `../dbdiff.py <file> 29:1 0:3 12:1 31:1` (and the Opus file 29:2). The trajectory files (13 to 20 MB each) stay out of the repository; URLs in `mk_inputs.py`.
Checks: `python3 recompute.py` (writes `recompute.json`), then from the repo root `node .../src/checks/check_ui.mjs` (every control at 390 dark and 920 light, every closed block opened; no animation moves before a click; compares the page's computations, the failure taxonomy and the 160 matcher verdicts with `recompute.json`; OK, 946 actions on 2026-10-24), `sh html_utils/checkpage.sh <folder>` (fail=0, emdash 0, errbox 1, clipped 0) and `python3 html_utils/ledger.py check <folder>` (problems 0).

Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md` (child page), rebuilt 2026-10-24 to `teaching/teaching-contract.md`. Reading: the core idea and a hero figure, You need, new terms; then one screen, the stepped trial, outcome, actions, steps (with the path-matcher grid), judges, reliability (pass^k), failure taxonomy, environments, hacking, cost, what to log, building a suite. Departure: public agent benchmarks are linked, not covered (owned by Topic: benchmarks' Agentic page); the real data is the same τ²-bench release that page uses, but here re-graded (three graders, do-nothing agent, path matchers) rather than for pass^k.

Parts: `01_head`, `02_css`, `10_header`, `20_read_a` to `_e`, `30_tab_grade`, `39_tab_more`; JS `21_js_data` (generated), `21_js_rd_common` (the skill template, `window.RD`), `22_js_calc` (all derived numbers, window.ATJ_OUT, including `fail_tax`), `23_js_anim` (the stepped trial, its own controller, never autoplays), `24_js_inline` (task strip), `25_js_viz` (the nine Reading figures as SVG), `31_js_grade`, `33_js_match` (the matcher grid, now in Reading), `99_js_tabs` (the skill template, key `kb-agent-traj-tab`). Ledger: `ledger.json`. `coverage.json` is the 2026-10-04 coverage record, kept for history.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence, a hero figure (the default trial in three layers, said, did and changed, each with its grader's verdict), You need, new terms (task, trial, transcript, outcome and process grading, gold actions, simulated user, pass^k, PRM).
- **Every core idea has a visual inline** (nine SVG figures drawn at the measured width, `25_js_viz.js`): do-nothing bars, the transcript-judge-against-database 2x2, the path-matcher ladder, the judge designs with the with-and-without-tools dumbbell, pass^k curves, the failure-taxonomy bars, the environment diagram (sandbox against the verifier), cost bars. The old HTML bars were redrawn as SVG.
- **The Path matchers tab moved into Reading** (section Steps): it explains one mechanism (how strict a step grader may be), so the ladder sits beside the claim and the full grid is a closed block. The Three graders tab stays: it is the explorer used across the page.
- **Owned concepts this page now teaches rather than links**: pass^k with its estimator and a worked instance (the brief makes this page the owner of reliability across runs); a **failure taxonomy** section (new): symptoms read by code from the 66 failed trials (`fail_tax` in `recompute.py`, checked by `check_ui.mjs`), causes from reading, τ-bench's Figure 5 breakdown (about 55% / 25% / 19% of 36 failed gpt-4o retail trajectories), MAST linked to Multi-agent patterns.
- **Moved to closed blocks (depth)**: data provenance, the four outcome-grader shapes table, the do-nothing method, MOLE and Emergence World details and HAL, the matcher grid, mobile judges and PRM history, METR, ImpossibleBench and StateM detail, the trace-format table (tracing itself is owned by LLM observability, now linked).
- **Deleted as fat**: the Common mistakes section (each item restated its section; the checklist keeps the actions), wind-ups, pointers to removed tabs.
- `99_js_tabs.js` is the skill template (also opens a tab named in the URL); `21_js_rd_common.js` added from the template. The trial stepper keeps its own controller, which never played by itself; `check_ui.mjs` now asserts that, and a reduced-motion run confirms it.
- No real image: nothing on this page is a physical object, and the mechanisms are drawn.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (rendered, `audit_pages.mjs`, 230 wpm) | 29 min | 26 min |
| Reading, closed details | 1 min | 6 min |
| Other tabs | 6 min (Three graders 2, Path matchers 2, Further reading 3) | 4 min (Three graders 2, Further reading 3) |
| Visuals drawn in Reading (svg, canvas, img) | 0 (HTML bars and the stepper only) | 9 |

Why 26 minutes is right: about 3.5 minutes of the core is the stepped trial's own text (real messages and the task's instructions, needed to see that the gold disagrees with the simulated user), and the page gained two owned subjects it lacked (pass^k taught, and a failure taxonomy). Everything else that is not needed on a first read (provenance, method notes, per-study numbers, the matcher grid, the trace formats) is closed. Each remaining section is one decision a builder of an agent eval must make.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
305 units: core 248, depth 30, fat 26, owned 1 (MAST's 14 modes, at Multi-agent patterns). 292 were drafted by `ledger.py init` from the old page and keyed by phrase match against the new page, then reviewed by hand; 13 were added by hand for script-drawn figures and new content. Fat units carry a `note`.
