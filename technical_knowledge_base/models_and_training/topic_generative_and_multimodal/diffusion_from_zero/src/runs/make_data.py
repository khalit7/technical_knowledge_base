"""Build parts/20_js_dz_0data.js (window.DZ) and out/page_data.json from out/ and the root lab's recordings (CPU).

Inputs: out/samplers.json, extra.json, guide.json, sd.json, sd/*.webp, gmm_toy.json, recompute.json, train_*.json,
inputs/published.json; GM_SCRATCH/dz/strips_*.npz; the root's src/diff/out/samples_eps.json, strips_eps.npz and
page_data.json (the lab's numbers and strips, reused, never recomputed). Sentences that quote numbers are written here
from the data (notes()), so the page cannot drift from the recordings; check_data.py verifies both.
"""
import base64, io, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dz_env import OUT, ROOT_SRC, dz_scratch
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
LAB = os.path.join(ROOT_SRC, "diff", "out")
J = lambda p: json.load(open(p))


def sprite(a):
    """uint8 [n, 28, 28] -> PNG data URI, one row, 16 grey levels (the lab's format)."""
    from PIL import Image
    a = np.asarray(a, dtype=np.uint8).reshape(-1, 28, 28)
    g = np.concatenate(list(a), axis=1)
    q = (g.astype(np.int32) * 15 + 127) // 255
    im = Image.fromarray(q.astype(np.uint8), "P"); im.putpalette(sum([[v * 17] * 3 for v in range(16)], []))
    buf = io.BytesIO(); im.save(buf, "PNG", optimize=True, bits=4)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def fmt(v, d=1):
    return f"{v:,.{d}f}"


def pct(v, d=1):
    return f"{100 * v:.{d}f}%"


SAMPLERS = [  # key, label, colour, dash, note
    ("ddpm", "DDPM (ancestral)", "#c2703a", None, "The lab's hand-written ancestral sampler (sigma^2 = beta tilde)."),
    ("ddim", "DDIM (eta 0)", "#2f6fb5", None, "Deterministic; identical to Euler in sigma (the lab measured them within 0.2 FD)."),
    ("eta0.5", "DDIM eta 0.5", "#6a8fc4", "4 3", "Half of DDPM's fresh noise at every step (dz_samplers.ddim_eta)."),
    ("eta1.0", "DDIM eta 1 (= DDPM)", "#e0a070", "2 3", "Algebraically DDPM; the page's own code, matching the lab's DDPM to 2.6e-5 on 16 images."),
    ("ddpm_clip", "DDPM + clip x0", "#a0522d", "6 2", "DDPM with the clean-image guess clamped to [-1, 1] at each step (diffusers' clip_sample=True)."),
    ("dpm", "DPM-Solver++ 2M", "#3f7f56", None, "diffusers DPMSolverMultistepScheduler defaults, trailing spacing."),
    ("dpm2m_karras", "DPM-Solver++ 2M, Karras sigmas", "#7fb08a", "4 3", "The same solver with Karras et al.'s sigma spacing (rho = 7)."),
    ("dpm2m_sde", "DPM-Solver++ 2M SDE", "#1f5f3a", "2 3", "The stochastic variant (algorithm_type sde-dpmsolver++)."),
    ("unipc", "UniPC", "#8a5cb8", None, "UniPCMultistepScheduler defaults (bh2, order 2)."),
    ("euler", "Euler", "#3a9aa8", "4 3", "EulerDiscreteScheduler (deterministic); equal to DDIM."),
    ("euler_a", "Euler ancestral", "#b8983a", None, "EulerAncestralDiscreteScheduler: Euler plus fresh noise."),
    ("heun", "Heun (2nd order)", "#d14d72", None, "HeunDiscreteScheduler: two network calls per step except the last."),
]


def main():
    lab = J(os.path.join(LAB, "samples_eps.json")); lab_pd = J(os.path.join(LAB, "page_data.json"))
    lab_st = dict(np.load(os.path.join(LAB, "strips_eps.npz")))
    sm, ex, gu, sd = (J(os.path.join(OUT, f + ".json")) for f in ("samplers", "extra", "guide", "sd"))
    toy, rc, pub = J(os.path.join(OUT, "gmm_toy.json")), J(os.path.join(OUT, "recompute.json")), J(os.path.join(HERE, "..", "inputs", "published.json"))
    tr_more, tr_bad = J(os.path.join(OUT, "train_more.json")), J(os.path.join(OUT, "train_bad.json"))
    st = {}
    for f in ("samplers", "extra", "guide"):
        st.update(dict(np.load(dz_scratch(f"strips_{f}.npz"))))
    strips = {}

    def add_strip(key, arr):
        strips[key] = sprite(arr); return key

    # ---------------- samplers, model m4 (the lab checkpoint) ----------------
    m4 = {k: {} for k, *_ in SAMPLERS}
    name_map = {"ddpm": "ddpm", "ddim": "ddim", "dpm": "dpm", "euler": "euler"}
    for r in lab["samplers"]:
        k = name_map[r["sampler"]]
        m4[k][r["steps"]] = {"fd": r["fd"], "acc": r["acc"], "div": r["div"], "sec": r["sec"], "nfe": r["steps"], "src": "lab",
                             "strip": add_strip(f"lab_{k}_{r['steps']}", lab_st[f"{r['sampler']}_{r['steps']}"])}
    alias = {"eta0.0": "ddim", "eta0.5": "eta0.5", "eta1.0": "eta1.0", "ddpm_clip": "ddpm_clip", "dpm2m": "dpm"}
    for r in sm["runs"]:
        s = r["sampler"]
        if s.startswith("lab_"):
            continue
        k = alias.get(s, s)
        n = r["steps"]
        m4.setdefault(k, {})[n] = {"fd": r["fd"], "acc": r["acc"], "div": r["div"], "sec": r["sec"], "nfe": r.get("nfe", n),
                                   "src": "page", "strip": add_strip(r["name"], st[r["name"]])}
    # DDPM at 2 steps = eta 1 at 2 steps (same algorithm; the lab did not run 2 steps)
    if 2 in m4["eta1.0"] and 2 not in m4["ddpm"]:
        m4["ddpm"][2] = dict(m4["eta1.0"][2], note="eta 1")
    m8 = {"ddim": {}, "ddpm": {}}
    for r in ex["runs"]:
        if r["sampler"] in ("m8_ddim", "m8_ddpm"):
            m8[r["sampler"][3:]][r["steps"]] = {"fd": r["fd"], "acc": r["acc"], "div": r["div"], "sec": r["sec"], "nfe": r["steps"],
                                                 "src": "page", "strip": add_strip(r["name"], st[r["name"]])}
    byname = {r["name"]: r for r in sm["runs"] + ex["runs"] + gu["runs"]}

    # ---------------- guidance on the tiny model ----------------
    G = {"cfg": [], "rescale": [], "interval": [], "ddpm_cfg": [], "auto": []}
    for r in lab["cfg"]:
        if r["scale"] == 0:
            continue
        G["cfg"].append({"scale": r["scale"], "fd": r["fd"], "acc": r["acc"], "div": r["div"], "white": r["white_frac"],
                         "strip": add_strip(f"lab_cfg_{r['scale']}", lab_st[f"cfg_{r['scale']}"])})
    for r in gu["runs"]:
        if r["kind"] in G:
            G[r["kind"]].append({"scale": r["scale"], "fd": r["fd"], "acc": r["acc"], "div": r["div"], "white": r["white"],
                                 "strip": add_strip(r["name"], st[r["name"]])})
    one = {"scale": 1, "fd": lab["cfg"][1]["fd"], "acc": lab["cfg"][1]["acc"], "div": lab["cfg"][1]["div"], "white": lab["cfg"][1]["white_frac"], "strip": "lab_cfg_1"}
    for k in ("rescale", "interval", "auto"):
        G[k] = [one] + sorted(G[k], key=lambda r: r["scale"])
    G["ddpm_cfg"] = sorted(G["ddpm_cfg"], key=lambda r: r["scale"])

    # ---------------- bugs ----------------
    ok = byname.get("raw_ddim_50")
    ddim50 = m4["ddim"][50]
    bugs = [{"label": "Correct (DDIM 50, EMA)", "fd": ddim50["fd"], "acc": ddim50["acc"], "div": ddim50["div"], "strip": ddim50["strip"],
             "cap": "The lab's checkpoint sampled correctly: DDIM, 50 steps, EMA weights."}]
    for key, label, cap in [("bug_noinit_50", "Forgot init_noise_sigma", "Euler (sigma space) started from unit noise instead of noise of size sigma_max."),
                            ("bug_int_t_50", "Integer timestep", "The network trained on t / 1000 was given t."),
                            ("bug_cosine_50", "Cosine schedule at sampling", "A linear-schedule model sampled with the cosine schedule's alpha bar."),
                            ("raw_ddim_50", "Raw weights, not EMA", "The training weights at step 4,000 instead of their moving average.")]:
        r = byname[key]
        bugs.append({"label": label, "fd": r["fd"], "acc": r["acc"], "div": r["div"], "strip": add_strip(key, st[key]), "cap": cap})

    # ---------------- SD images ----------------
    img = {}
    for r in sd["runs"]:
        img[r["key"]] = "data:image/webp;base64," + base64.b64encode(open(os.path.join(OUT, "sd", r["key"] + ".webp"), "rb").read()).decode()
    caps = {}
    for r in sd["runs"]:
        k = r["key"]
        if k.startswith("cfg"):
            caps[k] = f"CFG {r['scale']}" + (f", rescale {r['rescale']}" if r["rescale"] else ", no rescale")
        elif k.startswith("neg_"):
            caps[k] = f"CFG 7.5, negative prompt \"{r['neg']}\""
        elif k.startswith("interval"):
            caps[k] = f"CFG {r['scale']} only for sigma in (0.28, 5.42]: {r['guided_steps']} of 25 steps guided"
        elif k == "ztsnr_eps":
            caps[k] = "DDIM trailing, rescale_betas_zero_snr=True on the epsilon model"
        elif k == "ddim_trailing_ref":
            caps[k] = "DDIM trailing, SD 1.5's own schedule"
        elif k.startswith("dpm_"):
            caps[k] = f"DPM-Solver++ {r['steps']} steps, CFG 7.5"
        elif k.startswith("lcm_"):
            caps[k] = f"LCM-LoRA {r['steps']} step{'s' if r['steps'] > 1 else ''}, guidance {r['scale']}"
        r["cap"] = caps.get(k, k)
    scales = sorted({r["scale"] for r in sd["runs"] if r["key"].startswith("cfg")})
    sdsets = [{"label": "CFG scale, no rescale", "keys": [f"cfg{s}_r0.0" for s in scales],
               "note": "Plain classifier-free guidance at four scales; saturation climbs with the scale."},
              {"label": "CFG rescale 0.7", "keys": [f"cfg{s}_r0.7" for s in scales], "note": "The same four scales with guidance_rescale = 0.7."},
              {"label": "Guidance interval", "keys": ["cfg7.5_r0.0"] + [f"interval{s}" for s in (7.5, 12, 20)],
               "note": "Guidance only on the steps whose sigma lies in (0.28, 5.42], the interval Kynkaanniemi et al. used for SD-XL; the first image is full guidance at 7.5 for comparison. Hand-written loop, checked against the pipeline."},
              {"label": "Negative prompts", "keys": ["cfg7.5_r0.0", "neg_blurry", "neg_clouds"], "note": "The negative prompt replaces the empty prompt in the unconditional branch."},
              {"label": "Zero terminal SNR", "keys": ["ddim_trailing_ref", "ztsnr_eps"], "note": "SD 1.5 is an epsilon model; switching the schedule to zero terminal SNR without fine-tuning."},
              {"label": "Few steps: DPM vs LCM-LoRA", "keys": [k for n in (2, 4, 8) for k in (f"dpm_{n}", f"lcm_{n}")] + ["lcm_1", "lcm_4_cfg2"],
               "note": "DPM-Solver++ with CFG 7.5 against LCM-LoRA with guidance off, at equal steps; plus LCM at 1 step and at 4 steps with guidance 2."}]
    out = {"samplers": [{"key": k, "label": l, "color": c, "dash": d, "note": n} for k, l, c, d, n in SAMPLERS],
           "samp": {"m4": {k: v for k, v in m4.items() if v}, "m8": m8},
           "walks": {k: {"label": dict((a, b) for a, b, *_ in SAMPLERS).get({"dpm2m": "dpm"}.get(k, k), k), "t": v["t"]} for k, v in sm["walks"].items()},
           "guide": G, "bugs": bugs, "sd": {"runs": sd["runs"]}, "img": img, "sdsets": sdsets,
           "rescale_scales": scales, "lcm_steps": [1, 2, 4, 8],
           "test": lab_pd["test"], "edm": {"pmean": -1.2, "pstd": 1.2}, "strips": strips}
    import notes
    f, txt, dist, right = notes.build(dict(locals(), SAMPLERS=SAMPLERS))
    out.update({"f": f, "txt": txt, "dist": dist, "right": right,
                "num": {"floor": lab["floor_fd"], "real_acc": float(lab_pd["f"]["real_acc"]), "real_div": float(lab_pd["f"]["real_div"])}})
    js = "window.DZ=" + json.dumps(out, separators=(",", ":")) + ";\n"
    open(os.path.join(HERE, "..", "parts", "20_js_dz_0data.js"), "w").write(js)
    json.dump(out, open(os.path.join(OUT, "page_data.json"), "w"), separators=(",", ":"))
    print("page data", len(js) // 1024, "KB; strips", len(strips), "; images", len(img))


if __name__ == "__main__":
    main()
