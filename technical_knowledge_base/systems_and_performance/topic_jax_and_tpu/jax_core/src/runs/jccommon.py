"""Shared helpers for the JAX core child page's run scripts (src/runs/).

Imports the running example from the root page's src/data (model_jax, common). Run every script with
the shared venv, CPU only, low priority:
    JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B <script>.py
Outputs go to out/<name>.json (small, committed). Paths in captured messages are scrubbed
(same rules as the root's src/xf/xfcommon.py).
"""
import json
import os
import re
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src"))
DATA = os.path.join(ROOT_SRC, "data")
sys.path.insert(0, DATA)
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)
SCRATCH = os.environ.get("JX_SCRATCH", "")
JAXSRC = os.path.join(SCRATCH, "src", "jax") if SCRATCH else ""

import numpy as np  # noqa: E402


def scrub(s):
    """Strip absolute paths (home, scratchpad, venv) so nothing private is embedded."""
    s = str(s)
    s = re.sub(r"/(?:Users|private|tmp|home|var)/[^\s'\"]*?/site-packages/", "<site-packages>/", s)
    s = re.sub(r"/(?:Users|private|tmp|home|var)/[^\s'\"]*?/topic_jax_and_tpu/", "<root>/", s)
    s = re.sub(r"/(?:Users|private|tmp|home|var)/[^\s'\"]*?/src/jax/", "<jax-src>/", s)
    s = re.sub(r"/(?:Users|private|tmp|home|var)/[^\s'\"]+", "<path>", s)
    s = re.sub(r"\bkhalid\b", "<user>", s)
    return s


def save(name, obj):
    p = os.path.join(OUT, name + ".json")
    txt = json.dumps(obj, indent=1, ensure_ascii=False)
    txt = scrub(txt) if ("/Users/" in txt or "/private/" in txt) else txt
    with open(p, "w", encoding="utf-8") as f:
        f.write(txt)
    print("wrote", os.path.relpath(p, HERE), os.path.getsize(p), "bytes")


def versions():
    import platform
    import jax
    import jaxlib
    return {"jax": jax.__version__, "jaxlib": jaxlib.__version__, "python": platform.python_version()}


def load1():
    try:
        return round(os.getloadavg()[0], 1)
    except OSError:
        return None


def err(fn, n=None):
    """Run fn; return 'ExceptionType: message' (scrubbed; first n lines if n), or None if it did not raise."""
    try:
        fn()
    except Exception as e:  # noqa: BLE001
        msg = type(e).__name__ + ": " + str(e).strip()
        msg = scrub(msg)
        if n:
            msg = "\n".join(msg.splitlines()[:n])
        return msg
    return None


def median(xs):
    return float(np.median(np.asarray(xs)))


class Timer:
    """Wall and process CPU time of a block."""

    def __enter__(self):
        self.w0, self.c0 = time.perf_counter(), time.process_time()
        return self

    def __exit__(self, *a):
        self.wall = time.perf_counter() - self.w0
        self.cpu = time.process_time() - self.c0


LABEL = "measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority"
