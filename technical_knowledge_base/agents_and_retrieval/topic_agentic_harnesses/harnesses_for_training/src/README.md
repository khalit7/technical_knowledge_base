# Harnesses for training and evaluation: source

Notion: https://app.notion.com/p/3f15c17b0d0d815ea579d6c80065aa36 (child of Topic: agentic-harnesses). A new page: no old Notion text, so no `live.md` or `coverage.json`; the floor is the parent's Reading sections 7 and 8 and its Harness atlas sections "The harness changes the score", "Harnesses for training" and "Self-improving harnesses", which this page links rather than repeats.

## Build
`sh build.sh` writes `../index.html` from `parts/` (01_head, 10_header, 20_read_a..i and z = Reading, 31 to 34 tab HTML and JS, 35_js_read.js = the Reading tab's scripts, which run after the tab scripts because they reuse the simulator, 39 Further reading, 99_js_tabs last). `parts/30_js_data.js` (window.HT) is inserted after link expansion so its text is never rewritten.

Pipeline (scratch paths are arguments, never stored):
1. `code/gym/`: the environment and harnesses. `tasks.py` (8 bugs, 10 tasks), `hidden/hidden_tests.py` (20 checks), `verify.py` (hidden checks in a fresh `python:3.13-slim` container, `--network none`, workspace read-only; fail-to-pass and pass-to-pass computed by running the checks on each buggy repository: `meta.json` from `selftest.py`), `env.py` (per-rollout container), `harnesses.py` (bash, tools, plain), `rollout_local.py` (our loop, mlx_lm.server), `rollout_sdk.py` (Claude Agent SDK, our prompt and tools as an in-process MCP server, built-in tools off), `rollout_cc.py` (claude -p), `drive_*.sh`.
2. `python3 redact.py RAW_RUN_DIR code/gym` writes `recordings/*.jsonl` (schema "htrain/1", rules in its docstring) and `inputs/redaction.json`.
3. `python3 mask.py RAW_RUN_DIR inputs/mask.json <labels>` (run with the MLX env's Python, which has transformers 5.18.0 and the Qwen3-4B-Instruct-2507-4bit tokenizer in the Hugging Face cache): loss-mask classes per token, checked against the server's counts.
4. `python3 extract.py` builds `parts/30_js_data.js` and `inputs/stats.json`.
5. `python3 check.py` re-derives the data and the quoted facts and scans for private strings and em-dashes.

## Recordings (6 October 2026)
- Local model: mlx-community/Qwen3-4B-Instruct-2507-4bit (snapshot 50d4277) on mlx_lm.server 0.32.0 / mlx 0.32.3, Apple M1 Pro 16 GB, temperature 0.7, top-p 0.8, max 768 tokens per reply, 16 calls max; 4 rollouts per task and harness (bash, tools, plain).
- Claude Haiku 4.5 (claude-haiku-4-5-20251001) on the subscription: harnesses bash, tools, plain through claude-agent-sdk 0.2.163 (bundled Claude Code 2.1.286), and Claude Code 2.1.290 itself (`claude -p --tools Read,Edit,Write,Bash,Grep,Glob --permission-mode acceptEdits --allowedTools "Bash(python3:*)" ...`, `--setting-sources project --strict-mcp-config`, `--append-system-prompt "Never use the em-dash character."`); 3 rollouts per task and harness. Our harness prompts also ask for no em-dashes (both models). Remaining em-dashes in model text were replaced with ", " (count in `inputs/redaction.json`).
- Rollouts that failed for infrastructure reasons (the shared local server died) were rerun and are not in the data.
- Claude Code rollouts run commands on the host (its own Bash) in the workspace; every other rollout runs commands in its container. The verifier always runs in a fresh container.
- Timing of containers: `inputs/timing.json`.

## Sources
Paper facts come from this knowledge base's paper pages (`inputs/papers.json`, read 2026-10-06 from their "How much to believe" sections and corrections); framework facts from each project's README/docs, GitHub releases and PyPI on 2026-10-06 (`inputs/frameworks.json`); GRPO, Dr. GRPO, DAPO, RLOO, Search-R1, DeepSWE, Polar, LEGO-RL, verl, SkyRL, SWE-Gym, SWE-smith, Nebius datasets, OpenAI fine-tuning format and spec, transformers v5.18.0, TRL, LLaMA-Factory: links inline on the page, read 2026-10-06.

## Departures from the method
- Four data tabs rather than one: each holds a different kind of evidence (an experiment, an environment, a data pipeline, a literature comparison plus simulator).
- The search animation is a labelled simulation (no model); its start rate is the local model's measured overall rate.
- Page size is over 300 KB because every rollout's summary and the first rollout of each cell are embedded; all rollouts are in `recordings/`.
