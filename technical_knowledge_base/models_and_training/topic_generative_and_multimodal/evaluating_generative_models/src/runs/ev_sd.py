"""Stable Diffusion 1.5 (fp16, MPS, attention slicing) on the topic's 8 shared prompts, 2 seeds, 4 guidance scales.

    python -I ev_sd.py            # under the bench lock (run_gpu.sh)
The topic's generation defaults (pretrained.GEN): 512x512, 25 DPM-Solver steps, initial noise from a CPU generator.
Guidance scales in diffusers' convention: 1.0 = no classifier-free guidance (one U-Net pass per step: the plain
conditional model), 3.0, 7.5 (the default), 12.0. Seeds 0 and 1. 8 x 2 x 4 = 64 images.
Writes GM_SCRATCH/ev/sd/<key>_s<seed>_g<scale>.png and out/sd_gen.json (seconds per image, peak memory).
"""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ev_env import ev_scratch, dump
import torch
from common import cap_threads, device, sync, MACHINE, touch_bench, PeakMem
import pretrained

cap_threads(4)
torch.set_grad_enabled(False)
dev = device("mps")
SCALES = [1.0, 3.0, 7.5, 12.0]
SEEDS = [0, 1]
os.makedirs(ev_scratch("sd"), exist_ok=True)
res = {"model": list(pretrained.SD), "dtype": "float16", "machine": MACHINE, "date": time.strftime("%Y-%m-%d"),
       "steps": 25, "size": 512, "scheduler": "DPMSolverMultistepScheduler.from_config", "scales": SCALES, "seeds": SEEDS,
       "prompts": pretrained.PROMPTS, "images": []}
with PeakMem() as pm:
    t = time.time(); pipe = pretrained.load_sd(dev); res["load_seconds"] = round(time.time() - t, 1)
    for key, prompt in pretrained.PROMPTS.items():
        for seed in SEEDS:
            for g in SCALES:
                t = time.time()
                im = pipe(prompt, num_inference_steps=25, guidance_scale=g, height=512, width=512,
                          generator=torch.Generator("cpu").manual_seed(seed)).images[0]
                sync(dev); dt = time.time() - t
                name = f"{key}_s{seed}_g{g:g}"
                im.save(ev_scratch("sd", name + ".png"))
                res["images"].append({"name": name, "key": key, "seed": seed, "scale": g, "seconds": round(dt, 2)})
                print(name, f"{dt:.1f} s", flush=True); touch_bench("ev")
res["peak_mps_mb"] = round(pm.peak_mb, 1)
dump("sd_gen.json", res)
