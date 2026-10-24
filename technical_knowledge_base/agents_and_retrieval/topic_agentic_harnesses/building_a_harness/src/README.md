# Building a harness: source notes

`sh build.sh` writes `../index.html` from `parts/` (same assembler as the parent root). `build_data.py RAW_DIR` turns the raw recordings (kept in the session scratch folder, never committed) into redacted copies in `recordings/` and the embedded data `parts/22_js_hb_data.js` (window.HB). `check_page.py` proves the page embeds exactly that data and that the numbers written in the prose match it; `check_ui.mjs` clicks every control at 390 px dark and 920 px light.

## Code that made the recordings
- `harness/native.py`: the parent's Loop lab loop on native tool calls (OpenAI chat-completions shape, standard library only), same four tools and permission gate; `--stop-rule naive|careful|verify`; one JSON line per turn, including whether the tests pass after it.
- `harness/template_tokens.py`: renders a recorded conversation through the local model's own chat template and tokenizer (reproduces the server's prompt_tokens exactly). Output: `data/tok_native_demo.json`.
- `harness/boundary.py`: what the model writes after its own action when generation is not stopped there (text protocol with and without a stop sequence; native template continued past `<|im_end|>` through `/v1/completions`).
- `harness/interrupt_sdk.py`: Claude Agent SDK 0.2.163, interrupt on the first tool call, then a follow-up question.
- `editbench/`: `tasks.py` (13 edits on the six files in `files/`, each with a check that also fails on unrelated changes), `bench.py` (five formats, eight appliers, one retry with the applier's error), `codex_patch.py` (Python port of Codex apply_patch at commit 8b6bb1c), `aci.py` (the same failures retried with terse and instructive messages), `setup_aider.sh` (rebuilds Aider 0.86.2's appliers outside the repo).
- Claude runs: `claude -p` from Claude Code 2.1.289 with `--setting-sources project --strict-mcp-config`, on the subscription; `MAX_THINKING_TOKENS=0` for the "thinking off" bench runs. Local model: mlx-community/Qwen3-4B-Instruct-2507-4bit (snapshot 50d4277) on mlx-lm 0.32.0, Apple M1 Pro, shared with other agents' requests (wall times are not comparable; batching also broke seed determinism once, said on the page).

## Recordings (`recordings/`, redacted: paths to /work, login and host names replaced, ids relabelled, thinking signatures and rate-limit events dropped, em-dashes in model text replaced by ", ")
- `stop_*.jsonl`: 16 native.py runs (naive, careful, verify x seeds 1-5 at temperature 0.7; naive_t0 at temperature 0).
- `bench_*.jsonl`: edit bench, per model; `aci_*.jsonl`: error-wording retries.
- `boundary.jsonl`: boundary experiment.
- `cc_stream_sonnet.jsonl` (timestamped, partial messages), `cc_interrupt_sdk.jsonl`, `cc_maxturns.jsonl`, `cc_budget.jsonl`.

## Departures from the method
- The parent's Loop lab owns the from-zero build and the Anthropic/OpenAI request shapes; this page links them and goes one layer down (templates, tokens, servers) instead of repeating them.
- Context management, sandboxes and Claude Code internals are owned by the sibling children (Context engineering, Agent security, Claude Code); this page links them.
- The local bench ran a subset of the edits (the three edits on the 141-line report module were skipped): the shared local server was producing about 4 tokens a second under other agents' load, and whole-file replies of that module would have taken several minutes each. Said on the page.

## Rebuild of 2026-10-24 (teaching contract)
**What changed and why.**
- **Top**: the idea in one sentence, a hero figure (one turn of the loop as seven steps, each linked to its section with one recorded number; the action boundary highlighted), "You need" and "Not here" links to the owners of context, security, Claude Code, frameworks and benchmarks, six new terms, and the one-screen table extended to twelve decisions.
- **Ownership** (per the brief: this page owns building a harness from scratch). Four short sections added: 8 Planning (todo tool, plan phase, Anthropic's long-running harness), 9 Execution environment (what native.py fences: cwd, path check, 60 s timeout, output capture; the isolation spectrum, security analysis linked to Agent security), 11 Cost and latency (prompt tokens per call by kind, a lever table pointing to the page's own measurements), 12 Measuring a harness (method, the format-ranking flip across models, HarnessTax via Agentic benchmarks). No new runs: all numbers come from the existing recordings or are sourced.
- **Tabs folded into Reading.** "Tool call, token by token" became a closed block in section 1 (its per-call stack is now the section 11 figure); the "Stop lab" (pair stepper, replay sliders) now sits inline in section 10, its run table and Claude Code limit cards in a closed block. The Edit format bench stays a tab: it is a dataset used by sections 5, 6, 7 and 12.
- **Visuals inline**: 1 counted before, 10 after (`audit_pages.mjs`). New SVGs: hero loop, SWE-agent ablation bars, planning diagram, environment spectrum, prompt tokens per call, format-by-model dot plot. The five HTML bar charts (boundary, parallel calls, error wording, formats, recovery) were redrawn as SVG at the measured width (`21_js_svbar.js`, `HBV.hbars`); figure code in `25_js_hb_vis.js`.
- **Never autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `hb-tab`); the two mode toggles no longer call `play()`. Checked under normal and reduced motion: both steppers stay on step 0.
- **Moved to closed blocks**: the three-protocol table, the token-by-token view, server mechanics, stream event names, the error wordings in full, three edit-format failures, the boundary method, the per-rule fragility note, the stop-run table, native.py part by part, interview questions. Static captions now carry the numbers the scripts used to write (so the ledger can find them).
- **Deleted as fat**: the common-mistakes list (each restated a section), headings and wind-ups, the stream note and the interrupt drill (now in captions), navigation text for the removed tabs.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading core | 7,749 words, 34 min | 8,097 words, 35 min |
| Reading closed blocks | 896 words, 4 min | 4,345 words, 19 min |
| Other tabs (core) | Token view 1,795, Edit bench 1,079, Stop lab 1,155, Further reading 593: 20 min | Edit bench 1,134, Further reading 647: 8 min |
| Visuals inline in Reading | 1 | 10 |

The core of the whole subject fell from about 54 minutes (Reading plus the lab tabs it sent the reader to) to 43. Reading itself is one minute longer because it absorbed the Stop lab's explanation and four sections this page now owns (about 1,450 words). The length is right because the ledger is mostly core (218 core, 77 depth units against 40 fat), the page covers twelve distinct decisions each with its own measured evidence, and every section is now a claim beside its figure. What could still go: the one-screen table repeats the hero's numbers (kept, as it carries the defaults).

## Ledger
`src/ledger.json`: 335 units (328 drafted from the old page plus 7 for numbers that were only script-written): core 218, depth 77, fat 40; `ledger.py check` problems 0. Keys were found by longest common substring against the rebuilt page and the 56 unmatched units reviewed by hand (17 kept with new keys, the rest headings, navigation and the restating mistakes list).

## Checks (2026-10-24)
`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0. `check_page.py`: ALL OK. `check_ui.mjs` (tabs updated to Reading, Edit format bench, Further reading): clean at 390 dark and 920 light.
