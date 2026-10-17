import re, sys, os, json, torch, diffusers
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from configs import MODELS
for key, label, cls, cfg, *_ in MODELS:
    with torch.device("meta"):
        m = getattr(diffusers, cls).from_config(cfg())
    pats = {}
    for n, p in m.named_parameters():
        k = re.sub(r"\.\d+\.", ".#.", n)
        k = re.sub(r"\.\d+\.", ".#.", k)
        pats[k] = pats.get(k, 0) + p.numel()
    print("==", key, sum(p.numel() for p in m.parameters()))
    for k, v in pats.items():
        print("  ", k, v)
