"""Write the numbers into the prose at build time, so they are plain text (readable without JavaScript and visible to
html_utils/ledger.py check). Each <span data-rd="name"></span> in ../../index.html gets its value, computed from the
window.VE data the page itself embeds (so the prose and the charts cannot disagree). Run by ../build.sh.
Usage: python3 fill_prose.py [--list]
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); PAGE = os.path.join(HERE, "..", "..", "index.html")
page = open(PAGE, encoding="utf-8").read()
VE = json.loads(re.search(r"window\.VE=(\{.*?\});\n", page, re.S).group(1))
pc = lambda x: format(x * 100, ".1f") + "%"
F = {}
R = VE["res"]
F["clip448cos"] = format(R["clip"]["runs"]["448"]["cos_to_224"], ".2f"); F["clip448min"] = format(R["clip"]["runs"]["448"]["cos_to_224_min"], ".2f")
F["sig448cos"] = format(R["siglip"]["runs"]["448"]["cos_to_224"], ".2f")
for k, r in VE["probes"]["encoders"].items():
    kk = k.replace("_", "")
    F[kk + "500"] = pc(r["linear_probe"]["500"]["mean"]); F[kk + "16"] = pc(r["linear_probe"]["16"]["mean"]); F[kk + "1"] = pc(r["linear_probe"]["1"]["mean"])
    F[kk + "knn"] = pc(r["knn20"]); F[kk + "p10"] = pc(r["img2img"]["p@10"]); F[kk + "map"] = pc(r["img2img"]["map"])
MS = VE["maeShuffle"]
F["maeInPlace"] = str(MS["patches_in_place_default"]); F["maeP0"] = format(MS["patch0_cos_default_vs_fixed"], ".2f"); F["maeMean"] = format(MS["mean_cos_default_vs_fixed"], ".6f")
for w, v in VE["layer"].items():
    a = v["per_layer_mean_patch"]; b = max(range(len(a)), key=lambda i: (a[i], -i))
    F[w + "Lbest"] = str(b); F[w + "LbestAcc"] = pc(a[b]); F[w + "Llast"] = pc(a[-1]); F[w + "Lpool"] = pc(v["pooled_output"]); F[w + "L0"] = pc(a[0])
if "--list" in sys.argv:
    print(json.dumps(F, indent=0)); sys.exit()
miss = set()
def sub(m):
    k = m.group(1)
    if k not in F:
        miss.add(k); return m.group(0)
    return '<span data-rd="' + k + '">' + F[k] + "</span>"
page, n = re.subn(r'<span data-rd="(\w+)">[^<]*</span>', sub, page)
open(PAGE, "w", encoding="utf-8").write(page)
print(f"fill_prose: {n} numbers written" + (f"; unknown names {sorted(miss)}" if miss else ""))
sys.exit(1 if miss else 0)
