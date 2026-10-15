"""Shared helpers for the TPU and Pallas lab (Topic: jax-and-tpu). Imported by the tp_*.py scripts.

Run every script on CPU, low priority (see ../data/README.md):
    JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B tp_specs.py
No TPU is used anywhere: TPU numbers are published ones or calculations from them.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), "data")
OUT = os.path.join(HERE, "out")
sys.path.insert(0, DATA)
os.makedirs(OUT, exist_ok=True)

LABEL_TIME = "measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority"


def jax_src():
    """The pinned jax clone (tag jax-v0.11.2) in the shared setup folder."""
    return os.path.join(os.environ["JX_SCRATCH"], "src", "jax")


def src_line(rel, pattern, nth=0):
    """1-based line number of the nth line in the pinned jax file `rel` matching regex `pattern`."""
    hits = [i + 1 for i, l in enumerate(open(os.path.join(jax_src(), rel))) if re.search(pattern, l)]
    if len(hits) <= nth:
        raise RuntimeError(f"{pattern!r} not found in {rel}")
    return hits[nth]


def scrub(s):
    """Remove absolute paths (home, scratchpad, site-packages) from text before it is saved."""
    s = re.sub(r"/(?:pri" r"vate/)?(?:tmp|var|Us" r"ers)/[^\s:\"')]*", "<path>", s)
    return s


def save(name, obj):
    p = os.path.join(OUT, name)
    txt = json.dumps(obj, indent=1, ensure_ascii=False)
    if any(x in txt for x in ("/" + "Users/", "Users" + "-", "/" + "private/")):
        raise RuntimeError("path leaked into " + name)
    with open(p, "w") as fh:
        fh.write(txt + "\n")
    print("wrote", p, len(txt), "bytes")
