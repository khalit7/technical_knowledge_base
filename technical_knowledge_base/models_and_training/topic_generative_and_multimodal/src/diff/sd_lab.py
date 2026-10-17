"""Diffusion lab, pretrained part: Stable Diffusion v1.5 (fp16, MPS, attention slicing on) under the bench lock.

1. Time the pieces: text encoder, one U-Net pass at batch 1 and batch 2 (a guided step), one VAE decode.
2. One prompt, one seed, many step counts: DPM-Solver++ (the shared default), DDIM as SD 1.5's config sets it up
   (timestep_spacing 'leading' + steps_offset 1), and DDIM with 'trailing' spacing.
3. One prompt, one seed, guidance scale 0 (empty prompt) to 20, 25 DPM-Solver steps; plus the text prompt x07 at four scales.
Writes out/sd_lab.json and 192-pixel WebP thumbnails in out/sd/ (full-size PNGs stay in GM_SCRATCH/df_sd/; all thumbnails were later re-encoded at 160 pixels, WebP quality 50, by rethumb_sd.py, for page size).
"""
import json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
import numpy as np
import torch
from PIL import Image
from common import cap_threads, scratch, PeakMem, MACHINE, sync, touch_bench
import pretrained
from diffusers import DDIMScheduler, DPMSolverMultistepScheduler

cap_threads(4)
dev = "mps"
FULL = scratch("df_sd"); os.makedirs(FULL, exist_ok=True)
THUMB = os.path.join(HERE, "out", "sd"); os.makedirs(THUMB, exist_ok=True)
out = {"model": pretrained.SD, "machine": MACHINE, "date": time.strftime("%Y-%m-%d"), "torch": torch.__version__,
       "dtype": "float16", "attention_slicing": True, "size": 512}
import diffusers; out["diffusers"] = diffusers.__version__


def med(f, n):
    ts = []
    for _ in range(n):
        sync(dev); t0 = time.perf_counter(); f(); sync(dev); ts.append(time.perf_counter() - t0)
    return round(float(np.median(ts)), 4)


def img_stats(im):
    a = np.asarray(im).astype(np.float32) / 255
    mx, mn = a.max(2), a.min(2)
    satur = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    return {"mean_saturation": round(float(satur.mean()), 4),
            "clipped_frac": round(float(((a <= 0.004) | (a >= 0.996)).any(2).mean()), 4),
            "std": round(float(a.std()), 4)}


with PeakMem() as pm:
    t0 = time.perf_counter()
    pipe = pretrained.load_sd(dev, scheduler="dpm")
    out["load_s"] = round(time.perf_counter() - t0, 2)
    base_cfg = dict(pipe.scheduler.config)
    out["repo_scheduler"] = {k: base_cfg.get(k) for k in ["beta_schedule", "beta_start", "beta_end", "num_train_timesteps",
                                                           "steps_offset", "timestep_spacing", "prediction_type"]}
    prompt = pretrained.PROMPTS["g03"]
    gen = lambda: torch.Generator("cpu").manual_seed(0)
    pipe(prompt, num_inference_steps=2, generator=gen())          # warm-up (first image of a process is slower)

    # ---------------------------------------------------------------- 1. timing of the pieces
    with torch.no_grad():
        pe, ne = pipe.encode_prompt(prompt, dev, 1, True, "")
        lat = torch.randn((1, 4, 64, 64), generator=gen()).to(dev, torch.float16)
        t = torch.tensor(500, device=dev)
        u1 = lambda: pipe.unet(lat, t, encoder_hidden_states=pe).sample
        u2 = lambda: pipe.unet(torch.cat([lat, lat]), t, encoder_hidden_states=torch.cat([ne, pe])).sample
        for _ in range(2):
            u1(); u2()
        tim = {"text_encoder_s": med(lambda: pipe.encode_prompt(prompt, dev, 1, True, ""), 5),
               "unet_pass_batch1_s": med(u1, 10), "unet_pass_batch2_s": med(u2, 10),
               "vae_decode_s": med(lambda: pipe.vae.decode(lat / pipe.vae.config.scaling_factor).sample, 5)}
    out["timing"] = tim
    print(tim, flush=True)

    def gen_img(key, scheduler, steps, scale, p=prompt, neg=None):
        pipe.scheduler = scheduler
        times = []
        cb = lambda pp, i, t, kw: (sync(dev), times.append(time.perf_counter()), kw)[2]
        t0 = time.perf_counter()
        im = pipe(p, num_inference_steps=steps, guidance_scale=scale, generator=gen(), negative_prompt=neg,
                  callback_on_step_end=cb).images[0]
        sec = time.perf_counter() - t0
        im.save(os.path.join(FULL, key + ".png"))
        im.resize((192, 192), Image.LANCZOS).save(os.path.join(THUMB, key + ".webp"), quality=62, method=6)
        steps_t = np.diff([t0] + times)
        r = {"key": key, "steps": steps, "scale": scale, "sec": round(sec, 2),
             "timesteps": [int(x) if float(x).is_integer() else round(float(x), 2) for x in pipe.scheduler.timesteps],
             "median_step_s": round(float(np.median(steps_t[1:])) if len(steps_t) > 1 else float(steps_t[0]), 3),
             **img_stats(im)}
        print(r, flush=True); touch_bench("df")
        return r

    dpm = lambda: DPMSolverMultistepScheduler.from_config(base_cfg)
    ddim_lead = lambda: DDIMScheduler.from_config(base_cfg)
    ddim_trail = lambda: DDIMScheduler.from_config(base_cfg, timestep_spacing="trailing")
    out["dpm_config_spacing"] = dpm().config.timestep_spacing
    out["ddim_config_spacing"] = ddim_lead().config.timestep_spacing

    # ---------------------------------------------------------------- 2. steps
    st = []
    for n in [1, 2, 4, 10, 25, 50]:
        st.append({"sampler": "dpm", **gen_img(f"steps_dpm_{n}", dpm(), n, 7.5)})
    for n in [1, 4, 10, 25, 50]:
        st.append({"sampler": "ddim_leading", **gen_img(f"steps_ddim_{n}", ddim_lead(), n, 7.5)})
    for n in [1, 4]:
        st.append({"sampler": "ddim_trailing", **gen_img(f"steps_ddimtr_{n}", ddim_trail(), n, 7.5)})
    out["steps"] = st

    # ---------------------------------------------------------------- 3. guidance
    cf = [{"prompt": "g03", **gen_img("cfg_uncond", dpm(), 25, 1.0, p="")}]
    for s in [1, 2, 3, 5, 7.5, 10, 15, 20]:
        cf.append({"prompt": "g03", **gen_img(f"cfg_{s}", dpm(), 25, s)})
    for s in [1, 4, 7.5, 15]:
        cf.append({"prompt": "x07", **gen_img(f"cfgx07_{s}", dpm(), 25, s, p=pretrained.PROMPTS["x07"])})
    out["cfg"] = cf
out["peak_mps_mb"] = pm.peak_mb
out["prompts"] = {"g03": prompt, "x07": pretrained.PROMPTS["x07"]}
json.dump(out, open(os.path.join(HERE, "out", "sd_lab.json"), "w"), indent=1)
print("done peak", pm.peak_mb, flush=True)
