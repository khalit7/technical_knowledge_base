#!/usr/bin/env python3
"""Failure lab wrapper around the running example's train.py (unchanged).

--crash-once: the --crash-rank/--crash-step knob fires on the first attempt only. When the crashing rank
exits, it first drops a marker file in the checkpoint folder; any later attempt that sees the marker runs
without the crash knob, like a transient fault (a flaky GPU, a killed process) rather than a bug that
crashes every restart. Without --crash-once the knob fires on every attempt (a "poison" step).
Everything else is train.py's own main(): same model, data order, checkpoints and logs.
"""
import os, sys
sys.path.insert(0, os.environ.get("MI_TRAIN_DIR", "/opt/mi"))
import train as T

def strip(argv, flags):
    out, skip = [], False
    for i, x in enumerate(argv):
        if skip: skip = False; continue
        if x in flags: skip = True; continue
        if any(x.startswith(f + "=") for f in flags): continue
        out.append(x)
    return out

argv = sys.argv[1:]
once = "--crash-once" in argv
argv = [x for x in argv if x != "--crash-once"]
a = T.parse(argv)
marker = os.path.join(a.ckpt_dir, ".fl_crashed")
if once and os.path.exists(marker):
    argv = strip(argv, ("--crash-rank", "--crash-step"))
elif once:
    real_exit = os._exit
    def exit_with_marker(code):
        os.makedirs(a.ckpt_dir, exist_ok=True)
        open(marker, "w").write("crashed\n")
        real_exit(code)
    os._exit = exit_with_marker
if os.environ.get("FL_PROBE") == "1":
    # Straggler probe: time every backward pass (it contains DDP's gradient all-reduce, so a rank that
    # waits for a slow peer spends longer in it) and write per-rank totals when the process exits.
    import atexit, json, time, torch
    real_backward, times = torch.Tensor.backward, []
    def timed_backward(self, *args, **kw):
        t = time.perf_counter(); r = real_backward(self, *args, **kw); times.append(time.perf_counter() - t); return r
    torch.Tensor.backward = timed_backward
    def dump():
        rank = os.environ.get("RANK", "0"); os.makedirs(a.log_dir or ".", exist_ok=True)
        json.dump({"rank": int(rank), "n": len(times), "backward_ms": [round(x * 1000, 3) for x in times]},
                  open(os.path.join(a.log_dir or ".", f"probe_rank{rank}.json"), "w"))
    atexit.register(dump)
if os.environ.get("FL_NOREBUILD") == "1":
    # Resume-exactness test: stop DDP from rebuilding its gradient buckets after the first iteration of
    # every process (DistributedDataParallel._pre_forward calls self.reducer._rebuild_buckets() once).
    # The C++ reducer keeps working; only the Python-side call to rebuild is answered "no".
    import torch.nn.parallel as P
    class NoRebuild:
        def __init__(self, r): object.__setattr__(self, "_r", r)
        def _rebuild_buckets(self): return False
        def __getattr__(self, k): return getattr(self._r, k)
    Real = P.DistributedDataParallel
    class DDP(Real):
        def __init__(self, *a, **k):
            super().__init__(*a, **k)
            self.reducer = NoRebuild(self.reducer)
    T.nn.parallel.DistributedDataParallel = DDP
sys.argv = [sys.argv[0]] + argv
T.main()
