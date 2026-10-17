"""Extra counts for the page (meta tensors, CPU only, seconds):
1. stages: FLOPs and parameters of each top-level stage of SD 1.5's U-Net at 512 x 512 (one pass, batch 1), and of
   DiT-XL/2 at 512 x 512 (same 64 x 64 x 4 latent): the numbers the U-Net vs DiT animation steps through.
2. dit_table: every DiT config of the paper's Table 4 (S, B, L, XL x patch 8, 4, 2 at 256; XL/2 at 512) counted with
   the authors' code: parameters and FLOPs, to set against the paper's Params (M) and Flops (G) columns.
3. flux_schnell: FLUX.1 without the guidance embedder, against the Hub's public total for FLUX.1 [schnell].
4. pipeline defaults: num_inference_steps and guidance arguments read from each pipeline's __call__ signature.
Writes ../out/extras.json.
"""
import inspect, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import torch, diffusers
from torch.utils.flop_counter import FlopCounterMode
from configs import MODELS, FLUX1, HUB_TOTAL
from params_build import build

torch.set_num_threads(2)
out = {}

# 1. stages
def stage_flops(m, args, kwargs, names):
    with FlopCounterMode(display=False) as fc, torch.no_grad():
        m(*args, **kwargs)
    per = fc.get_flop_counts()
    res = {}
    for n in names:
        k = [kk for kk in per if kk.split(".", 1)[-1] == n or kk == n]
        res[n] = int(sum(per[k[0]].values())) if k else 0
    return int(fc.get_total_flops()), res, list(per.keys())[:60]

unet = build("sd15")
names = ["conv_in", "time_embedding"] + [f"down_blocks.{i}" for i in range(4)] + ["mid_block"] + [f"up_blocks.{i}" for i in range(4)] + ["conv_norm_out", "conv_out"]
with torch.device("meta"):
    tot, st, keys = stage_flops(unet, (torch.randn(1, 4, 64, 64), torch.tensor([500]), torch.randn(1, 77, 768)), {}, names)
pp = {n: sum(p.numel() for p in dict(unet.named_modules())[n].parameters()) for n in names}
out["sd15_stages_512"] = {"total": tot, "flops": st, "params": pp, "counter_keys_sample": keys[:20]}
print("sd15 stages", tot, st)
sys.path.insert(0, os.environ["DIT_SRC"])
import models as dm
with torch.device("meta"):
    dit = dm.DiT_XL_2(input_size=64, num_classes=1000)
    bn = ["x_embedder", "t_embedder", "y_embedder"] + [f"blocks.{i}" for i in range(28)] + ["final_layer"]
    tot, st, keys = stage_flops(dit, (torch.randn(1, 4, 64, 64), torch.tensor([500.0]), torch.tensor([1])), {}, bn)
pp = {n: sum(p.numel() for p in dict(dit.named_modules())[n].parameters()) for n in bn}
out["dit_xl2_stages_512"] = {"total": tot, "flops": st, "params": pp}
print("dit stages", tot, {k: st[k] for k in bn[:5]})

# 2. DiT Table 4
rows = []
for name, fn in dm.DiT_models.items():
    for res in ([256, 512] if name == "DiT-XL/2" else [256]):
        with torch.device("meta"):
            m = fn(input_size=res // 8, num_classes=1000)
            with FlopCounterMode(display=False) as fc, torch.no_grad():
                m(torch.randn(1, 4, res // 8, res // 8), torch.tensor([500.0]), torch.tensor([1]))
        rows.append({"model": name, "res": res, "params": sum(p.numel() for p in m.parameters()), "flops": int(fc.get_total_flops())})
        print(rows[-1])
out["dit_table"] = rows

# 3. FLUX.1 schnell
with torch.device("meta"):
    fs = diffusers.FluxTransformer2DModel.from_config(dict(FLUX1, guidance_embeds=False))
n = sum(p.numel() for p in fs.parameters())
out["flux_schnell"] = {"ours": n, "hub": HUB_TOTAL["flux1_schnell"], "match": n == HUB_TOTAL["flux1_schnell"][1]}
print("schnell", out["flux_schnell"])

# 4. pipeline defaults
P = {"sd15": "StableDiffusionPipeline", "sdxl": "StableDiffusionXLPipeline", "pixart": "PixArtSigmaPipeline", "sana": "SanaPipeline",
     "sd3": "StableDiffusion3Pipeline", "flux1": "FluxPipeline", "flux2k": "Flux2KleinPipeline", "qwen": "QwenImagePipeline",
     "zimg": "ZImagePipeline", "dit": "DiTPipeline"}
dd = {}
for k, cls in P.items():
    sig = inspect.signature(getattr(diffusers, cls).__call__)
    dd[k] = {"class": cls, **{a: (sig.parameters[a].default if sig.parameters[a].default is not inspect._empty else None)
                              for a in ["num_inference_steps", "guidance_scale", "true_cfg_scale", "height", "width", "max_sequence_length"]
                              if a in sig.parameters}}
    dd[k]["file"] = os.path.relpath(inspect.getsourcefile(getattr(diffusers, cls)), os.path.dirname(os.path.dirname(diffusers.__file__)))
    print(k, dd[k])
out["pipeline_defaults"] = dd
json.dump(out, open(os.path.join(HERE, "..", "out", "extras.json"), "w"), indent=1, default=str)
