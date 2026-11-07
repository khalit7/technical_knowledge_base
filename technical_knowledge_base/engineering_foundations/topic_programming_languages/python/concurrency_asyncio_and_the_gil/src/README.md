# Source of "Python: concurrency, asyncio and the GIL"

Child page 2 of Python: the essentials (page prefix `cg`, storage key `cg-tab`), section 1 child 2 of the language split plan. Built 2026-10-26 by splitting the language page; no new measurements were run.

## Build
`sh build.sh` writes `../index.html` from `parts/` (the skill template build: single-level tabs, Reading `t-read`, Further reading `t-more`).
Generated parts, never edited by hand:
- `pa/gen.py` expands `pa/tpl/` into `parts/20_read_b.html` (section 1), `parts/20_read_c.html` (section 2) and `parts/22_js_cg_0pa.js` (`window.PA`: the GIL timings, the a2 trace, the fan-out timings), inlining the real code and recorded outputs (`[[run:]]`, `[[code:]]`, `[[out:]]`, `[[predict:]]`, and `[[drill:TITLE]]`, added here for the recorded drills).
- `pb/build_data.py` writes `parts/22_js_cg_0pb.js` (`window.PB`: free-threading, subinterpreters, the C-extension, sys.path, NumPy and orjson transcripts, the wheel survey) from `pb/out/`.
Hand-written parts: `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` (skill templates; storage key `cg-tab`), `10_header.html`, `20_read_a.html` (styles, nav, the idea in one screen), `20_read_d.html` (free-threading), `20_read_e.html` (subinterpreters), `20_read_f.html` (choosing), `20_read_z.html`, `23_js_cg_util.js` (transcripts, prediction prompts, bars), `24_js_cg_hero.js`, `25_js_cg_s12.js`, `26_js_cg_loop.js` (the event-loop stepper), `27_js_cg_ft.js` (sections 3 and 4), `39_tab_more.html`.
Order after a rerun: `sh pa/run_all.sh`, `sh pb/run_all.sh` (it ends with the build and `check_embed.py`), `python3 pa/check_numbers.py`, `python3 pa/gen.py`, `sh build.sh`, `node check_controls.mjs`.

## Provenance (copied with `cp -R` from the language page's `src/`, which was left unchanged)
| Here | From the language page | What |
|---|---|---|
| `pa/code`, `pa/outputs` | `src/pa/` | `k1_gil`, `a1` to `a6`, `q_drills` (trimmed to the two asyncio drills); everything else removed from the copy |
| `pa/gen.py`, `pa/run_all.sh`, `pa/check_numbers.py` | `src/pa/` | trimmed to this page; class names now carry the `cg-` prefix |
| `pa/tpl/20_read_b.html`, `20_read_c.html` | `src/pa/tpl/30_tab_pa_read_h.html` and `31_tab_pa_loop.html` | Part 1 sections 9 and 10 and the Event loop tab, rewritten to the teaching contract |
| `pb/ft`, `pb/interp`, `pb/pack`, `pb/out`, `pb/env.sh` | `src/pb/` | free-threading, subinterpreter and wheel-survey runs; the JIT, lazy-import, types, uv, ruff, pytest and versions material went to the siblings |
| `pb/build_data.py`, `pb/run_all.sh`, `pb/check_embed.py` | `src/pb/` | trimmed; `run_all.sh` walks up to `topic_programming_languages` for the root's shared data generator (`src/rosetta/data/gen_chat.py`, read-only) |
| `parts/20_read_d.html`, `20_read_e.html`, `27_js_cg_ft.js` | `40_tab_pb_read_g.html` (sections 9 and 11), `42_js_pb_read_d.js`, `42_tab_pb_lab.html` and `44_js_pb_lab.js` (Runtime lab parts 1, 2, 4 and 5) | |
| `parts/26_js_cg_loop.js`, `23_js_cg_util.js` | `36_js_pa_loop.js`, `41_js_pb_util.js` | |
`pa/coverage.json` and `pb/coverage.json` are the old-Notion-page checks, trimmed to the claims about threads, the GIL, processes, free-threading and asyncio. `a2_trace.py`'s docstring now names the stepper on this page instead of the old Event loop tab (the output is unchanged).

## Departures from the topic-child shape, and why
- **No lab tabs.** The Event loop tab explained one mechanism, so its stepper sits inline in section 2. The Runtime lab's parts 1, 2, 4 and 5 were tables of every run: each now sits in a closed block beside the claim it backs (scaling chart and table, the lost-update table inside the race prediction's answer, the subinterpreter runs, the wheel survey). Part 3 (the JIT) went to the internals sibling.
- **Predictions inline.** The two asyncio "Predict the output" drills: "gather keeps argument order" is a reveal box in section 2; "Coroutine never awaited" is covered by the `a1_coro` reveal, which shows the same lesson plus the RuntimeWarning. Three choice prompts were added (four threads on CPU work, when A resumes in the blocked loop, lost updates under the GIL).
- **Code in closed blocks.** Each script's real output or a chart from it stays in the core; the scripts themselves (k1, a2, a3, a4, a5) are closed blocks.
- **Mutation on mode switch removed.** The stepper and the thread lanes reset to step 1 on a mode switch instead of playing (the language page played them); nothing moves before the reader acts.

## Length judgement
| | Language page (2026-10-26, these sections) | This page |
|---|---|---|
| Core reading (230 words a minute, `html_utils/audit_pages.mjs`) | about 26 min of Part 1 s9 to s10 and Part 2 s9 and s11, plus the Event loop tab and the Runtime lab's text, with the full code inline | 17.4 min |
| Closed details | none | 10.1 min (mostly the five scripts and the run tables) |
The plan estimated 14 min. The extra three are the subjects the plan assigned here that cannot be cut without losing a measured result: free-threading (lanes, scaling, races, extension opt-in, costs) and subinterpreters (start-up, the sys.path mistake, NumPy's refusal) are each new ground for an ML engineer who knows Python well, so their core stays; on familiar ground (what a thread is, concurrency against parallelism) the page links the OS Concurrency page instead of teaching it.

## Ledger
`ledger.json`: 153 units of this page (core 130, depth 21, fat 2), `ledger.py check` problems 0. `from_master.json`: 125 units of the language page's master ledger covered here (120 owned by this page, 1 owned by `topic_operating_systems/concurrency` (concurrency against parallelism), 4 fat: the "one cook" line, two Event-loop-tab pointers and the Runtime lab's intro).

## Checks
`sh html_utils/checkpage.sh <page>`: fail=0, emdash 0, errbox 1, clipped 0. `node src/check_controls.mjs`: every button, mode, step, range, select and closed block at 390 dark and 920 light, plus reduced motion (nothing moves): clean. `python3 src/pb/check_embed.py`: ALL OK. `python3 src/pa/check_numbers.py`: no stale numbers.

## 2026-11-07: split layout and 3D stages (the 2026-11-06 rollout)
- **Templates**: `02_split.html`, `21_js_rd_common.js`, `25_js_s3.js` (renderer v2) and `99_js_tabs.js` (key `cg-tab`) copied unchanged from the skill; `build.sh` cats `02_split.html` after `01_head.html`; the eased-step CSS (`rd-fwd`) added to the Reading part's style. The splits of sections 1 and 2 are written in `pa/tpl/` (the generated parts are never edited).
- **Two 3D stages**, each with an `ol.sx` step list on the left:
  `30_js_sc_hero.js`, Fig. 1 (the hero, 6 steps): four CPU cores on the floor with a thread on each, the interpreter as a glass plate above them and the GIL as a gold token; the token hops between threads (GIL build), is free while the threads wait on the OS slab (I/O), becomes one per plate for four processes (pickles flowing from the main process) and four subinterpreters (one process outline), disappears on the free-threaded build, and the last step is asyncio's one thread with tasks suspended at await. Labels carry `PA.k1` and `PB.interp` numbers. Replaces the 2D hero of illustrative schedules (`24_js_cg_hero.js`, removed).
  `31_js_sc_loop.js`, Fig. 3 (section 2): an event loop replaying `a2_trace.py`'s recorded events (`PA.loop`) in four modes: ready queue, the one thread, the loop's timers, a worker thread and a done tray, with the loop clock as a ruler at the front (0 to 620 ms in every mode). Each mode's 11 or 12 events are grouped into 5 or 6 explained stretches (`data-e` on each list item is the stretch's last event); tasks glide between places on flowing dots. Replaces the 2D stepper (`26_js_cg_loop.js`, removed) and its caption, counters, legend and the "1 against 2" bullets, whose content is now in the step lists.
- **Fig. 5 (free-threading lanes) stays 2D** (a timeline on a time axis), now `RD.anim` with 4 explained steps, one per interpreter, instead of 22 frames per build behind a toggle: a forward step grows that build's recorded lanes over about 1.8 s; earlier builds' finish times stay marked. Caption and counters removed (the step list carries them).
- **Kept 2D, in splits**: GIL bars (Fig. 2, s1), fan-out bars (Fig. 4), scaling bars (Fig. 6) and the subinterpreter bars and start-up table (Fig. 7): all are numbers on one axis. **Full width**: the predictions with code, never-block box and debug output, cancellation, async generators, the lost-update prediction (the race itself is drawn on OS Concurrency section 2, now linked), extension and orjson transcripts, costs, sys.path mistake, Choosing.
- **Checks**: `check_stages.mjs` (new): both stages and the lanes play when scrolled into view at 1400 light, 920 light and 390 dark, stop redrawing off screen, reach their last step in every mode with one list item per step, never move under reduced motion; the step-list numbers are checked against `PA` and `PB` (each loop stretch's last-event time and the totals, A's 102 ms lateness, the hero's k1 and start-up numbers, each lane step's finish, one-thread median, speed-up and per-block slowdown). `check_controls.mjs`: its never-autoplay block removed (check_stages covers motion); it now also clicks the loop's mode chips.
- **Ledger**: 158 units (core 131, depth 21, fat 6), problems 0. Keys changed: 4 (now "Reading:"), 8, 9, 49, 50, 55, 56, 57, 59, 66, 86, 93 (sentences moved into step lists or reworded), and 147 to 153 (outside-source times: keyed on the source names, never the minutes). Units 51 to 54 (the removed stepper's legend) are now fat. Units 154 to 158 added for facts the step lists now state.
- **Length**: Reading core 17.4 to 20.9 min (4,006 to 4,797 words), closed 10.1 min unchanged, Further reading 1.8 unchanged. 316 of the added words are the step lists of loop modes 2 to 4, hidden behind chips, so one pass through what is open is about 19.5 min; the rest is the hero's six steps and the step lists that replaced script-written captions (which the audit could not count). Nothing knowledge-bearing was cut.
