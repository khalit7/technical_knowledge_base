"""Shared setup for this page's runs: the root's shared code (src/data) and the Diffusion lab's samplers (src/diff)."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.join(HERE, "..", "..", "..", "src")
sys.path.insert(0, os.path.join(ROOT_SRC, "data")); sys.path.insert(0, os.path.join(ROOT_SRC, "diff")); sys.path.insert(0, HERE)
OUT = os.path.join(HERE, "..", "out")


def dz_scratch(*p):
    from common import scratch
    d = scratch("dz", *p[:-1]) if len(p) > 1 else scratch("dz")
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, p[-1]) if p else d
