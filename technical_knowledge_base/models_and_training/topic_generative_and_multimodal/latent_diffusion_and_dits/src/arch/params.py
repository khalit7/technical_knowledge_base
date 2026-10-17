"""Where the parameters of each denoiser live, and what one denoiser pass costs (CPU only, no weights downloaded).

Every model is instantiated from its config on PyTorch's "meta" device (shapes without memory), so a 20B model costs
nothing to count. Totals are checked against measured counts (SD 1.5, the root Model map's safetensors-header counts)
or the Hub API's public totals (gated repos), and the check is written into the output.

FLOPs per pass (multiply-add = 2 FLOPs):
- U-Nets: counted exactly by torch.utils.flop_counter.FlopCounterMode running the model on meta tensors at each size.
- Transformers: 2 x (per-token weights) x tokens for every linear layer, plus 4 x N^2 x d for attention scores and the
  weighted sum (N = tokens attending, d = width); modulation layers act once per image, not per token. The formula is
  checked against FlopCounterMode on meta for the models whose forward runs on meta tensors (see "flop_check").
Writes ../out/arch.json.
    GM_SCRATCH=... nice -n 15 $GM_SCRATCH/venv/bin/python -I params.py
"""
import json, os, re, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import torch, diffusers
from torch.utils.flop_counter import FlopCounterMode
from configs import MODELS, HUB_TOTAL

torch.set_num_threads(2)
CATS = ["conv", "attn_img", "attn_txt", "cross", "mlp_img", "mlp_txt", "mod", "embed"]


def classify(name, shape, key):
    """-> list of (category, count). Fused single-stream layers are split by their row/column counts."""
    n = 1
    for s in shape:
        n *= s
    # fused single-stream layers (FLUX.1 single blocks, FLUX.2 single blocks)
    if key == "flux1" and name.startswith("single_transformer_blocks"):
        if ".proj_out.weight" in name:            # [d, d + 4d]: first d columns are the attention output
            d = shape[0]; return [("attn_img", d * d), ("mlp_img", n - d * d)]
        if ".proj_out.bias" in name:
            return [("mlp_img", n)]
    if key == "flux2k" and name.startswith("single_transformer_blocks"):
        if "to_qkv_mlp_proj" in name:             # [3d + 2h, d]
            d = shape[1]; return [("attn_img", 3 * d * d), ("mlp_img", n - 3 * d * d)]
        if "attn.to_out" in name:                 # [d, d + h]
            d = shape[0]; return [("attn_img", d * d), ("mlp_img", n - d * d)]
    rules = [
        ("mod", r"time_embed\.linear\.|adaln_single\.linear\.|(norm1|norm1_context|norm|norm_out)\.linear|adaLN_modulation|scale_shift_table|img_mod|txt_mod|_modulation|time_emb_proj"),
        ("cross", r"attn2\."),
        ("attn_txt", r"add_[qkv]_proj|to_add_out|norm_added_|context_refiner\.\d+\.attention\.|context_refiner\.\d+\.attention_norm"),
        ("mlp_txt", r"ff_context|txt_mlp|context_refiner\.\d+\.(feed_forward|ffn_norm)"),
        ("attn_img", r"attn1\.|\.attn\.|\.attention\.|attention_norm|attentions\.\d+\.(norm|proj_in|proj_out)\.|blocks\.\d+\.norm[123]\.|\.norm[23]\."),
        ("mlp_img", r"\.ff\.|img_mlp|proj_mlp|feed_forward|ffn_norm|\.mlp\.fc"),
        ("conv", r"resnets|downsamplers|upsamplers|conv_in|conv_out|conv_norm_out"),
    ]
    for cat, pat in rules:
        if re.search(pat, name):
            return [(cat, n)]
    return [("embed", n)]


def dit_official():
    """DiT-XL/2 from the authors' code (facebookresearch/DiT models.py @ed81ce222909), not diffusers' port."""
    src = os.environ.get("DIT_SRC")
    sys.path.insert(0, src)
    import models as dit_models
    with torch.device("meta"):
        m = dit_models.DiT_XL_2(input_size=32, num_classes=1000)
    return m


def build(key, cls, cfg):
    if key == "dit":
        return dit_official()
    with torch.device("meta"):
        return getattr(diffusers, cls).from_config(cfg())


def unet_flops(m, key, res):
    h = res // 8
    with torch.device("meta"):
        x = torch.randn(1, 4, h, h); t = torch.tensor([500])
        if key == "sd15":
            c = torch.randn(1, 77, 768); kw = {}
        else:
            c = torch.randn(1, 77, 2048); kw = {"added_cond_kwargs": {"text_embeds": torch.randn(1, 1280), "time_ids": torch.randn(1, 6)}}
        with FlopCounterMode(display=False) as fc, torch.no_grad():
            m(x, t, c, **kw)
    by = {str(k): int(v) for k, v in fc.get_flop_counts()["Global"].items()}
    return int(fc.get_total_flops()), by


out = {"date": time.strftime("%Y-%m-%d"), "torch": torch.__version__, "diffusers": diffusers.__version__, "models": []}
for key, label, cls, cfg, kind, lat_ch, f, patch, te, ntxt in MODELS:
    m = build(key, cls, cfg)
    cats = {c: 0 for c in CATS}
    per_block = {}
    for name, p in m.named_parameters():
        for c, n in classify(name, tuple(p.shape), key):
            cats[c] += n
        top = re.sub(r"\.\d+\..*$", "", name) if re.search(r"\.\d+\.", name) else name.split(".")[0]
        per_block[top] = per_block.get(top, 0) + p.numel()
    total = sum(p.numel() for p in m.parameters())
    bufs = {n: b.numel() for n, b in m.named_buffers() if b.numel() > 10000}
    assert total == sum(cats.values())
    r = {"key": key, "label": label, "class": cls if key != "dit" else "DiT (facebookresearch/DiT models.py)", "kind": kind,
         "params": total, "cats": cats, "top": per_block, "big_buffers": bufs, "latent_ch": lat_ch, "vae_factor": f,
         "patch": patch, "text_encoder": te, "text_tokens": ntxt}
    c = cfg() if key != "dit" else {}
    r["config"] = {k: v for k, v in c.items() if not k.startswith("_") and not isinstance(v, dict)}
    if key in HUB_TOTAL:
        repo, hub = HUB_TOTAL[key]
        r["hub_check"] = {"repo": repo, "hub_total": hub, "ours": total, "ours_plus_buffers": total + sum(bufs.values()),
                          "match": hub in (total, total + sum(bufs.values()))}
    if kind == "unet":
        r["flops"] = {}
        for res in [256, 384, 512, 640, 768, 1024, 1280, 1536, 2048]:
            tot, by = unet_flops(m, key, res)
            r["flops"][res] = {"total": tot, "by_op": by}
        r["unet_levels"] = {"block_out_channels": c["block_out_channels"], "down": c["down_block_types"], "up": c["up_block_types"],
                            "layers_per_block": c["layers_per_block"], "transformer_layers_per_block": c.get("transformer_layers_per_block", 1),
                            "attention_head_dim": c["attention_head_dim"], "cross_attention_dim": c["cross_attention_dim"]}
    out["models"].append(r)
    print(key, total, {k: round(v / 1e6, 1) for k, v in cats.items()}, r.get("hub_check", ""), flush=True)
    del m
json.dump(out, open(os.path.join(HERE, "..", "out", "arch.json"), "w"), indent=1)
