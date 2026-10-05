# Harness atlas (tab t-atlas): notes

Owner files: `parts/33_tab_atlas.html`, `parts/33_js_atl_a_data.js` (generated), `parts/33_js_atl_b_core.js` (matrix, compare, chooser, edit formats), `parts/33_js_atl_c_scores.js` (same model, different harness; numbers quoted in the prose), `parts/33_js_atl_d_anim.js` (harness-tax animation, experiment table, RL stepper, environment table, LEGO-RL bars), `parts/33_js_atl_e_more.js` (paper cards, drills, interview questions, sources), and this folder.

## Pipeline
1. `inputs/r1_vendor_cli.json`, `r2_ide_cloud.json`, `r3_open.json`: one object per harness on nine axes, each axis with its own source URLs, gathered by research helpers on 2026-10-05 from each product's own docs, repo, changelog and pricing page (schema in `inputs/research_schema.md`; "unconfirmed" where a page did not say). `r4_scores.json`: same-model, different-harness scores (Terminal-Bench 2.0 and 2.1 boards via their data endpoint, SWE-bench Verified leaderboard JSON, HarnessTax chart JSON), scaffold studies, and SWE RL environments.
2. `python3 src/atlas/build_data.py` writes `parts/33_js_atl_a_data.js`. It also pulls per-call token counts of two recordings owned by the other labs (Loop lab `s5_haiku`, Trace lab `std_haiku_1`) from their generated data files for the animation; nothing is re-recorded.
3. `sh src/build.sh`, then `python3 src/atlas/check_prose.py` (110 checks: every number written by hand in the tab against the data, the HarnessTax blog extract kept by Agentic benchmarks, and the paper pages; the page embeds exactly the redacted experiment summary; no private strings or em-dashes), then `node src/atlas/check_ui.mjs <abs path to index.html> <shots dir>` (clicks every control at 390 dark and 920 light).

## The experiment (failed, kept as a lesson)
`run_mswe.py` ran mini-swe-agent 2.4.6 (stock `mini_textbased.yaml` prompts, Docker `python:3.13-slim`, container prefix `ahatlas-`) with Claude Haiku 4.5 through `claude -p --tools ""`, the transcript flattened into one prompt. Haiku invented command output in 7 of 11 replies (no stop sequence ends a turn at the action in `claude -p`); stopped by hand after 11 calls when the coordinator capped claude invocations (the shared subscription reported `allowed_warning` at 53 to 54% of its seven-day limit on every call). `inputs/mswe_attempt_2026-10-05.json` is the redacted summary (per call: tokens, seconds, number of actions, whether output was invented, the command that ran). Raw stream-json stays in the session scratchpad. 11 claude invocations in all for this tab.

## Departures from the brief
- The planned mini-SWE-agent against Claude Code comparison did not produce a run that finished; the same-model, two-harness comparison uses the Loop lab and Trace lab recordings instead (by link, numbers pulled at build time), and the failure is shown as what it teaches.
- Tags in the atlas are the compiler's summary of each cell for filtering; the cell text and its links are the evidence.
- Pricing cells are as read on 2026-10-05 and will go stale first.

## Findings for the other tabs and the sibling root
- Several products on the brief changed in 2026: Cursor acquired by SpaceX (Aug), Windsurf is now Devin Desktop with Cascade removed (Jun, Sep), Roo Code shut down (May), Kilo Code acquired by Anaconda (Jul), Copilot "coding agent" renamed "cloud agent", Codex docs moved to learn.chatgpt.com, Aider barely released since Feb. The Reading tab and Further reading should use these names.
- Claude Code: TodoWrite now off by default (Task* tools), Grep and Glob absent by default on macOS/Linux/WSL per the tools reference; Claude Mods (plugins with JS hooks modules) in 2.1.287 to 2.1.289.
- Agentic frameworks root: Claude Agent SDK sits beside Anthropic "Managed Agents" (hosted harness via the Claude API); Polar and LEGO-RL train inside production harnesses by proxying model calls (useful for the frameworks root's observability and gateways sections).
