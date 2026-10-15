"""Shared helpers for the Transforms lab scripts (src/xf/). Imports the running example from ../data.

Run every script with the shared venv, CPU only, low priority:
    JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B <script>.py
Outputs go to out/<name>.json (small, committed). Paths in captured messages are scrubbed.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), "data")
sys.path.insert(0, DATA)
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

import numpy as np  # noqa: E402

import common as C  # noqa: E402,F401


def scrub(s):
    """Strip absolute paths (home, scratchpad, venv) from captured text so nothing private is embedded."""
    s = str(s)
    s = re.sub(r"/(?:Users|private|tmp|home)/[^\s'\"]*?/site-packages/", "<site-packages>/", s)
    s = re.sub(r"/(?:Users|private|tmp|home)/[^\s'\"]*?/topic_jax_and_tpu/", "<root>/", s)
    s = re.sub(r"/(?:Users|private|tmp|home)/[^\s'\"]+", "<path>", s)
    return s


def save(name, obj):
    p = os.path.join(OUT, name + ".json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)
    print("wrote", os.path.relpath(p, HERE), os.path.getsize(p), "bytes")


def versions():
    import jax, jaxlib, platform  # noqa: E401
    return {"jax": jax.__version__, "jaxlib": jaxlib.__version__, "python": platform.python_version()}


def err(fn):
    """Run fn, return 'ExceptionType: first lines of the message' (scrubbed), or None if it did not raise."""
    try:
        fn()
    except Exception as e:  # noqa: BLE001
        msg = str(e).strip()
        return scrub(type(e).__name__ + ": " + msg)
    return None


def first_lines(s, n=4):
    return "\n".join(s.splitlines()[:n]) if s else s


def split_jaxpr(text):
    """Split the printed jaxpr into header, one text block per top-level equation, and footer."""
    lines = text.splitlines()
    head, eqns, foot = [], [], []
    for ln in lines:
        if ln.startswith("  in "):
            foot.append(ln)
        elif foot:
            foot.append(ln)
        elif re.match(r"^    [^\s\]].* = ", ln) or re.match(r"^    [^\s\]]+ = ", ln):
            eqns.append([ln])
        elif eqns:
            eqns[-1].append(ln)
        else:
            head.append(ln)
    return "\n".join(head), ["\n".join(e) for e in eqns], "\n".join(foot)


def median(xs):
    return float(np.median(np.asarray(xs)))
