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
