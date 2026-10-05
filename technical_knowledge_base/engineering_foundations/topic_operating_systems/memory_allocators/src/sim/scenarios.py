"""Request sequences for the caching-allocator simulator (illustrative workloads, sizes in bytes).
Each op is ["+", tag, bytes] or ["-", tag]. Written to scenarios.json and embedded in the page."""
import json, random
MiB = 1 << 20

def training(batches, layers=10, act=12, tmp=30, weights=900):
    """A toy training loop: weights stay; each step's forward keeps one activation per layer
    (act MiB per sample) and makes one temporary per layer (tmp MiB per sample) freed at once; the
    backward frees the activations in reverse."""
    ops = [["+", "w", weights * MiB]]
    for s, n in enumerate(batches):
        for l in range(layers):
            ops.append(["+", f"s{s}a{l}", act * n * MiB + 4096 * l])
            ops.append(["+", f"s{s}t{l}", tmp * n * MiB])
            ops.append(["-", f"s{s}t{l}"])
        for l in reversed(range(layers)):
            ops.append(["-", f"s{s}a{l}"])
    return ops

def seqlen(steps=8, seed=1):
    rng = random.Random(seed)
    lens = [rng.choice([512, 768, 1024, 1536, 2048]) for _ in range(steps)]
    ops = [["+", "w", 700 * MiB]]
    for s, L in enumerate(lens):
        for l in range(8):
            ops.append(["+", f"s{s}kv{l}", L * 24 * 1024 * 3])          # kept: 72 KiB per token
            ops.append(["+", f"s{s}mlp{l}", L * 96 * 1024 * 2])         # temporary: 192 KiB per token
            ops.append(["-", f"s{s}mlp{l}"])
        for l in reversed(range(8)):
            ops.append(["-", f"s{s}kv{l}"])
    return ops, lens

def small(n=40, seed=2):
    rng = random.Random(seed)
    ops, live = [], []
    for i in range(n):
        if live and rng.random() < 0.35:
            t = live.pop(rng.randrange(len(live))); ops.append(["-", t])
        else:
            t = f"x{i}"; ops.append(["+", t, rng.choice([600, 4096, 70000, 300000, 900000])]); live.append(t)
    return ops

if __name__ == "__main__":
    sl, lens = seqlen()
    out = {
        "batch": {"title": "Batch size changes: 8, then 9, then 10", "ops": training([8, 9, 10, 8, 10]), "cap": 2560 * MiB},
        "seqlen": {"title": "Variable sequence lengths " + ", ".join(map(str, lens)), "ops": sl, "cap": 2304 * MiB},
        "small": {"title": "Small tensors packed into 2 MiB segments", "ops": small(), "cap": 64 * MiB},
    }
    json.dump(out, open("scenarios.json", "w"))
    print({k: (len(v["ops"]), v["cap"] // MiB) for k, v in out.items()})
