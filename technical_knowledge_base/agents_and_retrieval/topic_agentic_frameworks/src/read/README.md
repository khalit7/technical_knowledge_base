# Reading and Further reading tabs: notes

Owner files: `parts/20_read.html` (opens the t-read wrapper, CSS, nav, section 0), `parts/20_read_a.html` (s1), `20_read_b.html` (s2), `20_read_c.html` (s3 to s5), `20_read_d.html` (s6 to s9), `20_read_e.html` (s10, s11, mistakes, interview, footer), `parts/20_read_z.html` (closes the wrapper), `parts/22_js_afread_data.js` (generated), `parts/23_js_afread_a.js`, `parts/23_js_afread_b.js`, `parts/39_tab_more.html`, and this folder.

## Pipeline
- `old/`: the old root and its four children, saved verbatim by script from the Notion fetch (read only).
- `recordings/`: two `claude -p` runs on 6 Oct 2026 (Claude Code 2.1.289, Haiku 4.5, built-in tools off), the structured-output before/after: `A_prompt_json.jsonl` (JSON asked for in the prompt) and `B_json_schema.jsonl` (`--json-schema`), plus the exact prompts and schema. Redacted by `redact.py` (raw copies stay in the scratchpad); 0 em-dashes needed replacing. 2 of the 3 allowed claude invocations used.
- `extract_read.py`: builds `parts/22_js_afread_data.js` (window.AFREAD) from `recordings/` and `../orch/recordings/` (pattern summaries, the chain and agent step lists, the single and multi-agent runs, the LangGraph event log).
- `check_read.py`: regenerates the data and proves the page embeds it; checks the recordings, the hand-typed measured numbers (including the Same agent tab's first-request counts from `../same/data/first_tokens.json`), em-dashes and private strings.
- `coverage.md`: every old claim marked verified, corrected, unconfirmed or moved.
- `viz_ideas.md`: visuals built and rejected.

## Departures from the brief
- Section numbering follows the brief (0 to 11). Only two new recordings: everything else reuses the Orchestration lab's and the Same agent tab's, as the budget override asked.
- Section 9 (hosted runtimes) and parts of 6 to 8 are from docs only; the Production stack tab owns the runs.
