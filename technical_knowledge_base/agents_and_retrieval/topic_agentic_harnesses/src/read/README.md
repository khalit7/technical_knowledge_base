# Reading and Further reading tabs: notes

Owner files: `parts/20_read.html` (opens the t-read wrapper, CSS, nav, section 0), `parts/20_read_a.html` to `20_read_h.html` (sections 1 to 10, mistakes, interview questions), `parts/20_read_z.html` (footer, closes the wrapper), `parts/22_js_rd_data.js` (generated), `parts/23_js_rd_main.js`, `parts/39_tab_more.html`, and this folder.

## Pipeline
- `old/`: the old root and its five children, saved verbatim by script from the Notion fetch (read only).
- `extract_read.py`: builds `parts/22_js_rd_data.js` (window.AHREAD) from redacted recordings already in the repo: `trace/recordings/std_haiku_1` (the replay), `std_haiku_*` and `std_sonnet_*` (spread), `loop/recordings/s0_haiku` (one call), `s5_sonnet` and `cc_sonnet_fair` (harness vs Claude Code), `loop/gate_cases.json` (gate). No new model runs (0 of the 5 allowed claude invocations used).
- `check_read.py`: regenerates the data and proves the page embeds it; checks every hand-written measured number in the Reading parts against the recordings; scans for em-dashes and private strings.
- `coverage.md`: every old claim marked verified, corrected, unconfirmed or moved.
- `viz_ideas.md`: visuals built and rejected.

## Departures from the brief
- No recordings of its own: the Loop and Trace labs' recordings already cover the running example, and the budget override asked to build from them.
- Section 6 (products) is five questions rather than a list of products, because no product fact on the old pages was verified here; the Harness atlas owns dated product facts.

## Close-out of 2026-10-24: the root rebuilt as a map
The root had never been rebuilt to the teaching contract (audit 2026-10-23: Reading 29 min core plus 3 closed; other tabs 126 min). Its children were rebuilt first; this pass made the root the map and moved every unit a child now owns.

**Reading.** Top: the core idea in one sentence, a hero figure drawn at the measured width (`23_js_rd_main.js`: one turn of an agent in seven steps, the model's step dashed, each step labelled with this page's section and its owner child; a snake at 920 px, a column at 390 px), the running example, new terms, and the comparison table (part, decision, where the harnesses differ, owner page). Sections 1 The loop (with the one-call against the loop replay, which spans the topic), 2 Tools, 3 Context, 4 Control, 5 Safety, 6 Products (the five questions), 7 Measuring and training (old sections 7, 8 and 9 merged into one map section), 8 Child pages (titles, one line each, times exactly as each header states), Depth (interview rehearsal, closed).
**Retired** (each unit labelled `owned:<child>` in `src/ledger.json` with a key found on that child, or kept here): the clickable harness map (replaced by the hero), the permission-gate stepper and the trifecta checkboxes (Agent security sections 4 and 1 carry both), the tool-design cards and levers grid (Building a harness 5 to 7, Context engineering 2 to 9), the "Build your own" defaults table (Building a harness, its one-screen table), the Common mistakes (each restated a section: fat), the predict drill (folded into the replay paragraph).
**Labs.** Loop lab kept whole (the from-zero build; Building a harness and Agent security build on it). Trace and context lab: Context lab 4 (a toy compaction animation) retired, because Context engineering section 4 records real compactions; its documentation facts (five recently modified files re-read, 967K threshold) moved to Claude Code section 9; the multiple-choice drills removed (no quizzes), their numbers written into the Context lab 1 and 2 captions; interview questions in one closed block. Harness atlas: "A tiny experiment that failed" moved to Building a harness section 2 (closed block, call by call); "Harnesses for training" and "Self-improving harnesses" moved to Harnesses for training (closed blocks in its sections 2, 6, 7 and 8: the published SWE environments table, LEGO-RL, Polar and Composer 2, Kimi-Dev and Terminal-Universe, each paper in one line); drills removed; interview questions closed. The atlas data file is unchanged (its checks still verify the moved numbers against the paper pages).
**Never autoplay.** `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `ah-tab`); the Loop lab and Trace lab controllers no longer start on first view; the replay's mode toggle no longer plays. Checked: every scrubber stays at its minimum after scrolling every tab at 390 and 920 px.

| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 wpm) | 29 min | 21 min |
| Reading, closed | 3 min | 3 min |
| Loop lab | 26 + 24 closed | 26 + 24 closed (unchanged) |
| Trace and context lab | 23 + 4 | 21 + 4 |
| Harness atlas | 43 + 2 | 30 + 2 |

Why 21 minutes: the Reading tab now only maps, compares and defines; about a quarter of its words are the replay's own transcript (the visual of section 1) and the comparison table. Every mechanism is one sentence and a link to the child that owns it.

**Ledger** (`src/ledger.json`, 714 units drafted by `ledger.py init` from the pre-close page): core 448, depth 116, owned 76 (Building a harness, Context engineering, Claude Code, Agent security, Harnesses for training), fat 74 (navigation, headings, widget instructions, question stems, the mistakes list, old card text replaced by the new cards); `ledger.py check` problems 0.
