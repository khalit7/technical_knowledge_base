"""Shared helper for the training_stack child page (prefix ts).

Scripts here import the root's running example (../../../src/data: common.py, model_nnx.py, model_jax.py)
and write small results to out/<name>.json. Large artefacts (checkpoints) go to $JX_SCRATCH/ts/.
Run: JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B <script>.py
"""
import json
import os
import re
import sys
import time
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_DATA = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data"))
sys.path.insert(0, ROOT_DATA)
os.environ.setdefault("JAX_PLATFORMS", "cpu")
import common as C  # noqa: E402

OUT = os.path.join(HERE, "out")


def scratch(*p):
    d = C.path("ts", *p)
    os.makedirs(os.path.dirname(d) if p and "." in p[-1] else d, exist_ok=True)
    return d


_SCRUB = [(re.compile(r"/(?:Users|home|private)/[^\s'\"]*?/site-packages/"), "site-packages/"),
          (re.compile(r"/(?:Users|home|private)/[^\s'\"]*?/training_stack/"), "training_stack/"),
          (re.compile(r"/(?:Users|home|private)/[^\s'\"]+"), "<path>")]


def scrub(s):
    s = str(s)
    for r, t in _SCRUB:
        s = r.sub(t, s)
    return s


def err_text(fn):
    """Run fn, return (type name, scrubbed first lines of the message) of the exception it raises, or None."""
    try:
        fn()
    except Exception as e:  # noqa: BLE001
        msg = scrub(str(e)).strip()
        return {"type": type(e).__name__, "msg": msg}
    return None


def save(name, obj):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name + ".json"), "w") as f:
        json.dump(obj, f, indent=1, default=str)
    print("wrote", name, os.path.getsize(os.path.join(OUT, name + ".json")), "bytes")


def versions():
    import jax, flax, optax  # noqa: E401
    v = {"jax": jax.__version__, "flax": flax.__version__, "optax": optax.__version__}
    try:
        import orbax.checkpoint as ocp
        v["orbax-checkpoint"] = getattr(ocp, "__version__", "0.12.7")
    except Exception:
        pass
    try:
        import grain
        v["grain"] = getattr(grain, "__version__", "0.2.18")
    except Exception:
        pass
    return v


def load_avg():
    try:
        return [round(x, 1) for x in os.getloadavg()]
    except Exception:
        return None


class Timer:
    def __enter__(self):
        self.w, self.c = time.perf_counter(), time.process_time(); return self

    def __exit__(self, *a):
        self.wall, self.cpu = time.perf_counter() - self.w, time.process_time() - self.c
