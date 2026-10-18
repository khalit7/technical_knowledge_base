"""curve.py (CPU): what the loss curve of the tiny GPT means, read off real snapshots.
1. Count-based floors on the held-out split: unigram (a model that ignores context) and bigram (a model that sees
   only the previous token, interpolated with the unigram; the best of a few smoothing strengths, chosen on the
   first half of the held-out split, scored on the second half: a calculation, not a trained network).
2. For each snapshot of the Inside lab's baseline retrain ($LA_SCRATCH/runs/in_snap/snap_<step>.pt, saved every few
   hundred steps, final held-out 2.2744): held-out loss on train.py's 20 fixed windows, per-token loss on the
   running sequence, and the greedy continuation of evaluation prompt 7 (the running sequence's own opening).
3. Sampling: the trained reference model's full next-token logits at two points of the running sequence (for the
   page's temperature and top-k explorer), and real continuations at several temperatures (seed 0).
Writes out/curve.json and out/sampling.json.
"""
import glob, json, math, os, re, sys
import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "..", "..", "src", "data")
sys.path.insert(0, os.path.join(HERE, "..", "zero")); sys.path.insert(0, DATA)
import gpt_zero as gz
from train import held_out_loss, SCR
from tokenizers import Tokenizer

torch.set_num_threads(4)
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
tok = Tokenizer.from_file(os.path.join(DATA, "tokenizer.json"))
run = json.load(open(os.path.join(DATA, "running_sequence.json")))
ids = torch.tensor([run["ids"]])
prompt7 = json.load(open(os.path.join(DATA, "eval_prompts.json")))["prompts"][6]
V = 4096
OUT = {}

# ---------------------------------------------------------------- 1. count floors
tr = np.memmap(os.path.join(SCR, "data", "train.bin"), dtype=np.uint16, mode="r")
va = np.memmap(os.path.join(SCR, "data", "val.bin"), dtype=np.uint16, mode="r")
uni = np.bincount(tr, minlength=V).astype(np.float64)
big = np.zeros(V * V, dtype=np.int64)
CH = 20_000_000
for s in range(0, len(tr) - 1, CH):
    a = tr[s:s + CH + 1].astype(np.int64)
    big += np.bincount(a[:-1] * V + a[1:], minlength=V * V)
big = big.reshape(V, V).astype(np.float64)
p_uni = (uni + 1) / (uni.sum() + V)
row = big.sum(1)
v = va.astype(np.int64); half = len(v) // 2
def ce(k, seg):
    a, b = seg[:-1], seg[1:]
    p = (big[a, b] + k * p_uni[b]) / (row[a] + k)
    return float(-np.log(p).mean())
ks = [0.1, 1, 10, 100, 1000]
tune = {k: ce(k, v[:half]) for k in ks}
kbest = min(tune, key=tune.get)
OUT["floors"] = {"unigram_val": round(float(-np.log(p_uni[v]).mean()), 4), "uniform": round(math.log(V), 4),
                 "bigram_tune": {str(k): round(x, 4) for k, x in tune.items()}, "bigram_k": kbest,
                 "bigram_val_second_half": round(ce(kbest, v[half:]), 4), "train_tokens": int(len(tr)), "val_tokens": int(len(v))}
print(OUT["floors"])
del big

# ---------------------------------------------------------------- 2. snapshots
snaps = sorted(glob.glob(os.path.join(SCR, "runs", "in_snap", "snap_*.pt")), key=lambda f: int(re.search(r"snap_(\d+)", f).group(1)))
x7 = torch.tensor([[0] + tok.encode(prompt7).ids])
OUT["snaps"] = []
for f in snaps:
    ck = torch.load(f, map_location="cpu")
    m = gz.GPT(gz.Config()).eval(); m.load_state_dict(gz.load_tiny(ck["model"]))
    with torch.no_grad():
        lg, *_ = m(ids)
        lp = torch.log_softmax(lg[0, :-1].float(), -1).gather(-1, ids[0, 1:, None])[:, 0]
        cont = m.generate(x7, 40)[0, x7.shape[1]:].tolist()
    rec = {"step": ck["step"], "val": round(held_out_loss(m, "cpu", 256), 4), "seq_mean": round(-lp.mean().item(), 4),
           "tok_loss": [round(-x, 2) for x in lp.tolist()], "greedy": tok.decode(cont[: cont.index(0)] if 0 in cont else cont)}
    OUT["snaps"].append(rec); print(rec["step"], rec["val"], rec["seq_mean"], rec["greedy"][:80].replace("\n", " "))
OUT["prompt"] = prompt7
OUT["pieces"] = run["pieces"]
json.dump(OUT, open(os.path.join(HERE, "out", "curve.json"), "w"))

# ---------------------------------------------------------------- 3. sampling
ck = torch.load(os.path.join(SCR, "runs", "ref_baseline_s1500", "ckpt.pt"), map_location="cpu")
m = gz.GPT(gz.Config()).eval(); m.load_state_dict(gz.load_tiny(ck["model"]))
S = {"points": [], "samples": []}
with torch.no_grad():
    lg, *_ = m(ids)
for pos in (30, 51):            # predicting the token after position pos
    ctx_text = "".join(run["pieces"][max(1, pos - 14):pos + 1])
    l = lg[0, pos].float()
    order = torch.argsort(l, descending=True)
    S["points"].append({"pos": pos, "context": ctx_text, "next_true": run["pieces"][pos + 1],
                        "logits": [round(x, 2) for x in l.tolist()],
                        "top": [[int(i), tok.decode([int(i)])] for i in order[:60]]})
p = "Once upon a time, there was a little girl named Lily. She loved to"
x = torch.tensor([[0] + tok.encode(p).ids])
for T_, k in [(0, None), (0.5, None), (0.8, None), (1.0, None), (1.5, None), (1.0, 40)]:
    g = torch.Generator().manual_seed(0)
    out = m.generate(x, 50, temperature=T_, top_k=k, generator=g)[0, x.shape[1]:].tolist()
    S["samples"].append({"T": T_, "top_k": k, "text": tok.decode(out[: out.index(0)] if 0 in out else out)})
    print(T_, k, S["samples"][-1]["text"][:100].replace("\n", " "))
S["prompt"] = p
S["vocab"] = [tok.decode([i]) for i in range(V)]
json.dump(S, open(os.path.join(HERE, "out", "sampling.json"), "w"))
print("wrote out/curve.json, out/sampling.json")
