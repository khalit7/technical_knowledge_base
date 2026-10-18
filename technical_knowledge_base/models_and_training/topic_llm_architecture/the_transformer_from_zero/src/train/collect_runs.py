"""collect_runs.py: copy the trimmed logs and evaluations of this page's runs (tz_*) and of the reference runs it
compares against from $LA_SCRATCH/runs to src/train/out/runs/<name>.json (scratch is not durable).
Reference runs (tiny_gpt.py, same loop): ref_baseline_s1500 (setup), bl_pre_lr3e-3 (Block lab rerun), bl_pre_lr1e-3
(Block lab, baseline at lr 1e-3), mx_baseline_s1 (MoE child, baseline at seed 1). Their eval_tz.json comes from
eval_zero.py --tiny (this page's evaluator on CPU).
Run: LA_SCRATCH=<scratch>/la python collect_runs.py
"""
import glob, json, os
SCR = os.environ["LA_SCRATCH"]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out", "runs"); os.makedirs(OUT, exist_ok=True)
REF = ["ref_baseline_s1500", "bl_pre_lr3e-3", "bl_pre_lr1e-3", "mx_baseline_s1"]
names = sorted(os.path.basename(d) for d in glob.glob(os.path.join(SCR, "runs", "tz_*"))) + REF
for n in names:
    d = os.path.join(SCR, "runs", n)
    if not os.path.exists(os.path.join(d, "log.json")):
        continue
    L = json.load(open(os.path.join(d, "log.json")))
    rec = {"name": n, "source": "tiny_gpt.py (root src/data/train.py)" if n in REF else "gpt_zero.py (src/train/train_zero.py)",
           "config": L.get("config"), "lr": L["args"]["lr"], "seed": L["args"]["seed"], "steps": L["args"]["steps"],
           "status": L["status"], "seconds": L.get("seconds"), "median_tok_s": L.get("median_tok_s"),
           "params": L["params"]["total"] if isinstance(L["params"], dict) else L["params"],
           "final_val": L["final_val_loss"], "eval": [[e["step"], round(e["val_loss"], 4)] for e in L["eval"]],
           "train": [[t["step"], t["loss"]] for t in L["train"]]}
    ev = os.path.join(d, "eval_tz.json")
    if os.path.exists(ev):
        E = json.load(open(ev))
        rec.update({"val100": E["val_loss"], "seq_mean": E["running_sequence_mean_loss"],
                    "tok_loss": [round(x, 2) for x in E["running_sequence_token_loss"]],
                    "samples": [{"greedy": s["greedy"], "t08": s["sampled_t0.8"]} for s in E["samples"]]})
    json.dump(rec, open(os.path.join(OUT, n + ".json"), "w"))
    print(n, rec["final_val"], rec.get("val100"), rec["status"])
