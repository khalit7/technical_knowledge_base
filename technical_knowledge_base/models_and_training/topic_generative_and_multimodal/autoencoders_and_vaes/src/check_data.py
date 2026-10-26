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
# 1b. the Latent lab subset (AVL, written by absorb_lab.py) equals the root's committed data part (src/retired/parts/31_js_lt_0data.js), field by field
js2 = open(os.path.join(HERE, "parts", "22_js_av_1lab.js")).read()
A = json.loads(js2[js2.index("window.AVL=") + len("window.AVL="):].rstrip().rstrip(";"))
RET = os.path.join(ROOT_SRC, "retired", "parts", "31_js_lt_0data.js")
if os.path.exists(RET):
    r = open(RET).read()
    LTD = json.loads(r[r.index("=") + 1:r.rindex(";")].strip())
else:  # the root's retired Latent lab data part is not in the repo (never committed): compare against AVL itself, and say so
    print("SKIP: root src/retired/parts/31_js_lt_0data.js missing; the Latent lab comparisons (1b, 5) check AVL against itself")
    LTD = {"tiny": {"runs": A["runs"]}, "img": A["img"], "sd_vae": A["sd"], "sd_scale": A["scale"], "perc": A["perc"], "scatter": A["scatter"]}
for k, v in A["runs"].items():
    for f, x in v.items():
        ok(LTD["tiny"]["runs"][k][f] == x, f"lab run {k}.{f}")
for k, v in A["img"].items():
    ok(LTD["img"][k] == v, f"lab sprite {k}")
for f in ("scaling_factor", "all16", "decode_mistakes", "noising"):
    ok(LTD["sd_vae"][f] == A["sd"][f], f"lab sd {f}")
ok(LTD["sd_scale"] == A["scale"] and LTD["perc"] == A["perc"] and LTD["scatter"] == A["scatter"], "lab scale, perc, scatter")
ok(abs(A["derived"]["snr_ratio"] - (1 / 0.18215) ** 2) < 0.06, "SNR ratio 30.1 = (1/0.18215)^2")
# 2. every data-av path in the parts resolves
ROOTS = {"lt": D["lt"], "elbo": D["elbo"]["runs"], "pc": D["pc"]["runs"], "quant": D["quant"], "derived": D["derived"], "tok": D["tok"]["m"], "lab": A}
paths = set()
for f in glob.glob(os.path.join(HERE, "parts", "*.html")):
    paths |= set(re.findall(r'data-av="([^"]+)"', open(f).read()))
for p in sorted(paths):
    parts = p.split("."); o = ROOTS.get(parts[0])
    for q in parts[1:]:
        o = o.get(q) if isinstance(o, dict) else (o[int(q)] if isinstance(o, list) and q.isdigit() else None)
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
# 5. typed numbers absorbed from the Latent lab, against its data (needs the root data part)
if os.path.exists(RET):
    ok(LTD["sd_vae"]["images"]["p01_cat"]["fp32"]["psnr"] == 30.92 and min(v["fp32"]["psnr"] for k, v in LTD["sd_vae"]["images"].items() if k.startswith("p")) == 26.66, "SD 1.5 photographs 26.7 to 30.9 dB")
    syn = [LTD["sd_vae"]["images"][k]["fp32"]["psnr"] for k in ("s01_shapes", "s03_text", "s05_chart", "s06_clock")]
    ok(round(min(syn), 1) == 32.3 and round(max(syn), 1) == 37.5, "SD 1.5 graphics 32.3 to 37.5 dB")
    ok(LTD["tiny"]["runs"]["vq_restart"]["test_psnr_db"] == 23.8 and LTD["tiny"]["runs"]["ae16"]["test_psnr_db"] == 21.4, "hero PSNRs")
# 5b. the MNIST VAE and beta sweep (window.AVM, moved from the Math page 2026-10-26) equal vi_mnist/make_data.py's output,
# and the numbers typed into those two closed blocks match the recorded run
js3 = open(os.path.join(HERE, "parts", "22_js_av_2mnist.js")).read()
M = json.loads(js3[js3.index("window.AVM=") + len("window.AVM="):].rstrip().rstrip(";"))
vo = load("vi_mnist/vae_out.json"); vg = load("vi_mnist/vae_gap.json")
ok(M["curve"] == vo["z2"]["curve"] and M["epochs"] == vo["z2"]["epochs"] and M["gap"] == vg, "AVM equals vi_mnist outputs")
last = M["epochs"][-1]
ok(f"{last[1]:.2f}" == "143.98" and f"{last[2]:.2f}" == "6.22" and f"{last[1] + last[2]:.2f}" == "150.20", "MNIST test rec 143.98, KL 6.22, neg ELBO 150.20")
ok([f"{v:.3f}" for v in M["sdmean"]] == ["0.066", "0.086"], "encoder sd 0.066 and 0.086")
typed = {0.5: (55.1, 34.4, 16, -83.9), 1: (60.5, 27.1, 16, -81.7), 2: (71.1, 19.6, 16, -82.9), 4: (93.7, 11.4, 14, -91.3), 8: (125.1, 5.5, 8, -111.3)}
for b in M["beta"]:
    t = typed[b["beta"]]
    ok((round(b["rec"], 1), round(b["kl"], 1), b["active"], round(b["iwae1000"], 1)) == t, f"beta {b['beta']} row typed as {t}")
# 6. the static fill: no data-av span left empty in the built page
built = open(os.path.join(HERE, "..", "index.html")).read()
ok(not re.search(r'data-av="[^"]+"[^>]*></span>', built), "empty data-av span in index.html (run build.sh)")
print("OK" if not bad else f"{bad} FAILURES")
