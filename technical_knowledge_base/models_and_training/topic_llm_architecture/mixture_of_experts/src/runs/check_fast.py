"""fast_moe.fast_forward against the original tiny_gpt.MoE.forward on CPU: same logits, loss, aux, router choices and
gradients (including which expert parameters get no gradient at all), for every MoE preset used on the page.
Run: <venv>/bin/python src/runs/check_fast.py  ->  src/runs/check_fast.json
"""
import copy, json, os, sys
import torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fast_moe  # noqa: E402
from fast_moe import tiny_gpt  # noqa: E402
sys.path.insert(0, fast_moe.DATA)
from configs import get  # noqa: E402

torch.set_num_threads(4)
res = []
for preset, over in [("moe8top2", {}), ("moe8top2_bias", {}), ("moe8top2", {"balance": "bias"}), ("moe8top2", {"balance": "none"}),
                     ("moe8top2_cap1", {}), ("moe16top3_shared", {}), ("moe8top2", {"_tokens": 2})]:
    torch.manual_seed(0)
    T = over.get("_tokens", 64)
    cfg = get(preset, **{a: b for a, b in over.items() if not a.startswith("_")})
    m0 = tiny_gpt.GPT(cfg).train()
    with torch.no_grad():                       # give the router a skew so some experts get no tokens in the batch
        for b in m0.blocks:
            b.ffn.router.weight[0] += 0.5
    m1 = copy.deepcopy(m0)
    x = torch.randint(0, cfg.vocab_size, (4 if T > 2 else 1, T)); y = torch.randint(0, cfg.vocab_size, x.shape)
    out = []
    for m, fwd in ((m0, fast_moe.ORIG), (m1, fast_moe.fast_forward)):
        tiny_gpt.MoE.forward = fwd
        logits, loss, aux, _ = m(x, targets=y)
        (loss + cfg.aux_coef * aux).backward()
        out.append((logits, loss, aux, [b.ffn.last for b in m.blocks],
                    {n: p.grad for n, p in m.named_parameters()}, [b.ffn.e_bias.clone() for b in m.blocks]))
    tiny_gpt.MoE.forward = fast_moe.ORIG
    (l0, s0, a0, r0, g0, e0), (l1, s1, a1, r1, g1, e1) = out
    none_mismatch = [n for n in g0 if (g0[n] is None) != (g1[n] is None)]
    gd = max(float((g0[n] - g1[n]).abs().max()) for n in g0 if g0[n] is not None and g1[n] is not None)
    res.append({"preset": preset, "override": over, "max_logit_diff": float((l0 - l1).abs().max()),
                "loss_diff": float((s0 - s1).abs()), "aux_diff": float((a0 - a1).abs()),
                "same_choices": all(torch.equal(p["top_i"], q["top_i"]) for p, q in zip(r0, r1)),
                "same_drops": all(p["dropped_frac"] == q["dropped_frac"] for p, q in zip(r0, r1)),
                "dropped_frac_layer0": r0[0]["dropped_frac"],
                "params_without_grad": sum(1 for n in g0 if g0[n] is None), "grad_none_mismatch": len(none_mismatch),
                "max_grad_diff": gd, "same_bias_update": all(torch.equal(p, q) for p, q in zip(e0, e1))})
    print(res[-1])
json.dump(res, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "check_fast.json"), "w"), indent=1)
