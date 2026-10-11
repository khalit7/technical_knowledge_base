"""Compact a quant-ladder run directory into one JSON (no paths): sizes, llama-bench, perplexity and KLD, load.
usage: python3 -I collect_q.py <run dir> <model label> <out.json>
"""
import json, os, re, sys

d, label, outp = sys.argv[1:4]
num = r"([-0-9.eE+]+)"
pats = {
    "ppl_q": r"Mean PPL\(Q\)\s*:\s*" + num + r"\s*±\s*" + num,
    "ppl_base": r"Mean PPL\(base\)\s*:\s*" + num,
    "ppl_ratio": r"Mean PPL\(Q\)/PPL\(base\)\s*:\s*" + num,
    "ln_ratio": r"Mean ln\(PPL\(Q\)/PPL\(base\)\)\s*:\s*" + num + r"\s*±\s*" + num,
    "kld_mean": r"Mean    KLD:\s*" + num + r"\s*±\s*" + num,
    "kld_max": r"Maximum KLD:\s*" + num,
    "kld_p999": r"99\.9%   KLD:\s*" + num,
    "kld_p99": r"99\.0%   KLD:\s*" + num,
    "kld_p95": r"95\.0%   KLD:\s*" + num,
    "kld_median": r"Median  KLD:\s*" + num,
    "dp_rms": r"RMS Δp    :\s*" + num,
    "same_top": r"Same top p:\s*" + num + r"\s*±\s*" + num,
}


def parse_ppl(path):
    t = open(path, encoding="utf-8", errors="replace").read()
    r = {}
    for k, p in pats.items():
        m = re.search(p, t)
        if m:
            r[k] = float(m.group(1))
            if m.lastindex and m.lastindex > 1:
                r[k + "_pm"] = float(m.group(2))
    m = re.search(r"Final estimate: PPL = " + num + r" \+/- " + num, t)
    if m:
        r["ppl"] = float(m.group(1)); r["ppl_pm"] = float(m.group(2))
    m = re.search(r"over (\d+) chunks, n_ctx=(\d+)", t)
    if m:
        r["chunks"] = int(m.group(1)); r["ctx"] = int(m.group(2))
    return r


def parse_bench(path):
    out = {}
    for r in json.load(open(path)):
        k = "pp" if r["n_prompt"] else "tg"
        out[k] = {"n": r["n_prompt"] or r["n_gen"], "ts": round(r["avg_ts"], 2), "sd": round(r["stddev_ts"], 2),
                  "samples": [round(x, 2) for x in r["samples_ts"]]}
        out["model_size"] = r["model_size"]; out["params"] = r["model_n_params"]; out["type"] = r["model_type"]
        out["build"] = r.get("build_commit"); out["threads"] = r.get("n_threads"); out["fa"] = r.get("flash_attn")
    return out


items = []
names = sorted({f.split(".")[0] for f in os.listdir(d) if f.endswith(".ppl.log")})
for n in names:
    it = {"quant": n.replace("+i", ""), "imatrix": n.endswith("+i"), "id": n}
    it.update(parse_ppl(os.path.join(d, n + ".ppl.log")))
    bp = os.path.join(d, n + ".bench.json")
    if os.path.exists(bp) and os.path.getsize(bp) > 10:
        it["bench"] = parse_bench(bp)
    sp = os.path.join(d, n + ".size")
    if os.path.exists(sp):
        it["file_bytes"] = int(open(sp).read().strip())
    lp = os.path.join(d, n + ".load")
    if os.path.exists(lp):
        try:
            it["load"] = json.loads(open(lp).read().replace("\n", ""))
        except Exception:
            pass
    ql = os.path.join(d, n + ".quant.log")
    if os.path.exists(ql):
        t = open(ql, errors="replace").read()
        m = re.search(r"quant size\s*=\s*([0-9.]+) MiB", t)
        if m:
            it["quant_size_mib"] = float(m.group(1))
    items.append(it)
im = os.path.join(d, "imatrix.log")
meta = {"model": label}
if os.path.exists(im):
    t = open(im, errors="replace").read()
    m = re.search(r"computing over (\d+) chunks", t)
    meta["imatrix_chunks"] = int(m.group(1)) if m else None
json.dump({"meta": meta, "items": items}, open(outp, "w"), indent=1)
print(len(items), "items")
