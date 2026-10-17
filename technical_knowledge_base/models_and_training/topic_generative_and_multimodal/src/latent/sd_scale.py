"""Latent lab: a wrong VAE scaling factor inside a real Stable Diffusion 1.5 pipeline (U-Net runs; a few images only).

MPS, under the bench lock, fp16, attention slicing (shared default, about 4.5 GB peak):
  GM_SCRATCH=... nice -n 15 $GM_SCRATCH/venv/bin/python -I sd_scale.py
1. Image-to-image on the cat photo (the encoder side matters): the pipeline multiplies the encoded latent by
   vae.config.scaling_factor, noises it to strength 0.6, denoises 25 x 0.6 = 15 steps, divides by the same factor and
   decodes. Factors: 0.18215 (SD 1.5's), 0.13025 (SDXL's, a real mix-up), 1.0 (no factor at all).
2. Text-to-image (the decoder side only): one prompt, seed 0, latents returned, then decoded after dividing by
   0.18215 (right), by 1.0 (forgot), and by 0.13025 (the wrong model's factor).
Writes GM_SCRATCH/lt/sdscale/*.png and src/latent/out/sd_scale.json.
"""
import json, os, sys, time

import numpy as np
import torch
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
from common import cap_threads, scratch, PeakMem, MACHINE, empty_cache
import pretrained

cap_threads(4)
dev = torch.device("mps")
OUT = scratch("lt", "sdscale"); os.makedirs(OUT, exist_ok=True)
res = {"machine": MACHINE, "torch": torch.__version__, "date": time.strftime("%Y-%m-%d"),
       "model": f"{pretrained.SD[0]}@{pretrained.SD[1][:12]}", "scheduler": "DPMSolverMultistepScheduler", "runs": {}}
from diffusers import StableDiffusionImg2ImgPipeline

with PeakMem() as pm:
    pipe = pretrained.load_sd(dev)
    i2i = StableDiffusionImg2ImgPipeline(**pipe.components)
    i2i.set_progress_bar_config(disable=True)
    cat = [im for k, im, it in pretrained.test_images() if k == "p01_cat"][0]
    prompt = "a photograph of a tabby cat"
    for f in (0.18215, 0.13025, 1.0):
        pipe.vae.register_to_config(scaling_factor=f)
        t0 = time.time()
        img = i2i(prompt, image=cat, strength=0.6, num_inference_steps=25, guidance_scale=7.5,
                  generator=torch.Generator("cpu").manual_seed(0)).images[0]
        sec = time.time() - t0
        name = f"i2i_{f}"
        img.save(os.path.join(OUT, name + ".png"))
        a = np.asarray(img).astype(np.float64)
        res["runs"][name] = {"factor": f, "seconds": round(sec, 1), "mean_rgb": [round(v, 1) for v in a.reshape(-1, 3).mean(0)],
                             "std_rgb": [round(v, 1) for v in a.reshape(-1, 3).std(0)]}
        print(name, res["runs"][name], flush=True)
        empty_cache()
    pipe.vae.register_to_config(scaling_factor=0.18215)
    p = pretrained.PROMPTS["g02"]
    t0 = time.time()
    lat = pipe(p, num_inference_steps=25, guidance_scale=7.5, output_type="latent",
               generator=torch.Generator("cpu").manual_seed(1)).images
    res["t2i"] = {"prompt": p, "seed": 1, "seconds": round(time.time() - t0, 1),
                  "latent_std_scaled_units": round(float(lat.float().std()), 4)}
    for f in (0.18215, 1.0, 0.13025):
        with torch.no_grad():
            x = pipe.vae.decode(lat / f).sample
        img = pipe.image_processor.postprocess(x, output_type="pil")[0]
        name = f"t2i_div_{f}"
        img.save(os.path.join(OUT, name + ".png"))
        a = np.asarray(img).astype(np.float64)
        res["runs"][name] = {"divide_by": f, "mean_rgb": [round(v, 1) for v in a.reshape(-1, 3).mean(0)],
                             "std_rgb": [round(v, 1) for v in a.reshape(-1, 3).std(0)]}
        print(name, res["runs"][name], flush=True)
res["peak_mps_mb"] = pm.peak_mb
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
json.dump(res, open(os.path.join(HERE, "out", "sd_scale.json"), "w"), indent=1)
print("done", res["peak_mps_mb"], flush=True)
