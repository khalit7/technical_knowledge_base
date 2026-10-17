import json, torch, diffusers
from torch.utils.flop_counter import FlopCounterMode

CFG = "../../../src/map/inputs/cfg_stable-diffusion-v1-5__stable-diffusion-v1-5.json"   # the root Model map's copy
cfg = json.load(open(CFG))["unet"]                       # SD 1.5's unet/config.json at the pinned revision
with torch.device("meta"):                               # shapes only: no memory, no weights
    unet = diffusers.UNet2DConditionModel.from_config(cfg)
    print(f"{sum(p.numel() for p in unet.parameters()):,} parameters")
    by_block = {}
    for name, p in unet.named_parameters():
        top = ".".join(name.split(".")[:2]) if name.startswith(("down_blocks", "up_blocks")) else name.split(".")[0]
        by_block[top] = by_block.get(top, 0) + p.numel()
    for k in ["down_blocks.0", "down_blocks.3", "mid_block", "up_blocks.1", "up_blocks.3"]:
        print(f"{k:14s} {by_block[k] / 1e6:7.1f}M")
    x, t, text = torch.randn(1, 4, 64, 64), torch.tensor([500]), torch.randn(1, 77, 768)
    with FlopCounterMode(display=False) as fc, torch.no_grad():
        unet(x, t, text)                                 # one pass for a 512 x 512 image
    print(f"{fc.get_total_flops() / 1e9:.1f} GFLOP per pass")
