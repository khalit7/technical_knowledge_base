"""Stable Diffusion 1.5's U-Net inspected and profiled, cross-attention maps recorded, resolution failures shown
(fp16, MPS, attention slicing on as in the topic's shared loader; under the bench lock; one process).

    GM_SCRATCH=... GM_LOCK=.../lock.sh nice -n 15 $GM_SCRATCH/venv/bin/python -I sd_ld.py [stage ...]
Stages (default all, in order): prof, res, xattn, bigres.
  prof   one guided U-Net pass (batch 2) at 512 x 512, timed per top-level stage and per kind of layer (forward hooks
         with an MPS sync on each side; median of 5), plus the unhooked pass for reference.
  res    one U-Net pass (batch 1) at 256 to 1024 pixels: median of 3 seconds and peak MPS memory.
  xattn  four prompts through the shared generation defaults (25 DPM-Solver++ steps, guidance 7.5, 512 x 512): the
         cross-attention probabilities of every attn2 layer, conditional half, averaged over heads, kept at 16 x 16
         (the five 16 x 16 layers averaged) for 7 of the 25 steps and at 32 x 32 averaged over all steps; the share of
         attention on the start token, the words and the end/padding tokens; the predicted clean image (x0) decoded at
         the same 7 steps.
  bigres the puppy prompt (g04, seed 3: the topic's test image g04 at 512) at 256, 512, 768 and 1024 pixels, VAE tiling on
         above 512.
Writes ../out/sd_ld.json and small WebP thumbnails in ../out/sd/ (full-size PNGs in GM_SCRATCH/ld_sd/).
"""
import json, os, re, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "src", "data"))
import numpy as np
import torch
from PIL import Image
from common import cap_threads, scratch, PeakMem, MACHINE, sync, touch_bench
import pretrained
from diffusers.models.attention_processor import AttnProcessor

cap_threads(4)
dev = "mps"
STAGES = sys.argv[1:] or ["prof", "res", "xattn", "bigres"]
FULL = scratch("ld_sd"); os.makedirs(FULL, exist_ok=True)
TH = os.path.join(HERE, "..", "out", "sd"); os.makedirs(TH, exist_ok=True)
OUTP = os.path.join(HERE, "..", "out", "sd_ld.json")
out = json.load(open(OUTP)) if os.path.exists(OUTP) else {}
out.update({"model": list(pretrained.SD), "machine": MACHINE, "date": time.strftime("%Y-%m-%d"), "torch": torch.__version__,
            "dtype": "float16", "attention_slicing": True})
LIMIT_MB = 6000


def mem_mb():
    return round(torch.mps.driver_allocated_memory() / 2**20, 1)


def guard(tag):
    m = mem_mb(); print(f"[mem] {tag}: {m} MiB driver", flush=True)
    if m > LIMIT_MB:
        json.dump(out, open(OUTP, "w"), indent=1)
        sys.exit(f"stop: {m} MiB over the {LIMIT_MB} MiB limit after {tag}")


def save():
    json.dump(out, open(OUTP, "w"), indent=1)


def thumb(img, name, px, q=62):
    im = img.copy(); im.thumbnail((px, px), Image.LANCZOS)
    im.save(os.path.join(TH, name + ".webp"), "WEBP", quality=q, method=6)


with PeakMem() as pm:
    t0 = time.perf_counter()
    pipe = pretrained.load_sd(dev, scheduler="dpm")
    out["load_s"] = round(time.perf_counter() - t0, 2)
    unet = pipe.unet
    pipe.set_progress_bar_config(disable=True)
    gen = lambda s: torch.Generator("cpu").manual_seed(s)
    P = pretrained.PROMPTS
    pipe(P["g03"], num_inference_steps=2, generator=gen(0))          # warm-up
    guard("load")
    with torch.no_grad():
        pe, ne = pipe.encode_prompt(P["g01"], dev, 1, True, "")
    ctx2 = torch.cat([ne, pe])

    # ------------------------------------------------------------------ prof
    if "prof" in STAGES:
        lat = torch.randn((2, 4, 64, 64), generator=gen(1)).to(dev, torch.float16)
        t = torch.tensor(500, device=dev)
        def full_pass():
            with torch.no_grad():
                unet(lat, t, encoder_hidden_states=ctx2)
        for _ in range(2):
            full_pass()
        ts = []
        for _ in range(5):
            sync(dev); a = time.perf_counter(); full_pass(); sync(dev); ts.append(time.perf_counter() - a)
        out["prof_plain_s"] = round(float(np.median(ts)), 4)
        # hooks: top-level stages and kinds of layer
        stages = [("conv_in", unet.conv_in), ("time_embedding", unet.time_embedding)] + \
                 [(f"down_blocks.{i}", b) for i, b in enumerate(unet.down_blocks)] + [("mid_block", unet.mid_block)] + \
                 [(f"up_blocks.{i}", b) for i, b in enumerate(unet.up_blocks)] + \
                 [("conv_norm_out+conv_out", unet.conv_out)]
        kinds = {"self-attention (attn1)": [], "cross-attention (attn2)": [], "feed-forward (ff)": [], "ResNet blocks": [],
                 "down/up-samplers": [], "proj_in/out + norms": []}
        for n, m in unet.named_modules():
            if n.endswith(".attn1"): kinds["self-attention (attn1)"].append(m)
            elif n.endswith(".attn2"): kinds["cross-attention (attn2)"].append(m)
            elif n.endswith(".ff"): kinds["feed-forward (ff)"].append(m)
            elif re.search(r"\.resnets\.\d+$", n): kinds["ResNet blocks"].append(m)
            elif re.search(r"(down|up)samplers\.\d+$", n): kinds["down/up-samplers"].append(m)
            elif n.endswith(".proj_in") or n.endswith(".proj_out") or (".attentions." in n and n.endswith(".norm")): kinds["proj_in/out + norms"].append(m)
        acc = {}
        def add_hooks(name, mod):
            st = {}
            def pre(*_):
                sync(dev); st["t"] = time.perf_counter()
            def post(*_):
                sync(dev); acc[name] = acc.get(name, 0.0) + time.perf_counter() - st["t"]
            return [mod.register_forward_pre_hook(pre), mod.register_forward_hook(post)]
        res = {}
        for view, groups in [("stage", [(n, [m]) for n, m in stages]), ("kind", list(kinds.items()))]:
            hs = []
            for name, mods in groups:
                for m in mods:
                    hs += add_hooks(name, m)
            runs = []
            for _ in range(5):
                acc.clear(); sync(dev); a = time.perf_counter(); full_pass(); sync(dev)
                runs.append(({k: v for k, v in acc.items()}, time.perf_counter() - a))
            for h in hs:
                h.remove()
            res[view] = {"total_s": round(float(np.median([r[1] for r in runs])), 4),
                         "parts_s": {k: round(float(np.median([r[0].get(k, 0) for r in runs])), 4) for k, _ in groups},
                         "count": {k: len(v) for k, v in groups}}
        out["prof"] = res
        out["prof_note"] = "batch 2 (one guided step), 512 x 512, timestep 500, fp16, attention slicing; hooks add an MPS sync per module"
        print("prof", out["prof_plain_s"], res, flush=True); save(); touch_bench("ld"); guard("prof")

    # ------------------------------------------------------------------ res
    if "res" in STAGES:
        rr = []
        for px in [256, 384, 512, 640, 768, 1024]:
            h = px // 8
            lat = torch.randn((1, 4, h, h), generator=gen(2)).to(dev, torch.float16)
            t = torch.tensor(500, device=dev)
            with torch.no_grad():
                unet(lat, t, encoder_hidden_states=pe)
                ts = []
                for _ in range(3):
                    sync(dev); a = time.perf_counter(); unet(lat, t, encoder_hidden_states=pe); sync(dev); ts.append(time.perf_counter() - a)
            r = {"px": px, "latent": h, "unet_s": round(float(np.median(ts)), 4), "driver_mb_after": mem_mb()}
            rr.append(r); print(r, flush=True); guard(f"res {px}"); torch.mps.empty_cache()   # check before freeing the cache (the recorded run checked after it and missed a 7.4 GB peak at 1024)
        out["res_sweep"] = rr; save(); touch_bench("ld")

    # ------------------------------------------------------------------ xattn
    if "xattn" in STAGES:
        rec = {"step": 0, "maps": {}, "mass": {}}
        KEEP = [0, 2, 5, 9, 14, 19, 24]

        class Store(AttnProcessor):
            def __init__(self, name):
                super().__init__(); self.name = name

            def __call__(self, attn, hidden_states, encoder_hidden_states=None, *a, **k):
                orig = attn.get_attention_scores
                def grab(q, kk, mask=None):
                    p = orig(q, kk, mask)                        # [2 * heads, Nq, 77]
                    c = p[p.shape[0] // 2:].float().mean(0)      # conditional half (diffusers puts [negative, positive]), mean over heads
                    n = int(round(c.shape[0] ** 0.5))
                    key = (rec["step"], n)
                    s = rec["maps"].setdefault(key, [torch.zeros_like(c), 0]); s[0] += c; s[1] += 1
                    mm = rec["mass"].setdefault(n, [torch.zeros(77, device=c.device), 0]); mm[0] += c.mean(0); mm[1] += 1
                    return p
                attn.get_attention_scores = grab
                try:
                    return super().__call__(attn, hidden_states, encoder_hidden_states, *a, **k)
                finally:
                    attn.get_attention_scores = orig

        procs = {}
        for n, p in unet.attn_processors.items():
            procs[n] = Store(n) if ".attn2." in n else p
        old = dict(unet.attn_processors)
        unet.set_attn_processor(procs)
        sched = pipe.scheduler
        cap = {}
        def unet_hook(mod, args, kwargs, output):
            cap["x"] = args[0] if args else kwargs["sample"]; cap["t"] = args[1] if len(args) > 1 else kwargs["timestep"]
            cap["eps"] = output[0] if isinstance(output, tuple) else output.sample
        hk = unet.register_forward_hook(unet_hook, with_kwargs=True)
        abar = sched.alphas_cumprod.to(dev)
        runs = [("g01", P["g01"], 0), ("g01_blue", P["g01"].replace("red", "blue"), 0), ("g06", P["g06"], 5), ("x08", P["x08"], 0)]
        xout = {}
        for key, prompt, seed in runs:
            rec["step"] = 0; rec["maps"].clear(); rec["mass"].clear(); x0s = {}
            def cb(p, i, t, kw):
                if i in KEEP:
                    eu, ec = cap["eps"].chunk(2); eps = eu + 7.5 * (ec - eu)
                    a = abar[int(cap["t"])].to(torch.float32)
                    x = cap["x"][:1].float()
                    x0 = (x - (1 - a).sqrt() * eps.float()) / a.sqrt()
                    with torch.no_grad():
                        im = p.vae.decode((x0 / p.vae.config.scaling_factor).half()).sample
                    x0s[i] = p.image_processor.postprocess(im, output_type="pil")[0]
                rec["step"] = i + 1
                return kw
            a0 = time.perf_counter()
            img = pipe(prompt, num_inference_steps=25, guidance_scale=7.5, generator=gen(seed), callback_on_step_end=cb).images[0]
            sec = time.perf_counter() - a0
            img.save(os.path.join(FULL, f"xattn_{key}.png")); thumb(img, f"x_{key}", 256, 70)
            for i, im in x0s.items():
                thumb(im, f"x_{key}_x0_{i:02d}", 128, 55)
            ids = pipe.tokenizer(prompt).input_ids
            ntok = len(ids) + 1                                   # start, words, end, plus the first padding position
            toks = pipe.tokenizer.convert_ids_to_tokens(pipe.tokenizer(prompt, padding="max_length", max_length=77).input_ids)[:ntok]
            m16 = {}
            for i in KEEP:
                s, c = rec["maps"][(i, 16)]
                m16[i] = (s / c)[:, :ntok].T.reshape(ntok, 16, 16).cpu().numpy()
            all32 = sum(rec["maps"][(i, 32)][0] for i in range(25)) / sum(rec["maps"][(i, 32)][1] for i in range(25))
            m32 = all32[:, :ntok].T.reshape(ntok, 32, 32).cpu().numpy()
            mass = {}
            for n, (s, c) in rec["mass"].items():
                v = (s / c).cpu().numpy()
                eos = len(ids) - 1
                mass[n] = {"start": round(float(v[0]), 4), "words": round(float(v[1:eos].sum()), 4),
                           "end_and_padding": round(float(v[eos:].sum()), 4), "per_token": [round(float(x), 4) for x in v[:ntok]]}
            np.savez_compressed(os.path.join(FULL, f"xattn_{key}.npz"), m32=m32, **{f"m16_{i}": m16[i] for i in KEEP})
            np.savez_compressed(os.path.join(HERE, "..", "out", f"xattn_{key}.npz"), m32=m32.astype(np.float16),
                                **{f"m16_{i}": m16[i].astype(np.float16) for i in KEEP})
            xout[key] = {"prompt": prompt, "seed": seed, "tokens": toks, "sec": round(sec, 2), "mass_by_res": mass,
                         "steps_kept": KEEP, "timesteps": [int(x) for x in sched.timesteps]}
            print(key, round(sec, 1), "s", {n: (v["start"], v["words"], v["end_and_padding"]) for n, v in mass.items()}, flush=True)
            touch_bench("ld"); guard(f"xattn {key}")
        hk.remove(); unet.set_attn_processor(old)
        out["xattn"] = xout; save()

    # ------------------------------------------------------------------ bigres
    if "bigres" in STAGES:
        br = []
        for px in [256, 512, 768, 1024]:
            if px > 512:
                pipe.vae.enable_tiling()
            a0 = time.perf_counter()
            img = pipe(P["g04"], num_inference_steps=25, guidance_scale=7.5, height=px, width=px, generator=gen(3)).images[0]
            sec = time.perf_counter() - a0
            img.save(os.path.join(FULL, f"bigres_{px}.png")); thumb(img, f"res_g04_{px}", 256, 70)
            br.append({"px": px, "sec": round(sec, 2), "driver_mb_after": mem_mb(), "vae_tiling": px > 512})
            print(br[-1], flush=True); touch_bench("ld"); guard(f"bigres {px}"); torch.mps.empty_cache()
        pipe.vae.disable_tiling()
        out["bigres"] = br; save()
out["peak_mps_mb"] = pm.peak_mb
save()
print("done peak", pm.peak_mb, flush=True)
