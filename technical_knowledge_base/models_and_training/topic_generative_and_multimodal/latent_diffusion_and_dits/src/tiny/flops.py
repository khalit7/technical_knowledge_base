"""FLOPs and parameters of the topic's tiny denoisers (CPU, batch 1, one forward pass), counted by
torch.utils.flop_counter.FlopCounterMode. Found on the first run: the counter sees TinyUNet's attention (as aten.bmm)
but not TinyDiT's (nn.MultiheadAttention with need_weights=False takes a fused native path the counter does not
count), so the DiT's attention scores are added analytically: 2 * 2 * N^2 * d per block (QK^T and AV), N tokens.
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "src", "data"))
import torch
from torch.utils.flop_counter import FlopCounterMode
from nets import TinyUNet, TinyDiT, n_params

torch.set_num_threads(2)
rows = []
for name, mk in [("unet", lambda: TinyUNet()), ("dit_p8", lambda: TinyDiT(patch=8)), ("dit_p4", lambda: TinyDiT(patch=4)),
                 ("dit_p2", lambda: TinyDiT(patch=2))]:
    m = mk().eval()
    x = torch.randn(1, 1, 32, 32); t = torch.tensor([0.5]); y = torch.tensor([3])
    with FlopCounterMode(display=False) as fc, torch.no_grad():
        m(x, t, y)
    tot = fc.get_total_flops()
    by = {str(k): int(v) for k, v in fc.get_flop_counts().get("Global", {}).items()}
    r = {"net": name, "params": n_params(m), "fwd_flops": int(tot), "by_op": by}
    if name.startswith("dit"):
        N = (32 // m.p) ** 2; d = 192; L = 6
        r["tokens"] = N; r["attn_scores_flops_analytic"] = 4 * N * N * d * L
    r["fwd_flops_total"] = int(tot) + r.get("attn_scores_flops_analytic", 0)
    r.setdefault("fwd_flops_total", int(tot))
    rows.append(r); print(name, r["params"], f"{tot/1e6:.1f} MFLOP", by, flush=True)
json.dump(rows, open(os.path.join(HERE, "out_flops.json"), "w"), indent=1)
