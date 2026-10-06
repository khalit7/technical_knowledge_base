# Other coding harnesses: source notes

Page: `../index.html`, built by `sh build.sh` from `parts/`. Child of Topic: agentic-harnesses. Replaces the old Notion page "Open-source harnesses" (3c65c17b0d0d819fa3cefdcd2ccff2f7) and absorbs "TO DELETE: OpenAI and Google harnesses" (3c65c17b0d0d810380c0d932d132c7b6); both saved verbatim in `live.md` (fetched read-only on 2026-10-06; neither had child pages, databases or a video).

## Tabs
- **Reading** (`20_read*.html`, `22_js_rd_boundary.js`, `23_js_rd_runs.js`): the six harnesses in one screen, the action boundary (before/after animation of two recorded runs), one section per harness read from source, what the runs show, cloud agents and hosted loops (the absorbed page), the rest of the old notes checked, corrections, mistakes, interview questions.
- **Same task, every harness** (`31_*`): every recorded run as the wire saw it.
- **Repo map lab** (`32_*`): Aider's own RepoMap run on mini-SWE-agent's source.
- **Further reading** (`39_tab_more.html`).

Departure from the child-page method: no separate data tab per harness; the depth per harness is in the Reading tab (each section links its source lines), because the comparison table belongs to the parent's Harness atlas tab.

## Source read at pinned commits
| Repo | Tag / commit |
|---|---|
| openai/codex | rust-v0.160.1, d27764b82f7118f674371e6d6e76271d9d606edb |
| google-gemini/gemini-cli | v0.62.0, b460678f3db508407554afd604cc9d6635becb2a |
| anomalyco/opencode | v1.18.34, aec0b9a6d8898f68f923aaf08b7306d931fd9d76 |
| Aider-AI/aider | main 5dc9490bb35f9729ef2c95d00a19ccd30c26339c (PyPI 0.86.2 was run) |
| OpenHands/software-agent-sdk | v1.53.0, 54daf056bd863bb46f922a2fe9324dd736b37ff6 |
| SWE-agent/mini-swe-agent | v2.4.6, a83fcae82d2a08f0ee0c688f9d137b3566c097f8 |

`build.sh` expands `{{text|cx:path#Lx-Ly}}` (cx, gm, oc, ai, oh, ms) to GitHub at these commits. Line ranges come from reading the clones; a few are approximate ranges around the cited code.

## Recordings (`recordings/*.json`, list in `recordings/order.json`)
Recorded 2026-10-06 on the running example (`textstats`, two planted bugs; task prompt unchanged). Raw logs stay in the session scratchpad; the repo holds redacted extracts written by the scratchpad's `extract.py` (paths to `/work`, ids to short labels, gateway key removed, a final assert that no private string or em-dash remains).
- Local model: `mlx-community/Qwen3-4B-Instruct-2507-4bit` on mlx-lm 0.32.0 (shared server, Apple M1 Pro 16 GB, temperature 0), every request through a logging proxy. Codex and Gemini CLI reached it through a LiteLLM 1.104.0 gateway (Responses API and Gemini API translated to chat completions; provider `lm_studio/` was needed so that LiteLLM translates instead of forwarding `/responses`).
- Claude: Haiku 4.5 through `claude -p` (Claude Code 2.1.289, `--tools "" --strict-mcp-config --setting-sources project --no-session-persistence`, own system prompt plus "Never use the em-dash character."), behind a small OpenAI-compatible adapter. Text-protocol harnesses only (Aider, mini-SWE-agent text mode). 18 `claude -p` calls in all.
- Containment: opencode and OpenHands inside throwaway Docker containers (prefix `hoth-`), mini-SWE-agent with its Docker environment, Codex with its own Seatbelt `workspace-write`, Gemini CLI with its own Seatbelt (`-s`), Aider with no sandbox (it runs no model-suggested command under `--yes-always`; only our test command).
- Environment fix: aider-chat 0.86.2 pins scipy 1.15.3, whose wheel does not load on macOS 27; scipy was upgraded to 1.18.1 in its venv.

## Inputs and scripts
- `inputs/repomap_lab.json` from `repomap_lab.py` (run with aider-chat 0.86.2 on mini-swe-agent v2.4.6 `src/`; paths shortened).
- `build_data.py` writes `parts/19_js_data_*.js`.
- `check_numbers.py`: prose numbers against recordings and inputs, embedded recordings equal the files, privacy strings, em-dashes.
- `check_ui.mjs`: clicks every control at 390 dark and 920 light.
- `make_coverage.py` writes `coverage.json` (every fact of `live.md`, where it went or why dropped).
- `viz_ideas.md`: visuals built and rejected.

## Verification
Claims of the two old pages were checked one by one against primary sources (vendor docs, release notes, GitHub API, PyPI, arXiv) on 2026-10-06; openai.com pages, which refuse direct fetches, were read through a text-extraction reader. Results are in the Reading tab's Corrections section and `coverage.json`.

## Notes added after the runs
- `run/proxy.py` is afsame's logging proxy (frameworks root) with two changes: SSE responses stream through, and every upstream request is serialised. The serialisation was added after Gemini CLI's 60-second header timeout and retries overlapped two long prompts and crashed the shared MLX server once (logged in the scratchpad's MLX_SERVER.md); the Gemini run on the page is the rerun.
- Gemini CLI's streamed responses carried no usage through the gateway; `run/count_tokens.py` counts its prompt tokens with the model's chat template (tools included). The same count reproduces the server's numbers on the opencode run exactly; completion counts are approximate. Calls counted this way are flagged in the data (`tok_src`).
- Gemini CLI needed `security.auth.selectedType = "gemini-api-key"` and folder trust off in a throwaway settings file (HOME pointed at a scratch folder for every harness, so no user configuration was read or written).
