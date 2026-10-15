"""Shared helpers for the child page "TPU programming and performance" (prefix tq).

Run every script on CPU, low priority, from this folder's parent's parent (see ../README.md):
    JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B runs/<script>.py
No TPU is used anywhere: TPU numbers are published ones (src/inputs/) or calculations from them.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)                       # this page's src/
PAGE = os.path.dirname(SRC)
ROOT_SRC = os.path.join(os.path.dirname(PAGE), "src")   # the root page's src/ (running example, TPU lab)
DATA = os.path.join(ROOT_SRC, "data")
OUT = os.path.join(SRC, "out")
INPUTS = os.path.join(SRC, "inputs")
sys.path.insert(0, DATA)
os.makedirs(OUT, exist_ok=True)

LABEL_TIME = "measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority"


def scratch():
    s = os.environ.get("JX_SCRATCH")
    if not s:
        raise RuntimeError("set JX_SCRATCH")
    return s


def src_file(repo, rel):
    return os.path.join(scratch(), "src", repo, rel)


def src_line(repo, rel, pattern, nth=0):
    """1-based line of the nth line matching regex `pattern` in the pinned clone repo/rel."""
    hits = [i + 1 for i, l in enumerate(open(src_file(repo, rel))) if re.search(pattern, l)]
    if len(hits) <= nth:
        raise RuntimeError(f"{pattern!r} not found in {repo}/{rel}")
    return hits[nth]


def src_line_after(repo, rel, pattern, after):
    """First line after line `after` matching `pattern`."""
    hits = [i + 1 for i, l in enumerate(open(src_file(repo, rel))) if re.search(pattern, l) and i + 1 > after]
    return hits[0]


def root_json(name):
    return json.load(open(os.path.join(ROOT_SRC, "tpu", "out", name)))


def scrub(s):
    return re.sub(r"/(?:pri" r"vate/)?(?:tmp|var|Us" r"ers)/[^\s:\"')]*", "<path>", s)


def save(name, obj):
    p = os.path.join(OUT, name)
    txt = json.dumps(obj, indent=1, ensure_ascii=False)
    if any(x in txt for x in ("/" + "Users/", "Users" + "-", "/" + "private/")):
        raise RuntimeError("path leaked into " + name)
    with open(p, "w") as fh:
        fh.write(txt + "\n")
    print("wrote", os.path.relpath(p, SRC), len(txt), "bytes")
