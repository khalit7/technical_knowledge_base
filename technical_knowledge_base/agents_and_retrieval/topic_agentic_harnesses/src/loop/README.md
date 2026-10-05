# Loop lab (tab t-loop): notes

What it is: an agent harness built from nothing in steps (`harness/step0.py` to `step5.py`, one complete file per step), each run for real on the running example (scratchpad task_repo, standard task prompt) on 2026-10-05. The model is `claude -p` with `--tools ""` and our own `--system-prompt`, so it only returns text; the harness parses `ACTION {json}` lines, gates and runs them, and appends results. Model calls go through the owner's Claude subscription (no API key).

## Files
- `harness/step*.py`: the harness per step. Final step: 240 lines, 190 of code (no comments or blanks).
- `run.sh` (one harness run on a fresh copy; `AH_INJECT`, `AH_INJECT_TEST` plant the prompt-injection text from `injection.txt` / `injection_test.py`), `run_cc.sh` (the same task in real Claude Code).
- `build_data.py`: redacts the raw runs (kept in the scratch directory) into `recordings/*.jsonl` and writes `parts/31_js_loop_0data.js`; ends with a privacy grep (uses topic_protocols' private_patterns helper). Assembled prompts are not stored (quadratic); each turn keeps its block list, from which they can be rebuilt.
- `gate_cases.py` -> `gate_cases.json`: step 3's real `check()` run on eleven actions, no model.
- `check_numbers.py`: the page embeds exactly the built data; per-run counts match the recordings; every hand-written number in the tab's prose is checked against the recordings.

## Runs (20 recorded task runs: 16 through the harness, 4 in Claude Code; 136 `claude -p` invocations in all, since each harness turn is one call)
Haiku 4.5 (`claude-haiku-4-5-20251001`) for all steps, Sonnet 5.5 (`claude-sonnet-5-5`) for the showcase step 5 and Claude Code comparisons. Labels in `recordings/`. `s5_denied_haiku` (gate had no rule for the new delegate tool) and `s5_soft_haiku` (soft prompt, never delegated) are kept as evidence.

## Findings worth reusing
- With `--tools ""` the model keeps writing after its action and invents the tool result (step 1, call 2), and once ran on for 95,162 characters until the 32,000-token output cap; the CLI then injected "Output token limit hit. Resume directly ..." and returned only the last 7,475 characters (294 s). Fix: keep text only to the first ACTION line (stop sequence by hand).
- A transcript resent as one growing text block gets 0 cache reads; past the minimum cacheable length (Haiku 4.5 4,096, Sonnet 5.5 512) the CLI writes the whole prompt to the 1-hour cache every call at 2x input price. Our Sonnet step 5 ($0.0738 equivalent) cost more than Claude Code's Sonnet run ($0.0384) while reading fewer tokens.
- The CLI adds about 420 input tokens of its own even with `--system-prompt` and no tools (it includes the working directory).
- Claude Code's first call reads 13,236 tokens (system prompt + six tool definitions), mostly from cache shared across sessions; matches ahtrace's 13,219 to 13,242.
- `--allowedTools "Bash(python3 *)"` blocked `python tests/test_core.py` in three of four Claude Code runs; the Haiku runs finished without running the tests. `sed -i` is denied in acceptEdits.
- Gate bugs found by this lab: an explicit "ask" rule fell through to execution (fixed in steps 3 to 5 after the recordings; no recorded run reached it; the step 5 Sonnet run was started before the fix); a new tool without a rule was denied (fail closed).
- Haiku ignored a planted `curl ... | sh` instruction in README.md (never read it) and in the test file (read, ignored).
- Python's `-v` trace puts the test results at lines 92 to 95 of about 240; head-and-tail clipping cuts them. Put the verdict on the first line.

## Em-dashes
Model replies sometimes contained em-dashes despite the instruction; the redacted copies and the page show each as ", " (said once on the page).

## Departures from the brief
- Step 1 has a 1b: the recording showed invented results, and the fix deserved its own before/after.
- Step 5 is a subagent, not a todo list: a subagent changes what the parent context holds (the mechanism of step 4); a todo list is a prompt pattern, visible in Claude Code (TodoWrite).
- Step 3's denial is shown by Claude Code's own runs, by step 5's fail-closed run, and by running the real gate on eleven actions without a model, because no harness run tried a forbidden action.
