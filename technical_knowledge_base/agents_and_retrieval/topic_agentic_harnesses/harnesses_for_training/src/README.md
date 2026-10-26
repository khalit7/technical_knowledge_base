# Harnesses for training and evaluation: source

Notion: https://app.notion.com/p/3f15c17b0d0d815ea579d6c80065aa36 (child of Topic: agentic-harnesses). A new page: no old Notion text, so no `live.md` or `coverage.json`; the floor is the parent's Reading sections 7 and 8 and its Harness atlas sections "The harness changes the score", "Harnesses for training" and "Self-improving harnesses", which this page links rather than repeats.

## Build
`sh build.sh` writes `../index.html` from `parts/` (01_head, 10_header, 20_read_a..i and z = Reading, 21_js_rd_common.js = the skill template (never autoplays), 31 and 32 tab HTML and JS, 33_js_traj.js and 34_js_self.js = scripts of the two former tabs whose content now sits in Reading sections 4, 6 and 7, 35_js_read.js = the Reading tab's scripts (after 34 because they reuse its simulator), 36_js_rd_flow.js = the hero and section 8 diagrams, 39 Further reading, 99_js_tabs.js = the skill template, storage key `htrain-tab`). `parts/30_js_data.js` (window.HT) is inserted after link expansion so its text is never rewritten; since 2026-10-24 build.sh also writes every bound number (`<span data-ht>`) into the static text, so the prose reads without scripts and the ledger can find it.

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

## The 2026-10-24 rebuild to the teaching contract
- **Top**: the core sentence (the harness is also the ruler and the gym), a static hero (`36_js_rd_flow.js`: one episode, task, policy, harness, sandbox, verifier, reward, drawn at the measured width as one row or a snake, the harness highlighted) with four cards for its uses (ruler, gym, dataset, search), the setup in one paragraph, the findings box, "You need" and new terms.
- **Tabs folded into Reading**: Rollout to dataset (format viewer and SFT funnel inline in section 6, redaction counts and every group's advantages in closed blocks in sections 6 and 4) and Self-improvement (the simulator sliders in a closed block under the section 7 animation, the full paper and environment comparisons in a closed block). Both explained one mechanism each. Scaffold experiment (a dataset view used by sections 1, 3, 4) and Environment lab (an explorer used by sections 2 and 3) stay.
- **New visual**: section 8's fleet diagram, the hero's six parts as services with their published sizes (DSec, DeepSWE; 64 problems x 8 rollouts = 512 containers per step, derived).
- **Owned elsewhere, now linked**: the GRPO worked arithmetic (+1.73 / -0.58, the 1, 1, 1, 0 drill, Dr. GRPO's numbers) is RL for LLMs' (sections 3 and 7); reward hacking in general is Reward Hacking's (the three published agent cases stay here in a closed block because the owner does not carry two of them).
- **Stale pointers fixed** (ids checked in pages.json): RL for LLMs section 8 (no Rollout mismatch tab), section 5 and its Real rollouts tab (no Verifier gallery), section 3 (group widget), section 12 (sync and async); Context engineering section 4 (no Compaction lab); Building a harness section 1 (no "Tool call, token by token" tab); Personal agents section 8 (Hermes trajectories).
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; `check_controls.mjs` steps every control at 390 dark and 920 light and confirms nothing plays by itself under normal and reduced motion.
- **Moved to closed blocks**: the docker command and published task sources, the reward-hacking cases, the verl, SkyRL and Polar quotes, public trajectory sets, the frameworks table, mistakes (a checklist) and interview rehearsal.
- **Measurement artefacts trimmed**: the group selector's option labels (counted as words) were shortened; the token view shows the end of the rollout inline (the template's insertion) and the whole rollout in a closed block.
- **No photo**: the page is about software mechanisms; no physical object or canonical figure would teach more than the diagrams.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 40 min | 30 min |
| Reading, closed details | 3 min | 16 min |
| Other tabs, core (excluding Further reading) | 20.5 min (four tabs) | 9.7 min (two tabs) |
| Visuals drawn in Reading (svg) | 3 | 5 (hero, environment stepper, groups stepper, search chart, fleet diagram), plus HTML bar charts, the token view, the format viewer and the funnel |

Why 30 minutes is right: the page teaches five mechanisms on its own evidence (scaffold sensitivity, the environment and verifier, rewards and flat groups, loss masks and token-in token-out, the winner's curse in harness search) plus how they look at scale; about a sixth of the core words are tables and captions drawn from the 240 recordings. What made it long (restated GRPO arithmetic, reward-hacking cases, quotes, mistakes, interview answers, full comparison tables) is now linked or closed.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
350 units: core 247, depth 71, fat 22, owned 10 (all RL for LLMs: the GRPO arithmetic and the baseline). 332 drafted by `ledger.py init`; 18 added by hand for script-rendered visuals and tables and for the new hero, core sentence and fleet diagram.

## Update pass 2026-10-26 (update-kb)
Core 30.3 to 32.6 min (header 33; the closed-details figure, 16, was left as computed before: the audit now reads 24.5 because it counts widget tables in closed blocks). Integrated: harness rankings change across models (arXiv 2610.32483, owned by Other coding harnesses) and state that cannot be re-observed, with the ARC-AGI-3 gap decomposition (arXiv 2610.26632), in section 1; "Can the weights absorb the harness?" (arXiv 2610.27157, the scaffold separation result) as point 5 of section 6; the ARC-AGI-3 self-revision study (arXiv 2610.30499) in section 7. The scaffold paper links to its KB paper page; its figures follow that page's corrections (43.6% is the 85-call tree, which has no student; best student 35.8%; LoRA rank 16 to 64 +1.8, full fine-tuning +2.2; the 4B student's lead is within noise; the theorem covers logarithmic chains of thought only).

**Contract pass 2026-10-26** (after the routine audit): item 5 of the trajectories section ("Can the weights absorb the harness?") no longer retells the Scaffolds paper (theorem, complexity classes, five numbers): it states the result with its scope in two sentences and links the paper page, which owns the method, numbers and evidence (OWNERS.md, Reference). Ledger: unit 355 and two new units are `owned:reference/papers/scaffold_computational_separations`. Header 32 min, plus 24 in closed details (measured 7,360 and 5,624 words at 230 a minute; the old "plus 16" was stale before the run).
