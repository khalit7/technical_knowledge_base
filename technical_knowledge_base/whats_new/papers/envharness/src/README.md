# EnvHarness: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81e88ab9c396a160f813, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the HarnessDev page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card, the core sentence and hero (the paper's own Figure 2, CC BY 4.0), You need and new terms, Problem, Idea (Table 1, Eq. 1), the three components with a stack diagram, EnvRigger (loop diagram, Table 8, the system prompt's rules), Setup, Results 1 to 5 with three predict-then-reveal questions (SWE-bench gain against its noise, Figure 5 in tasks, the band ceiling for Table 12), cross-model bars, How much to believe, What it takes to use this, Why it matters, Connections. |
| Wrap a world yourself | `t-run` | The live ingredient: a JS port of the released `EnvHarness`, `Setup`, `Rules` and `Link` over a toy household built from the paper's running example; one episode animated in the static and the wrapped world side by side (layer stack lit per step, order swap), K-rollout validation under the release prompt's band rule, and a scripted designer loop. |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 2 and 3 with Welch t and p, Figure 1 on two axes, Figure 5 in tasks, Tables 4, 5, 9 to 13, the RL recipe, Table 8 against the released configs, all 77 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **Live ingredient is a ported harness over a toy environment, not a trace replay.** The paper releases code but no trajectories, and the components themselves are the contribution, so the page runs the released wrapper semantics (delegation, Stage replay through `inner.step()`, blocked actions, the Chain's conjunction) on a household small enough to animate. The household, the policy's habits and every success rate in that tab are illustrative and labelled so; `check_world.mjs` checks the port against the release's contracts and the quoted rates.
- **No Then and now.** An August 2026 result; "What it takes to use this" covers adoption.
- **Reading tab is long (about 26 minutes against the old 8 before the 2026-10-25 light pass, 24 after; see below).** The old page was written from the abstract days after release; this one owns the full paper, the appendices (components, skills per round, nine specified weaknesses) and an evidence section whose findings change the reading (Figure 5, Table 12, the released configs). The RL recipe and the full Table 13 were moved to the tables tab to shorten it.

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an em-dash or unexpanded macro.
- `extract_paper.py`: arXiv HTML v1 to `inputs/`. `decode_figs.py` (with `svgparse.py`, copied from the HarnessDev page): Figures 1, 5 and 6 from their vector SVGs to `inputs/figs.json`.
- `mk_tables.py`: `tables.json` (Tables 2 to 5 and 7 to 13, 250 printed cells checked against the HTML extract, plus the decoded figures).
- `recompute.py`: 77 checks and every derived number (Welch tests, whole-task lattice, Figure 5 in tasks, RL in tasks with Fisher tests, the band ceiling, released configs against Table 8), to `inputs/recompute.json`.
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `parts/14_js_world.js`: the engine of the live tab (port of the released classes, the toy household, the scripted policy); `parts/15_js_run.js` its UI. `check_world.mjs` (node, from `src/`): 12 engine checks.
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (53 items, this paper's own, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, four component presets stepped end to end, the validation buttons, the three reveals.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `check_world.mjs` 12 of 12; `recompute.py` 76 of 77 hold as printed (the exception is the released configs against Table 8, a finding); `mk_coverage.py` 53 of 53.

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence, then the paper's own Figure 2 as the hero (`img/fig2_envharness.webp`, CC BY 4.0, credited under it and in `img/CREDITS.md`): agent harness and EnvHarness as the same move on both sides of the loop. Then "You need" and the new terms. The note on the first summary's provenance moved into a closed "About this page's sources".
- **Owned elsewhere, a sentence kept and linked**: what an agent harness is (Topic: agentic-harnesses), what an RL environment contains (Harnesses for training and evaluation), GRPO (RL for LLMs), the standard error of a difference (Eval statistics).
- **Closed**: Table 1 (the hero carries the analogy), the released code's class names, interface, Bridges and sandboxing, the designer's system-prompt rules, the split definitions, the components and skills of rounds 1 to 3 (one sentence stays open), the representative Chain skills, the per-model average-steps reading, the Table 13 Contract and skill example, the smaller evidence points, and the future-work list.
- **Volatile**: none found; the page holds no dated follow-up news (the same-month papers in Why it matters and Connections are context, not news).
- **No autoplay**: `makeAnim` patched as on the WSM page (the episode animation in Wrap a world yourself waits on its first step; changing a control resets to step 1 paused); `90_js_tabs.js` replaced by the skill template `99_js_tabs.js` (storage key `envharness-tab`, plus `data-to` scrolling). `check_page.mjs` fails if the animation draws a frame before a click, and opens every closed block.
- **Takeaway softened** (paper.json, so the card, and `live.md`): "beating static and generated environments for skill learning and GRPO RL and still scaling where they flatten" became the measured statement: above original-environment skills on all five benchmarks (+1.0 to +9.0 points, mostly within three-run noise), above generated environments where one exists, GRPO RL 3 of 4 metrics with one run per arm, and in Figure 5 the original environments gaining as many tasks as EnvHarness after the first 100 (only the generated ones flatten). The Notion property needs the same edit.
- Em-dashes in the saved extracts (`inputs/paper_v1.txt`, `inputs/tables_v1.txt`, two release YAMLs) written as `--`; `extract_paper.py` now does this and redacts emails (none were present). Header: "Reading: 24 min, plus 4 in closed details." from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 26.6 min (6,120 words) | 23.9 min (5,502) |
| The paper, closed | 0 | 4.1 min (948) |
| Wrap a world yourself; tables; Further reading | 4.3; 11.7; 4.0 min | unchanged |
| Visuals in Reading (audit) | 3 | 4 (the hero added) |

Why about 24 minutes is right: the paper has a framework (three components, their composition, the designer loop), five separate results and an evidence section whose findings change the reading (the SWE-bench means as whole counts, Figure 5 in tasks, the band ceiling under Table 12, the released configs). Each result keeps its numbers in the open text; what closed is provenance, code detail, per-round lists and examples. Shorter would mean closing results or evidence points that the verdict rests on.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
332 units: core 298, depth 30, owned 4, volatile 0, fat 0. 315 drafted by `ledger.py init` from the page before the pass; 17 added (core sentence, hero, new terms, four owner links, ten script-drawn tables keyed to their static headings). Nothing was deleted. `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 4, 209 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 386 actions, 0 problems (no frame before a click). `check_world.mjs`: all engine checks pass. `mk_coverage.py`: 53 of 53.
