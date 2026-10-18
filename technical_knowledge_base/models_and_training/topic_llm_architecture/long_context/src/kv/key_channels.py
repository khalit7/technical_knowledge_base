"""Do SmolLM2's cached keys have outlier channels (KIVI's premise)? Mean |entry| per channel of K and V, over the
4,096-token pass-key prompt (depth 50%, seed 0), per layer and KV head: ratio of the largest channel to the median.
Writes out/key_channels.json. CPU, a few seconds."""
import json, os, torch
import smol, items
torch.set_num_threads(4)
tok, m = smol.load()
it = items.passkey(tok, 4096, 0.5, 0)
cache = smol.prefill(m, it["ctx"], want_scores=False)
rows = []
for li, c in enumerate(cache):
    for h in range(c["k"].shape[0]):
        k = c["k"][h].abs().mean(0); v = c["v"][h].abs().mean(0)
        rows.append({"layer": li, "head": h, "k_ratio": round(float(k.max() / k.median()), 2), "v_ratio": round(float(v.max() / v.median()), 2)})
kr = sorted(r["k_ratio"] for r in rows); vr = sorted(r["v_ratio"] for r in rows)
out = {"rows": rows, "k_median_ratio": kr[len(kr) // 2], "v_median_ratio": vr[len(vr) // 2], "k_max_ratio": kr[-1], "v_max_ratio": vr[-1]}
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "out/key_channels.json"), "w"), indent=1)
print({k: v for k, v in out.items() if k != "rows"})
