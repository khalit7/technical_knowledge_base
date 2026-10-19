"""Copy the page's run logs (ns_*) from the scratch run folder into src/out/runs/ (the scratch is not durable).
Keeps every step's loss and gradient norm and every probe; drops nothing the page uses.
  LA_SCRATCH=<scratch>/la python3 collect_runs.py
"""
import glob, json, os

SCR = os.environ["LA_SCRATCH"]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out", "runs"); os.makedirs(OUT, exist_ok=True)
for d in sorted(glob.glob(os.path.join(SCR, "runs", "ns_*"))):
    f = os.path.join(d, "log.json")
    if not os.path.exists(f):
        continue
    L = json.load(open(f))
    keep = {k: L[k] for k in ("name", "preset", "ns", "status", "seconds", "steps_done", "device", "torch", "final_val_loss",
                              "loss", "grad_norm", "probe", "eval", "params")}
    a = L["args"]
    keep["args"] = {k: a[k] for k in ("lr", "clip", "warmup", "steps", "batch", "seed", "set", "zloss", "attn_softcap", "final_softcap", "init", "norm_pos")}
    keep["config"] = {k: L["config"][k] for k in ("norm", "norm_pos", "qk_norm", "pos", "init_std")}
    json.dump(keep, open(os.path.join(OUT, L["name"] + ".json"), "w"), separators=(",", ":"))
    print(L["name"], L["status"], L["final_val_loss"], os.path.getsize(os.path.join(OUT, L["name"] + ".json")))
