"""Shared helpers for the Ecosystem map's small real checks (CPU only, no timing)."""
import json, os, sys, platform
HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.normpath(os.path.join(HERE, "..", "..", "model"))
sys.path.insert(0, MODEL)
OUT = os.path.join(HERE, "..", "inputs", "checks")
os.makedirs(OUT, exist_ok=True)
SCRATCH = os.environ.get("MAP_SCRATCH", "/tmp/map_scratch")  # outputs that must not land in the repo
os.makedirs(SCRATCH, exist_ok=True)

def env():
    import torch
    return {"torch": torch.__version__, "python": platform.python_version(),
            "machine": "Apple M1 Pro" if platform.machine() == "arm64" and platform.system() == "Darwin" else platform.machine(),
            "threads": torch.get_num_threads()}

def save(name, d):
    d = {"check": name, "env": env(), **d}
    with open(os.path.join(OUT, name + ".json"), "w") as f:
        json.dump(d, f, indent=1, default=str)
    print(json.dumps(d, indent=1, default=str)[:3000])
