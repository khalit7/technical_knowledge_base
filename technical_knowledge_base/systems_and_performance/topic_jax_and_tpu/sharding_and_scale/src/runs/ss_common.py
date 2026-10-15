"""Shared helpers for the child page "Sharding and scale" (prefix ss). Imported by the ss_*.py scripts.

Reuses the root's Sharding lab helpers (../../src/shard/sh_common.py: HLO collective parser, ring cost, path scrub)
and the running example (../../src/data: common.py, model_jax.py). Run every script with the shared venv:

    export JX_SCRATCH=<the shared jax-and-tpu setup folder>
    XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 \
        $JX_SCRATCH/venv/bin/python -I -B ss_<name>.py

Small results go to ../out/<name>.json (embedded in the page); large files (HLO dumps) to $JX_SCRATCH/ss/.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)                                  # sharding_and_scale/src
ROOT_SRC = os.path.join(os.path.dirname(os.path.dirname(SRC)), "src")   # topic_jax_and_tpu/src
OUT = os.path.join(SRC, "out")
sys.path.insert(0, os.path.join(ROOT_SRC, "shard"))
sys.path.insert(0, os.path.join(ROOT_SRC, "data"))
import sh_common as H  # noqa: E402,F401  (root Sharding lab helpers)
import common as C  # noqa: E402,F401  (running example)


def big(*parts):
    """Path under $JX_SCRATCH/ss/ for large outputs that stay out of the repo."""
    p = os.path.join(C.scratch(), "ss", *parts)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


def dump(name, obj):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(obj, f, indent=1)
        f.write("\n")


def load_root(name):
    with open(os.path.join(ROOT_SRC, "shard", "out", name)) as f:
        return json.load(f)
