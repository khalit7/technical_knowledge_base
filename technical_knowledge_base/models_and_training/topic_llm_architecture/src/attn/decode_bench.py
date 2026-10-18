"""Attention lab: decode-step time against context, on MPS.

Part A (one attention layer at Llama 3.1 8B's shape: 32 query heads of 128, fp16, batch 4): the decode step of
attention alone (one new query per sequence against the cached keys and values) for MHA (32 KV heads), GQA-8,
MQA (1 KV head), an MLA-style absorbed read (one shared 576-number entry: 512 latent + 64 RoPE key, DeepSeek-V3's
sizes, read by all 32 heads), and GQA-8 through transformers' repeat_kv (the eager path that copies K and V up to
32 heads first). Reports median time and effective bandwidth = bytes of cache read / time.
Part B (the tiny GPT itself, random weights, batch 1): the whole-model decode step against context for the
mha, gqa2 and mqa shapes, to show where the cache stops mattering (overheads dominate at this size).

Run under the bench lock with the MPS memory cap:
  PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 OMP_NUM_THREADS=4 nice -n 15 \
    python decode_bench.py  ->  out/decode_bench.json
"""
import json, os, statistics, sys, time
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
dev = os.environ.get("AT_DEV", "mps")
torch.set_num_threads(4)
torch.manual_seed(0)


def sync():
    if dev == "mps":
        torch.mps.synchronize()


def timeit(f, warm=5, n=30):
    for _ in range(warm):
        f()
    sync()
    ts = []
    for _ in range(n):
        t = time.perf_counter(); f(); sync(); ts.append(time.perf_counter() - t)
    return statistics.median(ts), min(ts), max(ts)


def repeat_kv(x, n_rep):  # transformers v5.20.1 models/llama/modeling_llama.py lines 168-177
    b, h, s, d = x.shape
    if n_rep == 1:
        return x
    return x[:, :, None].expand(b, h, n_rep, s, d).reshape(b, h * n_rep, s, d)


@torch.inference_mode()
def part_a():
    B, H, D, dt = 4, 32, 128, torch.float16
    ctxs = [1024, 2048, 4096, 8192, 16384, 32768]
    variants = [("mha", 32, D, D), ("gqa8", 8, D, D), ("mqa", 1, D, D), ("mla_absorbed", 1, 576, 512), ("gqa8_repeat_kv", 8, D, D)]
    rows = []
    for name, hk, dk, dv in variants:
        for T in ctxs:
            g = H // hk
            q = torch.randn(B, hk, g, dk, device=dev, dtype=dt)
            if name == "mla_absorbed":   # one cache tensor; values are its first 512 numbers (the latent)
                K = torch.randn(B, 1, T, dk, device=dev, dtype=dt); V = K[..., :dv]
                cache_bytes = K.numel() * 2
            else:
                K = torch.randn(B, hk, T, dk, device=dev, dtype=dt); V = torch.randn(B, hk, T, dv, device=dev, dtype=dt)
                cache_bytes = (K.numel() + V.numel()) * 2
            scale = dk ** -0.5
            if name == "gqa8_repeat_kv":
                qf = q.reshape(B, H, 1, dk)
                def f():
                    k, v = repeat_kv(K, g), repeat_kv(V, g)
                    p = torch.softmax((qf @ k.transpose(-1, -2)) * scale, -1)
                    return p @ v
            else:
                def f():
                    p = torch.softmax((q @ K.transpose(-1, -2)) * scale, -1)   # (B, hk, g, T): each KV head read once for its g queries
                    return p @ V
            med, lo, hi = timeit(f)
            rows.append({"variant": name, "kv_heads": hk, "ctx": T, "batch": B, "cache_bytes": cache_bytes,
                         "ms_median": round(med * 1e3, 4), "ms_min": round(lo * 1e3, 4), "ms_max": round(hi * 1e3, 4),
                         "GBps": round(cache_bytes / med / 1e9, 1)})
            print(rows[-1], flush=True)
            del q, K, V
            if dev == "mps": torch.mps.empty_cache()
    return rows


@torch.inference_mode()
def part_b():
    from configs import get
    from tiny_gpt import GPT
    rows = []
    for preset in ["rope", "gqa2", "mqa"]:
        over = {"ctx": 2048} if preset == "rope" else {"ctx": 2048, "pos": "rope"}
        m = GPT(get(preset, **over)).to(dev).eval()
        for T in [64, 256, 1024, 2047]:
            idx = torch.randint(1, 4096, (1, T), device=dev)
            cache = []
            m(idx, cache=cache)          # prefill builds the cache
            nxt = torch.randint(1, 4096, (1, 1), device=dev)
            def f():
                c = [dict(d) for d in cache]   # same cache length every call (shallow copy of each layer's dict)
                return m(nxt, cache=c, start=T)
            med, lo, hi = timeit(f, warm=5, n=40)
            rows.append({"preset": preset, "ctx": T, "ms_median": round(med * 1e3, 3), "ms_min": round(lo * 1e3, 3)})
            print(rows[-1], flush=True)
        del m
        if dev == "mps": torch.mps.empty_cache()
    return rows


if __name__ == "__main__":
    out = {"date": time.strftime("%Y-%m-%d"), "device": "Apple M1 Pro, MPS", "torch": torch.__version__,
           "note": "rough timings on a shared laptop at nice 15; median of 30 (A) or 40 (B) calls after 5 warm-up calls",
           "part_a": part_a(), "part_b": part_b()}
    json.dump(out, open(os.path.join(HERE, "out", "decode_bench.json"), "w"), indent=1)
