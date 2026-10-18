"""SmolLM2-135M with attention written out by hand, so the KV cache can be evicted or quantised per layer and head.

Prefill-then-compress: the context is run once with full causal attention (as any engine prefills); its keys and
values (after RoPE) and the attention statistics eviction policies need are kept. Each policy then decides, per
layer and KV head, which cached context entries survive (or how they are quantised), and only the continuation
tokens are run again, attending to the surviving entries plus each other. Evicting with a mask is exactly
equivalent to removing the entries; the memory is computed from the count kept.
Weights: HuggingFaceTB/SmolLM2-135M (Apache-2.0), revision pinned in src/data/README.md of the root.
"""
import math, torch, torch.nn.functional as F
from transformers import AutoModelForCausalLM, AutoTokenizer

REPO = "HuggingFaceTB/SmolLM2-135M"
REV = "93efa2f097d58c2a74874c7e644dbc9b0cee75a2"


def load(device="cpu"):
    tok = AutoTokenizer.from_pretrained(REPO, revision=REV)
    m = AutoModelForCausalLM.from_pretrained(REPO, revision=REV, dtype=torch.float32, attn_implementation="eager").to(device).eval()
    return tok, m


def rope(m, pos):
    """cos, sin of shape (T, head_dim) from the model's own rotary module (theta 100,000)."""
    dummy = torch.zeros(1, 1, device=pos.device)
    cos, sin = m.model.rotary_emb(dummy, pos[None])
    return cos[0], sin[0]


def rot(x, cos, sin):  # rotate-half, as transformers' apply_rotary_pos_emb
    h = x.shape[-1] // 2
    return x * cos + torch.cat([-x[..., h:], x[..., :h]], -1) * sin


def qkv(layer, x, cos, sin, nh, nkv, hd):
    a = layer.self_attn
    T = x.shape[0]
    q = a.q_proj(x).view(T, nh, hd).transpose(0, 1)
    k = a.k_proj(x).view(T, nkv, hd).transpose(0, 1)
    v = a.v_proj(x).view(T, nkv, hd).transpose(0, 1)
    return rot(q, cos, sin), rot(k, cos, sin), v


@torch.inference_mode()
def prefill(m, ids, obs=32, chunk=512, want_scores=True, doc_end=None):
    """Full causal pass over ids (1-D). Returns per layer K, V (nkv, T, hd), and per layer the scores:
    h2o (nkv, T): attention each key received, summed over all queries and the query heads of its group;
    snap (nkv, T): the same from the last `obs` queries only (SnapKV's observation window);
    snap_doc (nkv, T): from the `obs` queries before doc_end (compression before the question arrives)."""
    c = m.config; nh, nkv = c.num_attention_heads, c.num_key_value_heads; hd = c.hidden_size // nh; g = nh // nkv
    T = ids.shape[0]; pos = torch.arange(T, device=ids.device)
    cos, sin = rope(m, pos)
    x = m.model.embed_tokens(ids)
    out = []
    for layer in m.model.layers:
        h = layer.input_layernorm(x)
        q, k, v = qkv(layer, h, cos, sin, nh, nkv, hd)
        kr, vr = k.repeat_interleave(g, 0), v.repeat_interleave(g, 0)
        rec = {"k": k, "v": v}
        o = torch.empty(nh, T, hd, device=ids.device)
        h2o = torch.zeros(nh, T, device=ids.device)
        for s in range(0, T, chunk):          # query chunks: memory nh x chunk x T, never T x T
            e = min(T, s + chunk)
            sc = (q[:, s:e] @ kr[:, :e].transpose(1, 2)) / math.sqrt(hd)
            qi = torch.arange(s, e, device=ids.device)[:, None]
            sc = sc.masked_fill(pos[None, :e] > qi, float("-inf")).softmax(-1)
            o[:, s:e] = sc @ vr[:, :e]
            if want_scores:
                h2o[:, :e] += sc.sum(1)
        if want_scores:
            def window(a, b):
                sc = (q[:, a:b] @ kr.transpose(1, 2)) / math.sqrt(hd)
                qi = torch.arange(a, b, device=ids.device)[:, None]
                return sc.masked_fill(pos[None, :] > qi, float("-inf")).softmax(-1).sum(1).view(nkv, g, T).sum(1)
            rec["h2o"] = h2o.view(nkv, g, T).sum(1)
            rec["snap"] = window(T - obs, T)
            if doc_end is not None:
                rec["snap_doc"] = window(doc_end - obs, doc_end)
        x = x + layer.self_attn.o_proj(o.transpose(0, 1).reshape(T, -1))
        x = x + layer.mlp(layer.post_attention_layernorm(x))
        out.append(rec)
    return out


@torch.inference_mode()
def continue_with_cache(m, cache, keep, cont_ids, start, kv_override=None):
    """Run cont_ids (1-D) at positions start.. attending to the cached context entries where keep[l] (nkv, T) is
    True, plus causally to each other. kv_override[l] = (K, V) replaces the cached tensors (quantised copies).
    Returns logits (n, vocab)."""
    c = m.config; nh, nkv = c.num_attention_heads, c.num_key_value_heads; hd = c.hidden_size // nh; g = nh // nkv
    n = cont_ids.shape[0]; T = cache[0]["k"].shape[1]
    pos = torch.arange(start, start + n, device=cont_ids.device)
    cos, sin = rope(m, pos)
    causal = torch.ones(n, n, dtype=torch.bool, device=cont_ids.device).tril()
    x = m.model.embed_tokens(cont_ids)
    for li, layer in enumerate(m.model.layers):
        h = layer.input_layernorm(x)
        q, k, v = qkv(layer, h, cos, sin, nh, nkv, hd)
        K, V = (kv_override[li] if kv_override is not None else (cache[li]["k"], cache[li]["v"]))
        Kall = torch.cat([K, k], 1).repeat_interleave(g, 0)
        Vall = torch.cat([V, v], 1).repeat_interleave(g, 0)
        kp = keep[li].repeat_interleave(g, 0)                       # (nh, T)
        mask = torch.cat([kp[:, None, :].expand(nh, n, T), causal[None].expand(nh, n, n)], -1)
        o = F.scaled_dot_product_attention(q[None], Kall[None], Vall[None], attn_mask=mask[None])[0]
        x = x + layer.self_attn.o_proj(o.transpose(0, 1).reshape(n, -1))
        x = x + layer.mlp(layer.post_attention_layernorm(x))
    return m.lm_head(m.model.norm(x))


@torch.inference_mode()
def check_against_hf(m, ids, split):
    """Max |logit difference| between HF's own forward and prefill(ids[:split]) + continue_with_cache(rest)."""
    ref = m(ids[None]).logits[0, split:]
    cache = prefill(m, ids[:split], want_scores=False)
    keep = [torch.ones(c["k"].shape[:2], dtype=torch.bool, device=ids.device) for c in cache]
    mine = continue_with_cache(m, cache, keep, ids[split:], split)
    return (ref - mine).abs().max().item(), ref.abs().max().item()
