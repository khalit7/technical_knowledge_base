# Correctness on the CPU: run every Triton kernel of the lab with TRITON_INTERPRET=1 against PyTorch
# (float64 references). Writes JSON to stdout. Sizes are small: the interpreter runs NumPy per block.
import os, json
assert os.environ.get("TRITON_INTERPRET") == "1"
import torch, triton
from lab_tl import softmax_3pass, softmax_online, softmax_row, matmul, softmax_matmul, flash_attn

torch.manual_seed(0)
res = {"triton": triton.__version__, "torch": torch.__version__, "checks": []}


def rec(name, out, ref, **kw):
    err = float((out.double() - ref).abs().max())
    res["checks"].append({"kernel": name, "max_abs_err": err, **kw})


R, C = 64, 1000                       # C not a multiple of the block: exercises the masks
x = torch.randn(R, C) * 2
ref = torch.softmax(x.double(), 1)
for fn, blk in ((softmax_3pass, 256), (softmax_online, 256), (softmax_row, 1024)):
    y = torch.empty_like(x)
    fn[(R,)](x, y, C, BLOCK=blk)
    rec(fn.__name__, y, ref, shape=[R, C], BLOCK=blk)

M = N = K = 128
for dt in (torch.float32, torch.float16):
    A, B = torch.randn(M, K).to(dt), torch.randn(K, N).to(dt)
    Cm = torch.empty(M, N, dtype=torch.float32)
    matmul[(M // 64, N // 64)](A, B, Cm, M, N, K, BM=64, BN=64, BK=32)
    rec("matmul", Cm, A.double() @ B.double(), dtype=str(dt).split(".")[1], shape=[M, N, K])

n, d = 256, 64
S = torch.randn(n, n) * 2
V = torch.randn(n, d)
O = torch.empty(n, d)
softmax_matmul[(n // 64,)](S, V, O, n, D=d, BM=64, BK=32)
rec("softmax_matmul", O, torch.softmax(S.double(), 1) @ V.double(), shape=[n, n, d])

H = 2
for dt in (torch.float32, torch.float16):
    Q, Kt, Vt = (torch.randn(H, n, d).to(dt) for _ in range(3))
    Oa = torch.empty(H, n, d, dtype=dt)
    flash_attn[(n // 64, H)](Q, Kt, Vt, Oa, n, d ** -0.5, D=d, BM=64, BK=32)
    ref = torch.softmax((Q.double() @ Kt.double().transpose(1, 2)) * d ** -0.5, -1) @ Vt.double()
    rec("flash_attn", Oa, ref, dtype=str(dt).split(".")[1], shape=[H, n, d])
print(json.dumps(res, indent=1))
