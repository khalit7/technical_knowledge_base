"""Attention lab: collect the recorded outputs into src/attn/out/ (durable) and write parts/32_js_at_0data.js.

Step 1 (needs the scratch runs; skipped when LA_SCRATCH is unset): summarise $LA_SCRATCH/runs/at_*/{log,eval}.json
        into out/runs_summary.json.
Step 2 (repo only): read out/*.json, inputs/published.json and src/data/running_sequence.json and write the data part.
Run: LA_SCRATCH=<scratch>/la python3 make_page_data.py   (or without LA_SCRATCH to rebuild from out/ only)
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
OUT = os.path.join(HERE, "out")
RUNS = [  # name, label, preset, what differs from the MHA run
    ("at_mha", "MHA", "rope", "8 KV heads (one per query head)"),
    ("at_gqa4", "GQA-4", "gqa4", "4 KV heads, 2 query heads each"),
    ("at_gqa2", "GQA-2", "gqa2", "2 KV heads, 4 query heads each"),
    ("at_mqa", "MQA", "mqa", "1 KV head for all 8 query heads"),
    ("at_mla", "MLA", "mla", "64-number latent + 16-number RoPE key"),
    ("at_swa64", "SWA-64", "swa64", "every layer sees the last 64 tokens"),
    ("at_swa64_g3", "SWA-64, 2 local : 1 global", "swa64_g3", "layers 3 and 6 full, the rest window 64"),
]
SEEDS = {"at_mha": "at_mha_s1", "at_mqa": "at_mqa_s1", "at_mla": "at_mla_s1"}


def kv_bytes(cfg_dict):
    sys.path.insert(0, os.path.join(SRC, "data"))
    from tiny_gpt import GPTConfig, kv_cache_bytes_per_token
    c = GPTConfig(**cfg_dict)
    return kv_cache_bytes_per_token(c, 2, context=c.ctx)


def summarise(scr):
    rows = []
    for name, label, preset, diff in RUNS + [(v, k + "_s1", "", "") for k, v in SEEDS.items()]:
        d = os.path.join(scr, "runs", name)
        if not os.path.exists(os.path.join(d, "eval.json")):
            print("missing", name); continue
        log = json.load(open(os.path.join(d, "log.json"))); ev = json.load(open(os.path.join(d, "eval.json")))
        tr = log["train"]
        rows.append({
            "run": name, "label": label, "preset": log["preset"], "set": log["args"]["set"], "seed": log["args"]["seed"], "differs": diff,
            "params": log["params"]["total"], "kv_bytes_per_token_bf16_ctx256": kv_bytes(log["config"]),
            "status": log["status"], "steps": log["steps_done"], "tokens": log["tokens_seen"], "seconds": log["seconds"],
            "median_tok_s": log["median_tok_s"], "mps_driver_mb_peak": log["mps_driver_mb_peak_sampled"],
            "val_loss_20win": log["final_val_loss"], "val_loss_100win": ev["val_loss"], "running_seq_loss": ev["running_sequence_mean_loss"],
            "eval_curve": [[e["step"], round(e["val_loss"], 4)] for e in log["eval"]],
            "train_curve": [[r["step"], r["loss"]] for r in tr if r["step"] % 50 == 0 or r["step"] == tr[-1]["step"]],
            "samples": [{"prompt": s["prompt"], "greedy": s["greedy"]} for s in ev["samples"] if s["prompt"].startswith(("Once upon a time, in", "Tom and"))],
            "device": log["device"], "torch": log["torch"]})
    json.dump({"note": "summarised from $LA_SCRATCH/runs/at_*/ by make_page_data.py; measured on Apple M1 Pro (MPS, fp32), 1,500 steps x 8,192 tokens, seed 0 unless named _s1",
               "runs": rows}, open(os.path.join(OUT, "runs_summary.json"), "w"), indent=1)


def main():
    scr = os.environ.get("LA_SCRATCH")
    if scr:
        summarise(scr)
    ld = lambda f: json.load(open(os.path.join(OUT, f))) if os.path.exists(os.path.join(OUT, f)) else None
    seq = json.load(open(os.path.join(SRC, "data", "running_sequence.json")))
    data = {
        "date": "2026-10-18",
        "seq": {"pieces": seq["pieces"][:24]},
        "runs": ld("runs_summary.json"),
        "bench": ld("decode_bench.json"),
        "cpu": ld("cpu_evals.json"),
        "sdpa": ld("sdpa_errors.json"),
        "code": json.load(open(os.path.join(HERE, "inputs", "code_snippets.json"))),
        "pub": json.load(open(os.path.join(HERE, "inputs", "published.json"))),
    }
    if data["runs"]:
        for r in data["runs"]["runs"]:   # the page shows curves and two samples; keep the rest in out/
            r["train_curve"] = r["train_curve"][::2]
    js = "// written by src/attn/make_page_data.py from src/attn/out/*.json and inputs/published.json; do not edit by hand\nwindow.ATD=" + \
        json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n"
    p = os.path.join(SRC, "parts", "32_js_at_0data.js")
    open(p, "w").write(js)
    print("wrote", p, len(js.encode()), "bytes")


if __name__ == "__main__":
    main()
