"""Shared helpers for the Libraries on top of PyTorch experiments (torch 2.14.1, Apple M1 Pro, CPU).
The running example is imported from the root's src/model (never copied). No timing anywhere: every
result here is deterministic (losses, gradients, call traces, bytes), so no bench lock is needed."""
import json, os, platform, re, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
INPUTS = os.path.join(SRC, "inputs")
ROOT_MODEL = os.path.normpath(os.path.join(SRC, "..", "..", "src", "model"))
sys.path.insert(0, ROOT_MODEL)
sys.path.insert(0, HERE)
SCRATCH = os.environ.get("LIB_SCRATCH", "/tmp/lib_scratch")   # Trainer / Lightning output folders (never committed)
os.makedirs(SCRATCH, exist_ok=True)
import torch  # noqa: E402


def env():
    import importlib.metadata as md
    v = {}
    for p in ["transformers", "accelerate", "lightning", "peft", "trl", "deepspeed", "torchao"]:
        try:
            v[p] = md.version(p)
        except Exception:
            pass
    return {"torch": torch.__version__, "python": platform.python_version(), "machine": "Apple M1 Pro",
            "threads": torch.get_num_threads(), "date": time.strftime("%Y-%m-%d"), "versions": v}


def clean(msg, n=300):
    """First lines of an error, machine paths removed."""
    s = str(msg)
    s = re.sub(r"/(U[s]ers|private|tmp|var)/[^\s'\":]*", "<path>", s)
    s = re.sub(r"\n\s*\n", "\n", s).strip()
    return s[:n] + ("..." if len(s) > n else "")


def save(name, d):
    os.makedirs(INPUTS, exist_ok=True)
    d = {"env": env(), **d}
    with open(os.path.join(INPUTS, name + ".json"), "w") as f:
        json.dump(d, f, indent=1, default=str)
    print("saved", name, len(json.dumps(d, default=str)), "bytes")
