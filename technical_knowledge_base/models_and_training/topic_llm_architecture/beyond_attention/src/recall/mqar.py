"""Multi-query associative recall (MQAR, Arora et al. 2023, Zoology) on the topic's tiny GPT code.

A sequence lists n key-value pairs, then asks for every key again in a random order; the model must answer each
query with the value that followed that key earlier:
    k1 v1 k2 v2 ... kn vn | q1 a1 q2 a2 ... qn an          (q_i is some k_j, a_i is its v_j)
Loss and accuracy only on the answer positions. Keys and values come from separate ranges of 256 ids each, so chance
is 1/256. The same 2-layer, 128-wide model is built with two attention layers, two SSM layers (the Mamba-2 style
mixer in src/data/tiny_gpt.py, state 16 or 64 per head) or one of each, and trained for the same steps on the same
seeded batches.

Run (one job per bench-lock hold):
  LA_SCRATCH=<scratch>/la <venv>/bin/python src/recall/mqar.py --model attn --pairs 32 [--steps 3000]
Writes out/mqar/<model>_p<pairs>.json (log and final held-out accuracy on 2,048 fresh sequences).
"""
import argparse, json, math, os, sys, time
import torch, torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data"))
sys.path.insert(0, DATA)
from tiny_gpt import GPT, GPTConfig  # noqa: E402

NK = NV = int(os.environ.get("MQAR_NK", 256))  # key ids 2..NK+1, value ids after them; 0 pad, 1 separator
VOCAB = 2 + NK + NV
MODELS = {                          # name -> GPTConfig overrides (2 layers, d_model 128)
    "attn": dict(layer_types="aa", pos="rope"),
    "ssm16": dict(layer_types="ss", pos="nope", ssm_state=16),
    "ssm64": dict(layer_types="ss", pos="nope", ssm_state=64),
    "hybrid": dict(layer_types="sa", pos="rope", ssm_state=16),
}


def batch(n_pairs, B, gen, device):
    keys = torch.stack([torch.randperm(NK, generator=gen)[:n_pairs] for _ in range(B)]) + 2
    vals = torch.randint(0, NV, (B, n_pairs), generator=gen) + 2 + NK
    order = torch.stack([torch.randperm(n_pairs, generator=gen) for _ in range(B)])
    q = keys.gather(1, order); a = vals.gather(1, order)
    ctx = torch.stack([keys, vals], 2).reshape(B, -1)
    qa = torch.stack([q, a], 2).reshape(B, -1)
    x = torch.cat([ctx, torch.ones(B, 1, dtype=torch.long), qa], 1)       # length 4n + 1
    pos_q = 2 * n_pairs + 1 + 2 * torch.arange(n_pairs)                  # query positions; the answer is next
    inp = x[:, :-1]                                                        # predict token p+1 at position p
    tgt = torch.full_like(inp, -100).scatter(1, pos_q.expand(B, -1), a)
    return inp.to(device), tgt.to(device)


@torch.no_grad()
def accuracy(m, n_pairs, device, n=2048, seed=12345):
    g = torch.Generator().manual_seed(seed); right = tot = 0
    for _ in range(n // 256):
        x, t = batch(n_pairs, 256, g, device)
        lg, *_ = m(x)
        mask = t != -100
        right += (lg.argmax(-1)[mask] == t[mask]).sum().item(); tot += mask.sum().item()
    return right / tot


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", choices=sorted(MODELS), required=True)
    ap.add_argument("--pairs", type=int, required=True)
    ap.add_argument("--steps", type=int, default=3000)
    ap.add_argument("--batch", type=int, default=64)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--device", default="mps" if torch.backends.mps.is_available() else "cpu")
    a = ap.parse_args()
    torch.set_num_threads(4); torch.manual_seed(a.seed)
    T = 4 * a.pairs
    cfg = GPTConfig(vocab_size=VOCAB, n_layer=2, d_model=128, n_head=4, ctx=T, **MODELS[a.model])
    m = GPT(cfg).to(a.device)
    n_par = sum(p.numel() for p in m.parameters())
    opt = torch.optim.AdamW(m.parameters(), lr=a.lr, betas=(0.9, 0.95), weight_decay=0.1)
    sched = lambda s: min(1, (s + 1) / 200) * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * min(1, s / a.steps))))
    g = torch.Generator().manual_seed(a.seed)
    log = []; t0 = time.time()
    for s in range(a.steps):
        for pg in opt.param_groups: pg["lr"] = a.lr * sched(s)
        x, t = batch(a.pairs, a.batch, g, a.device)
        _, loss, *_ = m(x, t)
        opt.zero_grad(set_to_none=True); loss.backward()
        torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step()
        if s % 250 == 0 or s == a.steps - 1:
            m.eval(); acc = accuracy(m, a.pairs, a.device, n=512); m.train()
            log.append({"step": s, "loss": round(loss.item(), 4), "acc": round(acc, 4), "sec": round(time.time() - t0, 1)})
            print(log[-1], flush=True)
    m.eval(); acc = accuracy(m, a.pairs, a.device)
    E = cfg.ssm_expand * cfg.d_model
    state = {"attn": 0, "ssm16": 2 * E * 16, "ssm64": 2 * E * 64, "hybrid": E * 16}[a.model]
    res = {"model": a.model, "pairs": a.pairs, "seq_len": T, "steps": a.steps, "batch": a.batch, "lr": a.lr,
           "seed": a.seed, "params": n_par, "ssm_state_numbers": state,
           "kv_numbers_at_end": {"attn": 2 * 2 * 128 * T, "hybrid": 2 * 128 * T}.get(a.model, 0),
           "acc": round(acc, 4), "eval_sequences": 2048, "sec": round(time.time() - t0, 1), "log": log,
           "device": a.device, "torch": torch.__version__}
    os.makedirs(os.path.join(HERE, "out", "mqar"), exist_ok=True)
    json.dump(res, open(os.path.join(HERE, "out", "mqar", f"{a.model}_p{a.pairs}.json"), "w"), indent=1)
    print("FINAL", a.model, a.pairs, acc)


if __name__ == "__main__":
    main()
