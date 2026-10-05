# Same agent, six ways (tab `t-same`)

Parts: `parts/31_tab_same.html` (prose, CSS scoped under `#t-same`), `parts/31_js_same_0data.js` (generated),
`31_js_same_1ui.js` (helpers, step-animation controller, predict questions, side-by-side code),
`31_js_same_2res.js` (results table, failure causes), `31_js_same_3inf.js` (prompt inflation before/after),
`31_js_same_4rep.js` (run replay).

## What was run (2026-10-05 and 06)
- One task (the running example `textstats`, standard prompt verbatim), four tools with shared bodies
  (`code/tools_impl.py`), one short system prompt, 15-call limit.
- `code/a1_plain.py` ... `code/a6_claude_sdk.py`: the six agents. `a5b_smol_toolcalling.py` (fairness check:
  smolagents without code actions), `a6b_claude_preset.py` and `a6c_claude_builtin.py` (Claude prompt-size variants).
- Local model: `mlx-community/Qwen3-4B-Instruct-2507-4bit` (HF snapshot 50d427756c6b1b2fe0c0a10f67fbda1fc8e82c1b)
  on mlx-lm 0.32.0 / mlx 0.32.3, Apple M1 Pro 16 GB, `--max-tokens 2048`. Labelled "local model on Apple M1 Pro"
  everywhere; never compared with Claude as the same model.
- Greedy runs (`*_1`): server default temperature 0. Sampled runs (`*_t07_*`): temperature 0.7, first through a
  second server started with `--temp 0.7`; after two Metal out-of-memory crashes (two servers plus a Docker VM on
  16 GB) the last four (`a5_t07_3`, `a5b_t07_1..3`) went through one server with the logging proxy setting
  `"temperature": 0.7` on each request (visible in their recorded requests). Runs lost to the crash
  ("generation thread died") were infrastructure failures and were rerun; they are not on the page.
- Claude: 7 runs through the subscription (`haiku` x5, `sonnet` x1, plus one discarded run, below). Budget cap from
  the coordinator respected (no Claude runs after the rate-limit warning note).
- Discarded: the first Claude Agent SDK run, made without `strict_mcp_config=True`, loaded the account's connected
  claude.ai connectors as tools (first call well over 100k tokens). Its raw file stays in the scratchpad; it is
  described on the page without the list of connectors.

## Files
- `harness/run.py` copies the task repo, runs one agent, re-runs the tests itself and checks the test file is
  unchanged; `harness/proxy.py` is the logging proxy (optionally sets temperature); `harness/extract.py` redacts
  and compacts raw recordings into `data/runs.json`.
- `data/runs.json`: every kept run, redacted: paths to `/work`, the scratchpad to `/scratch`, the login name to
  `user`, tool-call ids to `call_N`, Claude init record reduced to model, permissionMode, tools,
  claude_code_version and cwd; thinking blocks kept as a marker (no signature); long texts cut at 2,500 characters
  with a note. Model-written em-dashes were replaced by ", " (count shown in the tab footer).
- `data/first_tokens.json` from `tok.py`: each first request split into parts with the model's own tokenizer and
  chat template; the totals equal the server's `prompt_tokens` for all five (checked by the script).
- `causes.json`: why each run that did not end fixed and clean failed, read from its transcript.
- `gen_data.py` writes `parts/31_js_same_0data.js` (transcripts only for the runs listed in `SHOW`, to keep the
  page smaller). `check_data.py` checks the page embeds exactly these recordings and that numbers in the prose
  match the data.

Rebuild: `python3 gen_data.py && sh ../build.sh`.
