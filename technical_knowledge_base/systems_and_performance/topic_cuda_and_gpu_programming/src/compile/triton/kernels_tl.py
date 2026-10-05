# The same operations as the CUDA ladder, written in Triton.
# A Triton program works on a whole block of elements at once; the compiler decides
# how the block maps onto threads, warps, registers and shared memory.
import triton
import triton.language as tl


@triton.jit
def vadd(a_ptr, b_ptr, c_ptr, n, BLOCK: tl.constexpr):
    pid = tl.program_id(0)                      # which block of the vector this program owns
    offs = pid * BLOCK + tl.arange(0, BLOCK)    # BLOCK indices at once
    mask = offs < n
    a = tl.load(a_ptr + offs, mask=mask)
    b = tl.load(b_ptr + offs, mask=mask)
    tl.store(c_ptr + offs, a + b, mask=mask)


@triton.jit
def matmul(a_ptr, b_ptr, c_ptr, M, N, K,
           sam, sak, sbk, sbn, scm, scn,
           BM: tl.constexpr, BN: tl.constexpr, BK: tl.constexpr):
    pid_m = tl.program_id(0)
    pid_n = tl.program_id(1)
    rm = pid_m * BM + tl.arange(0, BM)
    rn = pid_n * BN + tl.arange(0, BN)
    rk = tl.arange(0, BK)
    acc = tl.zeros((BM, BN), dtype=tl.float32)
    for k in range(0, K, BK):                   # walk along K one tile at a time
        a = tl.load(a_ptr + rm[:, None] * sam + (k + rk)[None, :] * sak,
                    mask=(rm[:, None] < M) & ((k + rk)[None, :] < K), other=0.0)
        b = tl.load(b_ptr + (k + rk)[:, None] * sbk + rn[None, :] * sbn,
                    mask=((k + rk)[:, None] < K) & (rn[None, :] < N), other=0.0)
        acc += tl.dot(a, b)                     # tile x tile on tensor cores when inputs are fp16/bf16
    tl.store(c_ptr + rm[:, None] * scm + rn[None, :] * scn, acc,
             mask=(rm[:, None] < M) & (rn[None, :] < N))


@triton.jit
def softmax(x_ptr, y_ptr, ncols, stride, BLOCK: tl.constexpr):
    row = tl.program_id(0)                      # one program per row
    offs = tl.arange(0, BLOCK)
    mask = offs < ncols
    x = tl.load(x_ptr + row * stride + offs, mask=mask, other=-float("inf"))
    x = x - tl.max(x, axis=0)                   # the whole row sits in registers: one pass
    e = tl.exp(x)
    tl.store(y_ptr + row * stride + offs, e / tl.sum(e, axis=0), mask=mask)
