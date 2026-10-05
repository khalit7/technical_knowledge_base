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

## Shape
Follows Part B of `html_utils/methods/topic_pages.md` (child page). Sections follow OSTEP ch. 26 to 33, each with problem, mechanism, measured cost, where it bites in ML work, the command that shows it, and the fix. The futex section carries the before/after animation (one contended lock through spin, kernel-on-every-unlock, futex and adaptive designs, to scale with measured costs). The two labs are tabs because each needs room: the Interleaving lab is a scheduler you drive, the Event loop lab an animation plus a calculator.

## Caveats
- The VM is shared with other agents' experiments: lock, ping-pong, GIL and io_uring timings are medians of 3 to 5 runs and the raw outputs show the spread. Cross-CPU wake-ups are expensive in this VM (an inter-processor interrupt through the hypervisor); the page says so.
- The futex animation's 3 µs time slice and 1 µs adaptive spin limit are illustrative; its other costs are measured.
- GPU-side threads (NCCL, ProcessGroupNCCL watchdog) are from source only.
