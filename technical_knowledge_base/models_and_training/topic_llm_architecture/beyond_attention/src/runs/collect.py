"""Copy what the page needs from the training runs (scratch, not durable) into src/runs/out/runs.json (durable).

Runs: ba_ssm, ba_ssm_s1, ba_hybrid, ba_hybrid2 (trained for this page with the root's src/data/train.py, presets ssm,
hybrid, hybrid2; commands in ../README.md), and for comparison at_mha, at_mha_s1 (the root Attention lab) and pe_nope
(the Positional Encodings child), all 1,500 steps x 8,192 tokens, seed 0 unless _s1.
Run: LA_SCRATCH=<scratch>/la python3 src/runs/collect.py
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCR = os.environ["LA_SCRATCH"]
DATA = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data"))
sys.path.insert(0, DATA)
RUNS = [("at_mha", "attention, RoPE", "Attention lab"), ("at_mha_s1", "attention, RoPE, seed 1", "Attention lab"),
        ("pe_nope", "attention, no positions", "Positional Encodings child"),
        ("ba_ssm", "SSM only", "this page"), ("ba_ssm_s1", "SSM only, seed 1", "this page"),
        ("ba_hybrid", "hybrid, attention at layer 3", "this page"), ("ba_hybrid2", "hybrid, attention at layers 3 and 6", "this page")]


def main():
    from tiny_gpt import GPTConfig, kv_cache_bytes_per_token, ssm_state_bytes
    out = []
    for name, label, owner in RUNS:
        d = os.path.join(SCR, "runs", name)
        if not os.path.exists(os.path.join(d, "eval.json")):
            print("missing", name); continue
        lg = json.load(open(os.path.join(d, "log.json"))); ev = json.load(open(os.path.join(d, "eval.json")))
        cfg = GPTConfig(**lg["config"])
        tr = lg["train"]
        curve = []
        for s in range(0, lg["steps_done"], 50):          # mean train loss over each 50-step window
            w = [r["loss"] for r in tr if s <= r["step"] < s + 50]
            if w: curve.append([s + 25, round(sum(w) / len(w), 4)])
        out.append({"run": name, "label": label, "owner": owner, "layer_types": cfg.layer_types, "pos": cfg.pos,
                    "params": lg["params"]["total"], "val": ev["val_loss"], "val20": lg["final_val_loss"],
                    "rs": ev["running_sequence_mean_loss"], "tok_s": lg["median_tok_s"], "seconds": lg["seconds"],
                    "steps": lg["steps_done"], "seed": lg["args"]["seed"],
                    "kv_256_bf16": kv_cache_bytes_per_token(cfg, 2, 256) * 256, "state_fp32": ssm_state_bytes(cfg, 4),
                    "mps_mb": lg.get("mps_driver_mb_peak_sampled"), "curve": curve, "eval": lg["eval"],
                    "rs_tokens": ev["running_sequence_token_loss"],
                    "sample": {"prompt": ev["samples"][6]["prompt"], "greedy": ev["samples"][6]["greedy"]}})
        print(name, out[-1]["val"], out[-1]["rs"], out[-1]["params"], out[-1]["tok_s"])
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    json.dump({"date": "2026-10-19", "runs": out}, open(os.path.join(HERE, "out", "runs.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
