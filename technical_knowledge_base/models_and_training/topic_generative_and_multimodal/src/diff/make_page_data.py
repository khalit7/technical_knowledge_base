"""Build the Diffusion lab's page data (parts/32_js_df_0data.js) from the recorded outputs in out/.

    GM_SCRATCH=... python -I make_page_data.py     (CPU only: also scores 1,000 real validation images for the reference lines)
Inputs: out/train_eps.json, out/train_v.json, out/samples_eps.json, out/samples_v.json, out/strips_*.npz, out/sd_lab.json,
out/sd/*.webp. Writes out/page_data.json (the same object, for check_data.py) and the JS part.
"""
import base64, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
import numpy as np

O = os.path.join(HERE, "out")
J = lambda n: json.load(open(os.path.join(O, n)))
b64 = lambda a: base64.b64encode(np.ascontiguousarray(a, dtype=np.uint8).tobytes()).decode()


def sprite(a, cols, levels=256):
    """uint8 images [..., 28, 28] -> PNG data URI of a grid with `cols` tiles per row (16 grey levels if levels=16)."""
    import io
    from PIL import Image
    a = np.asarray(a, dtype=np.uint8).reshape(-1, 28, 28)
    n = len(a); rows = (n + cols - 1) // cols
    g = np.zeros((rows * 28, cols * 28), np.uint8)
    for i in range(n):
        r, c = divmod(i, cols); g[r * 28:(r + 1) * 28, c * 28:(c + 1) * 28] = a[i]
    buf = io.BytesIO()
    if levels == 16:
        q = (g.astype(np.int32) * 15 + 127) // 255
        im = Image.fromarray(q.astype(np.uint8), "P"); im.putpalette(sum([[v * 17] * 3 for v in range(16)], []))
        im.save(buf, "PNG", optimize=True, bits=4)
    else:
        Image.fromarray(g, "L").save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def g(x, nd=2):
    return f"{x:,.{nd}f}"


def real_reference():
    """Accuracy and diversity of 1,000 real validation images, scored exactly as the samples are (CPU)."""
    import torch
    from common import cap_threads, load_split
    import fid
    cap_threads(4)
    clf = fid.load_classifier("cpu")
    xv, yv = load_split("val")
    f, lg = fid.classifier_features(xv[:1000], clf, "cpu")
    f = torch.as_tensor(np.asarray(f)); y = torch.as_tensor(yv[:1000])
    acc = float((torch.as_tensor(np.asarray(lg)).argmax(1) == y).float().mean())
    div = float(np.mean([torch.pdist(f[y == c]).mean().item() for c in range(10)]))
    return round(acc, 4), round(div, 3)


def main():
    from common import test16
    te, tl, _ = test16()
    tr = {k: J(f"train_{k}.json") for k in ("eps", "v")}
    se, sv = J("samples_eps.json"), J("samples_v.json")
    sd = J("sd_lab.json")
    ste = dict(np.load(os.path.join(O, "strips_eps.npz")))
    stv = dict(np.load(os.path.join(O, "strips_v.npz")))
    ab = __import__("torch").cumprod(1 - __import__("torch").linspace(1e-4, 0.02, 1000, dtype=__import__("torch").float64), 0).numpy()
    sl = np.cumprod(1 - np.linspace(0.00085 ** 0.5, 0.012 ** 0.5, 1000) ** 2)
    f_cos = lambda t: np.cos((t / 1000 + 0.008) / 1.008 * np.pi / 2) ** 2
    cb = np.minimum(1 - f_cos(np.arange(1, 1001)) / f_cos(np.arange(1000)), 0.999); ac = np.cumprod(1 - cb)
    snr1 = lambda a: int(np.nonzero(a / (1 - a) < 1)[0][0])
    real_acc, real_div = real_reference()

    d = {"test": b64(te[:10]), "train": {}, "samp": [], "sampv": [], "st": {}, "cfg": [], "traj": {}, "sd": {}}
    for k in ("eps", "v"):
        d["train"][k] = {"curve": [[r["step"], r["loss"]] for r in tr[k]["log"]],
                         "per_t": [[r["t"], r["loss"], r["eps_mse"], r["x0_mse"]] for r in tr[k]["per_t"]]}
    for r in se["samplers"]:
        d["samp"].append({"s": r["sampler"], "n": r["steps"], "fd": r["fd"], "acc": r["acc"], "div": r["div"], "sec": r["sec"]})
    for r in sv["samplers"]:
        d["sampv"].append({"s": r["sampler"], "n": r["steps"], "fd": r["fd"], "acc": r["acc"], "div": r["div"], "sec": r["sec"]})
    for k, a in ste.items():
        if not k.startswith("traj") and not k.startswith("euler") and k != "dpm_250":
            d["st"][k] = sprite(a, 10, 16)
    for k, a in stv.items():
        if k.startswith("mismatch"):
            d["st"][k.replace("mismatch", "mm")] = sprite(a, 10, 16)
        elif k in ("ddim_1", "ddim_50"):
            d["st"]["v_" + k] = sprite(a, 10, 16)
    for r in se["cfg"]:
        d["cfg"].append({"s": r["scale"], "fd": r["fd"], "acc": r["acc"], "div": r["div"], "white": r["white_frac"]})
    K = 3                                      # images shown: dress, sandal, bag (the 4th, ankle boot, is left out for size)
    for n in ("1", "4", "20", "50"):
        fr = list(range(1, int(n) + 1)) if n != "50" else list(range(2, 51, 2))     # 50 steps: every 2nd frame, for size
        sel = lambda a: a[[s - 1 for s in fr], :K]
        d["traj"][n] = {"t": se["traj_t"][n], "frames": fr, "xt": sprite(sel(ste[f"traj_{n}_xt"]), K, 16),
                        "x0": sprite(sel(ste[f"traj_{n}_x0"]), K, 16)}
    d["traj"]["d20"] = {"t": se["traj_t"]["20"], "frames": list(range(1, 21)), "xt": sprite(ste["traj_ddpm20_xt"][:, :K], K, 16)}
    d["traj"]["noise"] = sprite(ste["traj_noise"][:K], K, 16); d["traj"]["k"] = K
    imgs = {}
    for r in sd["steps"] + sd["cfg"]:
        imgs[r["key"]] = "data:image/webp;base64," + base64.b64encode(open(os.path.join(O, "sd", r["key"] + ".webp"), "rb").read()).decode()
    keep = ("key", "sampler", "steps", "scale", "sec", "timesteps", "median_step_s", "mean_saturation", "clipped_frac", "prompt")
    d["sd"] = {"timing": sd["timing"], "steps": [{k: r[k] for k in keep if k in r} for r in sd["steps"]],
               "cfg": [{k: r[k] for k in keep if k in r} for r in sd["cfg"]], "img": imgs}

    S = {(r["sampler"], r["steps"]): r for r in se["samplers"]}
    V = {(r["sampler"], r["steps"]): r for r in sv["samplers"]}
    C = {r["scale"]: r for r in se["cfg"]}
    t = tr["eps"]
    f = {"date": t["date"], "train_min": g(t["seconds"] / 60, 1), "train_steps": f"{t['config']['steps']:,}",
         "train_sps": g(t["steps_per_s"], 2), "train_mem": f"{t['peak_mps_mb'] / 1024:.1f} GB", "params": f"{t['config']['params']:,}",
         "floor_fd": g(se["floor_fd"], 1), "real_acc": f"{real_acc}", "real_div": g(real_div, 2),
         "ddim_check": f"{se['check_ddim_vs_diffusers_maxabs']:.1e}",
         "ms_1": g(se["ms_per_eval"]["1"], 1), "ms_1000": g(se["ms_per_eval"]["1000"], 0),
         "sqrtab_lin_500": f"{ab[500] ** .5:.2f}", "sqrtab_cos_500": f"{ac[500] ** .5:.2f}", "sqrtab_lin_999": f"{ab[999] ** .5:.4f}",
         "inv_sqrtab_lin_999": f"{1 / ab[999] ** .5:.0f}", "sqrtab_sd_999": f"{sl[999] ** .5:.3f}", "pct_sd_999": f"{100 * sl[999] ** .5:.1f}%",
         "snr1_lin": str(snr1(ab)), "snr1_cos": str(snr1(ac)), "pct_noisy_lin": f"{100 * (1000 - snr1(ab)) / 1000:.0f}%",
         "eps999": g(t["per_t"][-1]["loss"], 5), "torch": t["torch"], "diffusers": sd["diffusers"],
         "prompt_g03": sd["prompts"]["g03"], "prompt_x07": sd["prompts"]["x07"]}
    for (s, n), r in S.items():
        f[f"fd_{s}_{n}"] = g(r["fd"], 1); f[f"acc_{s}_{n}"] = f"{100 * r['acc']:.1f}%"; f[f"sec_{s}_{n}"] = g(r["sec"], 1)
    for (s, n), r in V.items():
        f[f"v_fd_{s}_{n}"] = g(r["fd"], 1); f[f"v_acc_{s}_{n}"] = f"{100 * r['acc']:.1f}%"
    for s, r in C.items():
        k = str(s).replace(".0", "") if s == int(s) else str(s)
        f[f"acc_cfg_{k}"] = f"{100 * r['acc']:.1f}%"; f[f"div_cfg_{k}"] = g(r["div"], 2); f[f"fd_cfg_{k}"] = g(r["fd"], 1)
        f[f"white_cfg_{k}"] = f"{100 * r['white_frac']:.1f}%"
    for r in sv["mismatch"]:
        f[f"mm_fd_{r['steps']}"] = g(r["fd"], 1); f[f"mm_acc_{r['steps']}"] = f"{100 * r['acc']:.1f}%"
    tm = sd["timing"]
    f["sd_pass"] = g(tm["unet_pass_batch1_s"], 3)
    f["sd_b2"] = g(tm["unet_pass_batch2_s"], 3); f["sd_vae"] = g(tm["vae_decode_s"], 3); f["sd_text"] = g(tm["text_encoder_s"], 3)
    f["sd_sum25"] = g(tm["text_encoder_s"] + 25 * tm["unet_pass_batch2_s"] + tm["vae_decode_s"], 2)
    for r in sd["cfg"]:
        f[f"sat_{r['key']}"] = g(r["mean_saturation"], 2); f[f"sec_{r['key']}"] = g(r["sec"], 1)
    f["sd_peak"] = f"{sd['peak_mps_mb'] / 1024:.2f} GB"
    f["sd_img25"] = g(next(r["sec"] for r in sd["steps"] if r["sampler"] == "dpm" and r["steps"] == 25), 1)
    lead1 = next(r for r in sd["steps"] if r["sampler"] == "ddim_leading" and r["steps"] == 1)
    f["ddim1_t"] = str(lead1["timesteps"][0])
    # plateau: fewest steps at which DDIM is within 10% of its best FD
    dd = sorted((n, r["fd"]) for (s, n), r in S.items() if s == "ddim")
    best = min(x[1] for x in dd); f["plateau_steps"] = str(next(n for n, x in dd if x <= 1.1 * best))
    notes = json.load(open(os.path.join(HERE, "notes.json")))        # prose written after reading the results; {key} = a fact
    import re
    f.update({k: re.sub(r"\{([\w.]+)\}", lambda m: f[m.group(1)], v) for k, v in notes.items()})
    d["f"] = f
    # numbers for the Reading tab (src/read/todo.md keys steps, cfg, sd_time_more, sd_sec_per_pass): copied there by its owner
    M = '<span class="meas">measured</span>'
    ser = lambda smp, ns: " / ".join(f[f"fd_{smp}_{n}"] for n in ns)
    rd = {
        "steps": f"Tiny DDPM on Fashion-MNIST (1,000 samples per point; FD in the classifier's feature space, where 1,000 real images score {f['floor_fd']}): DDPM at 1 / 4 / 10 / 50 / 250 / 1,000 steps FD {ser('ddpm', [1, 4, 10, 50, 250, 1000])}; DDIM at 1 / 4 / 10 / 50 / 250 steps {ser('ddim', [1, 4, 10, 50, 250])}; DPM-Solver++ reaches {f['fd_dpm_20']} at 20 steps. On this briefly trained model the stochastic DDPM sampler beats DDIM from 4 steps up, the opposite of the DDIM paper's well-trained CIFAR-10 result. One network evaluation takes {f['ms_1']} ms for one image and {f['ms_1000']} ms for 1,000 {M} on Apple M1 Pro (MPS). On Stable Diffusion v1.5 with DPM-Solver++ and guidance 7.5, 1 to 4 steps give a blur, 10 a usable image, 25 and 50 nearly the same image, at {f['sd_b2']} s per guided step {M}; DDIM with SD 1.5's default 'leading' spacing starts its single step at t = {f['ddim1_t']} and returns noise.",
        "cfg": f"Stable Diffusion v1.5, \"{f['prompt_g03']}\", seed 0, 25 steps: the empty prompt draws an unrelated scene, s = 1 a coast with no clear lighthouse, s = 2 and above the lighthouse, past 10 a deep orange sky and harsh contrast (mean colour saturation {f['sat_cfg_1']} at s = 1, {f['sat_cfg_7.5']} at 7.5, {f['sat_cfg_20']} at 20) {M}. On the tiny class-conditional model, class accuracy goes from {f['acc_cfg_1']} at s = 1 to {f['acc_cfg_5']} at s = 5, FD is best at s = 2 ({f['fd_cfg_2']}) and diversity falls from {f['div_cfg_1']} to {f['div_cfg_15']} at s = 15 {M}.",
        "sd_time_more": f"Split: one U-Net pass {f['sd_pass']} s at batch 1 and {f['sd_b2']} s for a guided step's batch of two; VAE decode {f['sd_vae']} s; text encoder {f['sd_text']} s; 25 guided steps {f['sd_img25']} s for the whole pipeline against {f['sd_sum25']} s summed from the pieces {M} (Apple M1 Pro, fp16, attention slicing).",
        "sd_sec_per_pass": float(f["sd_pass"]),
        "t_diff": "about 20 minutes (19.5 at 200 words per minute, measured by check_page.mjs on 2026-10-17), plus about 3 for the folded interview answers and code",
    }
    json.dump(rd, open(os.path.join(O, "read_numbers.json"), "w"), indent=1, ensure_ascii=False)
    json.dump(d, open(os.path.join(O, "page_data.json"), "w"), separators=(",", ":"))
    js = ("// ---- Diffusion lab data: written by src/diff/make_page_data.py from src/diff/out/; do not edit by hand ----\n"
          "window.DFD=" + json.dumps(d, separators=(",", ":")) + ";\n")
    p = os.path.join(HERE, "..", "parts", "32_js_df_0data.js")
    open(p, "w").write(js)
    print("wrote", p, len(js), "bytes;", {k: len(json.dumps(v)) for k, v in d.items()})


if __name__ == "__main__":
    main()
