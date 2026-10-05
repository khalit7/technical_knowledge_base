# Correctness on CPU: run the Triton kernels with TRITON_INTERPRET=1 against PyTorch.
import os, json, sys
assert os.environ.get("TRITON_INTERPRET") == "1"
import torch, triton
from kernels_tl import vadd, matmul, softmax
torch.manual_seed(0)
res = {"triton": triton.__version__, "torch": torch.__version__}
n = 5000
a, b = torch.randn(n), torch.randn(n)
c = torch.empty(n)
vadd[(triton.cdiv(n, 1024),)](a, b, c, n, BLOCK=1024)
res["vadd_max_abs_err"] = float((c - (a + b)).abs().max())
M, N, K = 70, 50, 90
for dt in (torch.float32, torch.float16):
    A, B = torch.randn(M, K).to(dt), torch.randn(K, N).to(dt)
    C = torch.empty(M, N, dtype=torch.float32)
    matmul[(triton.cdiv(M, 32), triton.cdiv(N, 32))](A, B, C, M, N, K, A.stride(0), A.stride(1),
          B.stride(0), B.stride(1), C.stride(0), C.stride(1), BM=32, BN=32, BK=32)
    ref = A.float() @ B.float()
    res["matmul_%s_max_abs_err" % str(dt).split(".")[1]] = float((C - ref).abs().max())
X = torch.randn(33, 1000)
Y = torch.empty_like(X)
softmax[(33,)](X, Y, 1000, X.stride(0), BLOCK=1024)
res["softmax_max_abs_err"] = float((Y - torch.softmax(X, 1)).abs().max())
print(json.dumps(res, indent=1))
