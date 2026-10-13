"""Call torch.nn.attention.varlen.varlen_attn on CPU and MPS (deterministic; records the outcome).
    python varlen_probe.py -> inputs/varlen.json"""
import torch, common
from torch.nn.attention.varlen import varlen_attn
out = {"env": common.env()}
for dev in ("cpu", "mps"):
    lens = [5, 3, 8]; tot = sum(lens)
    q, k, v = (torch.randn(tot, 4, 64, device=dev) for _ in range(3))
    cu = torch.tensor([0, 5, 8, 16], dtype=torch.int32, device=dev)
    try:
        varlen_attn(q, k, v, cu, cu, max(lens), max(lens)); out[dev] = "ran"
    except Exception as e:
        out[dev] = f"{type(e).__name__}: {str(e).splitlines()[0][:200]}"
    print(dev, out[dev])
common.dump("varlen.json", out)
