# Other coding harnesses: source notes

Page: `../index.html`, built by `sh build.sh` from `parts/`. Child of Topic: agentic-harnesses. Replaces the old Notion page "Open-source harnesses" (3c65c17b0d0d819fa3cefdcd2ccff2f7) and absorbs "TO DELETE: OpenAI and Google harnesses" (3c65c17b0d0d810380c0d932d132c7b6); both saved verbatim in `live.md` (fetched read-only on 2026-10-06; neither had child pages, databases or a video).

## Tabs (since the 2026-10-24 rebuild)
- **Reading** (`20_read.html` top and styles, `20_read_a` to `20_read_h` sections 1 to 7, runs and the Versions table, `20_read_i` Depth, `20_read_z` close; JS `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `hoth-tab`), `22_js_rd_boundary.js` the section 1 before/after, `25_js_oc_vis.js` every SVG figure and the repository-map stepper).
- **Same task, every harness** (`31_*`): every recorded run as the wire saw it, and each first request in full.
- **Further reading** (`39_tab_more.html`).

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
- `build_data.py` writes `parts/19_js_data_runs.js` and `19_js_data_map.js`; `derive_ends.py` writes `19_js_data_ends.js` (one letter per model call: acted, error, silent no-op, prose, side call, subagent; asserts the counts the prose states).
- `check_numbers.py`: prose numbers against recordings and inputs, embedded recordings equal the files, privacy strings, em-dashes.
- `check_ui.mjs`: clicks every control at 390 dark and 920 light, checks that nothing has moved before the reader acts, and saves element screenshots of each figure.
- `make_coverage.py` writes `coverage.json` (every fact of `live.md`, where it went or why dropped).
- `viz_ideas.md`: visuals built and rejected.

## Verification
Claims of the two old pages were checked one by one against primary sources (vendor docs, release notes, GitHub API, PyPI, arXiv) on 2026-10-06; openai.com pages, which refuse direct fetches, were read through a text-extraction reader. Results are in the Reading tab's Corrections section and `coverage.json`.

## Notes added after the runs
- `run/proxy.py` is afsame's logging proxy (frameworks root) with two changes: SSE responses stream through, and every upstream request is serialised. The serialisation was added after Gemini CLI's 60-second header timeout and retries overlapped two long prompts and crashed the shared MLX server once (logged in the scratchpad's MLX_SERVER.md); the Gemini run on the page is the rerun.
- Gemini CLI's streamed responses carried no usage through the gateway; `run/count_tokens.py` counts its prompt tokens with the model's chat template (tools included). The same count reproduces the server's numbers on the opencode run exactly; completion counts are approximate. Calls counted this way are flagged in the data (`tok_src`).
- Gemini CLI needed `security.auth.selectedType = "gemini-api-key"` and folder trust off in a throwaway settings file (HOME pointed at a scratch folder for every harness, so no user configuration was read or written).

## Rebuild of 2026-10-24 (teaching contract)
**What changed and why.**
- **Organised by design choice, not by harness.** The brief gives this page ownership of the other coding harnesses compared by design choice. The old Reading tab had one section per harness; the new one has one per choice, each comparing all six with a figure: 1 how the model writes an action, 2 what stops the loop and the loop guards, 3 edit format and matcher ladder, 4 sandbox and approval, 5 what the model sees (first request, compaction, Aider's repository map), 6 sub-agents, extensions and the harness as a server, 7 where the loop runs. Then the run outcomes and cost, a compact dated Versions table, and Depth.
- **Top**: the idea in one sentence; a hero SVG (one turn of the loop with the five choices linked to their sections, beside the shared-task outcome per harness with the choice at which each run failed); "You need" and "Not here" links to the owners (Claude Code, Building a harness for the action boundary, ACI and the edit bench, Context engineering, Agent security, Coding benchmarks, Harnesses for training, the root's Harness atlas); six new terms; the one-screen table kept, rows renumbered to the sections.
- **Visuals inline: 0 counted before, 9 after** (`audit_pages.mjs` counts SVG). New: hero, run-ending strips (from `derive_ends.py`), matcher ladders, first-request anatomy (moved from the runs tab), compaction "what survives", containment grid (default and headless), where the loop runs, run cost bars (redrawn as SVG), repository map (moved from the Repo map lab tab, now an SVG stepper over the three situations). The section 1 before/after on recorded transcripts is kept (HTML text, not counted).
- **Repo map lab tab folded into section 5**: it explained one mechanism. The runs tab stays: a dataset used across the page (and linked by name from Personal agents); its anatomy bars became a picker, since the drawing is now inline.
- **Never autoplay**: the template controller; `check_ui.mjs` confirms both steppers sit on step 0 after load.
- **Moved to closed blocks**: each loop read from source, each harness's sandbox model, per-model prompts and tool sets, instruction files, compaction details and output limits, Aider's formats, repository-map caveats, dated facts in full, the rest of the field, how the runs were made, corrections to the old notes, interview rehearsal.
- **Deleted as fat**: per-harness "What it is" headings and the "What to steal" lines (now the table's Steal row and each section's "What it buys"), the three-findings box (now the core sentence and hero), the Common mistakes list (each restated a section; the facts stay in their sections), pointers to the removed tab.
- **Volatile**: versions, release dates, stars, tier changes, the opencode Console breach, cloud and hosted agent launches and the rest-of-field news sit in one dated table (compact visible, full rows closed).
- No new runs; every number comes from the existing recordings and sources. No real images: the subject is software whose mechanisms a diagram shows better, and the recorded transcripts are the real artefacts.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading core | 9,229 words, 40 min | 5,966 words, 26 min |
| Reading closed | 574 words, 2 min | 4,950 words, 22 min |
| Other tabs (core) | runs 2,171, repo map 1,272, further 560: 17 min | runs 1,987, further 545: 11 min |
| Visuals inline in Reading | 0 | 9 |

The core of the subject (Reading plus the lab it sent the reader to) fell from about 46 minutes to 26. That is right for a comparison of six harnesses on five design axes: every section is one choice, its figure and what it buys, with the per-harness source detail one click away in closed blocks. The closed time grew because nothing was cut: the per-harness facts with their source links, the dated facts and the corrections now live there.

## Ledger
`src/ledger.json`: 429 units drafted by `ledger.py init`; core 216, depth 153, volatile 24, fat 36; `ledger.py check` problems 0. Keys were found by longest common substring against the rebuilt page; 88 unmatched units were reviewed by hand (two facts found missing, Gemini CLI's and OpenHands' tool sets, were restored in a closed block).

## Checks (2026-10-24)
`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0. `check_numbers.py`: ok=63 fail=0 (two phrase checks updated to the new wording). `check_ui.mjs`: clean at 390 dark and 920 light, nothing moving before the reader acts. Privacy grep clean.
