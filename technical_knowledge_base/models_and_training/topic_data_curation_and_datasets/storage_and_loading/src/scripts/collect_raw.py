"""Copy the run outputs (outside the repo) into src/data/raw/, dropping the large per-document arrays, so the page's data
is rebuilt from committed files.   python3 collect_raw.py <outputs dir>"""
import json, os, sys
O = sys.argv[1]; H = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(H, "..", "data", "raw"); os.makedirs(R, exist_ok=True)
J = lambda n: json.load(open(os.path.join(O, n)))
def save(n, d): json.dump(d, open(os.path.join(R, n), "w"), indent=0, separators=(",", ":"), ensure_ascii=False)
for n in ("formats_2k.json", "formats_50k.json"):
    d = J(n); lq = d["tokens"].pop("lens_q"); d["tokens"].pop("lens_g")
    if n == "formats_2k.json": save("lens2k.json", lq)
    save(n, d)
l = J("lens50k.json"); l.pop("lens"); save("tok_lens50k.json", l)
for n in ("pack2k.json", "pack50k.json", "shuffle.json", "resume.json", "loader_speed.json", "megatron_demo.json"): save(n, J(n))
f = J("fineweb_footer.json")
rg = f.pop("rgs"); cols = {}
for g in rg:
    for c, v in g["cols"].items():
        a = cols.setdefault(c, {"comp": 0, "unc": 0, "codec": v["codec"]}); a["comp"] += v["comp"]; a["unc"] += v["unc"]
f["rows_per_group"] = sorted({g["rows"] for g in rg}); f["columns"] = cols; f["first_groups"] = rg[:2]
f["group_bytes_min"] = min(sum(v["comp"] for v in g["cols"].values()) for g in rg); f["group_bytes_max"] = max(sum(v["comp"] for v in g["cols"].values()) for g in rg)
save("fineweb_footer.json", f)
print(sorted(os.listdir(R)), sum(os.path.getsize(os.path.join(R, x)) for x in os.listdir(R)))
