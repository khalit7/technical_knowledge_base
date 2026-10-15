"""Shared helpers for the scripts of the child page "XLA and compilation" (prefix xp).

Reuses the root Compiler lab's helpers (src/xla/xc_common.py: scrub(), setup_state(), versions(); src/xla/hlo_tools.py)
so that the same model, the same initial state and the same counting rules give the same numbers.

Run every script with the shared venv, CPU only, low priority:
    export JX_SCRATCH=<the shared jax-and-tpu setup folder>
    JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B <script>.py
Small results go to lab/out/*.json (committed); big dumps stay in $JX_SCRATCH/xp/.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src"))
sys.path.insert(0, os.path.join(ROOT_SRC, "xla"))
sys.path.insert(0, os.path.join(ROOT_SRC, "data"))
OUT = os.path.join(HERE, "out")

import common as C  # noqa: E402
import xc_common as XC  # noqa: E402
import hlo_tools as HT  # noqa: E402

scrub = XC.scrub
setup_state = XC.setup_state
versions = XC.versions


def big(*parts):
    """A path under $JX_SCRATCH/xp for big intermediates (never committed)."""
    p = os.path.join(C.scratch(), "xp", *parts)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


def save(name, obj):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(obj, f, indent=1, sort_keys=False)
    print("wrote lab/out/" + name)


def src_path(*parts):
    """A file in the pinned source clones ($JX_SCRATCH/src/...)."""
    return os.path.join(C.scratch(), "src", *parts)


def locate(path, pattern, rel, url_base=None, ctx=0, nth=0):
    """Find the nth line matching regex `pattern` in a pinned source file. Returns {file, line, quote, url}.
    Line numbers are located by pattern, never typed by hand."""
    with open(path, encoding="utf-8") as f:
        lines = f.read().splitlines()
    rx = re.compile(pattern)
    hits = [i for i, l in enumerate(lines) if rx.search(l)]
    if len(hits) <= nth:
        raise ValueError("pattern not found: %r in %s" % (pattern, rel))
    i = hits[nth]
    quote = "\n".join(lines[i:i + 1 + ctx])
    out = {"file": rel, "line": i + 1, "quote": quote}
    if url_base:
        out["url"] = url_base + rel + "#L" + str(i + 1)
    return out


JAX_URL = "https://github.com/jax-ml/jax/blob/jax-v0.11.2/"
XLA_REV = "91888df6ce85102c30220e41d952065925e10886"
XLA_URL = "https://github.com/openxla/xla/blob/" + XLA_REV + "/"


def xla_file(rel):
    """Local copy of an XLA file fetched at the pinned commit (src/xla_files, '/' replaced by '_';
    cpu_compiler.cc and gpu_compiler.cc were saved under their bare names)."""
    base = os.path.join(C.scratch(), "src", "xla_files")
    flat = os.path.join(base, rel.replace("/", "_"))
    if os.path.exists(flat):
        return flat
    return os.path.join(base, os.path.basename(rel))


def xla_locate(rel, pattern, ctx=0, nth=0):
    return locate(xla_file(rel), pattern, rel, XLA_URL, ctx, nth)


def jax_locate(rel, pattern, ctx=0, nth=0):
    return locate(src_path("jax", rel), pattern, rel, JAX_URL, ctx, nth)


def load1():
    return round(os.getloadavg()[0], 2)


def strip_meta(line):
    """HLO line without metadata={...}, frontend_attributes and backend_config (for diffs)."""
    line = re.sub(r",?\s*metadata=\{[^{}]*\}", "", line)
    line = re.sub(r",?\s*frontend_attributes=\{[^{}]*\}", "", line)
    line = re.sub(r",?\s*backend_config=(\{.*\}|\"[^\"]*\")$", "", line)
    line = re.sub(r",?\s*origin=\{[^{}]*\}", "", line)
    return line.rstrip()


def hlo_no_tables(txt):
    """HLO module text without the FileNames / FunctionNames / FileLocations / StackFrames tables
    (they hold absolute paths and are not part of the program)."""
    out, skip = [], False
    for l in txt.splitlines():
        if l.strip() in ("FileNames", "FunctionNames", "FileLocations", "StackFrames"):
            skip = True
            continue
        if skip:
            if not l.strip():
                skip = False
            continue
        out.append(l)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip() + "\n"
