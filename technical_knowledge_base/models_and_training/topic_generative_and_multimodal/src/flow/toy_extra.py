"""Flow lab, 2-D toy follow-up (CPU, seconds): Heun with the last step as Euler (EDM's rule), scored exactly like
toy2d.py (same networks as stored in out/toy2d.json, same 2,000 noises and targets). Writes out/toy_extra.json."""
import base64, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
import torch
from toy2d import MLP, data, flow_solve, on_mode, w2

torch.set_num_threads(4)
T = json.load(open(os.path.join(HERE, "out", "toy2d.json")))


def load(blob):
    net, sd = MLP(), {}
    for i, L in enumerate(blob):
        q = torch.from_numpy(np.frombuffer(base64.b64decode(L["q"]), np.int8).astype(np.float32)).view(L["o"], L["i"])
        sd[f"l.{i}.weight"] = q * torch.tensor(L["s"]).view(-1, 1); sd[f"l.{i}.bias"] = torch.tensor(L["b"])
    net.load_state_dict(sd); return net


@torch.no_grad()
def heun_last_euler(net, z, n):
    x, h = z.clone(), 1.0 / n
    for k in range(n):
        t = torch.full((len(x),), k * h); v = net(x, t)
        x = x + h * v if k == n - 1 else x + h * 0.5 * (v + net(x + h * v, t + h))
    return x


ge = torch.Generator().manual_seed(11)
zE = torch.randn(2000, 2, generator=ge); tgt = data(2000, ge)
res = []
for kind in ["cfm", "reflow", "ot"]:
    net = load(T["nets"][kind]); ref = flow_solve(net, zE, 512, "heun")
    for n in [1, 2, 3, 4, 6, 8, 16, 32, 64]:
        x = heun_last_euler(net, zE, n)
        res.append({"model": kind, "solver": "heun_last_euler", "steps": n, "nfe": 2 * n - 1, "on_mode": round(on_mode(x), 4),
                    "w2": round(w2(x, tgt), 4), "err_ref": round(float((x - ref).norm(dim=1).mean()), 4)})
# check: the stored results are reproduced by these loaded networks
chk = flow_solve(load(T["nets"]["cfm"]), zE, 4, "euler")
r0 = [r for r in T["results"] if r["model"] == "cfm" and r["solver"] == "euler" and r["steps"] == 4][0]
out = {"results": res, "check_cfm_euler4_on_mode": [round(on_mode(chk), 4), r0["on_mode"]]}
json.dump(out, open(os.path.join(HERE, "out", "toy_extra.json"), "w"))
print(out["check_cfm_euler4_on_mode"]); [print(r) for r in res if r["model"] == "cfm"]
