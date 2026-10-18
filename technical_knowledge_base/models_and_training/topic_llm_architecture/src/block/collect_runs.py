"""Block lab: copy the pre-norm / post-norm training logs from the scratch run folders into src/block/out/runs/
(trimmed: the per-step records the page draws), and record the unigram cross-entropy of the held-out split, the loss
of a model that ignores context and predicts token frequencies.

Run: LA_SCRATCH=<scratch>/la <venv>/bin/python src/block/collect_runs.py
"""
import glob, json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SCR = os.environ["LA_SCRATCH"]
OUT = os.path.join(HERE, "out", "runs")
os.makedirs(OUT, exist_ok=True)

names = sorted(os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(SCR, "runs", "bl_*", "log.json")))
for n in names:
    L = json.load(open(os.path.join(SCR, "runs", n, "log.json")))
    a = L["args"]
    keep = {"name": n, "preset": L["preset"], "norm_pos": L["config"]["norm_pos"], "lr": a["lr"], "warmup": a["warmup"],
            "steps": a["steps"], "batch": a["batch"], "clip": a["clip"], "seed": a["seed"], "status": L["status"],
            "steps_done": L["steps_done"], "tokens_seen": L["tokens_seen"], "seconds": L["seconds"],
            "median_tok_s": L["median_tok_s"], "final_val_loss": L["final_val_loss"], "device": L["device"],
            "torch": L["torch"], "params_total": L["params"]["total"],
            "train": [[r["step"], r["loss"], r["grad_norm"], r["lr"]] for r in L["train"]],
            "eval": [[e["step"], round(e["val_loss"], 4)] for e in L["eval"]]}
    json.dump(keep, open(os.path.join(OUT, n + ".json"), "w"))
    print(n, keep["status"], keep["final_val_loss"], keep["seconds"])

tr = np.memmap(os.path.join(SCR, "data", "train.bin"), dtype=np.uint16, mode="r")
va = np.memmap(os.path.join(SCR, "data", "val.bin"), dtype=np.uint16, mode="r")
c = np.bincount(tr, minlength=4096).astype(np.float64)
p = c / c.sum()
cv = np.bincount(va, minlength=4096).astype(np.float64)
uni = {"train_unigram_entropy_nats": round(float(-(p[p > 0] * np.log(p[p > 0])).sum()), 4),
       "val_cross_entropy_under_train_unigram_nats": round(float(-(cv * np.log(np.maximum(p, 1e-12))).sum() / cv.sum()), 4),
       "uniform_nats_ln4096": round(float(np.log(4096)), 4)}
json.dump(uni, open(os.path.join(HERE, "out", "unigram.json"), "w"), indent=1)
print(uni)
