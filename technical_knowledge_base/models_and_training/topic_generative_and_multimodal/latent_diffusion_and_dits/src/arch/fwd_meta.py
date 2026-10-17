"""One denoiser forward pass on meta tensors per model and resolution, under FlopCounterMode: exact FLOPs from shapes
(imported by flops_all.py; also run alone as a smoke test: python -I fwd_meta.py <key> <res>)."""
import os, sys, torch, diffusers
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from torch.utils.flop_counter import FlopCounterMode
from configs import MODELS


def inputs(key, m, res, ntxt):
    """The tensors a pipeline would pass for one image at res x res (batch 1, no CFG batching), on meta."""
    M = {k[0]: k for k in MODELS}
    _, _, _, cfg, kind, ch, f, p, _, _ = M[key]
    h = res // f
    t = torch.tensor([500.0])
    if key == "dit":
        return (torch.randn(1, 4, h, h), t, torch.tensor([1])), {}
    if key == "sd15":
        return (torch.randn(1, 4, h, h), t, torch.randn(1, ntxt, 768)), {}
    if key == "sdxl":
        return (torch.randn(1, 4, h, h), t, torch.randn(1, ntxt, 2048)), {
            "added_cond_kwargs": {"text_embeds": torch.randn(1, 1280), "time_ids": torch.randn(1, 6)}}
    if key == "pixart":
        return (), dict(hidden_states=torch.randn(1, 4, h, h), encoder_hidden_states=torch.randn(1, ntxt, 4096), timestep=t,
                        added_cond_kwargs={"resolution": None, "aspect_ratio": None})
    if key == "sana":
        return (), dict(hidden_states=torch.randn(1, 32, h, h), encoder_hidden_states=torch.randn(1, ntxt, 2304), timestep=t)
    if key in ("sd3m", "sd35l"):
        return (), dict(hidden_states=torch.randn(1, 16, h, h), encoder_hidden_states=torch.randn(1, ntxt, 4096),
                        pooled_projections=torch.randn(1, 2048), timestep=t)
    if key == "flux1":
        n = (h // 2) ** 2
        return (), dict(hidden_states=torch.randn(1, n, 64), encoder_hidden_states=torch.randn(1, ntxt, 4096),
                        pooled_projections=torch.randn(1, 768), timestep=t / 1000, img_ids=torch.zeros(n, 3),
                        txt_ids=torch.zeros(ntxt, 3), guidance=torch.tensor([3.5]))
    if key == "flux2k":
        n = (h // 2) ** 2
        return (), dict(hidden_states=torch.randn(1, n, 128), encoder_hidden_states=torch.randn(1, ntxt, 7680),
                        timestep=t / 1000, img_ids=torch.zeros(1, n, 4), txt_ids=torch.zeros(1, ntxt, 4))
    if key == "qwen":
        n = (h // 2) ** 2
        return (), dict(hidden_states=torch.randn(1, n, 64), encoder_hidden_states=torch.randn(1, ntxt, 3584),
                        encoder_hidden_states_mask=torch.ones(1, ntxt), timestep=t / 1000, img_shapes=[(1, h // 2, h // 2)])
    if key == "zimg":
        return (), dict(x=[torch.randn(16, 1, h, h)], t=t / 1000, cap_feats=[torch.randn(ntxt, 2560)])
    raise KeyError(key)


def count(key, m, res, ntxt):
    with torch.device("meta"):
        if key == "dit":          # DiT's sine-cosine position table is built for one grid size: rebuild at this size
            import models as dit_models
            m = dit_models.DiT_XL_2(input_size=res // 8, num_classes=1000)
        a, kw = inputs(key, m, res, ntxt)
        with FlopCounterMode(display=False) as fc, torch.no_grad():
            m(*a, **kw)
    return int(fc.get_total_flops()), {str(k): int(v) for k, v in fc.get_flop_counts()["Global"].items()}


if __name__ == "__main__":
    import params_build
    key, res = sys.argv[1], int(sys.argv[2])
    m = params_build.build(key)
    ntxt = {k[0]: k[9] for k in MODELS}[key]
    tot, by = count(key, m, res, ntxt)
    print(key, res, round(tot / 1e9, 1), "GFLOP", {k: round(v / 1e9, 1) for k, v in by.items()})
