"""Which router logits receive gradient? One trained tiny-GPT MoE layer, the running sequence, CPU.
For each token, the gradient of the language-model loss with respect to its 8 router logits is non-zero only on the
k experts it chose (selection is a top-k, which has no gradient); adding the Switch auxiliary loss puts gradient on all.

Run: LA_SCRATCH=<scratch>/la OMP_NUM_THREADS=4 <venv>/bin/python src/code/grad_check.py <run> [layer]
Writes src/code/out/grad_<run>.json.
"""
import json, os, sys
import torch

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "analysis"))
import moe_probe as P  # noqa: E402

run = sys.argv[1]; layer = int(sys.argv[2]) if len(sys.argv) > 2 else 3
torch.set_num_threads(4)
P.MoE.forward = P.ORIG_FORWARD
model = P.load(run)
model.train()                                       # aux is computed in training mode only (no dropout in this model)
moe = model.blocks[layer].ffn
store = {}
orig_router = moe.router.forward
def hooked(x):
    out = orig_router(x)
    out.retain_grad(); store["logits"] = out
    return out
moe.router.forward = hooked
ids = torch.tensor([json.load(open(os.path.join(P.DATA, "running_sequence.json")))["ids"]])
res = {"run": run, "layer": layer, "tokens": [1, 2, 3, 4, 5, 6, 7, 8]}
for mode in ("lm_only", "lm_plus_aux"):
    model.zero_grad()
    _, loss, aux, _ = model(ids[:, :-1], targets=ids[:, 1:])
    (loss + (model.cfg.aux_coef * aux if mode == "lm_plus_aux" else 0)).backward()
    g = store["logits"].grad[1:9]                   # tokens 1..8 of the running sequence
    sel = moe.last["top_i"][0, 1:9]
    res[mode] = {"grad": [[float(f"{v:.3e}") for v in row] for row in g.tolist()],
                 "nonzero_per_token": [int((row != 0).sum()) for row in g],
                 "max_unselected_over_max_selected": float(f"{max(float(g[t][[e for e in range(g.shape[1]) if e not in sel[t].tolist()]].abs().max()) / float(g[t][sel[t]].abs().max()) for t in range(8)):.3e}"),
                 "selected": sel.tolist(), "aux": float(aux)}
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), "out"), exist_ok=True)
P.jdump(res, os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", f"grad_{run}.json"))
for m in ("lm_only", "lm_plus_aux"):
    print(m, "non-zero logit gradients per token:", res[m]["nonzero_per_token"], "max |unselected| / max |selected|:", res[m]["max_unselected_over_max_selected"])
