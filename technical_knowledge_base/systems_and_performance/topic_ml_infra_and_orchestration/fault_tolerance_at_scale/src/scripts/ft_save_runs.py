#!/usr/bin/env python3
"""Copy the native runs from scratch into src/runs/<name>.json, columnar and lossless for every logged field.
usage: python3 ft_save_runs.py <scratch runs dir> <src/runs>
Per run: steps; per rank: loss, compute_ms, comm_ms, step_ms, lgh (local-gradient fingerprint, sdc modes);
global (identical on every rank, checked here): gloss, gnorm, cks_agree; the flip record if any.
"""
import glob, json, math, os, sys

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for d in sorted(glob.glob(os.path.join(src, "*"))):
    files = sorted(glob.glob(os.path.join(d, "rank*.jsonl")))
    if len(files) != 4:
        continue
    name = os.path.basename(d)
    R = {}
    for f in files:
        for line in open(f):
            r = json.loads(line); R.setdefault(r["step"], {})[r["rank"]] = r
    steps = sorted(R)
    out = {"name": name, "world": 4, "steps": steps, "ranks": {}, "flip": None,
           "env": "measured on Apple M1 Pro, natively (macOS, torch 2.14.1, gloo on loopback), shared machine"}
    for k in range(4):
        rr = [R[s][k] for s in steps]
        o = {f: [r[f] for r in rr] for f in ("loss", "compute_ms", "comm_ms", "step_ms")}
        if "lgh" in rr[0]:
            o["lgh"] = [r["lgh"] for r in rr]
        out["ranks"][k] = o
    def same(f):
        vals = []
        for s in steps:
            v = [R[s][k].get(f) for k in range(4)]
            ok = all((isinstance(x, float) and math.isnan(x) and isinstance(v[0], float) and math.isnan(v[0])) or x == v[0] for x in v)
            if not ok:
                raise SystemExit(f"{name}: {f} differs across ranks at step {s}: {v}")
            vals.append(v[0])
        return vals
    out["gloss"] = same("gloss")
    if "gnorm" in R[steps[0]][0]:
        out["gnorm"] = same("gnorm"); out["cks_agree"] = same("cks_agree")
    for s in steps:
        for k in range(4):
            if "flip" in R[s][k]:
                out["flip"] = {"step": s, "rank": k, **R[s][k]["flip"]}
    txt = json.dumps(out, separators=(",", ":")).replace("NaN", "null")
    open(os.path.join(dst, name + ".json"), "w").write(txt)
    print(name, len(steps), "steps", len(txt), "bytes")
