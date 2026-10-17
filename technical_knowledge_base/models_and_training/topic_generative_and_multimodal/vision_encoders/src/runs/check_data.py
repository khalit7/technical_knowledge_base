"""The page embeds exactly the recorded data, and the numbers written into the prose match it.

1. window.VE in ../../index.html against out/*.json (probes, textq, flops, layerwise, mae_shuffle, resolution runs,
   neighbour indices) and against the Vision lab's recorded outputs it reuses.
2. Every number typed into the HTML text is recomputed from the recorded data (a list of claims below); numbers
   filled in by the page's script (data-rd spans) come straight from window.VE and are checked by (1).
Usage: python3 check_data.py   (plain Python 3, no third-party packages)
"""
import json, os, re, base64, struct, sys, html as H

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "out")
ROOT = os.path.join(HERE, "..", "..", "..", "src")
page = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
m = re.search(r"window\.VE=(\{.*?\});\n", page, re.S); VE = json.loads(m.group(1))
O = lambda n: json.load(open(os.path.join(OUT, n)))
bad = []; n = 0


def same(a, b, what):
    global n; n += 1
    if a != b:
        bad.append(what)


same(VE["probes"], O("probes.json"), "probes"); same(VE["textq"], O("textq.json"), "textq"); same(VE["flops"], O("flops.json"), "flops")
same(VE["maeShuffle"], O("mae_shuffle.json"), "mae_shuffle")
for w in ("clip", "siglip", "dino", "mae"):
    same(VE["layer"][w], O(f"layerwise_{w}.json"), "layer " + w)
res = O("resolution.json")
for w in ("clip", "siglip"):
    same(VE["res"][w]["runs"], res[w]["runs"], "res " + w); same(VE["res"][w]["err"], res[w]["error_without_interpolation"], "err " + w)
nb = O("neighbours.json")
for w, v in nb["nn"].items():
    raw = base64.b64decode(VE["nb"]["idx"][w]); idx = list(struct.unpack("<%dH" % (len(raw) // 2), raw))
    same(idx, [i for row in v["idx"] for i in row], "nb idx " + w)
same(VE["nb"]["gallery_test_idx"], nb["gallery_test_idx"], "gallery")
labc = json.load(open(os.path.join(ROOT, "vision", "out", "analyse_clip.json")))
same(VE["lab"]["clip_sim16"], labc["sim16"], "lab sim16")
zs = json.load(open(os.path.join(ROOT, "vision", "out", "zeroshot.json")))
for w in ("clip", "siglip"):
    same(VE["probes"]["encoders"][w]["linear_probe"], zs[w]["linear_probe"], "probe equals Vision lab " + w)

# ---- prose claims
text = H.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<script.*?</script>", " ", page, flags=re.S)))
text = re.sub(r"\s+", " ", text)
F = {r["name"].split(" (")[0]: r for r in VE["flops"]["rows"]}
vb, db = VE["flops"]["rows"][0], VE["flops"]["rows"][2]
rc = O("recompute.json")["prose"]
S = labc["sim16"]; diag = [S[i][i] for i in range(16)]; off = [S[i][j] for i in range(16) for j in range(16) if i != j]
P = VE["probes"]["encoders"]; L = VE["layer"]
r448c, r448s = res["clip"]["runs"]["448"], res["siglip"]["runs"]["448"]
best = lambda a: max(range(len(a)), key=lambda i: a[i])
claims = [
    ("17.56 to 78.49 GMACs, a factor of 4.47", rc["vitb16_224"] == 17.56 and rc["vitb16_448"] == 78.49 and rc["ratio_448_224"] == 4.47),
    ("4% of a ViT-B/16", round(vb["attn_scores_share"] * 100) == 4), ("23% of DINOv2 B/14", round(db["attn_scores_share"] * 100) == 23),
    ("16.9 GMACs, which matches the count without attention scores (16.85; with them, 17.56)", vb["counted_gmacs_sdpa"] == 16.848 and vb["formula_gmacs"] == 17.563 and vb["published_gmacs"] == 16.9),
    ("151.7, which matches the count with them (151.57; without, 116.98)", db["formula_gmacs"] == 151.574 and db["counted_gmacs_sdpa"] == 116.979),
    ("at 117.0 instead of 151.6", round(db["counted_gmacs_sdpa"], 1) == 117.0 and round(db["formula_gmacs"], 1) == 151.6),
    ("0.24 GMACs more", round(VE["flops"]["rows"][4]["counted_gmacs_eager"] - VE["flops"]["rows"][4]["formula_gmacs"], 2) == 0.24),
    ("all 16 true pairs pass and 1 of the 240 wrong pairs", sum(d >= 0.28 for d in diag) == 16 and sum(o >= 0.28 for o in off) == 1),
    ("s04 (0.284)", round(diag[labc["keys"].index("s04_typographic")], 3) == 0.284),
    ("about 0.28 to 0.38", round(min(diag), 2) == 0.28 and round(max(diag), 2) == 0.38),
    ("cosine 0.91 to the 224-pixel one for CLIP at 448", round(r448c["cos_to_224"], 2) == 0.91),
    ("CLIP still 15 of 16, SigLIP 2 still 16 of 16", all(res["clip"]["runs"][k]["matched"] == 15 for k in ("224", "336", "448")) and all(res["siglip"]["runs"][k]["matched"] == 16 for k in ("224", "336", "448"))),
    ("about a point and a half lower", abs((P["siglip"]["linear_probe"]["500"]["mean"] - P["clip"]["linear_probe"]["500"]["mean"]) * 100 - 1.5) < 0.1),
    ("by 0.4 to 1.1 points over the last block", round(min((max(L[w]["per_layer_mean_patch"]) - L[w]["per_layer_mean_patch"][-1]) * 100 for w in L), 1) == 0.4 and round(max((max(L[w]["per_layer_mean_patch"]) - L[w]["per_layer_mean_patch"][-1]) * 100 for w in L), 1) == 1.1),
    ("MAE's mean patch token taken before the final LayerNorm probes at 85.2%", round(L["mae"]["per_layer_mean_patch"][-1] * 100, 1) == 85.2),
    ("against 80.6% after it", round(P["mae_mean"]["linear_probe"]["500"]["mean"] * 100, 1) == 80.6),
    ("block-0 probe reaches only about 20%", round(L["siglip"]["per_layer_mean_patch"][0] * 100) == 20),
    ("CLIP 61.3 to 66.7%, SigLIP 2 20.0 to 74.5%", round(min(zs["clip"]["acc"].values()) * 100, 1) == 61.3 and round(max(zs["clip"]["acc"].values()) * 100, 1) == 66.7 and round(min(zs["siglip"]["acc"].values()) * 100, 1) == 20.0 and round(max(zs["siglip"]["acc"].values()) * 100, 1) == 74.5),
    ("underfit by 5 to 8 points", round((zs["clip"]["linear_probe"]["500"]["mean"] - zs["clip"]["linear_probe_unscaled_500"]) * 100) == 8 and round((zs["siglip"]["linear_probe"]["500"]["mean"] - zs["siglip"]["linear_probe_unscaled_500"]) * 100) == 5),
    ("15 to 23 times", True), ("up to 4.7 times", True), ("in 8 of the 16 images", True),
]
# the token-norm claims, from the embedded ratios (x 10)
def ratios(w):
    e = VE["dense"]["enc"][w]; g = e["grid"]; P_ = g * g; raw = base64.b64decode(e["normRatio"])
    return [[raw[i * P_ + k] / 10 for k in range(P_)] for i in range(16)]
sg, dn, dr, cl, ma = (ratios(w) for w in ("siglip", "dino", "dinoreg", "clip", "mae"))
mx = lambda R: [max(r) for r in R]
claims[-3] = ("15 to 23 times", round(min(mx(sg))) == 15 and round(max(mx(sg)) + 1e-9) in (22, 23))
claims[-2] = ("up to 4.7 times", round(max(mx(dn)), 1) == 4.7)
claims[-1] = ("in 8 of the 16 images", sum(m_ > 3 for m_ in mx(dn)) == 8)
claims.append(("(at most 1.5 times)", max(max(mx(dr)), max(mx(cl)), max(mx(ma))) <= 1.5))
G = VE["dense"]["enc"]["siglip"]["grid"]
claims.append(("three bright fixed slots in every image", all(all(r[a * G + b] > 3 for a, b in ((0, 1), (0, 13), (3, 13))) for r in sg) and sum(1 for r in sg if sum(v > 3 for v in r) == 4 and r[0 * G + 11] > 3) == 5))
for s, ok in claims:
    n += 1
    if s not in text and s not in page:   # numbers inside script-built captions are in the raw page
        bad.append("text missing: " + s)
    elif not ok:
        bad.append("number wrong: " + s)
print(f"{n} checks, {len(bad)} failures")
for b_ in bad:
    print("  ", b_)
sys.exit(1 if bad else 0)
