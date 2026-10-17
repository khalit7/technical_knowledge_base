"""Diffusion from zero: guidance and few-step runs on Stable Diffusion v1.5 (MPS fp16, attention slicing; bench lock).

Same prompt, seed and defaults as the Diffusion lab's guidance strip (g03, seed 0, 512 x 512, 25 DPM-Solver++ steps):
  1. CFG scale x CFG rescale (phi 0 and 0.7; Lin et al. 2023 sec. 3.4, diffusers guidance_rescale)
  2. negative prompts (they replace the empty prompt in the unconditional branch)
  3. guidance interval (Kynkaanniemi et al. 2024) with a hand-written loop, checked against the pipeline at phi 0
  4. zero-terminal-SNR rescaling applied to SD 1.5's epsilon model without fine-tuning (a failure, on purpose)
  5. LCM-LoRA (latent-consistency/lcm-lora-sdv1-5) at 2, 4 and 8 steps against DPM-Solver++ at the same steps
Thumbnails (256 px WebP) to out/sd/, full PNGs to GM_SCRATCH/dz/sd/, numbers to out/sd.json.
peft (needed by diffusers' LoRA loader) is imported from GM_SCRATCH/dz/pylib, not installed into the shared venv.
"""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dz_env import OUT, dz_scratch
sys.path.insert(0, dz_scratch("pylib", "x").rsplit("/", 1)[0])
import peft  # noqa: F401  (must be importable before diffusers decides on its LoRA backend)
import numpy as np
import torch
from PIL import Image
from common import cap_threads, sync, PeakMem, MACHINE, touch_bench
import pretrained
from diffusers import DPMSolverMultistepScheduler, DDIMScheduler, LCMScheduler
import diffusers

cap_threads(4)
dev = "mps"
FULL = dz_scratch("sd", "x").rsplit("/", 1)[0]
THUMB = os.path.join(OUT, "sd"); os.makedirs(THUMB, exist_ok=True)
LCM_REPO, LCM_REV = "latent-consistency/lcm-lora-sdv1-5", "cf2fced511dbe7e26c8d1d397e728fbab875db4b"
out = {"machine": MACHINE, "date": time.strftime("%Y-%m-%d"), "torch": torch.__version__, "diffusers": diffusers.__version__,
       "peft": peft.__version__, "model": pretrained.SD, "lcm_lora": [LCM_REPO, LCM_REV], "dtype": "float16", "size": 512,
       "seed": 0, "prompt": pretrained.PROMPTS["g03"], "runs": []}


def img_stats(im):              # as the lab's sd_lab.py
    a = np.asarray(im).astype(np.float32) / 255
    mx, mn = a.max(2), a.min(2)
    satur = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    return {"mean_saturation": round(float(satur.mean()), 4),
            "clipped_frac": round(float(((a <= 0.004) | (a >= 0.996)).any(2).mean()), 4),
            "std": round(float(a.std()), 4), "mean": round(float(a.mean()), 4)}


def save(key, im, **meta):
    im.save(os.path.join(FULL, key + ".png"))
    im.resize((256, 256), Image.LANCZOS).save(os.path.join(THUMB, key + ".webp"), quality=60, method=6)
    r = {"key": key, **meta, **img_stats(im)}
    out["runs"].append(r); print(r, flush=True); touch_bench("dz")
    return r


with PeakMem() as pm:
    pipe = pretrained.load_sd(dev, scheduler="dpm")
    base = dict(pipe.scheduler.config)
    prompt = out["prompt"]
    gen = lambda: torch.Generator("cpu").manual_seed(0)
    pipe(prompt, num_inference_steps=2, generator=gen())                       # warm-up

    def run(key, steps=25, scale=7.5, rescale=0.0, neg=None, sch=None, **meta):
        pipe.scheduler = sch or DPMSolverMultistepScheduler.from_config(base)
        t0 = time.perf_counter()
        im = pipe(prompt, num_inference_steps=steps, guidance_scale=scale, guidance_rescale=rescale, negative_prompt=neg,
                  generator=gen()).images[0]
        sync(dev)
        return save(key, im, steps=steps, scale=scale, rescale=rescale, neg=neg, sec=round(time.perf_counter() - t0, 2), **meta)

    # 1. scale x rescale
    for s in [3, 7.5, 12, 20]:
        for phi in [0.0, 0.7]:
            run(f"cfg{s}_r{phi}", scale=s, rescale=phi, kind="rescale")
    # 2. negative prompts
    for neg in ["blurry, low contrast, haze", "clouds"]:
        run("neg_" + neg.split(",")[0], neg=neg, kind="negative")

    # 3. guidance interval, hand-written loop (DPM-Solver++ 2M, as the pipeline)
    sf = pipe.vae.config.scaling_factor

    @torch.no_grad()
    def loop(scale, interval=None):
        sch = DPMSolverMultistepScheduler.from_config(base); sch.set_timesteps(25, device=dev)
        pe, ne = pipe.encode_prompt(prompt, dev, 1, True, "")
        lat = torch.randn((1, 4, 64, 64), generator=gen(), dtype=torch.float16).to(dev) * sch.init_noise_sigma
        ac = sch.alphas_cumprod
        guided = 0
        for t in sch.timesteps:
            sig = float(((1 - ac[int(t)]) / ac[int(t)]).sqrt())
            on = scale > 1 and (interval is None or interval[0] < sig <= interval[1])
            if on:
                u, c = pipe.unet(torch.cat([lat, lat]), t, encoder_hidden_states=torch.cat([ne, pe])).sample.chunk(2)
                eps = u + scale * (c - u); guided += 1
            else:
                eps = pipe.unet(lat, t, encoder_hidden_states=pe).sample
            lat = sch.step(eps, t, lat).prev_sample
        img = pipe.vae.decode(lat / sf).sample
        return pipe.image_processor.postprocess(img, output_type="pil")[0], guided

    im, _ = loop(7.5)
    ref = np.asarray(Image.open(os.path.join(FULL, "cfg7.5_r0.0.png"))).astype(int)
    out["loop_vs_pipeline_max_abs_pixel"] = int(np.abs(np.asarray(im).astype(int) - ref).max())
    out["loop_vs_pipeline_mean_abs_pixel"] = round(float(np.abs(np.asarray(im).astype(int) - ref).mean()), 3)
    print("loop check", out["loop_vs_pipeline_max_abs_pixel"], out["loop_vs_pipeline_mean_abs_pixel"], flush=True)
    sch = DPMSolverMultistepScheduler.from_config(base); sch.set_timesteps(25)
    ac = sch.alphas_cumprod
    out["sd_sigmas_25"] = [round(float(((1 - ac[int(t)]) / ac[int(t)]).sqrt()), 3) for t in sch.timesteps]
    out["sd_timesteps_25"] = [int(t) for t in sch.timesteps]
    for s in [7.5, 12, 20]:
        t0 = time.perf_counter(); im, g = loop(s, (0.28, 5.42)); sync(dev)
        save(f"interval{s}", im, steps=25, scale=s, interval=[0.28, 5.42], guided_steps=g, sec=round(time.perf_counter() - t0, 2), kind="interval")

    # 4. zero terminal SNR on an epsilon model, no fine-tuning
    z = DDIMScheduler.from_config(base, rescale_betas_zero_snr=True, timestep_spacing="trailing")
    out["ztsnr_abar_last"] = float(z.alphas_cumprod[-1])
    run("ztsnr_eps", sch=z, kind="ztsnr")
    run("ddim_trailing_ref", sch=DDIMScheduler.from_config(base, timestep_spacing="trailing"), kind="ztsnr_ref")

    # 5. few steps: DPM-Solver++ against LCM-LoRA at equal steps
    for n in [2, 4, 8]:
        run(f"dpm_{n}", steps=n, kind="few_dpm")
    t0 = time.perf_counter()
    pipe.load_lora_weights(LCM_REPO, revision=LCM_REV, weight_name="pytorch_lora_weights.safetensors", adapter_name="lcm")
    out["lora_load_s"] = round(time.perf_counter() - t0, 2)
    lcm = lambda: LCMScheduler.from_config(base)
    pipe(prompt, num_inference_steps=2, guidance_scale=1.0, generator=gen())  # warm-up with LoRA
    for n in [1, 2, 4, 8]:
        r = run(f"lcm_{n}", steps=n, scale=1.0, sch=lcm(), kind="few_lcm")
        r["timesteps"] = [int(t) for t in pipe.scheduler.timesteps]
    run("lcm_4_cfg2", steps=4, scale=2.0, sch=lcm(), kind="few_lcm")
out["peak_mps_mib"] = pm.peak_mb
json.dump(out, open(os.path.join(OUT, "sd.json"), "w"), indent=0)
print("done", flush=True)
