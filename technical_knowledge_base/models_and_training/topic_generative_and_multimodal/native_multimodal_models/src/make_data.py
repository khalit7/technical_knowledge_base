"""Build parts/22_js_nm_0data.js (window.NM) from the recorded runs (CPU only; prefix nm).

  GM_SCRATCH=... nice -n 15 $GM_SCRATCH/venv/bin/python -I make_data.py
Inputs: out/tokenize.json, out/samples.json, out/mistakes.json, ar/runs/*.json (this folder); the Diffusion and Flow
labs' recorded results (root src/diff/out, src/flow/out) for the equal-compute comparison; images from
GM_SCRATCH/nm/samples.npz and mistakes.npz, the labs' strips, and the tokenizers (to decode the 16 fixed test images).
Images are embedded as small WebP sprites (one row of 28x28 tiles). Also writes out/images/*.webp copies (small) so
the page can be rebuilt without the scratch folder.
"""
import base64, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.join(HERE, "..", "..", "src")
sys.path[:0] = [os.path.join(ROOT_SRC, "data"), os.path.join(HERE, "ar")]
import numpy as np
from PIL import Image

OUT = os.path.join(HERE, "out")
IMG = os.path.join(OUT, "images"); os.makedirs(IMG, exist_ok=True)
J = lambda p: json.load(open(p))


def sprite(arr, name, q=82):
    """arr (n, 28, 28) uint8 -> one row WebP, saved under out/images and returned as a data URI."""
    arr = np.asarray(arr, dtype=np.uint8)
    row = np.concatenate(list(arr), 1)
    path = os.path.join(IMG, name + ".webp")
    Image.fromarray(row, "L").save(path, "WEBP", quality=q, method=6)
    return "data:image/webp;base64," + base64.b64encode(open(path, "rb").read()).decode()


def from_saved(name):
    path = os.path.join(IMG, name + ".webp")
    return "data:image/webp;base64," + base64.b64encode(open(path, "rb").read()).decode()


def derived(NM, tok, smp, runs, df, fw):
    """Numbers the prose quotes, each with its formula (checked again by checks/check_data.py)."""
    near = lambda a, b: abs(float(a) - float(b)) < 1e-9
    find = lambda lst, **kw: next(r for r in lst if all(near(r[k], v) for k, v in kw.items()))
    F_unet = tok["flops_unet_fwd_1"]
    D, L, T = 192, 6, 64
    lin_ar = tok["flops_ar1000_fwd_1"]                                  # linear layers, one 64-token pass (FlopCounterMode)
    att_cached = sum(4 * L * D * (i + 1) for i in range(T))             # one query per step against i+1 cached keys
    ar_sample = lin_ar + att_cached                                     # per image, with the KV cache
    mask_pass = runs["mask_fsq1000"]["fwd_flops_per_image"]
    dec = tok["tok"]["fsq1000"]["flops_decode_1"]
    t1 = find(smp["ar_temp"], T=1.0); g = find(smp["ar_temp"], T=0)
    cfg_all = smp["ar_cfg"] + [dict(t1)]
    best = min(cfg_all, key=lambda r: r["fd"])
    m8 = find(smp["mask"], steps=8, s=1.0)
    mbest = min(smp["mask"], key=lambda r: r["fd"])
    dd = {(x["sampler"], x["steps"]): x for x in df["samplers"]}
    fe = {x["steps"]: x for x in fw["samplers"] if x["solver"] == "euler"}
    dcfg2 = next(c for c in df["cfg"] if c["scale"] == 2)
    fcfg = next(c for c in fw["cfg"] if near(c["scale"], 1.5))
    rows = [
        {"name": "Autoregressive over FSQ-1000 tokens, s = 1", "train_s": runs["ar_fsq1000"]["seconds"], "params": runs["ar_fsq1000"]["params"],
         "train_flops": runs["ar_fsq1000"]["train_flops_approx_3x_fwd"], "calls": 64, "flops": ar_sample + dec, "fd": t1["fd"], "acc": t1["acc"], "sec": t1["sec_batch1000"]},
        {"name": "Autoregressive over FSQ-1000 tokens, best guidance s = %g" % best["s"], "train_s": runs["ar_fsq1000"]["seconds"], "params": runs["ar_fsq1000"]["params"],
         "train_flops": runs["ar_fsq1000"]["train_flops_approx_3x_fwd"], "calls": 64, "flops": 2 * ar_sample + dec, "fd": best["fd"], "acc": best["acc"], "sec": best["sec_batch1000"]},
        {"name": "Masked (MaskGIT-style), 8 rounds, s = 1", "train_s": runs["mask_fsq1000"]["seconds"], "params": runs["mask_fsq1000"]["params"],
         "train_flops": runs["mask_fsq1000"]["train_flops_approx_3x_fwd"], "calls": 8, "flops": 8 * mask_pass + dec, "fd": m8["fd"], "acc": m8["acc"], "sec": m8["sec_batch1000"]},
        {"name": "DDPM, 1,000 steps (Diffusion lab)", "train_s": NM["ref"]["df_train_seconds"], "params": tok["params_unet"],
         "train_flops": 3 * F_unet * 128 * 4000, "calls": 1000, "flops": 1000 * F_unet, "fd": dd[("ddpm", 1000)]["fd"], "acc": dd[("ddpm", 1000)]["acc"], "sec": dd[("ddpm", 1000)]["sec"]},
        {"name": "DDIM, 50 steps, guidance s = 2 (Diffusion lab)", "train_s": NM["ref"]["df_train_seconds"], "params": tok["params_unet"],
         "train_flops": 3 * F_unet * 128 * 4000, "calls": 50, "flops": 2 * 50 * F_unet, "fd": dcfg2["fd"], "acc": dcfg2["acc"], "sec": None},
        {"name": "Flow matching, Euler 50 steps, s = 1 (Flow lab)", "train_s": NM["ref"]["fw_train_seconds"], "params": tok["params_unet"],
         "train_flops": 3 * F_unet * 128 * 4000, "calls": 50, "flops": 50 * F_unet, "fd": fe[50]["fd"], "acc": fe[50]["acc"], "sec": fe[50]["sec"]},
        {"name": "Flow matching, Euler 50 steps, s = 1.5 (Flow lab)", "train_s": NM["ref"]["fw_train_seconds"], "params": tok["params_unet"],
         "train_flops": 3 * F_unet * 128 * 4000, "calls": 50, "flops": 2 * 50 * F_unet, "fd": fcfg["fd"], "acc": fcfg["acc"], "sec": None},
    ]
    vq1 = find(smp["vq_cfg"], s=1.0)
    vqb = min(smp["vq_cfg"], key=lambda r: r["fd"])
    ev = runs["ar_fsq1000"]["eval"]
    return {
        "nll_ar": ev["val_ema"]["nll_bits_per_image"], "nll_ar_train5k": ev["train5k_ema"]["nll_bits_per_image"],
        "nll_vq": runs["ar_vq128"]["eval"]["val_ema"]["nll_bits_per_image"], "bpp": ev["val_ema"]["bits_per_position"],
        "greedy": g, "t1": t1, "topk10": find(smp["ar_topk"], k=10), "cfg0": find(smp["ar_cfg"], s=0), "mask_r1": find(smp["mask"], steps=1, s=1.0), "mask_r32": find(smp["mask"], steps=32, s=1.0), "fw15": {"fd": fcfg["fd"], "acc": fcfg["acc"]}, "best_cfg": best, "mask8": m8, "mask_best": mbest, "vq1": vq1, "vq_best": vqb,
        "ar_sample_flops": ar_sample, "ar_sample_flops_attention": att_cached, "mask_pass_flops": mask_pass, "decode_flops": dec,
        "rows": rows, "cmp": {"flops_ratio_ddpm": round(1000 * F_unet / (ar_sample + dec)), "flops_ratio_flow50": round(50 * F_unet / (ar_sample + dec)),
                              "tok_train_flops": 3 * (tok["tok"]["fsq1000"]["flops_encode_1"] + dec) * 128 * 5000},
        "batch1": smp.get("ar_batch1_seconds"), "ddpm_ms_batch1": df["ms_per_eval"]["1"],
    }


def main():
    have_scratch = bool(os.environ.get("GM_SCRATCH")) and os.path.exists(os.path.join(os.environ["GM_SCRATCH"], "nm", "samples.npz"))
    tok = J(os.path.join(OUT, "tokenize.json"))
    smp = J(os.path.join(OUT, "samples.json"))
    mis = J(os.path.join(OUT, "mistakes.json"))
    runs = {n: J(os.path.join(HERE, "ar", "runs", n + ".json")) for n in ["ar_fsq1000", "mask_fsq1000", "ar_vq128"]}
    for r in runs.values():
        r.pop("eval", None) if False else None
    df = J(os.path.join(ROOT_SRC, "diff", "out", "samples_eps.json"))
    fw = J(os.path.join(ROOT_SRC, "flow", "out", "samples_fm_4000.json"))
    dtrain = J(os.path.join(ROOT_SRC, "diff", "out", "train_eps.json"))
    ftrain = J(os.path.join(ROOT_SRC, "flow", "out", "train_fm_4000.json"))
    NM = {"tok": {}, "runs": {}, "smp": {}, "img": {}, "mis": mis, "ref": {}}
    for k, v in tok["tok"].items():
        NM["tok"][k] = {kk: vv for kk, vv in v.items()}
    for k in ("floor_fd_val1000", "flops_unet_fwd_1", "params_unet", "flops_ar1000_fwd_1", "flops_ar1000_formula",
              "params_ar1000", "params_mask1000", "params_ar128"):
        NM["tok"][k] = tok[k]
    for n, r in runs.items():
        NM["runs"][n] = {k: r[k] for k in ("params", "steps", "seconds", "steps_per_s", "fwd_flops_per_image",
                                           "train_flops_approx_3x_fwd", "ddpm_train_flops_approx", "peak_mps_mib", "eval")}
        log = [json.loads(l) for l in open(os.path.join(HERE, "ar", "runs", n + ".jsonl"))]
        NM["runs"][n]["curve"] = [[e["step"], round(e["loss"], 4)] for e in log[::4]]
    NM["smp"] = {k: v for k, v in smp.items() if k not in ("ar_record",)}
    rec = smp["ar_record"]
    NM["smp"]["ar_record"] = {s: {"tokens": r["tokens"], "p": r["p_chosen"], "H": r["entropy_bits"],
                                  "top5": r["top5"]} for s, r in rec.items()}
    # reference rows from the Diffusion and Flow labs (their own recorded numbers, not re-run)
    dd = {(x["sampler"], x["steps"]): x for x in df["samplers"]}
    NM["ref"] = {
        "ddpm1000": {k: dd[("ddpm", 1000)][k] for k in ("fd", "acc", "sec", "div")},
        "ddim50": {k: dd[("ddim", 50)][k] for k in ("fd", "acc", "sec", "div")},
        "ddim20": {k: dd[("ddim", 20)][k] for k in ("fd", "acc", "sec", "div")},
        "df_cfg": df["cfg"], "df_ms_per_eval": df["ms_per_eval"], "df_floor": df["floor_fd"],
        "df_train_seconds": dtrain["seconds"], "fw_train_seconds": ftrain["seconds"],
        "fw_euler": [{k: x[k] for k in ("steps", "fd", "acc", "sec", "div")} for x in fw["samplers"] if x["solver"] == "euler"],
        "fw_cfg": fw["cfg"], "fw_ms_per_eval": fw["ms_per_eval"], "real_div": fw["real_div"],
    }
    NM["d"] = derived(NM, tok, smp, runs, df, fw)
    if have_scratch:
        S = os.environ["GM_SCRATCH"]
        z = np.load(os.path.join(S, "nm", "samples.npz"))
        for k in z.files:
            a = z[k]
            if k.startswith("ar_frames"):
                if k != "ar_frames__1.0":
                    continue
                for c in [3, 5, 8, 9, 2]:
                    sprite(a[c], f"{k}_c{c}")
            elif k.startswith("mask_frames"):
                for c in [3, 5, 8, 9, 2]:
                    sprite(a[c], f"{k}_c{c}")
            else:
                sprite(a, k)
        m = np.load(os.path.join(S, "nm", "mistakes.npz"))
        sprite(m["garbage"], "mis_garbage"); sprite(m["right"], "mis_right")
        # the 16 fixed test images: originals and FSQ round trips (first 8: one per class 0..7)
        import torch
        from common import test16, to_model, from_model
        from objectives import to_image
        from tokenize_data import load_tokenizer
        x16, y16, _ = test16()
        sprite(x16[:10], "test_orig")
        for name in ["fsq1000", "vq128"]:
            t = torch.as_tensor(np.array(tok["tok"][name]["test16_tokens"][:10])).view(-1, 8, 8)
            with torch.no_grad():
                sprite(from_model(to_image(load_tokenizer(name).decode_tokens(t))), f"test_rec_{name}")
        # the Diffusion lab's DDIM 20-step path (dress, sandal, bag, ankle boot) and final rows, reused
        st = np.load(os.path.join(ROOT_SRC, "diff", "out", "strips_eps.npz"))
        tr = st["traj_20_xt"]                                            # (20, 4, 28, 28)
        for j, c in enumerate([3, 5, 8, 9]):
            sprite(np.concatenate([st["traj_noise"][j:j + 1], tr[:, j]]), f"ddim20_c{c}")
        sprite(st["ddpm_1000"], "ddpm_1000"); sprite(st["cfg_2"], "ddim50_cfg2")
        fs = np.load(os.path.join(ROOT_SRC, "flow", "out", "strips_fm_4000.npz"))
        sprite(fs["euler_50"], "flow_euler50"); sprite(fs["cfg_1.5"], "flow_cfg1.5")
    # attach each recorded setting's image key (the npz key with "|" -> "__")
    names = [f[:-5] for f in os.listdir(IMG)]
    def key_for(prefix, vals):
        for nme in names:
            parts = nme.split("__")
            if parts[0] != prefix or len(parts) != len(vals) + 1:
                continue
            try:
                if all(abs(float(a) - float(b)) < 1e-9 for a, b in zip(parts[1:], vals)):
                    return nme
            except ValueError:
                pass
        return None
    for lst in ("ar_temp", "ar_topk", "ar_cfg", "ar_grid", "vq_cfg"):
        for r in NM["smp"].get(lst, []):
            r["img"] = key_for(lst, [r["T"], r["k"], r["s"]])
    for r in NM["smp"].get("mask", []):
        r["img"] = key_for("mask", [r["steps"], r["s"]])
    for f in sorted(os.listdir(IMG)):
        NM["img"][f[:-5]] = from_saved(f[:-5])
    js = "// generated by make_data.py: recorded runs of this page (measured on Apple M1 Pro) and reused lab results\nwindow.NM=" + json.dumps(NM, separators=(",", ":")) + ";\n"
    open(os.path.join(HERE, "parts", "22_js_nm_0data.js"), "w").write(js)
    print("NM bytes", len(js), "images", len(NM["img"]))


if __name__ == "__main__":
    main()
