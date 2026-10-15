"""Buffer assignment and layouts, read from XLA's own dump of the train step (made by passes_diff.py dump step).

1. Memory over the step: XLA writes the schedule (InstructionSequence) and every buffer's live range
   (start-end positions) in *-live-range.txt; with the value sizes from *-buffer-assignment.txt this gives the
   bytes live at every point of the schedule. Checked against the peak XLA reports itself.
2. Who holds the peak: XLA's "Stack trace breakdown for peak usage" (bytes per JAX op_name at the peak).
3. Allocations: how many, of which kind (parameter, output, thread-local, constant, temp), and the largest.
4. Layouts: three small functions whose optimised HLO shows layout assignment and transpose folding.
Output: lab/out/buffers.json
"""
import collections
import glob
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xp_common as X  # noqa: E402

C = X.C
D = os.path.join(C.scratch(), "xp", "dump_step")
stem = sorted(glob.glob(os.path.join(D, "module_*.jit_train_step.cpu_after_optimizations-live-range.txt")))[0]
base = stem.replace("-live-range.txt", "")
lr = open(base + "-live-range.txt").read()
ba = open(base + "-buffer-assignment.txt").read()
opt = open(base + ".txt").read()

# ---------------------------------------------------------------- schedule and live ranges
seq_txt = lr.split("InstructionSequence:")[1].split("BufferLiveRange:")[0]
seq = [l.split(":", 1)[1].strip() for l in seq_txt.strip().splitlines()]
max_pos = int(re.search(r"HloLiveRange \(max (\d+)\)", lr).group(1))
ranges = {}
for l in lr.split("BufferLiveRange:")[1].split("Live ranges at")[0].strip().splitlines():
    m = re.match(r"\s*(\S+?)\{([\d,]*)\}:(\d+)-(\d+)", l)
    if m:
        ranges[(m.group(1), m.group(2))] = (int(m.group(3)), int(m.group(4)))
sizes = {}
alloc_kind = {}
allocs = []
cur = None
for l in ba.splitlines():
    m = re.match(r"allocation (\d+): size (\d+), (.*)$", l)
    if m:
        kinds = []
        rest = m.group(3)
        for k in ("parameter", "maybe-live-out", "thread-local", "constant", "preallocated-temp", "output"):
            if k in rest:
                kinds.append(k)
        cur = {"i": int(m.group(1)), "size": int(m.group(2)), "kinds": kinds, "values": 0}
        allocs.append(cur)
        continue
    m = re.match(r"\s*value: <\d+ (\S+) @([\d,]*)> \(size=(\d+),offset=(\d+)\)", l)
    if m and cur is not None:
        sizes[m.group(1)] = max(sizes.get(m.group(1), 0), int(m.group(3)))
        cur["values"] += 1
        alloc_kind[(m.group(1), m.group(2))] = cur["kinds"]
live = [0] * (max_pos + 2)
matched = 0
for key, (a, b) in ranges.items():
    s = sizes.get(key[0]) if key[1] == "" else None
    if s is None:
        continue
    matched += 1
    for t in range(a, b + 1):
        live[t] += s
peak_pos = max(range(len(live)), key=lambda t: live[t])
xla_peak_pos = int(re.search(r"Live ranges at (\d+) \(peak\)", lr).group(1))
xla_peak = int(re.search(r"Stack trace breakdown for peak usage: ([\d ]+) bytes", lr).group(1).replace(" ", ""))
print("values with ranges", len(ranges), "matched sizes", matched, "peak", peak_pos, live[peak_pos], "xla", xla_peak_pos, xla_peak)

# phase of each schedule position, from the op_name of that instruction in the optimised HLO
opn = {}
for m in re.finditer(r"^\s*(?:ROOT\s+)?%?([\w.\-]+) = .*?op_name=\"([^\"]*)\"", opt, re.M):
    opn[m.group(1)] = m.group(2)


def phase(name):
    o = opn.get(name, "")
    if name.startswith("params") or name.startswith("opt_state") or name in ("x", "y") or name.startswith("x.") or name.startswith("y."):
        return "input"
    if "transpose(" in o:
        return "backward"
    if "jvp(" in o:
        return "forward"
    return "optimiser" if o else "other"


phases = [phase(n) for n in seq]
STEP = 4
timeline = [max(live[t:t + STEP]) for t in range(0, max_pos + 1, STEP)]
# phase per bucket of STEP positions: the majority among instructions that do work there
bucket_phase = []
for t in range(0, max_pos + 1, STEP):
    c = collections.Counter(p for p in phases[t:t + STEP] if p not in ("other",))
    bucket_phase.append(c.most_common(1)[0][0] if c else (bucket_phase[-1] if bucket_phase else "input"))
bands = []
for i, p in enumerate(bucket_phase):
    if bands and bands[-1][2] == p:
        bands[-1][1] = i
    else:
        bands.append([i, i, p])
# merge runs shorter than 3 buckets into their predecessor
merged = []
for b in bands:
    if merged and (b[1] - b[0] < 2 or merged[-1][2] == b[2]):
        merged[-1][1] = b[1]
    else:
        merged.append(b)
bands = merged

# ---------------------------------------------------------------- the peak, as XLA attributes it
brk = lr.split("Stack trace breakdown for peak usage:")[1]
peak_rows = []
for m in re.finditer(r"├── (.+?) \(([\d.]+)%, total: ([\d ]+) bytes", brk):
    peak_rows.append({"op_name": X.scrub(m.group(1))[:120], "pct": float(m.group(2)), "bytes": int(m.group(3).replace(" ", ""))})
    if len(peak_rows) >= 14:
        break
peak_live = []
sec = lr.split("Live ranges at")[1].split("Stack trace breakdown")[0]
for m in re.finditer(r"^\s+(\S+?)\{[\d,]*\}: (\d+) bytes", sec, re.M):
    peak_live.append((m.group(1), int(m.group(2))))
peak_live_by_size = collections.Counter()
for n, b in peak_live:
    peak_live_by_size[b] += 1

# ---------------------------------------------------------------- allocations
kinds = collections.Counter()
kbytes = collections.Counter()
for a in allocs:
    k = "+".join(a["kinds"]) or "temp"
    kinds[k] += 1
    kbytes[k] += a["size"]
report = open(base + "-memory-usage-report.txt").read()
total_line = re.search(r"Total bytes: (\d+)", report).group(1)

# ---------------------------------------------------------------- layouts
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402

LAY = [
    ("transpose_alone", "def f(x):\n    return x.T + 1.0"),
    ("transpose_into_dot", "def f(x, w):\n    return x.T @ w"),
    ("reshape_free", "def f(x):\n    return x.reshape(32, 128, 4, 32) * 2.0"),
]
lay = []
for key, code in LAY:
    ns = {"jnp": jnp}
    exec(code, ns)
    if key == "transpose_into_dot":
        args = (jnp.ones((128, 64)), jnp.ones((128, 256)))
    elif key == "reshape_free":
        args = (jnp.ones((32, 128, 128)),)
    else:
        args = (jnp.ones((256, 512)),)
    txt = jax.jit(ns["f"]).lower(*args).compile().as_text()
    body = X.hlo_no_tables(txt)
    entry = body.split("ENTRY", 1)[1]
    lines = [X.strip_meta(l.strip()) for l in entry.splitlines()[1:] if l.strip() and l.strip() != "}"]
    fused = [X.strip_meta(l.strip()) for l in body.split("ENTRY")[0].splitlines()
             if re.search(r"\b(transpose|copy|bitcast|dot)\(", l)]
    lay.append({"key": key, "code": code, "entry": [X.scrub(l)[:220] for l in lines][:8],
                "inside_fusions": [X.scrub(l)[:200] for l in fused][:6]})
    print(key, lines[:4])

X.save("buffers.json", {
    "versions": X.versions(), "module": "jit_train_step (donated), dump of passes_diff.py",
    "schedule_len": max_pos + 1, "values_with_ranges": len(ranges), "values_matched": matched,
    "timeline_step": STEP, "timeline": timeline, "bands": bands,
    "peak": {"pos": peak_pos, "bytes": live[peak_pos], "xla_pos": xla_peak_pos, "xla_bytes": xla_peak,
             "rows": peak_rows, "n_live": len(peak_live),
             "live_sizes": sorted(peak_live_by_size.items(), key=lambda kv: -kv[0])[:8]},
    "allocations": {"count": len(allocs), "by_kind": dict(kinds.most_common()), "bytes_by_kind": dict(kbytes),
                    "total_bytes_report": int(total_line),
                    "largest": sorted([a["size"] for a in allocs], reverse=True)[:10],
                    "max_values_sharing": max(a["values"] for a in allocs)},
    "layouts": lay,
})
