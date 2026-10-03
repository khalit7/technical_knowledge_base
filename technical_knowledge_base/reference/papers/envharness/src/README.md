# EnvHarness: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81e88ab9c396a160f813, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `html_utils/methods/papers.md`, starting from the HarnessDev page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card, Problem, Idea (Table 1, Eq. 1), the three components with a stack diagram, EnvRigger (loop diagram, Table 8, the system prompt's rules), Setup, Results 1 to 5 with three predict-then-reveal questions (SWE-bench gain against its noise, Figure 5 in tasks, the band ceiling for Table 12), cross-model bars, How much to believe, What it takes to use this, Why it matters, Connections. |
| Wrap a world yourself | `t-run` | The live ingredient: a JS port of the released `EnvHarness`, `Setup`, `Rules` and `Link` over a toy household built from the paper's running example; one episode animated in the static and the wrapped world side by side (layer stack lit per step, order swap), K-rollout validation under the release prompt's band rule, and a scripted designer loop. |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 2 and 3 with Welch t and p, Figure 1 on two axes, Figure 5 in tasks, Tables 4, 5, 9 to 13, the RL recipe, Table 8 against the released configs, all 77 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **Live ingredient is a ported harness over a toy environment, not a trace replay.** The paper releases code but no trajectories, and the components themselves are the contribution, so the page runs the released wrapper semantics (delegation, Stage replay through `inner.step()`, blocked actions, the Chain's conjunction) on a household small enough to animate. The household, the policy's habits and every success rate in that tab are illustrative and labelled so; `check_world.mjs` checks the port against the release's contracts and the quoted rates.
- **No Then and now.** An August 2026 result; "What it takes to use this" covers adoption.
- **Reading tab is long (about 26 minutes against the old 8).** The old page was written from the abstract days after release; this one owns the full paper, the appendices (components, skills per round, nine specified weaknesses) and an evidence section whose findings change the reading (Figure 5, Table 12, the released configs). The RL recipe and the full Table 13 were moved to the tables tab to shorten it.

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
