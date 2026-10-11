"""Speed pass 2 (scripts/speedpass.sh) -> results/speed_<tag>.json: per file the llama-bench samples and the load before.
usage: python3 -I collect_speed.py <INF/lo/runs/speed/<tag>/p2> <out.json>"""
import json, os, sys
d, outp = sys.argv[1:3]
out = {}
for f in sorted(os.listdir(d)):
    if not f.endswith(".bench.json"):
        continue
    i = f[:-11]
    try:
        rows = json.load(open(os.path.join(d, f)))
    except Exception:
        continue
    e = {}
    for r in rows:
        k = "pp" if r["n_prompt"] else "tg"
        e[k] = [round(x, 2) for x in r["samples_ts"]]
    ld = json.load(open(os.path.join(d, i + ".load")))
    e["load"] = ld["before"]["loadavg"][0]
    out[i] = e
json.dump(out, open(outp, "w"), indent=0)
print(len(out), "files")
