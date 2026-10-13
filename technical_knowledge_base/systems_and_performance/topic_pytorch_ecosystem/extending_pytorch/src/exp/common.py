"""Shared helpers for the extending_pytorch experiments: paths, the running example, message cleaning."""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
INPUTS = os.path.join(SRC, "inputs")
ROOT_MODEL = os.path.normpath(os.path.join(SRC, "..", "..", "src", "model"))
sys.path.insert(0, ROOT_MODEL)
sys.path.insert(0, HERE)
SCRATCH = os.environ.get("EXT_SCRATCH", "/tmp/ext_scratch")   # build dirs, generated code (never committed)
os.makedirs(SCRATCH, exist_ok=True)
# A fresh compile cache per process unless one is given: a warm cache can hide registration changes
# (see cache_trap.py), and the default cache is shared with every other job on the machine.
# (importing torch may already have set TORCHINDUCTOR_CACHE_DIR to the default, so EXT_CACHE_DIR is the override.)
import tempfile
os.environ["TORCHINDUCTOR_CACHE_DIR"] = os.environ.get("EXT_CACHE_DIR") or tempfile.mkdtemp(prefix="inductor_", dir=SCRATCH)


def clean(msg, n=400):
    """First lines of an error or warning, with machine paths removed, cut to n characters."""
    s = str(msg)
    s = re.sub(r"(/[^\s'\"]+)+/(site-packages|lib|private|U[s]ers|tmp)[^\s'\"]*", "<path>", s)
    s = re.sub(r"/(U[s]ers|private|tmp)/[^\s'\"]*", "<path>", s)
    s = re.sub(r"\n\s*\n", "\n", s).strip()
    return s[:n] + ("..." if len(s) > n else "")


def save(name, obj):
    os.makedirs(INPUTS, exist_ok=True)
    p = os.path.join(INPUTS, name)
    with open(p, "w") as f:
        json.dump(obj, f, indent=1, sort_keys=False)
    print("wrote", p, os.path.getsize(p), "bytes")
