"""How often each of the 4,096 tokens occurs in the tiny GPT's training data, and what training did to the embedding
rows of tokens it (almost) never saw: the running example's own "glitch tokens". CPU, about 20 s.
Needs $LA_SCRATCH/data/train.bin and $LA_SCRATCH/runs/ref_baseline_s1500 (see the root's src/data/README.md).
Run: LA_SCRATCH=<scratch>/la OMP_NUM_THREADS=4 nice -n 15 <venv>/bin/python freq_glitch.py -> ../out/freq_glitch.json
"""
import json, os, sys
import numpy as np, torch
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data"))
sys.path.insert(0, DATA)
from eval import load
from tokenizers import Tokenizer
torch.set_num_threads(4)
SCR = os.environ["LA_SCRATCH"]
tok = Tokenizer.from_file(os.path.join(DATA, "tokenizer.json"))
V = tok.get_vocab_size()
arr = np.fromfile(os.path.join(SCR, "data", "train.bin"), dtype=np.uint16)
cnt = np.bincount(arr, minlength=V).astype(np.int64)
m = load("ref_baseline_s1500", "cpu")
W = m.wte.weight.detach().float()
norm = W.norm(dim=1).numpy()
pieces = [tok.decode([i]) for i in range(V)]
order = np.argsort(cnt, kind="stable")
zero = [int(i) for i in range(1, V) if cnt[i] == 0]
lt100 = [int(i) for i in range(1, V) if 0 < cnt[i] < 100]
lf = np.log10(cnt[1:] + 1); rho = float(np.corrcoef(lf, norm[1:])[0, 1])
# rank correlation (Spearman) without scipy
def rank(x): r = np.empty(len(x)); r[np.argsort(x, kind="stable")] = np.arange(len(x)); return r
sp = float(np.corrcoef(rank(cnt[1:]), rank(norm[1:]))[0, 1])
# buckets by frequency
edges = [0, 1, 100, 10_000, 1_000_000, 10 ** 12]
buckets = []
for lo, hi in zip(edges[:-1], edges[1:]):
    sel = [i for i in range(1, V) if lo <= cnt[i] < hi]
    buckets.append({"lo": lo, "hi": hi, "n": len(sel), "median_norm": float(np.median(norm[sel])) if sel else None})
# what the trained model does right after a never-seen token, against a common word in the same slot (greedy, 25 tokens)
probe = []
with torch.no_grad():
    base = tok.encode("Once upon a time, there was a little").ids
    cands = [("common", tok.token_to_id("Ġdog"))] + [("never seen", i) for i in zero[:4]]
    for kind, tid in cands:
        ids = torch.tensor([[0] + base + [tid]])
        out = m.generate(ids, 25)[0, ids.shape[1]:].tolist()
        logits, *_ = m(ids)
        p = torch.softmax(logits[0, -1].float(), -1)
        ent = float(-(p * p.clamp_min(1e-12).log()).sum())
        probe.append({"kind": kind, "id": int(tid), "piece": pieces[tid], "count": int(cnt[tid]), "norm": float(norm[tid]),
                      "next_entropy_nats": round(ent, 3), "continuation": tok.decode(out)})
Wn = torch.nn.functional.normalize(W, dim=1)
zs = torch.tensor(zero); common = torch.tensor([int(i) for i in order[::-1][:200]])
cos_zero = (Wn[zs] @ Wn[zs].T)[~torch.eye(len(zero), dtype=bool)].mean().item()
cos_common = (Wn[common] @ Wn[common].T)[~torch.eye(200, dtype=bool)].mean().item()
mean_dir = Wn[zs].mean(0); mean_dir = mean_dir / mean_dir.norm()
merged_rare = [{"id": int(i), "piece": pieces[i], "count": int(cnt[i])} for i in range(257, V) if cnt[i] < 100]
res = {"V": V, "cos_within_zero": round(cos_zero, 3), "cos_within_200_common": round(cos_common, 3),
       "n_byte_tokens_zero": sum(1 for i in zero if i <= 256), "merged_rare": merged_rare, "train_tokens": int(arr.size), "count_eot": int(cnt[0]),
       "n_zero": len(zero), "n_lt100": len(lt100),
       "zero": [{"id": i, "piece": pieces[i], "norm": round(float(norm[i]), 3)} for i in zero],
       "rarest_nonzero": [{"id": int(i), "piece": pieces[i], "count": int(cnt[i]), "norm": round(float(norm[i]), 3)} for i in order if cnt[i] > 0][:15],
       "most_common": [{"id": int(i), "piece": pieces[i], "count": int(cnt[i])} for i in order[::-1][:15]],
       "median_norm": float(np.median(norm[1:])), "pearson_logfreq_norm": round(rho, 3), "spearman_freq_norm": round(sp, 3),
       "buckets": buckets, "probe": probe,
       "hist": {"log10_count_bins": np.histogram(lf, bins=14, range=(0, 7))[0].tolist()},
       "count": cnt.tolist(), "norm": [round(float(x), 3) for x in norm]}
json.dump(res, open(os.path.join(HERE, "..", "out", "freq_glitch.json"), "w"), ensure_ascii=False)
print("zero", len(zero), "lt100", len(lt100), "median norm", res["median_norm"], "pearson", rho, "spearman", sp)
print("zero tokens", [(z["piece"], z["norm"]) for z in res["zero"]][:30])
print("rarest", [(r["piece"], r["count"], r["norm"]) for r in res["rarest_nonzero"]])
print("buckets", buckets); print("cos zero", cos_zero, "cos common", cos_common, "merged rare", merged_rare)
for p in probe: print(p)
