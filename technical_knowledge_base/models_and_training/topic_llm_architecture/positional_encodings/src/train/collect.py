"""Collect the equal-budget position runs of the tiny GPT (1,500 steps x 8,192 tokens = 12.3M tokens, seed 0, same batches)
from their logs in the scratch runs folder into out/runs.json (the page's copy; scratch is not durable).
learned = the root's ref_baseline_s1500 (the baseline preset); rope = the Attention lab's at_mha (the rope preset, same
settings); alibi, nope, sinusoidal, and second seeds of rope and learned trained by this page (gpu_queue.sh).
Run: LA_SCRATCH=<scratch>/la python3 collect.py"""
import json, os

H = os.path.dirname(os.path.abspath(__file__))
SCR = os.environ["LA_SCRATCH"]
RUNS = [("learned", "ref_baseline_s1500", 0), ("sinusoidal", "pe_sinusoidal", 0), ("sinusoidal x16", "pe_sinusoidal_x16", 0), ("alibi", "pe_alibi", 0), ("nope", "pe_nope", 0),
        ("rope", "at_mha", 0), ("rope", "pe_rope_s1", 1), ("learned", "pe_learned_s1", 1)]
out = {"what": "tiny GPT, one position scheme per run, equal budgets; measured on Apple M1 Pro (MPS, fp32)", "runs": []}
for scheme, name, seed in RUNS:
    p = os.path.join(SCR, "runs", name, "log.json")
    if not os.path.exists(p):
        out["runs"].append({"scheme": scheme, "name": name, "seed": seed, "pending": True}); continue
    lg = json.load(open(p))
    a = lg["args"]
    assert a["steps"] == 1500 and a["batch"] == 32 and a["lr"] == 3e-3 and a["seed"] == seed, (name, a)
    ev = json.load(open(os.path.join(SCR, "runs", name, "eval.json"))) if os.path.exists(os.path.join(SCR, "runs", name, "eval.json")) else {}
    r = {"scheme": scheme, "name": name, "seed": seed, "status": lg["status"], "steps": lg["steps_done"], "tokens": lg["tokens_seen"],
         "seconds": lg["seconds"], "tok_s": lg["median_tok_s"], "params": lg["params"]["total"], "position_params": lg["params"]["position"],
         "val_20": lg["final_val_loss"], "val_curve": [[e["step"], round(e["val_loss"], 4)] for e in lg["eval"]],
         "train_curve": [[t["step"], round(t["loss"], 3)] for t in lg["train"][::10]], "torch": lg.get("torch")}
    if ev:
        r["val_100"] = ev["val_loss"]; r["running_seq_loss"] = ev["running_sequence_mean_loss"]
        r["greedy_prompt0"] = ev["samples"][0]["greedy"]; r["prompt0"] = ev["samples"][0]["prompt"]
    out["runs"].append(r)
    print(scheme, name, r["val_20"], r.get("val_100"), r["tok_s"], r["seconds"])
json.dump(out, open(os.path.join(H, "out/runs.json"), "w"), indent=1)
