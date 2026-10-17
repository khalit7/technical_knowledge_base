"""Confirm the page embeds exactly the recorded outputs, that every data-av span resolves, and that the numbers typed
into the prose match their sources. CPU, no scratch folder needed.  python3 check_data.py
"""
import glob, json, math, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.join(HERE, "..", "..", "src")
js = open(os.path.join(HERE, "parts", "22_js_av_0data.js")).read()
D = json.loads(js[js.index("window.AVD=") + len("window.AVD="):].rstrip().rstrip(";"))
bad = 0


def ok(cond, msg):
    global bad
    if not cond:
        bad += 1
        print("FAIL", msg)


def load(p):
    return json.load(open(os.path.join(HERE, p)))


# 1. embedded copies equal the recorded files
ok(D["quant"] == load("out/quant.json"), "quant.json differs")
ok(D["elbo"] == load("out/elbo.json"), "elbo.json differs")
ok(D["pc"] == load("out/collapse.json"), "collapse.json differs")
tiny = json.load(open(os.path.join(ROOT_SRC, "latent", "out", "tiny.json")))
for k, v in D["lt"]["vae16_b1p0"].items():
    src = tiny["runs"]["vae16_b1p0"]["prior"]["fd"] if k == "prior_fd" else tiny["runs"]["vae16_b1p0"][k]
    ok(v == src, f"lt.{k}")
if os.path.exists(os.path.join(HERE, "out", "tok", "metrics.json")):
    met = load("out/tok/metrics.json")
    for k, m in D["tok"]["m"].items():
        j = load(f"out/tok/{k}.json")
        ok(m["latent_shape"] == j["latent_shape"] and m["params"] == j["params"] and m["rt"] == j["roundtrip_s_median"], f"tok {k} meta")
        if not m["nan"]:
            ok(m["mean"] == met[k]["mean"], f"tok {k} mean")
            ok([r["psnr"] for r in m["per"]] == [r["psnr"] for r in met[k]["per_image"]], f"tok {k} per-image")
# 2. every data-av path in the parts resolves
ROOTS = {"lt": D["lt"], "elbo": D["elbo"]["runs"], "pc": D["pc"]["runs"], "quant": D["quant"], "derived": D["derived"], "tok": D["tok"]["m"]}
paths = set()
for f in glob.glob(os.path.join(HERE, "parts", "*.html")):
    paths |= set(re.findall(r'data-av="([^"]+)"', open(f).read()))
for p in sorted(paths):
    parts = p.split("."); o = ROOTS.get(parts[0])
    for q in parts[1:]:
        o = o.get(q) if isinstance(o, dict) else None
    ok(o is not None, f"unresolved data-av {p}")
print(len(paths), "data-av paths checked")
# 3. derived values
v = tiny["runs"]["vae16_b1p0"]
ok(abs(D["derived"]["bpd_vae16"] - v["test_neg_elbo_nats_beta1"] / 1024 / math.log(2)) < 1e-3, "bpd")
ok(abs(D["derived"]["kl_bits_vae16"] - v["test_kl_nats"] / math.log(2)) < 0.06, "kl bits")
# 4. numbers typed into the prose, against their sources
log = [json.loads(l) for l in open(os.path.join(HERE, "runs", "c_anneal.jsonl"))]
at400 = [d for d in log if d["step"] == 400][0]
ok(round(at400["kl"]) == 13 and at400["active_batch"] == 16, "annealing: about 13 nats and 16 dims at step 400")
q = D["quant"]["runs"]
ok(q["vq_plain"]["test_psnr_db"] == tiny["runs"]["vq_plain"]["test_psnr_db"], "lab vq_plain PSNR reproduced")
ok(q["vq_restart"]["test_psnr_db"] == tiny["runs"]["vq_restart"]["test_psnr_db"], "lab vq_restart PSNR reproduced")
rng = [r["test_psnr_db"] for k, r in q.items() if k.startswith(("q_", "vq_"))]
ok(22 <= min(rng) and max(rng) <= 25.5, f"tiny tokenizer PSNR range typed as 22 to 25 dB: {min(rng)} to {max(rng)}")
print("OK" if not bad else f"{bad} FAILURES")
