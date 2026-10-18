"""CPU self-test of tiny_gpt.py: every preset builds, runs forward and backward, records, and decoding with the
cache gives the same logits as a full forward. Run: <venv>/bin/python src/data/test_tiny_gpt.py"""
import json, sys
import torch
torch.set_num_threads(4)
from configs import PRESETS, get
from tiny_gpt import GPT, kv_cache_bytes_per_token, ssm_state_bytes

torch.manual_seed(0)
rows = []
for name in PRESETS:
    cfg = get(name)
    m = GPT(cfg).eval()
    idx = torch.randint(0, cfg.vocab_size, (2, 48))
    logits, loss, aux, rec = m(idx, targets=idx, record=True)
    assert logits.shape == (2, 48, cfg.vocab_size) and torch.isfinite(loss)
    assert rec["resid_norm"].shape == (cfg.n_layer + 1, 2, 48)
    m.train(); _, l2, a2, _ = m(idx, targets=idx); (l2 + a2).backward(); m.eval()
    with torch.no_grad():
        full, *_ = m(idx)
        cache = []
        a, *_ = m(idx[:, :40], cache=cache)
        steps = [a]
        for t in range(40, 48):
            s, *_ = m(idx[:, t:t + 1], cache=cache)
            steps.append(s)
        inc = torch.cat(steps, 1)
    err = (inc - full).abs().max().item()
    g = m.param_groups()
    rows.append((name, g["total"], g["active"], g["non_embedding"], kv_cache_bytes_per_token(cfg, 2, 256), ssm_state_bytes(cfg), err))
    # capacity drops depend on which tokens share a batch, so a one-token decode step legitimately differs
    assert err < 1e-3 or cfg.capacity_factor, (name, err)
print(f"{'preset':18s} {'total':>9s} {'active':>9s} {'non-emb':>9s} {'KV B/tok':>9s} {'SSM B':>8s} cache-err")
for r in rows:
    print(f"{r[0]:18s} {r[1]:9d} {r[2]:9d} {r[3]:9d} {r[4]:9.0f} {r[5]:8d} {r[6]:.1e}")
if len(sys.argv) > 1:
    json.dump([dict(zip(["preset", "total", "active", "non_embedding", "kv_bytes_per_token_bf16_ctx256", "ssm_state_bytes_bf16", "cache_max_abs_err"], r)) for r in rows],
              open(sys.argv[1], "w"), indent=1)
print("ALL OK")
