"""Small CPU checks quoted on the page (output pasted from out/demos.txt).

1. Causal linear attention computed two ways, the parallel masked form and the recurrence, agree.
2. Mamba-2's decay mask L[i, j] = exp(sum_{j<k<=i} log a_k) computed by subtracting cumulative sums loses precision
   in low precision; the segment-sum form (transformers' mamba2 segment_sum) does not.

Run: <venv>/bin/python src/code/demos.py > src/code/out/demos.txt
"""
import torch, torch.nn.functional as F

torch.manual_seed(0)

# 1. linear attention: parallel (training) form vs recurrent (decoding) form ------------------------------------
T, dk, dv = 64, 16, 16
q, k, v = torch.randn(T, dk, dtype=torch.float64), torch.randn(T, dk, dtype=torch.float64), torch.randn(T, dv, dtype=torch.float64)
phi = lambda x: F.elu(x) + 1                                   # Katharopoulos et al. 2020 feature map
Q, K = phi(q), phi(k)
mask = torch.ones(T, T, dtype=torch.float64).tril()
A = (Q @ K.T) * mask                                           # (T, T): like attention scores, causal
par = (A @ v) / A.sum(-1, keepdim=True)                        # parallel form: O(T^2 d)
S = torch.zeros(dk, dv, dtype=torch.float64); z = torch.zeros(dk, dtype=torch.float64); rec = []
for t in range(T):                                             # recurrent form: O(T d^2), state S is dk x dv
    S = S + K[t, :, None] * v[t, None, :]
    z = z + K[t]
    rec.append((Q[t] @ S) / (Q[t] @ z))
rec = torch.stack(rec)
print("linear attention, T=64, d=16: max |parallel - recurrent| =", f"{(par - rec).abs().max().item():.2e}")
print("state size:", S.numel() + z.numel(), "numbers, whatever T is; a KV cache here holds", T * (dk + dv), "numbers")

# 2. decay mask by subtraction of cumulative sums vs segment sum --------------------------------------------------
T = 2048
la = -torch.rand(T, dtype=torch.float64) * 0.05                # log a_t in (-0.05, 0]: half-lives of 14 tokens and up
ref = torch.exp(torch.cumsum(la, 0)[:, None] - torch.cumsum(la, 0)[None, :]).tril()


def seg_sum(x):                                                # transformers 5.20.1 models/mamba2/modeling_mamba2.py
    n = x.size(-1)
    x = x[..., None].expand(*x.size(), n)
    x = x.masked_fill(~torch.ones(n, n, dtype=torch.bool).tril(-1), 0)
    s = torch.cumsum(x, dim=-2)
    return s.masked_fill(~torch.ones(n, n, dtype=torch.bool).tril(0), float("-inf"))


for dt in (torch.float32, torch.bfloat16):
    cs = torch.cumsum(la.to(dt), 0)
    sub = torch.exp((cs[:, None] - cs[None, :]).float()).tril()
    seg = torch.exp(seg_sum(la.to(dt)).float())
    print(f"{str(dt):15s} T=2048: subtract cumsums, max error {(sub - ref).abs().max().item():.3e}; "
          f"segment sum, max error {(seg - ref).abs().max().item():.3e}")
