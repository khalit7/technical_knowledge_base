"""Peak memory of one SD 1.5 image with and without attention slicing (one process, under the bench lock).
Run: GM_SCRATCH=... nice -n 15 python -I smoke_sd_slicing.py ; writes smoke/sd_slicing.json."""
import json, os, sys, time
import torch
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from common import cap_threads, device, PeakMem, sync, empty_cache, MACHINE
from pretrained import load_sd, PROMPTS, GEN
cap_threads(4); dev = device("mps"); out = {"machine": MACHINE, "date": time.strftime("%Y-%m-%d"), "prompt": "g01", "steps": GEN["steps"]}
pipe = load_sd(dev)
for mode in ("none", "slicing"):
    if mode == "slicing":
        pipe.enable_attention_slicing()
    empty_cache()
    with PeakMem() as pm:
        sync(dev); t = time.time()
        pipe(PROMPTS["g01"], num_inference_steps=GEN["steps"], guidance_scale=GEN["guidance_scale"],
             generator=torch.Generator("cpu").manual_seed(0))
        sync(dev); dt = time.time() - t
    out[mode] = {"seconds": round(dt, 2), "peak_mps_mb": pm.peak_mb, "current_allocated_mb_after": round(torch.mps.current_allocated_memory() / 2**20, 1)}
    print(mode, out[mode], flush=True)
json.dump(out, open(os.path.join(HERE, "smoke", "sd_slicing.json"), "w"), indent=1)
