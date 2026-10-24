# Concurrency page: sources and how it is built

`sh build.sh` writes `../index.html` from `parts/` (same assembler as the sibling pages: `01_head`, `10_header`, `20_read_*.html`, `3x_tab_*.html`, every `*.js` in its own script, `99_js_tabs.js` last; `{{text|url}}` links).

## Data flow
1. `run_all.sh [name ...]` runs every experiment in its own capped container (`os-conc-*`, image `kb-os-conc:1` built from `runs/Dockerfile`) and writes `runs/out/*.txt`; `redact.py` strips host paths and container hostnames.
   - `runs/c/`: `threads.c` (clone recipe, TLS, create cost), `locks.c` (seven locks, four scenarios), `pingpong.c` (wake-up cost), `peterson.c`, `condvar.c` (if / while / one condition variable), `evloop.c` (select, poll, epoll cost against N), `edge_level.c`, `uring.c` (io_uring against pread).
   - `runs/py/`: `deadlock.py` + `deadlock.sh` (py-spy and /proc on a deadlock), `mp_futex.py` (shared futex), `gil_latency.py`, `conns.py` (2,000 connections: threads against asyncio), `job_threads.sh` + `classify_threads.py` (the root's training job: /proc, py-spy, gdb, strace counts; mounts the root's `src/trace/job/`).
2. `recompute.py` explores every interleaving of `inputs/lab_programs.json` (independently of the page's JavaScript) and fits poll's per-descriptor cost; writes `inputs/recompute_out.json`.
3. `make_data.py` turns the outputs into `parts/22_js_data.js` (`window.CD`: raw outputs verbatim, every number the prose shows, chart data, lab programs and counts).
4. `check_embed.py` checks that the built page carries the outputs byte for byte, that every `<b data-k>` number in the prose equals the recorded value, and that the lab counts equal recompute's.

`inputs/source_lines.txt`: the source excerpts cited (Linux v5.10, glibc 2.36, CPython v3.11.2, libuv, mio, PyTorch v2.14.1, NCCL v2.32.3-1) with line numbers.

## Tabs and parts (rebuilt 2026-10-24 to the teaching contract)
| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read_a` (styles, nav, the idea in one screen: core sentence, hero, you need, new terms, the page in one table closed) to `20_read_h` (closed interview and OSTEP map); JS: `21_js_rd_common.js` (skill template, never autoplays), `22_js_data.js` (CD, generated), `23_js_read.js` (recorded outputs, thread picture, lock, GIL and epoll charts), `24_js_futex.js` (one lock, four designs), `25_js_il.js` (the scheduler lab, formerly the Interleaving lab tab), `26_js_vis.js` (hero, lost-update stepper, deadlock cycle, GIL against free-threaded, choosing tree), `27_js_ev.js` (five designs on one input and the scale sliders, formerly the Event loop lab tab) | sections 1 to 10 core, depth in closed blocks |
| Further reading `t-more` | `39_tab_more.html` | |

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence and a hero (every wait ends in a futex queue or the epoll ready list, with the measured costs), "You need" with the owners of processes, scheduling, language-level async, database concurrency and GPU streams, and a short list of new terms. The old "In one screen" table and the training job's thread lanes are a closed reference block.
- **Both lab tabs moved into Reading**, each beside the mechanism it explains: the Interleaving lab is now the scheduler lab inside section 4 (the lost wake-up), with a link from section 5 that opens its "if" scenario; the Event loop lab's animation and scale sliders are inside section 8. Tabs left: Reading and Further reading.
- **New visuals** for concepts this page now owns or that had none: the lost update as an interleaving (stepper, plain against atomic fetch-and-add, section 2); the deadlock wait-for cycle (static, section 6); the GIL build against the free-threaded build on the same job (before/after, section 7, totals from the Python page's measurement); a choosing tree with three cost cards (section 9, new section); the hero. The thread picture is now drawn at the measured width (it was a fixed 640 px SVG scaled down).
- **No autoplay**: `21_js_rd_common.js` is the skill template; the futex and event-loop animations no longer start on a mode switch. `check_controls.mjs` (new) clicks every control at 390 px dark and 920 px light and confirms, with normal and reduced motion, that no animation moves before the reader acts.
- **Depth into closed blocks**: TLS addresses, guard pages, clone3 and exit(); LL/SC and lock-free structures; futex hash table, shared futexes and the rest of the futex family; reader-writer locks; Lu et al.'s bug study; each runtime's loop at a pinned tag (kqueue and mio included); io_uring's memlock and capability failures; GPU-node threads; the raw outputs of the Peterson, condition-variable and io_uring runs; interview answers; the OSTEP map.
- **Deleted as fat** (ledger notes say why): drill questions whose answers now sit in the prose, the common-mistakes list (each restated a section; the two that did not, `os.cpu_count()` in a container and blocking in an event loop, moved into sections 10 and 8), headings and pointers to removed tabs.
- **Free-threaded Python** (owned here as the worked case): mechanism quoted from the CPython 3.14 free-threading how-to (internal locks in dict, list and set; biased reference counting; immortal objects; 1% to 8% single-thread overhead on pyperformance), numbers from the Python page (Python 3.14.8, 0.99 s against 0.37 s for four threads), not rerun here.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 42.3 min (9,721 words) | 34.1 min (7,837 words) |
| Reading, closed details | 2.9 min | 14.4 min |
| Other tabs, core | Interleaving lab 1.5 + Event loop lab 1.2 + Further reading 2.9 | Further reading 2.8 |
| Core total, excluding Further reading | 45.0 min | 34.1 min |
| Visuals inline in Reading (audit count) | 5 (+1 in a tab) | 11 |

Why 34 minutes is right: the page teaches ten mechanisms (threads, races and atomics, memory order, locks, the futex, condition variables and semaphores, deadlock, the GIL and its free-threaded replacement, readiness and completion I/O, the choice between them) and absorbed both lab tabs and three newly owned units (races drawn as interleavings, free-threaded Python, choosing threads, processes or async). About 1,100 of the core words are recorded outputs and script-written captions that are the evidence itself (the clone trace, the deadlock inspection, the edge-triggered run, the training job's threads, the lab's program text). What made the old page long (raw outputs, per-item tables, the futex family, runtime source lines, the GPU-node table, interview answers) is now closed and optional.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
344 units: core 209, depth 79, fat 56. 336 were drafted from the old page by `ledger.py init`; 8 were added by hand for script-rendered charts, tables, the lab counts and the event-loop animation (section "script-rendered"). Fat units carry a `note` saying why. No unit is labelled owned: nothing was handed to another page.

## Departures from the page-kind shape, and why
- **No tool tabs**: both labs explain one mechanism each, so they sit beside it in Reading (teaching contract, 2026-10-23).
- **No real images**: the page is about mechanisms (locks, queues, rings); no physical object or canonical figure would teach more than the diagrams.
- **Free-threaded numbers are quoted, not measured here**: the Python page owns the runs; this page shows the mechanism.

## Caveats
- The VM is shared with other agents' experiments: lock, ping-pong, GIL and io_uring timings are medians of 3 to 5 runs and the raw outputs show the spread. Cross-CPU wake-ups are expensive in this VM (an inter-processor interrupt through the hypervisor); the page says so.
- The lost-update stepper's values (41, 42, 43) are illustrative; the root measured the race at full speed.
- The futex animation's 3 µs time slice and 1 µs adaptive spin limit are illustrative; its other costs are measured.
- GPU-side threads (NCCL, ProcessGroupNCCL watchdog) are from source only.
