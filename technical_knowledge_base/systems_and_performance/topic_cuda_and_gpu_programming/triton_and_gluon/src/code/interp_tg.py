"""Run every kernel of kernels_tg.py on the CPU with Triton's interpreter and compare with PyTorch.
Usage (inside kb-gpu-lab:1): TRITON_INTERPRET=1 python interp_tg.py  -> ../out/interp.json
The interpreter executes the kernel body with NumPy, one program instance after another: it checks the
math, the indexing and the masks, not speed, races or the compiler.
"""
import os, json, math, time, traceback
assert os.environ.get("TRITON_INTERPRET") == "1"
import torch, triton
from kernels_tg import vadd, softmax, matmul, attn_fwd, matmul_tma

torch.manual_seed(0)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out")
res = {"triton": triton.__version__, "torch": torch.__version__, "cases": []}


def rec(name, shape, got, ref, tol, note=""):
    err = (got.float() - ref.float()).abs().max().item()
    res["cases"].append({"kernel": name, "shape": shape, "max_abs_err": float(f"{err:.3g}"),
                         "tol": tol, "ok": err <= tol, "note": note})


# vector add: n not a multiple of BLOCK, so the mask matters
n = 1000
a, b = torch.randn(n), torch.randn(n)
c = torch.empty(n)
vadd[(triton.cdiv(n, 256),)](a, b, c, n, BLOCK=256)
rec("vadd", [n], c, a + b, 0.0, "4 programs of 256; the last one masks 24 lanes")

# row softmax: 1,000 columns padded to BLOCK 1,024 with -inf
x = torch.randn(37, 1000) * 3
y = torch.empty_like(x)
softmax[(37,)](x, y, 1000, x.stride(0), BLOCK=triton.next_power_of_2(1000))
rec("softmax", [37, 1000], y, torch.softmax(x, -1), 1e-6, "BLOCK 1,024 for 1,000 columns")

# matmul fp32 and fp16 inputs, sizes that are not multiples of the tiles
for dt, tol in ((torch.float32, 1e-4), (torch.float16, 2e-2)):
    M, N, K = 200, 150, 130
    A, B = torch.randn(M, K).to(dt), torch.randn(K, N).to(dt)
    C = torch.empty(M, N, dtype=torch.float32)
    grid = (triton.cdiv(M, 64) * triton.cdiv(N, 32),)
    matmul[grid](A, B, C, M, N, K, A.stride(0), A.stride(1), B.stride(0), B.stride(1), C.stride(0), C.stride(1),
                 BM=64, BN=32, BK=32, GROUP_M=2)
    rec("matmul_" + str(dt).split(".")[-1], [M, N, K], C, A.float() @ B.float(), tol, "tiles 64x32x32, GROUP_M 2")

# tensor-descriptor (TMA) matmul: sizes multiples of the tiles
try:
    M = N = K = 256
    A, B = torch.randn(M, K).half(), torch.randn(K, N).half()
    C = torch.empty(M, N, dtype=torch.float16)
    triton.set_allocator(lambda size, align, stream: torch.empty(size, dtype=torch.int8))
    matmul_tma[(M // 128, N // 128)](A, B, C, M, N, K, BM=128, BN=128, BK=64, WS=False)
    rec("matmul_tma", [M, N, K], C, (A.float() @ B.float()), 0.05, "fp16 output; error is fp16 rounding of the result")
except Exception as e:
    res.setdefault("skipped", []).append("matmul_tma: " + type(e).__name__ + ": " + str(e)[:200])

# attention, causal and not, fp16 inputs, against PyTorch's reference in fp32
H, Nq, D = 2, 200, 64
q, k, v = (torch.randn(H, Nq, D).half() for _ in range(3))
for causal in (False, True):
    o = torch.empty_like(q)
    attn_fwd[(triton.cdiv(Nq, 64), H)](q, k, v, o, Nq, 1 / math.sqrt(D), D=D, BM=64, BN=32, CAUSAL=causal)
    ref = torch.nn.functional.scaled_dot_product_attention(q.float(), k.float(), v.float(), is_causal=causal)
    rec("attn_fwd" + ("_causal" if causal else ""), [H, Nq, D], o, ref, 1e-2, "BM 64, BN 32; N not a multiple of BN")

# two mistakes, as the interpreter reports them
mist = {}
try:
    vadd[(4,)](a, b, c, n, BLOCK=250)
except Exception as e:
    mist["non_power_of_two_block"] = (type(e).__name__ + ": " + str(e)).strip().splitlines()[-1][:300]
try:
    y = torch.zeros_like(x)
    softmax[(37,)](x, y, 1000, x.stride(0), BLOCK=512)
    err = (y - torch.softmax(x, -1)).abs().max().item()
    mist["block_smaller_than_row"] = f"no error raised; max abs error {err:.3g} (columns 512 to 999 never written or read)"
except Exception as e:
    mist["block_smaller_than_row"] = str(e)[:300]
res["mistakes"] = mist
json.dump(res, open(os.path.join(OUT, "interp.json"), "w"), indent=1)
print(json.dumps(res, indent=1))
