"""Cache policies at an equal budget: which context entries each layer and KV head keeps, or how they are quantised.
budget = fraction of the context's KV entries kept (eviction) or of its bf16 bytes used (quantisation)."""
import torch, torch.nn.functional as F

SINK = 4


def _topk_mask(score, k, force=None):
    """score (nkv, T) -> bool mask with the k best per head; `force` (T,) bool entries always kept (counted)."""
    s = score.clone()
    if force is not None:
        s[:, force] = float("inf")
    idx = s.topk(k, dim=-1).indices
    m = torch.zeros_like(s, dtype=torch.bool)
    m.scatter_(1, idx, True)
    return m


def evict(cache, name, frac, q_len, seed=0, n_layers=30, global_every=6):
    """Return keep masks [(nkv, T)] for policy `name` keeping `frac` of the T context entries in every head."""
    nkv, T = cache[0]["k"].shape[:2]
    k = max(1, int(round(frac * T)))
    pos = torch.arange(T)
    tail = pos >= T - q_len                         # the question (or last tokens) is always kept
    sink = pos < SINK
    out = []
    for li, c in enumerate(cache):
        if name == "full":
            m = torch.ones(nkv, T, dtype=torch.bool)
        elif name == "recent":                       # sliding window applied to the cache
            m = (pos >= T - k)[None].expand(nkv, T).clone()
        elif name == "sink_recent":                  # StreamingLLM: first 4 + most recent
            m = (sink | (pos >= T - (k - SINK)))[None].expand(nkv, T).clone()
        elif name == "random":                       # the cheap control, keeping sinks and the question
            g = torch.Generator().manual_seed(seed * 1000 + li)
            m = _topk_mask(torch.rand(nkv, T, generator=g), k, force=sink | tail)
        elif name == "h2o":                          # half heavy hitters (accumulated attention), half recent
            rec = pos >= T - k // 2
            m = _topk_mask(c["h2o"], k, force=rec | sink)
        elif name == "snapkv":                       # observation window = the last 32 prompt tokens (question inside)
            sc = F.max_pool1d(c["snap"][:, None], 7, 1, 3)[:, 0]
            m = _topk_mask(sc, k, force=pos >= T - 32)
        elif name == "snapkv_doc":                   # same, but compressed before the question arrived
            sc = F.max_pool1d(c["snap_doc"][:, None], 7, 1, 3)[:, 0]
            m = _topk_mask(sc, k, force=tail | ((pos >= T - q_len - 32) & (pos < T - q_len)))
        elif name == "local_global":                 # every 6th layer keeps everything, the others sink + window
            n_glob = n_layers // global_every
            w = int(round((frac * n_layers - n_glob) / (n_layers - n_glob) * T))
            if w < SINK + q_len:
                return None
            if (li + 1) % global_every == 0:
                m = torch.ones(nkv, T, dtype=torch.bool)
            else:
                m = (sink | (pos >= T - (w - SINK)))[None].expand(nkv, T).clone()
        else:
            raise ValueError(name)
        out.append(m)
    return out


def quant(x, bits, axis, group=32):
    """Asymmetric min-max round-to-nearest in groups of `group` along `axis` (x: (nkv, T, hd)); returns dequantised x."""
    nkv, T, hd = x.shape
    if axis == "token":      # groups along head_dim, per token (the usual per-token cache quantisation)
        y = x.reshape(nkv, T, hd // group, group)
        lo, hi = y.amin(-1, keepdim=True), y.amax(-1, keepdim=True)
    else:                     # "channel": groups of `group` tokens, per channel (KIVI's choice for keys)
        pad = (-T) % group
        y = F.pad(x, (0, 0, 0, pad)).reshape(nkv, (T + pad) // group, group, hd)
        lo, hi = y.amin(2, keepdim=True), y.amax(2, keepdim=True)
    s = (hi - lo).clamp(min=1e-8) / (2 ** bits - 1)
    yq = ((y - lo) / s).round().clamp(0, 2 ** bits - 1) * s + lo
    if axis == "token":
        return yq.reshape(nkv, T, hd)
    return yq.reshape(nkv, -1, hd)[:, :T]


def quant_bytes_frac(bits, group=32):
    """Bytes relative to bf16: bits per number plus an fp16 scale and zero per group of 32."""
    return (bits + 32.0 / group) / 16.0
