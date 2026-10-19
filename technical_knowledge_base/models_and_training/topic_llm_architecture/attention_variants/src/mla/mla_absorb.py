"""MLA's absorbed form, checked numerically on the Attention lab's trained at_mla checkpoint (CPU).

Tiny GPT MLA: d_model 256, 8 heads, head_dim 32, latent d_c 64 (RMS-normalised), decoupled RoPE key d_r 16 shared by
all heads; no query compression. For the last token of the running sequence (position 255) attending to all 256
cached positions, in every layer:
  naive:    k_h = W_uk^h c_j, v_h = W_uv^h c_j (expand every cached latent), scores q_h . [k_h ; k_rope_j], softmax, o
  absorbed: q~_h = W_uk^h^T q_h (a 64-number query in latent space); scores q~_h . c_j + q_rope_h . k_rope_j;
            u_h = sum_j w_hj c_j (64 numbers); out = sum_h (W_o^h W_uv^h) u_h   (W_uv folded into W_o)
The two must agree to rounding. Then the trap: if RoPE were applied to the whole key (no decoupling), the key is
R(j) W_uk c_j and no single matrix can be folded into the query: using the position-0 fold gives the error printed.
Also counts multiply-adds and bytes per decoded token per layer for three ways to decode MLA (tiny GPT and
DeepSeek-V3 shapes, a calculation for the latter).
Writes ../out/mla_absorb.json.  Run: LA_SCRATCH=<scratch>/la python mla_absorb.py
"""
import json, os, sys
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.abspath(os.path.join(HERE, "..", "..", "..", "src", "data"))
sys.path.insert(0, DATA)
from tiny_gpt import GPT, GPTConfig, Rope  # noqa: E402
from train import SCR  # noqa: E402

torch.set_num_threads(4)


def costs(D, H, hd, dc, dr, T):
    """multiply-add FLOPs (2 per MAC) and bf16 bytes read from the cache, per new token per layer, T cached tokens"""
    naive_re = {"cache_numbers": T * (dc + dr),
                "flops": 2 * T * dc * 2 * H * hd + 2 * T * H * (hd + dr) + 2 * T * H * hd}
    expanded = {"cache_numbers": T * (2 * H * hd + dr),       # store k_h (with the shared rope part) and v_h per head
                "flops": 2 * T * H * (hd + dr) + 2 * T * H * hd}
    absorbed = {"cache_numbers": T * (dc + dr),
                "flops": 2 * H * hd * dc + 2 * T * H * (dc + dr) + 2 * T * H * dc + 2 * H * dc * D - 2 * H * hd * D}
    for d in (naive_re, expanded, absorbed):
        d["bytes"] = 2 * d["cache_numbers"]
        d["flops_per_byte"] = round(d["flops"] / d["bytes"], 1)
    return {"re-expand every step": naive_re, "cache expanded K and V": expanded, "absorbed": absorbed}


@torch.no_grad()
def main():
    ck = torch.load(os.path.join(SCR, "runs", "at_mla", "ckpt.pt"), map_location="cpu")
    m = GPT(GPTConfig(**ck["config"])); m.load_state_dict(ck["model"]); m.eval()
    m = m.double()
    cfg = m.cfg
    H, hd, dc, dr, D = cfg.n_head, cfg.head_dim, cfg.mla_kv_latent, cfg.mla_rope_dim, cfg.d_model
    run = json.load(open(os.path.join(DATA, "running_sequence.json")))
    ids = torch.tensor([run["ids"]])
    T = ids.shape[1]
    _, _, _, rec = m(ids, record="hidden")
    pos = torch.arange(T)
    layers = []
    for li, blk in enumerate(m.blocks):
        a = blk.mix
        h = blk.n1(rec["hidden"][li])                                   # (1, T, D)
        ref, _ = a(h, pos)                                              # the model's own forward
        ref = ref[0, -1]
        q = a.q(h).view(1, T, H, hd + dr).transpose(1, 2)[0, :, -1]     # (H, hd+dr) for the last token
        qn, qr = q[:, :hd], a.rope(q[None, :, None, hd:], pos[-1:])[0, :, 0]
        c = a.kv_norm(a.kv_down(h))[0]                                  # (T, dc): the cache
        kr = a.rope(a.k_rope(h)[:, None], pos)[0, 0]                    # (T, dr): the shared RoPE key, cached
        Wuk = a.k_up.weight.view(H, hd, dc)                             # k_h = Wuk[h] @ c
        Wuv = a.v_up.weight.view(H, hd, dc)
        Wo = a.o.weight.view(D, H, hd)                                  # out = sum_h Wo[:, h] @ y_h
        # naive
        k = torch.einsum("hdc,tc->htd", Wuk, c); v = torch.einsum("hdc,tc->htd", Wuv, c)
        s = (torch.einsum("hd,htd->ht", qn, k) + qr @ kr.T) * a.scale
        w = s.softmax(-1)
        y = torch.einsum("ht,htd->hd", w, v)
        out_naive = torch.einsum("Dhd,hd->D", Wo, y)
        # absorbed
        q_lat = torch.einsum("hdc,hd->hc", Wuk, qn)                     # (H, dc)
        s2 = (q_lat @ c.T + qr @ kr.T) * a.scale
        w2 = s2.softmax(-1)
        u = w2 @ c                                                      # (H, dc)
        Wov = torch.einsum("Dhd,hdc->hDc", Wo, Wuv)                     # (H, D, dc) folded once, offline
        out_abs = torch.einsum("hDc,hc->D", Wov, u)
        def both(dt):  # the same two computations in another dtype, from the same inputs
            qn_, qr_, c_, kr_, Wuk_, Wuv_, Wo_ = (t.to(dt) for t in (qn, qr, c, kr, Wuk, Wuv, Wo))
            k_ = torch.einsum("hdc,tc->htd", Wuk_, c_); v_ = torch.einsum("hdc,tc->htd", Wuv_, c_)
            w_ = ((torch.einsum("hd,htd->ht", qn_, k_) + qr_ @ kr_.T) * a.scale).softmax(-1)
            n_ = torch.einsum("Dhd,hd->D", Wo_, torch.einsum("ht,htd->hd", w_, v_))
            wa_ = ((torch.einsum("hdc,hd->hc", Wuk_, qn_) @ c_.T + qr_ @ kr_.T) * a.scale).softmax(-1)
            a_ = torch.einsum("hDc,hc->D", torch.einsum("Dhd,hdc->hDc", Wo_, Wuv_), wa_ @ c_)
            return float((a_ - n_).abs().max())
        # the trap: RoPE on the whole key, folded with the position-0 rotation
        rope_full = Rope(hd, cfg).double()                             # a RoPE over the whole 32-dim head
        k_rot = rope_full(k[None], pos)[0]                                 # (H, T, hd) keys rotated by their position
        q_rot = rope_full(qn[None, :, None], pos[-1:])[0, :, 0]
        s_true = (torch.einsum("hd,htd->ht", q_rot, k_rot) + qr @ kr.T) * a.scale
        s_fold0 = (torch.einsum("hdc,hd->hc", Wuk, q_rot) @ c.T + qr @ kr.T) * a.scale   # pretends R(j) = I
        layers.append({"layer": li + 1,
                       "max_abs_out": round(out_naive.abs().max().item(), 4),
                       "naive_vs_model": float((out_naive - ref).abs().max()),
                       "absorbed_vs_naive": float((out_abs - out_naive).abs().max()),
                       "absorbed_vs_naive_fp32": both(torch.float32), "absorbed_vs_naive_bf16": both(torch.bfloat16),
                       "weights_absorbed_vs_naive": float((w2 - w).abs().max()),
                       "rope_trap_score_err": round(float((s_fold0 - s_true).abs().max()), 3),
                       "rope_trap_weight_err": round(float((s_fold0.softmax(-1) - s_true.softmax(-1)).abs().max()), 3),
                       "score_range": round(float(s_true.abs().max()), 3)})
    out = {"run": "at_mla", "token": "last of the running sequence (position 255), 256 cached positions",
           "dtype": "float64 (fp32 column also)", "device": "Apple M1 Pro, CPU",
           "tiny": {"D": D, "H": H, "hd": hd, "dc": dc, "dr": dr}, "layers": layers,
           "costs_tiny_T256": costs(D, H, hd, dc, dr, 256),
           "deepseek_v3": {"D": 7168, "H": 128, "hd_nope": 128, "hd_v": 128, "dc": 512, "dr": 64,
                           "note": "calculation from config.json (hidden_size 7168, 128 heads, qk_nope_head_dim 128, v_head_dim 128, kv_lora_rank 512, qk_rope_head_dim 64)",
                           "costs_T32768": costs(7168, 128, 128, 512, 64, 32768)}}
    json.dump(out, open(os.path.join(HERE, "..", "out", "mla_absorb.json"), "w"), indent=1)
    for l in layers:
        print(l)
    for k, v in out["costs_tiny_T256"].items():
        print("tiny", k, v)
    for k, v in out["deepseek_v3"]["costs_T32768"].items():
        print("v3", k, v)


if __name__ == "__main__":
    main()
