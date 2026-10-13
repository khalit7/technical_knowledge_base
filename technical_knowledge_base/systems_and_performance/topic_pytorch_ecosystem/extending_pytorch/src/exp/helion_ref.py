"""Helion ref mode (HELION_INTERPRET=1): the kernel body run as eager PyTorch on the CPU, no compiler. Called by helion_k.py."""
import torch, helion, helion.language as hl, torch.nn.functional as F, json
@helion.kernel(autotune_effort="none")
def gelu_erf(x: torch.Tensor) -> torch.Tensor:
    out = torch.empty_like(x)
    for tile in hl.tile(x.size()):
        v = x[tile]
        out[tile] = 0.5 * v * (1.0 + torch.erf(v * 0.7071067811865476))
    return out
@helion.kernel(autotune_effort="none")
def softmax_rows(x: torch.Tensor) -> torch.Tensor:
    n, m = x.size()
    out = torch.empty_like(x)
    for tile_n in hl.tile(n):
        row = x[tile_n, :]
        mx = torch.amax(row, dim=1, keepdim=True)
        e = torch.exp(row - mx)
        out[tile_n, :] = e / torch.sum(e, dim=1, keepdim=True)
    return out
r={}
x=torch.randn(8,64,1024); r["gelu_erf"]=(gelu_erf(x)-F.gelu(x)).abs().max().item()
y=torch.randn(512,64); r["softmax_rows"]=(softmax_rows(y)-torch.softmax(y,1)).abs().max().item()
print(json.dumps(r))
