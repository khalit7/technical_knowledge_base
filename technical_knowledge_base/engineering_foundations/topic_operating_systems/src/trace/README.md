# Syscall tracer tab (t-trace): sources and how to rebuild

- `JOB.md`: the running example every tab uses (job code in `job/`).
- `lab/Dockerfile`: the shared image `kb-os-lab:1`; `Dockerfile.tr`: this tab's `kb-os-tr:1` (adds Rust and Node).
- `run_all.sh`: re-records everything into `raw/` (untraced timings first, alone), redacts (`scripts/redact.py`), and rebuilds `data/trace_data.json` and `../parts/32_js_tr_0data.js` (`scripts/parse.py`, `scripts/parse_jobs.py`, `scripts/strace_parse.py`).
- `scripts/check_embed.py`: the page embeds exactly what `parse.py` builds from `raw/`; every system call in the embedded events has a dictionary entry; no home paths, tokens or private patterns.
- `scripts/check_ui.mjs`: clicks every control at 390 dark and 920 light (run from the repo root).
- Page parts: `32_tab_trace.html`, `32_js_tr_0data.js` (generated), `32_js_tr_1dict.js` (system call dictionary), `32_js_tr_2core.js`, `32_js_tr_3x.js`, `32_js_tr_4anim.js`, `32_js_tr_5more.js`.

Notes. `train.py` now labels its first-batch line with the start method actually used ("fork (default)" when workers run and none is named); earlier recordings elsewhere (the processes page's shutdown runs) show the old label "none (no workers)" for that case, although their workers used fork. The lane label "main threads (N thread IDs over the run)" counts every thread seen during a run, not threads alive at once. The three traced job runs were recorded before `train.py` gained `--preload`, `--second-iter` and the earlier start of the first-batch clock; those changes are inactive by default or do not make system calls, so the traces are unaffected. The language stacks were re-recorded later with deeper backtraces (`bt 40`). Raw traces over 1 MB are gzipped.
