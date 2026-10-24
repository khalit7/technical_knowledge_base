"""Confirm the page embeds exactly the Vision lab's recorded outputs, and that numbers in the prose match them.
Usage: python3 check_data.py   (plain Python, no dependencies)
"""
import json, os, re, html as H
HERE = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
# Since 2026-10-24 the patch, loss and probe prose lives on Vision encoders (the root keeps the zero-shot study);
# prose numbers are looked for on both pages, the data on the root.
prose_pages = page + open(os.path.join(HERE, "..", "..", "vision_encoders", "index.html"), encoding="utf-8").read()
m = re.search(r"window\.VS_DATA=(\{.*?\});\n", page, re.S)
D = json.loads(m.group(1))
O = lambda n: json.load(open(os.path.join(HERE, "out", n)))
A = {w: O(f"analyse_{w}.json") for w in ("clip", "siglip")}; Z = O("zeroshot.json")
E = {w: O(f"embed_fmnist_{w}.json") for w in A}; C = {w: O(f"diag_case_{w}.json") for w in A}
bad = 0
def eq(name, a, b, tol=6e-5):
    global bad
    fa, fb = json.dumps(a), json.dumps(b)
    ok = fa == fb
    if not ok:
        try:
            na = [float(x) for x in re.findall(r"-?\d+\.?\d*(?:e-?\d+)?", fa)]; nb = [float(x) for x in re.findall(r"-?\d+\.?\d*(?:e-?\d+)?", fb)]
            ok = len(na) == len(nb) and all(abs(x - y) <= tol for x, y in zip(na, nb))
        except Exception:
            ok = False
    if not ok:
        bad += 1; print("MISMATCH", name)
for w in A:
    m_ = D["models"][w]
    eq(w + " acc", m_["acc"], Z[w]["acc"]); eq(w + " lp", m_["lp"], Z[w]["linear_probe"]); eq(w + " confusion", m_["confusion"], Z[w]["confusion"])
    eq(w + " sim16", m_["sim16"], A[w]["sim16"]); eq(w + " probes", m_["probes"], A[w]["probes"])
    eq(w + " scale", m_["scale"], A[w]["logit_scale"]); eq(w + " bias", m_["bias"], A[w].get("logit_bias"))
    eq(w + " check", m_["check"], A[w]["patch_check"]); eq(w + " case", m_["case"], C[w]["acc"])
    eq(w + " ips", m_["fmnist_ips"], E[w]["images_per_second"])
eq("captions", D["captions"], A["clip"]["captions"])
# prose: every (text, value) pair below must appear in the tab and agree with the data
txt = H.unescape(re.sub(r"<[^>]+>", "", re.sub(r"<script.*?</script>|<style.*?</style>", " ", prose_pages, flags=re.S)))
pc = lambda x, d=1: f"{x * 100:.{d}f}%"
a, z = A, Z
cases = [
    (pc(z["clip"]["acc"]["official|bw"]), "CLIP best"), (pc(z["siglip"]["acc"]["plain|ensemble"]), "SigLIP best"),
    (pc(min(z["clip"]["acc"].values())), "CLIP min"), (pc(z["clip"]["acc"]["official|ensemble"]), "CLIP ensemble"),
    (pc(min(v for k, v in z["siglip"]["acc"].items() if k.startswith("official|"))) + " to " + pc(max(v for k, v in z["siglip"]["acc"].items() if k.startswith("official|"))), "SigLIP official range"),
    (pc(min(v for k, v in z["siglip"]["acc"].items() if k.startswith("official_lower|"))) + " to " + pc(max(v for k, v in z["siglip"]["acc"].items() if k.startswith("official_lower|"))), "SigLIP lower range"),
    (pc(C["siglip"]["acc"]["official"]), "diag"), (pc(C["siglip"]["acc"]["official_lower"]), "diag"), (pc(C["siglip"]["acc"]["plain"]), "diag"), (pc(C["siglip"]["acc"]["plain_capitalised"]), "diag"),
    (pc(C["clip"]["acc"]["official"]), "diag"), (pc(C["clip"]["acc"]["plain"]), "diag"),
    (pc(z["clip"]["linear_probe"]["16"]["mean"]), "probe16"), (pc(z["siglip"]["linear_probe"]["16"]["mean"]), "probe16"),
    (pc(z["clip"]["linear_probe"]["1"]["mean"]), "probe1"), (pc(z["siglip"]["linear_probe"]["1"]["mean"]), "probe1"),
    (pc(z["clip"]["linear_probe"]["500"]["mean"]), "probe500"), (pc(z["siglip"]["linear_probe"]["500"]["mean"]), "probe500"),
    (pc(z["clip"]["linear_probe_unscaled_500"]), "unscaled"), (pc(z["siglip"]["linear_probe_unscaled_500"]), "unscaled"),
    (pc(D["fmclf"], 2), "fmclf"),
    (str(z["clip"]["confusion"]["official|bw"][4][2]) + " of 1,000 coats", "conf"), (str(z["clip"]["confusion"]["official|bw"][6][2]) + " of 1,000 shirts", "conf"),
    (str(z["siglip"]["confusion"]["plain|ensemble"][4][2]) + " coats", "conf"), (str(z["siglip"]["confusion"]["plain|ensemble"][0][6]) + " T-shirts", "conf"),
    (f"{sum(r[0] for r in z['siglip']['confusion']['official|bare']):,}", "tshirt sink"),
    (f"t = {a['siglip']['logit_scale']:.2f}", "scale"), (f"{a['siglip']['logit_bias']:.2f}".replace("-", "−"), "bias"),
    (f"{a['clip']['probes']['typo'][2][1]:.4f} for dog against {a['clip']['probes']['typo'][2][0]:.4f}", "typo"),
    (f"{a['clip']['probes']['typo'][3][2]:.4f} against {a['clip']['probes']['typo'][3][0]:.4f}", "typo bird"),
    (f"cat {a['clip']['probes']['typo'][4][0]:.4f}, car {a['clip']['probes']['typo'][4][3]:.4f}", "typo car"),
    (f"{a['clip']['probes']['typo'][1][0]:.4f} against {a['clip']['probes']['typo'][0][0]:.4f}", "typo cat"),
    (f"from {a['siglip']['probes']['typo'][0][1]:.4f} to {a['siglip']['probes']['typo'][2][1]:.4f}", "siglip dog"),
    (f"{round(E['clip']['images_per_second'])} Fashion-MNIST images per second", "ips"), (f"{round(E['siglip']['images_per_second'])} per second", "ips"),
]
import statistics
S = A["clip"]["sim16"]; d = [S[i][i] for i in range(16)]; off = (sum(map(sum, S)) - sum(d)) / 240
cases += [(f"average a cosine of {sum(d)/16:.3f} and the other pairs {off:.3f}", "clip diag")]  # wording on Vision encoders since 2026-10-24
S = A["siglip"]["sim16"]; d = [S[i][i] for i in range(16)]; off = (sum(map(sum, S)) - sum(d)) / 240
cases += [(f"{sum(d)/16:.3f} and {off:.3f}".replace("-", "−"), "siglip diag")]
for s, name in cases:
    if s not in txt:
        bad += 1; print("PROSE MISSING", name, repr(s))
print("checked", len(cases), "prose numbers;", "OK" if not bad else f"{bad} problems")
