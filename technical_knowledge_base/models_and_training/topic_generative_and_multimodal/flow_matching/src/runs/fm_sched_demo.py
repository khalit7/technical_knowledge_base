"""Flow matching child page: what diffusers' flow scheduler does with a real config (CPU, a second; diffusers 0.41.0).

Loads the FLUX.2 [klein] 4B scheduler config read from the Hub (inputs/scheduler_configs.json), prints the 4-step sigma
grid at 512 and 1024 px (the scheduler's own default grid, and the grid the FLUX pipelines pass in), checks the exponential time shift equals the fixed shift with shift = e^mu, and shows the error
diffusers raises when a dynamic-shifting scheduler is used without mu. Writes out/sched_demo.json (the printed text too).
"""
import io, json, math, os, contextlib
import numpy as np
from diffusers import FlowMatchEulerDiscreteScheduler
from diffusers.pipelines.flux.pipeline_flux import calculate_shift
import diffusers

HERE = os.path.dirname(os.path.abspath(__file__))
cfg = json.load(open(os.path.join(HERE, "..", "inputs", "scheduler_configs.json")))["configs"]["black-forest-labs/FLUX.2-klein-4B"]["config"]
buf = io.StringIO()
out = {"diffusers": diffusers.__version__}
with contextlib.redirect_stdout(buf):
    sch = FlowMatchEulerDiscreteScheduler.from_config(cfg)
    for px in [512, 1024]:
        tokens = (px // 16) ** 2                       # 8x VAE, 2x2 patches
        mu = calculate_shift(tokens, cfg["base_image_seq_len"], cfg["max_image_seq_len"], cfg["base_shift"], cfg["max_shift"])
        sch.set_timesteps(4, mu=mu)
        fixed = FlowMatchEulerDiscreteScheduler(shift=math.exp(mu)); fixed.set_timesteps(4)
        print(f"{px} px: {tokens} tokens, mu = {mu:.3f}, shift e^mu = {math.exp(mu):.3f}")
        print("  dynamic sigmas:", [round(float(v), 4) for v in sch.sigmas])
        default = [round(float(v), 4) for v in sch.sigmas]
        print("  fixed-shift sigmas:", [round(float(v), 4) for v in fixed.sigmas])
        sch.set_timesteps(sigmas=np.linspace(1.0, 1 / 4, 4), mu=mu)          # what pipeline_flux.py line 823 passes
        print("  pipeline grid, dynamic:", [round(float(v), 4) for v in sch.sigmas])
        pipe = [round(float(v), 4) for v in sch.sigmas]
        out[str(px)] = {"tokens": tokens, "mu": round(mu, 4), "shift": round(math.exp(mu), 4),
                        "sigmas": default, "fixed_sigmas": [round(float(v), 4) for v in fixed.sigmas], "pipeline_sigmas": pipe}
    try:
        FlowMatchEulerDiscreteScheduler.from_config(cfg).set_timesteps(4)
    except ValueError as e:
        print("ValueError:", e); out["error"] = str(e)
out["printed"] = buf.getvalue()
print(out["printed"])
json.dump(out, open(os.path.join(HERE, "..", "out", "sched_demo.json"), "w"), indent=0)
