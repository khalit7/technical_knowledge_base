"""ViT cost by formula, checked three ways (CPU, randomly initialised models built from configs; no weights needed).

macs(R, P, D, L, F, extra) counts multiply-accumulates of one forward pass of a plain ViT on one R x R image:
  patch embedding  N * (3 P^2) * D            with N = (R / P)^2 patches, T = N + extra tokens ([CLS], registers)
  per layer        4 T D^2 (Q, K, V, output projections) + 2 T^2 D (scores Q K^T and the weighted sum of V)
                   + 2 T D F (the two MLP matrices, hidden width F)
Norms, softmax, GELU and biases are left out (they are not matrix multiplies).
Checks: (1) torch.utils.flop_counter.FlopCounterMode, once with PyTorch's fused attention (sdpa) and once with
plain matmul attention (eager), on transformers ViTModel / Dinov2Model / Siglip vision towers
built from the pinned configs (FLOPs / 2 = MACs); (2) the timm model cards' published GMACs for ViT-B/16 at 224
(16.9) and DINOv2 ViT-B/14 at 518 (151.7). Writes ../out/flops.json; the page's calculator uses the same formula.
"""
import os, sys, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ve_env import *
import torch
from torch.utils.flop_counter import FlopCounterMode

cap_threads(4)


def macs(R, P, D, L, F, extra=1):
    N = (R // P) ** 2; T = N + extra
    patch = N * 3 * P * P * D
    layer = 4 * T * D * D + 2 * T * T * D + 2 * T * D * F
    return {"tokens": T, "patch": patch, "attn_proj": 4 * T * D * D * L, "attn_scores": 2 * T * T * D * L,
            "mlp": 2 * T * D * F * L, "total": patch + layer * L}


def counted(model, R, impl):
    model.set_attn_implementation(impl)
    x = torch.zeros(1, 3, R, R)
    with torch.no_grad(), FlopCounterMode(display=False) as fc:
        model(pixel_values=x)
    return fc.get_total_flops() / 2


from transformers import ViTConfig, ViTModel, Dinov2Config, Dinov2Model, SiglipVisionConfig, SiglipVisionModel
cases = []
vit = ViTModel(ViTConfig(hidden_size=768, num_hidden_layers=12, num_attention_heads=12, intermediate_size=3072,
                         patch_size=16, image_size=224), add_pooling_layer=False).eval()
cases.append(("ViT-B/16 (google/vit-base-patch16-224 shape)", vit, 224, dict(P=16, D=768, L=12, F=3072, extra=1), 16.9))
clipb32 = ViTModel(ViTConfig(hidden_size=768, num_hidden_layers=12, num_attention_heads=12, intermediate_size=3072,
                             patch_size=32, image_size=224), add_pooling_layer=False).eval()
cases.append(("ViT-B/32 (CLIP B/32 image tower shape)", clipb32, 224, dict(P=32, D=768, L=12, F=3072, extra=1), None))
d = Dinov2Model(Dinov2Config(hidden_size=768, num_hidden_layers=12, num_attention_heads=12, mlp_ratio=4, patch_size=14,
                             image_size=518)).eval()
cases.append(("DINOv2 ViT-B/14 at 518", d, 518, dict(P=14, D=768, L=12, F=3072, extra=1), 151.7))
cases.append(("DINOv2 ViT-B/14 at 224 (the processor's default crop)", d, 224, dict(P=14, D=768, L=12, F=3072, extra=1), None))
s = SiglipVisionModel(SiglipVisionConfig(hidden_size=768, num_hidden_layers=12, num_attention_heads=12,
                                         intermediate_size=3072, patch_size=16, image_size=224)).eval()
cases.append(("SigLIP 2 B/16 vision tower at 224 (with its MAP head)", s, 224, dict(P=16, D=768, L=12, F=3072, extra=0), None))
out = []
for name, m, R, cfg, pub in cases:
    t0 = time.time(); c = counted(m, R, "sdpa"); ce = counted(m, R, "eager"); f = macs(R, **cfg)
    row = {"name": name, "R": R, **cfg, "formula_gmacs": round(f["total"] / 1e9, 3), "counted_gmacs_sdpa": round(c / 1e9, 3), "counted_gmacs_eager": round(ce / 1e9, 3),
           "formula_without_scores_gmacs": round((f["total"] - f["attn_scores"]) / 1e9, 3),
           "published_gmacs": pub, "attn_scores_share": round(f["attn_scores"] / f["total"], 4), "tokens": f["tokens"]}
    out.append(row); print(row, round(time.time() - t0, 1), "s", flush=True)
R = {"date": time.strftime("%Y-%m-%d"), "machine": MACHINE, "rows": out,
     "published_source": "timm model cards: timm/vit_base_patch16_224.augreg2_in21k_ft_in1k (GMACs 16.9, 224) and "
                         "timm/vit_base_patch14_dinov2.lvd142m (GMACs 151.7, 518), read 2026-10-17"}
dump("flops.json", R)
