import os, sys, torch, diffusers
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from configs import MODELS


def build(key):
    M = {k[0]: k for k in MODELS}
    if key == "dit":
        sys.path.insert(0, os.environ["DIT_SRC"])
        import models as dit_models
        with torch.device("meta"):
            return dit_models.DiT_XL_2(input_size=32, num_classes=1000)
    _, _, cls, cfg, *_ = M[key]
    with torch.device("meta"):
        return getattr(diffusers, cls).from_config(cfg())
