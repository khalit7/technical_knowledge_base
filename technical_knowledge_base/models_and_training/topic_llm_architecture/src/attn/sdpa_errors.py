"""Attention lab: the real error messages when GQA shapes are passed to attention without expanding K and V.
CPU, a second. Run: python sdpa_errors.py -> out/sdpa_errors.json"""
import json, os
import torch, torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
B, H, Hk, T, D = 1, 8, 2, 5, 32           # the tiny GPT's gqa2 shape: 8 query heads, 2 KV heads of 32
q = torch.randn(B, H, T, D); k = torch.randn(B, Hk, T, D); v = torch.randn(B, Hk, T, D)
res = {"torch": torch.__version__, "shapes": {"q": list(q.shape), "k": list(k.shape)}}
try:
    F.scaled_dot_product_attention(q, k, v, is_causal=True)
    res["sdpa_no_enable_gqa"] = "no error"
except Exception as e:
    res["sdpa_no_enable_gqa"] = f"{type(e).__name__}: {e}"
try:
    q @ k.transpose(-1, -2)
    res["matmul"] = "no error"
except Exception as e:
    res["matmul"] = f"{type(e).__name__}: {e}"
y = F.scaled_dot_product_attention(q, k, v, is_causal=True, enable_gqa=True)
ref = F.scaled_dot_product_attention(q, k.repeat_interleave(H // Hk, 1), v.repeat_interleave(H // Hk, 1), is_causal=True)
wrong = F.scaled_dot_product_attention(q, k.repeat(1, H // Hk, 1, 1), v.repeat(1, H // Hk, 1, 1), is_causal=True)
res["enable_gqa_equals_repeat_interleave_maxabs"] = float((y - ref).abs().max())
res["repeat_instead_of_repeat_interleave_maxabs"] = float((wrong - ref).abs().max())
res["head_to_kv_repeat_interleave"] = [h // (H // Hk) for h in range(H)]
res["head_to_kv_repeat"] = [h % Hk for h in range(H)]
json.dump(res, open(os.path.join(HERE, "out", "sdpa_errors.json"), "w"), indent=1)
print(json.dumps(res, indent=1))
