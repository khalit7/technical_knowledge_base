"""Shared helpers for the Sharding lab (Topic: jax-and-tpu). Imported by the sh_*.py scripts.

Run every script with 8 simulated CPU devices:
    XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 \
        $JX_SCRATCH/venv/bin/python -I -B sh_strategies.py
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), "data")
OUT = os.path.join(HERE, "out")
sys.path.insert(0, DATA)

DT_BYTES = {"f32": 4, "s32": 4, "u32": 4, "bf16": 2, "f16": 2, "pred": 1, "s8": 1, "u8": 1, "f64": 8, "s64": 8}
COLL = ("all-reduce", "all-gather", "reduce-scatter", "all-to-all", "collective-permute")
_LINE = re.compile(r"^\s*(?:ROOT\s+)?%(\S+)\s*=\s*(.+?)\s+(all-reduce|all-gather|reduce-scatter|all-to-all|collective-permute)(-start)?\((.*)$")
_SHAPE = re.compile(r"\b(f32|s32|u32|bf16|f16|pred|s8|u8|f64|s64)\[([\d,]*)\]")


def shape_bytes(type_str):
    """Total bytes and shapes of an HLO type string, e.g. '(f32[128,512]{1,0}, f32[512]{0})'."""
    tot, shapes = 0, []
    for dt, dims in _SHAPE.findall(type_str):
        n = 1
        for d in dims.split(","):
            if d:
                n *= int(d)
        tot += n * DT_BYTES[dt]
        shapes.append(f"{dt}[{dims}]")
    return tot, shapes


def group_size(rest, n_dev):
    """Number of devices in each replica group of a collective (from its replica_groups attribute)."""
    m = re.search(r"replica_groups=mesh\[([^\]]*)\]\s*\{([^}]*)\}", rest)
    if m:                                     # Shardy's mesh form: replica_groups=mesh['data'=2,'model'=4] {'model'}
        sizes = dict((a.strip("'"), int(b)) for a, b in re.findall(r"('[^']+')=(\d+)", m.group(1)))
        axes = re.findall(r"'([^']+)'", m.group(2))
        g = 1
        for a in axes:
            g *= sizes[a]
        return g
    m = re.search(r"replica_groups=\[(\d+),(\d+)\]<=", rest)
    if m:
        return int(m.group(2))
    m = re.search(r"replica_groups=\{\{([\d,]+)\}", rest)
    if m:
        return len(m.group(1).split(","))
    m = re.search(r"replica_groups=\{\}", rest)
    if m:
        return n_dev
    return None


def phase(op_name):
    """Forward, backward or other, from XLA's op_name metadata (a heuristic: transpose(...) is the backward pass)."""
    if "transpose(" in op_name:
        return "backward"
    if "jvp(" in op_name:
        return "forward"
    return "other"


def collectives(hlo_text, n_dev):
    """Every collective instruction in an optimised HLO module: kind, result bytes, shapes, group size, phase.
    'bytes' is the size of the result per device (all-gather: the gathered array; reduce-scatter: the
    scattered slice; all-reduce: the reduced array). 'logical' is the full array the collective works on
    (all-gather output, reduce-scatter input, all-reduce operand)."""
    out = []
    for line in hlo_text.splitlines():
        m = _LINE.match(line)
        if not m:
            continue
        name, typ, kind, start, rest = m.groups()
        b, shapes = shape_bytes(typ)
        g = group_size(rest, n_dev)
        op = re.search(r'op_name="([^"]*)"', rest)
        op = op.group(1) if op else ""
        logical = b * g if (kind == "reduce-scatter" and g) else b
        dims = re.search(r"dimensions=\{([\d,]*)\}", rest)
        out.append({"name": name, "kind": kind, "bytes": b, "logical": logical, "shapes": shapes, "group": g,
                    "dims": dims.group(1) if dims else None, "phase": phase(op), "op_name": op[:160]})
    return out


def ring_bytes(kind, logical, g):
    """Bytes each device sends on a ring of g devices for one collective over an array of `logical` bytes:
    all-gather and reduce-scatter (g-1)/g * N, all-reduce 2(g-1)/g * N (reduce-scatter then all-gather),
    all-to-all (g-1)/g * N (each device keeps 1/g of its own block and sends the rest),
    collective-permute N (each device sends its whole buffer to one neighbour)."""
    if kind == "collective-permute":
        return logical
    if not g or g == 1:
        return 0
    if kind == "all-reduce":
        return 2 * (g - 1) * logical / g
    if kind in ("all-gather", "reduce-scatter", "all-to-all"):
        return (g - 1) * logical / g
    return logical


def summarise(colls):
    s = {}
    for c in colls:
        k = s.setdefault(c["kind"], {"count": 0, "bytes": 0, "ring_bytes": 0})
        k["count"] += 1
        k["bytes"] += c["logical"]
        k["ring_bytes"] += ring_bytes(c["kind"], c["logical"], c["group"])
    return s


def scrub(text):
    """Drop absolute paths (source_file=... in HLO metadata, file paths in messages)."""
    text = re.sub(r'source_file="[^"]*"', 'source_file="<scrubbed>"', text)
    text = re.sub(r"/(?:Users|private|home|tmp|var)/[^\s\"':]+", "<path>", text)
    return text


def mem(c):
    m = c.memory_analysis()
    return {k: int(getattr(m, k)) for k in ("argument_size_in_bytes", "output_size_in_bytes", "alias_size_in_bytes",
                                             "temp_size_in_bytes", "generated_code_size_in_bytes")}


def dump(name, obj):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(obj, f, indent=1, sort_keys=False)
        f.write("\n")
