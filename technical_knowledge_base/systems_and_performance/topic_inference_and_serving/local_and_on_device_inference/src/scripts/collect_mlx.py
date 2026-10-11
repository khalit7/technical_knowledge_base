"""Compact the MLX job (quality.json, bytes.txt, bench_*.txt/.load) into results/mlx.json.
usage: python3 -I collect_mlx.py <INF/lo/runs/mlx> <out.json>
"""
import json, os, re, sys, statistics as st

d, outp = sys.argv[1:3]
q = json.load(open(os.path.join(d, "quality.json")))
by = {m["model"]: m for m in q["models"]}
sizes = dict(l.split() for l in open(os.path.join(d, "bytes.txt")) if l.strip())
sizes["Qwen3-1.7B-4bit"] = "968080210"  # mlx-community/Qwen3-1.7B-4bit model.safetensors (MODELS.md)
P = 1720574976  # Qwen3-1.7B parameters (tied embedding stored once in MLX safetensors)
LAB = {"bf16": "bf16", "8bit": "8-bit, group 64", "6bit": "6-bit, group 64", "4bit": "4-bit, group 64 (default)", "4bit-g32": "4-bit, group 32",
       "3bit": "3-bit, group 64", "mxfp4": "mxfp4 (group 32)", "mixed_3_6": "mixed 3/6-bit recipe", "Qwen3-1.7B-4bit": "mlx-community 4-bit"}


def bench(n):
    """passes in runs/mlx, p2, p3: use the fastest (sharing the GPU only slows a run); keep all medians."""
    passes = []
    for k, dd in enumerate((d, os.path.join(d, "p2"), os.path.join(d, "p3"))):
        p = os.path.join(dd, "bench_" + n + ".txt")
        if not os.path.exists(p):
            continue
        tr = []
        for line in open(p):
            m = re.match(r"Trial \d+:\s+(.*)", line)
            if m:
                tr.append({kk: float(v) for kk, v in (kv.split("=") for kv in m.group(1).split(", "))})
        lp = os.path.join(dd, "bench_" + n + ".load")
        ld = json.load(open(lp))["before"]["loadavg"][0] if os.path.exists(lp) else None
        if tr:
            passes.append({"pass": k + 1, "load": ld, "tr": tr})
    if not passes:
        return {}
    b = max(passes, key=lambda x: st.median(t["generation_tps"] for t in x["tr"]))
    tr = b["tr"]
    return {"tg": st.median(t["generation_tps"] for t in tr), "tg_sd": st.pstdev([t["generation_tps"] for t in tr]),
            "pp": st.median(t["prompt_tps"] for t in tr), "peak_gb": st.median(t["peak_memory"] for t in tr),
            "load": b["load"], "pass": b["pass"],
            "passes": [{"pass": x["pass"], "load": x["load"], "tg": round(st.median(t["generation_tps"] for t in x["tr"]), 2)} for x in passes]}


items = []
for n in ["8bit", "6bit", "4bit", "4bit-g32", "3bit", "mxfp4", "mixed_3_6", "Qwen3-1.7B-4bit"]:
    m = by.get(n)
    if not m:
        continue
    b = int(sizes.get(n, 0)) or None
    it = {"id": n, "label": LAB.get(n, n), "short": n, "imat": False, "bytes": b, "bpw": round(b * 8 / P, 4) if b else None,
          "ppl": round(m["ppl"], 4), "kld": round(m["kld_mean"], 6), "kld_p99": round(m["kld_p99"], 6), "top": round(m["same_top_pct"], 3)}
    it.update({k: (round(v, 2) if isinstance(v, float) else v) for k, v in bench(n).items()})
    items.append(it)
base = {"id": "bf16", "label": "bf16", "bytes": int(sizes["bf16"]), "ppl": round(q["base_ppl"], 4)}
base.update({k: (round(v, 2) if isinstance(v, float) else v) for k, v in bench("bf16").items()})
json.dump({"name": "Qwen3-1.7B MLX", "params": P, "base": base, "items": items, "chunks": q["chunks"], "ctx": q["ctx"]}, open(outp, "w"), indent=1)
print(len(items), "items")
