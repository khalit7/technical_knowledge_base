"""Build parts/22_js_av_0data.js (window.AVD) from the recorded outputs. CPU only.

  GM_SCRATCH=... nice -n 15 $GM_SCRATCH/venv/bin/python -I make_data.py
Inputs: out/quant.json, out/elbo.json, out/collapse.json, out/tok/*.json (this page), the root Latent lab's
out/tiny.json, and the image arrays in GM_SCRATCH (av/*.npz, av/tok/*.npz, lt/tiny.npz, the 512 px test images).
Every number the page shows comes from these files; check_data.py confirms the embedded copy is exact.
"""
import base64, glob, io, json, math, os, sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.join(HERE, "..", "..", "src")
sys.path.insert(0, os.path.join(ROOT_SRC, "data"))
from common import scratch, test16
import pretrained


def grey_uri(a):
    """28x28 uint8 -> PNG data URI with a 16-level palette (4-bit), a few hundred bytes."""
    q = (np.asarray(a, dtype=np.float64) / 17).round().astype(np.uint8)          # 0..15
    im = Image.fromarray(q, "P")
    im.putpalette(sum([[v * 17] * 3 for v in range(16)], []))
    b = io.BytesIO(); im.save(b, "PNG", optimize=True, bits=4)
    return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()


def webp_uri(im, q=90):
    b = io.BytesIO(); im.save(b, "WEBP", quality=q, method=6)
    return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()


def load(p):
    return json.load(open(os.path.join(HERE, p)))


TOK = [  # key, label, short, kind, normalisation text
    ("sd15_fp32", "SD 1.5 VAE", "SD 1.5", "KL, f8", "multiply by 0.18215 (diffusers default; the config has no key)"),
    ("sdxl_fp32", "SDXL VAE", "SDXL", "KL, f8", "multiply by 0.13025 (config)"),
    ("sdxl_fp16", "SDXL VAE in float16", "SDXL fp16", "KL, f8", "as SDXL"),
    ("sdxlfix_fp16", "SDXL VAE fp16-fix, in float16", "SDXL fix", "KL, f8", "as SDXL"),
    ("flux1_fp32", "FLUX.1 VAE (as shipped with Z-Image-Turbo)", "FLUX.1", "KL, f8", "subtract 0.1159, multiply by 0.3611 (config)"),
    ("flux2_fp32", "FLUX.2 VAE (from FLUX.2 [klein] 4B)", "FLUX.2", "KL, f8", "2 &times; 2 patchify to 128 channels, then batch-norm running mean and std (pipeline_flux2.py)"),
    ("qwen_fp32", "Qwen-Image VAE", "Qwen-Image", "KL, f8, causal 3-D", "per-channel (z &minus; mean) / std, 16 values each in the config"),
    ("dcae_bf16", "DC-AE f32c32 (Sana 1.1)", "DC-AE", "deep compression, f32", "multiply by 0.41407 (config)"),
    ("amused_fp32", "aMUSEd VQGAN", "aMUSEd VQ", "VQ, f16", "none: integer tokens, decoded from codebook vectors"),
    ("movq_fp32", "Kandinsky 2.2 MoVQ", "MoVQ", "VQ, f8", "none here (Kandinsky's own pipeline decodes unquantized latents)"),
]
CROPS = {"p01_cat": ((96, 140), "Cat (fur, eye)"), "s03_text": ((90, 175), "Text card"),
         "p04_hubble": ((176, 176), "Hubble field"), "g05_stopsign": ((150, 210), "Stop sign")}
CS = 160


def main():
    D = {}
    # ---- the parent Latent lab (read only)
    tiny = json.load(open(os.path.join(ROOT_SRC, "latent", "out", "tiny.json")))
    v = tiny["runs"]["vae16_b1p0"]
    D["lt"] = {"vae16_b1p0": {k: v[k] for k in ("test_nll_nats", "test_kl_nats", "test_neg_elbo_nats_beta1", "active_units", "test_psnr_db", "params")},
               "floor_fd": tiny["floor_real_val_1000"]["fd"]}
    D["lt"]["vae16_b1p0"]["prior_fd"] = v["prior"]["fd"]
    neg = v["test_neg_elbo_nats_beta1"]
    D["derived"] = {"bpd_vae16": round(neg / (1024 * math.log(2)), 3), "kl_bits_vae16": round(v["test_kl_nats"] / math.log(2), 1)}
    lt_npz = np.load(scratch("lt", "tiny.npz"))
    x16, y16, idx16 = test16()
    img = {"orig16": [grey_uri(a) for a in x16], "quant": {}, "elbo": {}, "pc": {}}
    # ---- quantizers
    q = load("out/quant.json"); D["quant"] = q
    D["derived"]["gan_psnr_cost"] = round(q["runs"]["vq_restart"]["test_psnr_db"] - q["runs"]["g_lpips"]["test_psnr_db"], 2)
    D["derived"]["l2_unused"] = q["runs"]["q_vq_l2"]["K"] - q["runs"]["q_vq_l2"]["codes_used_test"]
    qa = np.load(scratch("av", "quant.npz"))
    for name in q["runs"]:
        img["quant"][name] = [grey_uri(a) for a in qa[name + "_rec16"]]
    # ---- ELBO units
    e = load("out/elbo.json"); D["elbo"] = e
    ea = np.load(scratch("av", "elbo.npz"))
    for name in e["runs"]:
        img["elbo"][name + "_rec16"] = [grey_uri(a) for a in ea[name + "_rec16"][:8]]
    img["elbo"]["vae16_b1p0_rec16"] = [grey_uri(a) for a in lt_npz["vae16_b1p0_rec16"][:8]]
    # ---- posterior collapse
    c = load("out/collapse.json"); D["pc"] = c
    ca = np.load(scratch("av", "collapse.npz"))
    for name in c["runs"]:
        for part in ("own", "prior", "bern"):
            img["pc"][f"{name}_{part}"] = [grey_uri(a) for a in ca[f"{name}_{part}"]]
    # ---- tokenizer comparator
    if not os.path.exists(os.path.join(HERE, "out", "tok", "metrics.json")):     # comparator not run yet
        D["tok"] = {"order": [], "m": {}, "images": [], "crops": {}, "crop_images": [], "crop_names": {}}
        return finish(D, img)
    met = load("out/tok/metrics.json")
    keys = [k for k, _, _, _, _ in TOK if os.path.exists(os.path.join(HERE, "out", "tok", k + ".json"))]
    T = {"order": keys, "m": {}, "images": [r["key"] for r in met[keys[0]]["per_image"]], "crops": {},
         "crop_images": list(CROPS), "crop_names": {k: v[1] for k, v in CROPS.items()}}
    for k, label, short, kind, norm in TOK:
        if k not in keys:
            continue
        j = load(f"out/tok/{k}.json")
        nan = any(s["nan"] for s in j["per_image"])
        m = {"label": label, "short": short, "kind": kind, "norm": norm, "dtype": j["dtype"], "latent_shape": j["latent_shape"],
             "numbers": j["numbers_per_image"], "params": j["params"], "rt": j["roundtrip_s_median"], "peak_mib": j["peak_mps_mib"],
             "repo": j["repo"], "revision": j["revision"][:12], "licence": j["licence"], "nan": nan,
             "nan_images": sum(s["nan"] for s in j["per_image"]),
             "raw_std": float(np.sqrt(np.mean([s["raw_std"] ** 2 for s in j["per_image"]]))),
             "lat_std": float(np.sqrt(np.mean([s["lat_std"] ** 2 for s in j["per_image"]]))),
             "lat_mean": float(np.mean([s["lat_mean"] for s in j["per_image"]]))}
        for f in ("raw_std", "lat_std", "lat_mean"):
            m[f] = round(m[f], 4)
        if not nan:
            m["mean"] = met[k]["mean"]; m["per"] = [{kk: r[kk] for kk in ("psnr", "ssim", "lpips")} for r in met[k]["per_image"]]
        if "K" in j:
            m["K"] = j["K"]; m["codes_used_16"] = j["codes_used_16"]
        if k + "_noshift" in met:
            m["noshift"] = met[k + "_noshift"]["mean"]
        T["m"][k] = m
    origs = {kk: im for kk, im, _ in pretrained.test_images(512)}
    for ck, ((x0, y0), _) in CROPS.items():
        box = (x0, y0, x0 + CS, y0 + CS)
        T["crops"][ck] = {"orig": webp_uri(origs[ck].crop(box))}
        for k in keys:
            if T["m"][k]["nan"]:
                continue
            d = np.load(scratch("av", "tok", k + ".npz"))
            i = list(d["keys"]).index(ck)
            T["crops"][ck][k] = webp_uri(Image.fromarray(d["rec"][i]).crop(box))
    D["tok"] = T
    D["derived"]["sdxlfix_gap"] = round(abs(T["m"]["sdxl_fp32"]["mean"]["psnr"] - T["m"]["sdxlfix_fp16"]["mean"]["psnr"]), 2)
    return finish(D, img)


def finish(D, img):
    D["img"] = img
    js = "// generated by src/make_data.py from the recorded outputs; do not edit\nwindow.AVD=" + json.dumps(D, separators=(",", ":")) + ";\n"
    open(os.path.join(HERE, "parts", "22_js_av_0data.js"), "w").write(js)
    print("22_js_av_0data.js", len(js), "bytes")


if __name__ == "__main__":
    main()
