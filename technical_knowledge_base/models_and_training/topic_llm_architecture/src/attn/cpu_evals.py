"""Attention lab: CPU evaluations of the trained tiny GPTs (no training).

1. Serving a full-attention model with a sliding cache, with and without the first token kept (StreamingLLM's
   attention sink, Xiao et al. 2023), against a model trained with the window. Held-out loss on fixed validation
   windows, counted only at positions >= W (where the window has evicted something).
2. Attention mass on the first position, by layer, on the running sequence (why the sink matters).
3. The silent GQA bug: expanding 2 KV heads to 8 query heads with .repeat instead of .repeat_interleave.

Run (CPU, about 2 to 4 minutes): LA_SCRATCH=<scratch>/la OMP_NUM_THREADS=4 nice -n 15 python cpu_evals.py -> out/cpu_evals.json
"""
import json, os, sys, time
import torch, torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
import tiny_gpt
from eval import load
from train import Batches

torch.set_num_threads(4)
dev = "cpu"
SERVE = {"W": None, "sinks": 0}
_orig_bias = tiny_gpt.attn_bias


def serving_bias(cfg, layer_idx, q_pos, k_pos, device, slopes=None):
    if SERVE["W"] is None:
        return _orig_bias(cfg, layer_idx, q_pos, k_pos, device, slopes)
    diff = q_pos[:, None] - k_pos[None, :]
    keep = (diff >= 0) & ((diff < SERVE["W"]) | (k_pos[None, :] < SERVE["sinks"]))
    return torch.zeros(keep.shape, device=device).masked_fill(~keep, float("-inf"))[None]


tiny_gpt.attn_bias = serving_bias


def val_windows(n_batches=6, batch=32, ctx=256):
    b = Batches("val", batch, ctx, 1234)        # the same fixed windows train.py's held-out loss starts from
    return [b.next(dev) for _ in range(n_batches)]


@torch.no_grad()
def loss_by_pos(m, wins):
    tot = torch.zeros(256); n = 0
    for x, y in wins:
        logits, _, _, _ = m(x, record=True)      # record=True forces the explicit-mask path, so serving_bias applies
        ce = F.cross_entropy(logits.float().transpose(1, 2), y, reduction="none")   # (B, T)
        tot += ce.sum(0); n += ce.shape[0]
    return tot / n


def main():
    out = {"date": time.strftime("%Y-%m-%d"), "device": "Apple M1 Pro, CPU, 4 threads", "torch": torch.__version__}
    wins = val_windows()
    out["val_windows"] = len(wins) * 32
    sw = []
    for run in ["at_mha", "at_swa64"]:
        m = load(run, dev)
        for W, sinks in [(None, 0), (64, 0), (64, 1), (64, 4), (32, 0), (32, 1), (32, 4), (16, 0), (16, 1), (16, 4)]:
            SERVE.update(W=W, sinks=sinks)
            lp = loss_by_pos(m, wins)
            cut = W or 64
            sw.append({"run": run, "serve_window": W, "sinks_kept": sinks,
                       "loss_pos_ge_W": round(lp[cut:].mean().item(), 4), "loss_all": round(lp.mean().item(), 4),
                       "loss_by_pos_32": [round(v, 3) for v in lp.view(8, 32).mean(1).tolist()]})
            if W is None:
                sw[-1]["loss_by_pos"] = [round(v, 3) for v in lp.tolist()]
            print(sw[-1]["run"], W, sinks, sw[-1]["loss_pos_ge_W"], flush=True)
        SERVE.update(W=None, sinks=0)
    out["sliding_serving"] = sw
    # 2. attention mass on position 0 (running sequence, queries at positions >= 8)
    run_seq = json.load(open(os.path.join(HERE, "..", "data", "running_sequence.json")))
    ids = torch.tensor([run_seq["ids"]])
    mass = {}
    for run in ["at_mha", "at_swa64", "at_gqa2", "at_mqa", "at_mla"]:
        m = load(run, dev)
        with torch.no_grad():
            _, _, _, rec = m(ids, record=True)
        mass[run] = [round(w[0, :, 8:, 0].mean().item(), 4) for w in rec["attn"]]
        print(run, mass[run], flush=True)
    out["first_token_mass"] = mass
    # 3. the silent GQA bug
    m = load("at_gqa2", dev)
    SERVE.update(W=None, sinks=0)
    good = loss_by_pos(m, wins).mean().item()
    orig = torch.Tensor.repeat_interleave
    torch.Tensor.repeat_interleave = lambda self, r, dim=None, **kw: self.repeat(1, r, 1, 1)   # the bug, exactly
    try:
        bad = loss_by_pos(m, wins).mean().item()
    finally:
        torch.Tensor.repeat_interleave = orig
    out["gqa_expand_bug"] = {"run": "at_gqa2", "loss_repeat_interleave": round(good, 4), "loss_repeat": round(bad, 4)}
    print(out["gqa_expand_bug"])
    json.dump(out, open(os.path.join(HERE, "out", "cpu_evals.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
