"""Block lab: count the FLOPs of one forward pass of the tiny GPT on the running sequence with PyTorch's own counter
(torch.utils.flop_counter.FlopCounterMode, which counts matrix multiplies and attention kernels), split by operation,
and check them against the hand formula the page uses.

Run on CPU: LA_SCRATCH=<scratch>/la OMP_NUM_THREADS=4 nice -n 15 <venv>/bin/python src/block/flops.py
Writes src/block/out/flops.json.
"""
import json, os, sys
import torch
from torch.utils.flop_counter import FlopCounterMode

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
sys.path.insert(0, DATA)
from tiny_gpt import GPT, GPTConfig  # noqa: E402
from configs import get  # noqa: E402


def formula(cfg, T):
    """Forward FLOPs for a whole sequence of T tokens, by operation (2 FLOPs per multiply-add).
    Attention scores and the weighted sum are counted over the FULL T x T matrix, as the counter does for a fused
    causal kernel; a causal kernel that skips masked blocks does about half."""
    D, H, Hk, hd, F, V, L = cfg.d_model, cfg.n_head, cfg.n_kv_head, cfg.head_dim, cfg.ffn_hidden, cfg.vocab_size, cfg.n_layer
    per_layer = {
        "qkv_proj": 2 * T * D * (H + 2 * Hk) * hd,
        "attn_scores_qk": 2 * T * T * H * hd,
        "attn_weighted_v": 2 * T * T * H * hd,
        "out_proj": 2 * T * H * hd * D,
        "ffn_up": 2 * T * D * F * (2 if cfg.ffn == "swiglu" else 1),
        "ffn_down": 2 * T * F * D,
    }
    tot = {k: v * L for k, v in per_layer.items()}
    tot["unembed"] = 2 * T * D * V
    return tot


@torch.no_grad()
def main():
    torch.set_num_threads(4)
    seq = json.load(open(os.path.join(DATA, "running_sequence.json")))
    ids = torch.tensor([seq["ids"]])
    T = ids.shape[1]
    res = {"T": T, "presets": {}}
    for name in ("baseline", "swiglu", "gqa2"):
        cfg = get(name)
        torch.manual_seed(0)
        m = GPT(cfg).eval()
        fc = FlopCounterMode(display=False)
        with fc:
            m(ids, record=True)   # record=True takes the explicit q @ k^T, softmax, @ v path, which the counter sees
        counts = fc.get_flop_counts()
        # map module paths to operations
        by_op = {"qkv_proj": 0, "attn_scores_qk": 0, "attn_weighted_v": 0, "out_proj": 0, "ffn_up": 0, "ffn_down": 0, "unembed": 0}
        sdpa = 0
        for mod, ops in counts.items():
            n = sum(ops.values())
            if mod.endswith(".mix.q") or mod.endswith(".mix.k") or mod.endswith(".mix.v"):
                by_op["qkv_proj"] += n
            elif mod.endswith(".mix.o"):
                by_op["out_proj"] += n
            elif mod.endswith(".ffn.up") or mod.endswith(".ffn.gate"):
                by_op["ffn_up"] += n
            elif mod.endswith(".ffn.down"):
                by_op["ffn_down"] += n
            elif mod.endswith("lm_head"):
                by_op["unembed"] += n
            elif mod.endswith(".mix"):
                sdpa += sum(v for k, v in ops.items() if str(k) in ("aten.bmm", "aten.matmul"))  # q @ k^T and w @ v (equal halves); the Linear children are aten.mm
        by_op["attn_scores_qk"] = sdpa // 2
        by_op["attn_weighted_v"] = sdpa - sdpa // 2
        total = int(counts["Global"] and sum(counts["Global"].values()))
        f = formula(cfg, T)
        res["presets"][name] = {"counter_by_op": by_op, "counter_total": total, "formula_by_op": f,
                                "formula_total": sum(f.values()),
                                "match": all(by_op[k] == f[k] for k in f) and total == sum(f.values()),
                                "global_ops": {str(k): v for k, v in counts["Global"].items()},
                                "params": m.param_groups()}
        # forward + backward (training step): the counter sees the gradient matmuls too
        m.train()
        fc2 = FlopCounterMode(display=False)
        with torch.enable_grad():
            with fc2:
                _, loss, _, _ = m(ids[:, :-1].contiguous(), targets=ids[:, 1:].contiguous(), record=True)
                loss.backward()
        tr = sum(fc2.get_flop_counts()["Global"].values())
        fwd255 = sum(formula(cfg, T - 1).values())
        res["presets"][name].update({"train_step_counter_T255": tr, "forward_formula_T255": fwd255,
                                     "train_over_forward": round(tr / fwd255, 4)})
        print(name, "counter", total, "formula", sum(f.values()), "match", res["presets"][name]["match"])
    res["torch"] = torch.__version__
    json.dump(res, open(os.path.join(HERE, "out", "flops.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
