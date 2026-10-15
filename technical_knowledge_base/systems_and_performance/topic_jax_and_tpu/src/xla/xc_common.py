"""Shared helpers for the Compiler lab scripts (Topic: jax-and-tpu, tab t-xla, prefix xc).

Run every script from anywhere with the shared venv, CPU only, low priority:
    export JX_SCRATCH=<the shared jax-and-tpu setup folder>
    JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B <script>.py
Small results go to src/xla/out/*.json (committed); big dumps (HLO dumps, profiles) stay in $JX_SCRATCH/xla/.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
OUT = os.path.join(HERE, "out")
sys.path.insert(0, DATA)

import common as C  # noqa: E402


def big(*parts):
    """A path in the scratch area for big intermediates (never committed)."""
    p = os.path.join(C.scratch(), "xla", *parts)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


def save(name, obj):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(obj, f, indent=1, sort_keys=False)
    print("wrote", os.path.join("src/xla/out", name))


_HOME = os.path.expanduser("~")


def scrub(s):
    """Strip absolute paths and the host name from compiler and profiler text.
    site-packages/... and the repo's src/... stay as package- or repo-relative paths."""
    import socket
    s = re.sub(r"/[^\s\"']*/site-packages/", "site-packages/", s)
    s = re.sub(r"/[^\s\"']*/topic_jax_and_tpu/src/", "src/", s)
    s = re.sub(r"/[^\s\"']*/scratchpad/[^\s\"']*", "<scratch>", s)
    s = s.replace(_HOME, "~")
    s = s.replace(C.scratch(), "<scratch>")
    for h in {socket.gethostname(), socket.gethostname().split(".")[0]}:
        if h:
            s = s.replace(h, "<host>")
    return s


def setup_state(cfg=None):
    """The running example's initial params (from the shared PyTorch init), optax state and batch 0."""
    import numpy as np
    import model_jax as MJ
    cfg = cfg or C.CFG
    sd = dict(np.load(C.path("data", "init_torch.npz")))
    params = MJ.from_torch(sd, cfg)
    tx = MJ.make_optimizer(cfg, C.lr_at)
    opt = tx.init(params)
    x, y = C.batch(0)
    return params, tx, opt, x, y


def versions():
    import platform
    import jax
    import jaxlib
    return {"jax": jax.__version__, "jaxlib": jaxlib.__version__, "python": platform.python_version(),
            "machine": "Apple M1 Pro (CPU)"}
