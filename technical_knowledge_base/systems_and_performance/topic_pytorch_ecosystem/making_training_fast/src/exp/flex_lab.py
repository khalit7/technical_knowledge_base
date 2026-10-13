"""FlexAttention on this machine (torch 2.14.1): masks as BlockMasks (block counts, sparsity), forward correctness of
compiled flex_attention on CPU and MPS against SDPA with the same dense mask and a float64 reference, what happens
with requires_grad, and eager vs compiled. Deterministic (no timing).
    python flex_lab.py -> inputs/flex_lab.json
"""
import math, sys, warnings
import torch
import torch.nn.functional as F
from torch.nn.attention.flex_attention import flex_attention, create_block_mask, and_masks, or_masks, create_mask
import common

warnings.filterwarnings("ignore")
torch.set_num_threads(4)

W = 128                       # sliding window (keys within the last W positions)
PREFIX = 64                   # prefix-LM: the first PREFIX positions see each other both ways


def doc_ids(T, lens):
    ids = torch.cat([torch.full((n,), i, dtype=torch.int32) for i, n in enumerate(lens)])
    assert ids.numel() == T, (ids.numel(), T)
    return ids


def masks(T, dev):
    lens = {256: [90, 60, 70, 36], 1024: [300, 200, 400, 124], 4096: [1200, 800, 1600, 496]}[T]
    doc = doc_ids(T, lens).to(dev)
    causal = lambda b, h, q, k: q >= k
    window = lambda b, h, q, k: (q >= k) & (q - k < W)
    document = lambda b, h, q, k: (doc[q] == doc[k]) & (q >= k)
    prefix = lambda b, h, q, k: (k < PREFIX) | (q >= k)
    return {"causal": causal, "sliding_window": window, "document_causal": document, "prefix_lm": prefix}, lens


def block_stats(bm):
    # kv_num_blocks: partially masked blocks per query row-block; full_kv_num_blocks: fully unmasked blocks
    part = int(bm.kv_num_blocks.sum()); full = int(bm.full_kv_num_blocks.sum()) if bm.full_kv_num_blocks is not None else 0
    nq = bm.kv_num_blocks.shape[-1]
    nk = math.ceil(bm.seq_lengths[1] / bm.BLOCK_SIZE[1])
    return {"block_size": list(bm.BLOCK_SIZE), "q_blocks": nq, "kv_blocks": nk, "partial_blocks": part, "full_blocks": full,
            "skipped_blocks": nq * nk - part - full, "sparsity_pct": round(float(bm.sparsity()), 4)}


def softcap(score, b, h, q, k):
    return 20.0 * torch.tanh(score / 20.0)


def alibi_for(H):
    slopes = torch.tensor([2 ** (-8 * (i + 1) / H) for i in range(H)])
    def alibi(score, b, h, q, k):
        return score - slopes.to(score.device)[h] * (q - k)
    return alibi, slopes


def reference(q, k, v, dense, mod=None, slopes=None):
    q, k, v = (t.detach().cpu().double() for t in (q, k, v))
    s = q @ k.transpose(-2, -1) / math.sqrt(q.size(-1))
    T = s.size(-1)
    if mod == "softcap":
        s = 20.0 * torch.tanh(s / 20.0)
    if mod == "alibi":
        qi = torch.arange(T).view(-1, 1); ki = torch.arange(T).view(1, -1)
        s = s - slopes.double().view(1, -1, 1, 1) * (qi - ki)
    s = s.masked_fill(~dense.cpu(), float("-inf"))
    return torch.softmax(s, -1) @ v


def run_device(dev, T=256, B=2, H=4, D=64):
    g = torch.Generator().manual_seed(0)
    q, k, v = (torch.randn(B, H, T, D, generator=g).to(dev) for _ in range(3))
    mm, _ = masks(T, dev)
    flex_c = torch.compile(flex_attention, dynamic=False)
    res = []
    for name, fn in mm.items():
        bm = create_block_mask(fn, None, None, T, T, device=dev, BLOCK_SIZE=128)
        dense = create_mask(fn, None, None, T, T, device=dev).view(T, T)
        ref = reference(q, k, v, dense)
        r = {"device": dev, "mask": name, "T": T}
        try:
            out = flex_c(q, k, v, block_mask=bm)
            r["compiled_max_abs_err_vs_f64"] = float((out.cpu().double() - ref).abs().max())
        except Exception as e:
            r["compiled_error"] = f"{type(e).__name__}: {str(e).splitlines()[0][:200]}"
        try:
            sd = F.scaled_dot_product_attention(q, k, v, attn_mask=dense)
            r["sdpa_dense_mask_max_abs_err_vs_f64"] = float((sd.cpu().double() - ref).abs().max())
            if "compiled_max_abs_err_vs_f64" in r:
                r["flex_vs_sdpa_max_abs_diff"] = float((out.cpu() - sd.cpu()).abs().max())
        except Exception as e:
            r["sdpa_error"] = f"{type(e).__name__}: {str(e).splitlines()[0][:200]}"
        try:
            eo = flex_attention(q, k, v, block_mask=bm)
            r["eager_max_abs_err_vs_f64"] = float((eo.cpu().double() - ref).abs().max())
        except Exception as e:
            r["eager_error"] = f"{type(e).__name__}: {str(e).splitlines()[0][:200]}"
        res.append(r)
        print(r, file=sys.stderr)
    # score_mods on the causal mask
    alibi, slopes = alibi_for(H)
    bm = create_block_mask(mm["causal"], None, None, T, T, device=dev, BLOCK_SIZE=128)
    dense = create_mask(mm["causal"], None, None, T, T, device=dev).view(T, T)
    for name, sm in (("softcap", softcap), ("alibi", alibi)):
        r = {"device": dev, "mask": "causal", "score_mod": name, "T": T}
        try:
            out = flex_c(q, k, v, score_mod=sm, block_mask=bm)
            r["compiled_max_abs_err_vs_f64"] = float((out.cpu().double() - reference(q, k, v, dense, name, slopes)).abs().max())
        except Exception as e:
            r["compiled_error"] = f"{type(e).__name__}: {str(e).splitlines()[0][:200]}"
        res.append(r); print(r, file=sys.stderr)
    # training: requires_grad
    qg = q.clone().requires_grad_(True)
    r = {"device": dev, "requires_grad": True}
    try:
        flex_c(qg, k, v, block_mask=bm).sum().backward()
        r["backward"] = "ok"
    except Exception as e:
        r["backward_error"] = f"{type(e).__name__}: {str(e).splitlines()[0][:220]}"
    res.append(r); print(r, file=sys.stderr)
    return res


if __name__ == "__main__":
    out = {"env": common.env(), "window": W, "prefix": PREFIX, "block_masks": [], "runs": []}
    for T in (256, 1024, 4096):
        mm, lens = masks(T, "cpu")
        for name, fn in mm.items():
            bm = create_block_mask(fn, None, None, T, T, device="cpu", BLOCK_SIZE=128)
            d = {"T": T, "mask": name, "doc_lens": lens if name == "document_causal" else None, **block_stats(bm)}
            dense = create_mask(fn, None, None, T, T, device="cpu").view(T, T)
            d["allowed_pairs"] = int(dense.sum()); d["all_pairs"] = T * T
            out["block_masks"].append(d); print(d, file=sys.stderr)
    devs = ["cpu"] + (["mps"] if torch.backends.mps.is_available() else [])
    for dev in devs:
        out["runs"] += run_device(dev)
    common.dump("flex_lab.json", out)
