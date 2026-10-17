"""Build parts/22_js_ld_0data.js (window.LD) from the recorded outputs in out/ and the small inputs in inputs/.

    python3 -I make_data.py          (standard library only; images are already small WebP/PNG files)
Everything the page shows as a measured or counted number comes from here; check_data.py verifies the page against it.
"""
import base64, json, os, struct, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
OUT, INP = os.path.join(HERE, "out"), os.path.join(HERE, "inputs")
ROOT_DATA = os.path.join(HERE, "..", "..", "src", "data")


def J(*p):
    f = os.path.join(*p)
    return json.load(open(f)) if os.path.exists(f) else None


def uri(path, mime):
    return "data:%s;base64,%s" % (mime, base64.b64encode(open(path, "rb").read()).decode())


def png_gray(rows):
    """rows: list of lists of 0..255 ints -> PNG data URI (8-bit greyscale, no dependencies)."""
    h, w = len(rows), len(rows[0])
    raw = b"".join(b"\x00" + bytes(r) for r in rows)
    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 0, 0, 0, 0)) + \
        chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    return "data:image/png;base64," + base64.b64encode(png).decode()


LD = {"date": "2026-10-17"}

# ---------------------------------------------------------------- architectures and FLOPs (meta-device counts)
arch = J(OUT, "arch.json")
keep_cfg = ["block_out_channels", "layers_per_block", "attention_head_dim", "cross_attention_dim", "num_layers", "num_single_layers",
            "num_attention_heads", "joint_attention_dim", "caption_projection_dim", "pooled_projection_dim", "patch_size", "in_channels",
            "pos_embed_max_size", "qk_norm", "axes_dims_rope", "mlp_ratio", "dim", "n_layers", "n_heads", "n_refiner_layers", "axes_dims",
            "caption_channels", "cross_attention_head_dim", "num_cross_attention_heads", "norm_type", "guidance_embeds", "sample_size"]
LD["arch"] = [{k: m[k] for k in ["key", "label", "kind", "params", "cats", "top", "latent_ch", "vae_factor", "patch", "text_encoder",
                                 "text_tokens", "big_buffers"]} | {"config": {k: v for k, v in m["config"].items() if k in keep_cfg},
                                                                    "hub": m.get("hub_check")} for m in arch["models"]]
fl = J(OUT, "flops.json")
LD["flops"] = {k: {"fit": m["fit"], "worst": m["fit_worst_rel"], "T": m["text_default"], "f": m["f"], "p": m["patch"],
                   "ch": m["latent_ch"], "grid": [[q["res"], q["T"], q["flops"], q["bmm"]] for q in m["grid"]]}
               for k, m in fl["models"].items()}
ex = J(OUT, "extras.json")
LD["stages"] = {"sd15": ex["sd15_stages_512"], "dit": {"total": ex["dit_xl2_stages_512"]["total"],
                "flops": ex["dit_xl2_stages_512"]["flops"], "params": ex["dit_xl2_stages_512"]["params"]}}
for k in ("counter_keys_sample",):
    LD["stages"]["sd15"].pop(k, None)
# DiT keeps its fixed sine-cosine table as a frozen nn.Parameter (counted in its parameters): 1,024 x 1,152 at 512 px
tot512 = next(r["params"] for r in ex["dit_table"] if r["model"] == "DiT-XL/2" and r["res"] == 512)
LD["stages"]["dit"]["params"]["pos_embed"] = tot512 - sum(LD["stages"]["dit"]["params"].values())
LD["dit_count"] = ex["dit_table"]
LD["flux_schnell"] = ex["flux_schnell"]
LD["pipe"] = ex["pipeline_defaults"]
LD["src"] = J(INP, "source_lines.json")
LD["pub"] = J(INP, "published.json")

# ---------------------------------------------------------------- text encoder
te = J(OUT, "text_enc.json")
if te:
    eos = te["g01_eos_index"]
    LD["te"] = {"tokens": te["g01_tokens"][:eos + 2], "ids": te["g01_ids"][:eos + 2], "n_pad": 77 - (eos + 1),
                "long_tokens": te["long_prompt_tokens"], "warning": te["truncation_warning"],
                "sot_cos_g01_g06": te["sot_cos_g01_g06"], "sot_cos_g01_x08": te["sot_cos_g01_x08"],
                "sot_max_abs_diff": te["sot_max_abs_diff"], "pooled_eq": te["pooled_equals_eos_output"],
                "cos_pad": te["cos_pad_to_eos"], "cos_pad_last": te["cos_pad_to_eos"][-1],
                "cos_last_penult": te["cos_last_vs_penultimate_by_pos"][:eos + 2], "eos": eos}

# ---------------------------------------------------------------- SD 1.5 runs
sd = J(OUT, "sd_ld.json")
if sd:
    LD["sd"] = {k: sd.get(k) for k in ["prof", "prof_plain_s", "res_sweep", "bigres", "load_s", "peak_mps_mb", "date", "machine", "torch"]}
    xa = {}
    for key, v in (sd.get("xattn") or {}).items():
        z = os.path.join(OUT, f"xattn_{key}.npz")
        if not os.path.exists(z):
            continue
        import numpy as np            # only for reading the recorded maps
        a = np.load(z)
        n = len(v["tokens"])
        def q8(m):                     # per token: scale to its own max, 0..255
            m = m.astype(np.float32)
            mx = m.reshape(m.shape[0], -1).max(1)
            return base64.b64encode(np.clip(np.round(m / mx[:, None, None] * 255), 0, 255).astype(np.uint8).tobytes()).decode(), \
                [round(float(x), 5) for x in mx]
        m32, mx32 = q8(a["m32"])
        m16 = {}
        for s in v["steps_kept"]:
            b, mx = q8(a[f"m16_{s}"])
            m16[s] = {"b": b, "max": mx}
        th = os.path.join(OUT, "sd")
        xa[key] = {"prompt": v["prompt"], "seed": v["seed"], "tokens": v["tokens"], "mass": v["mass_by_res"], "steps": v["steps_kept"],
                   "timesteps": v["timesteps"], "sec": v["sec"], "m32": m32, "m32max": mx32, "m16": m16,
                   "img": uri(os.path.join(th, f"x_{key}.webp"), "image/webp"),
                   "x0": {s: uri(os.path.join(th, f"x_{key}_x0_{s:02d}.webp"), "image/webp") for s in v["steps_kept"]}}
    LD["xa"] = xa
    res_imgs = {}
    for r in (sd.get("bigres") or []):
        res_imgs[r["px"]] = uri(os.path.join(OUT, "sd", f"res_g04_{r['px']}.webp"), "image/webp")
    LD["res_imgs"] = res_imgs

# ---------------------------------------------------------------- tiny models
ts = J(OUT, "tiny_scores.json")
fo = {r["net"]: r for r in J(HERE, "tiny", "out_flops.json")}
if ts:
    tr = {}
    for v in ["p4", "p2", "p8", "p4_nozero"]:
        t = J(OUT, f"train_dit_{v}.json")
        if t:
            tr[v] = {"seconds": t["seconds"], "at_save": t["seconds_at_save"], "steps_per_s": t["steps_per_s"], "peak_mb": t["peak_mps_mb"],
                     "loss_end": t["log"][-1]["loss"], "loss": [[r["step"], r["loss"]] for r in t["log"][::4]]}
    fw = J(HERE, "..", "..", "src", "flow", "out", "train_fm_4000.json")
    tr["unet"] = {"seconds": fw["seconds"], "steps_per_s": fw["steps_per_s"], "loss_end": fw["log"][-1]["loss"],
                  "loss": [[r["step"], r["loss"]] for r in fw["log"][::4]]}
    LD["tiny"] = {"scores": ts, "train": tr, "flops": {k: {"params": v["params"], "fwd": v["fwd_flops_total"], "tokens": v.get("tokens")}
                                                        for k, v in fo.items()},
                  "floor": J(HERE, "..", "..", "src", "flow", "out", "samples_fm_4000.json")["floor_fd"]}
    import numpy as np
    st = np.load(os.path.join(OUT, "tiny_strips.npz"))
    LD["tiny"]["strips"] = {k: png_gray(np.concatenate(list(st[k]), axis=1).tolist()) for k in st.files}

# ---------------------------------------------------------------- code shown on the page (real files)
def lines(path, a, b):
    return "\n".join(open(path).read().split("\n")[a - 1:b])
LD["code"] = {"meta": open(os.path.join(HERE, "arch", "demo_meta.py")).read().strip(),
              "meta_out": open(os.path.join(OUT, "demo_meta.txt")).read().strip()}
src = open(os.path.join(HERE, "sd", "sd_ld.py")).read().split("\n")
i0 = next(i for i, l in enumerate(src) if l.strip().startswith("class Store(AttnProcessor)"))
i1 = next(i for i, l in enumerate(src) if l.strip().startswith("attn.get_attention_scores = orig")) + 1
LD["code"]["grab"] = "\n".join(l[8:] for l in src[i0:i1])

js = "window.LD=" + json.dumps(LD, separators=(",", ":")) + ";\n"
open(os.path.join(HERE, "parts", "22_js_ld_0data.js"), "w").write("// generated by src/make_data.py from out/ and inputs/; do not edit\n" + js)
print("22_js_ld_0data.js", len(js), "bytes;", {k: len(json.dumps(v)) for k, v in LD.items()})
