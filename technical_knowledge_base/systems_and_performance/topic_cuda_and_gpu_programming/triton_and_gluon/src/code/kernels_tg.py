"""The Triton kernels of the page "Triton and Gluon". Every function is shown on the page.

Checked on the CPU with TRITON_INTERPRET=1 (interp_tg.py) and compiled for NVIDIA and AMD targets
without a GPU (compile_tg.py). Triton 3.8.0 in the kb-gpu-lab:1 image.
The matmul follows the official tutorial 03 (python/tutorials/03-matrix-multiplication.py, v3.8.0, MIT).
"""
import triton
import triton.language as tl


@triton.jit
def vadd(a_ptr, b_ptr, c_ptr, n, BLOCK: tl.constexpr):
    pid = tl.program_id(0)                       # which block of the vector this program owns
    offs = pid * BLOCK + tl.arange(0, BLOCK)     # BLOCK indices at once
    mask = offs < n                              # the last block may hang past the end
    a = tl.load(a_ptr + offs, mask=mask)
    b = tl.load(b_ptr + offs, mask=mask)
    tl.store(c_ptr + offs, a + b, mask=mask)


@triton.jit
def softmax(x_ptr, y_ptr, n_cols, stride, BLOCK: tl.constexpr):
    row = tl.program_id(0)                       # one program per row
    offs = tl.arange(0, BLOCK)                   # BLOCK = next power of two >= n_cols
    mask = offs < n_cols
    x = tl.load(x_ptr + row * stride + offs, mask=mask, other=-float("inf"))
    x = x - tl.max(x, axis=0)                    # the whole row is on chip: one read
    e = tl.exp(x)
    tl.store(y_ptr + row * stride + offs, e / tl.sum(e, axis=0), mask=mask)


@triton.jit
def matmul(a_ptr, b_ptr, c_ptr, M, N, K,
           stride_am, stride_ak, stride_bk, stride_bn, stride_cm, stride_cn,
           BM: tl.constexpr, BN: tl.constexpr, BK: tl.constexpr, GROUP_M: tl.constexpr):
    # 1. which tile of C: grouped ordering, GROUP_M rows of tiles at a time (L2 reuse)
    pid = tl.program_id(0)
    num_pid_m = tl.cdiv(M, BM)
    num_pid_n = tl.cdiv(N, BN)
    num_pid_in_group = GROUP_M * num_pid_n
    first_pid_m = (pid // num_pid_in_group) * GROUP_M
    group_size_m = min(num_pid_m - first_pid_m, GROUP_M)
    pid_m = first_pid_m + ((pid % num_pid_in_group) % group_size_m)
    pid_n = (pid % num_pid_in_group) // group_size_m
    # 2. pointers to the first K tile of A (BM x BK) and B (BK x BN)
    offs_am = (pid_m * BM + tl.arange(0, BM)) % M
    offs_bn = (pid_n * BN + tl.arange(0, BN)) % N
    offs_k = tl.arange(0, BK)
    a_ptrs = a_ptr + offs_am[:, None] * stride_am + offs_k[None, :] * stride_ak
    b_ptrs = b_ptr + offs_k[:, None] * stride_bk + offs_bn[None, :] * stride_bn
    # 3. walk along K, accumulating in fp32
    acc = tl.zeros((BM, BN), dtype=tl.float32)
    for k in range(0, tl.cdiv(K, BK)):
        a = tl.load(a_ptrs, mask=offs_k[None, :] < K - k * BK, other=0.0)
        b = tl.load(b_ptrs, mask=offs_k[:, None] < K - k * BK, other=0.0)
        acc = tl.dot(a, b, acc)                  # tensor cores for fp16/bf16 inputs
        a_ptrs += BK * stride_ak
        b_ptrs += BK * stride_bk
    # 4. write the tile (an epilogue such as an activation would go here, still in fp32)
    offs_cm = pid_m * BM + tl.arange(0, BM)
    offs_cn = pid_n * BN + tl.arange(0, BN)
    c_ptrs = c_ptr + offs_cm[:, None] * stride_cm + offs_cn[None, :] * stride_cn
    tl.store(c_ptrs, acc.to(c_ptr.dtype.element_ty),
             mask=(offs_cm[:, None] < M) & (offs_cn[None, :] < N))


@triton.jit
def attn_fwd(q_ptr, k_ptr, v_ptr, o_ptr, N, sm_scale,
             D: tl.constexpr, BM: tl.constexpr, BN: tl.constexpr, CAUSAL: tl.constexpr):
    # FlashAttention forward: one program = BM query rows of one head; K and V stream through
    # in BN-row tiles; the N x N score matrix never exists in memory.
    # Q, K, V, O: (heads, N, D) contiguous; grid = (cdiv(N, BM), heads).
    pid_m, h = tl.program_id(0), tl.program_id(1)
    base = h * N * D
    offs_m = pid_m * BM + tl.arange(0, BM)
    offs_d = tl.arange(0, D)
    q = tl.load(q_ptr + base + offs_m[:, None] * D + offs_d[None, :], mask=offs_m[:, None] < N, other=0.0)
    m_i = tl.full([BM], float("-inf"), tl.float32)        # running row max
    l_i = tl.zeros([BM], tl.float32)                      # running row sum of exp
    acc = tl.zeros([BM, D], tl.float32)                   # running P @ V
    qk_scale = sm_scale * 1.44269504                      # exp(x) = exp2(x * log2 e)
    hi = tl.minimum((pid_m + 1) * BM, N) if CAUSAL else N  # causal: skip tiles above the diagonal
    for start_n in range(0, hi, BN):
        offs_n = start_n + tl.arange(0, BN)
        k = tl.load(k_ptr + base + offs_n[None, :] * D + offs_d[:, None], mask=offs_n[None, :] < N, other=0.0)
        s = tl.dot(q, k) * qk_scale                       # BM x BN scores, on chip
        keep = offs_n[None, :] < N
        if CAUSAL:
            keep = keep & (offs_m[:, None] >= offs_n[None, :])
        s = tl.where(keep, s, float("-inf"))
        m_new = tl.maximum(m_i, tl.max(s, axis=1))
        alpha = tl.exp2(m_i - m_new)                      # rescale what was summed so far
        p = tl.exp2(s - m_new[:, None])
        l_i = l_i * alpha + tl.sum(p, axis=1)
        v = tl.load(v_ptr + base + offs_n[:, None] * D + offs_d[None, :], mask=offs_n[:, None] < N, other=0.0)
        acc = acc * alpha[:, None] + tl.dot(p.to(v.dtype), v)
        m_i = m_new
    out = acc / l_i[:, None]
    tl.store(o_ptr + base + offs_m[:, None] * D + offs_d[None, :], out.to(o_ptr.dtype.element_ty),
             mask=offs_m[:, None] < N)


@triton.jit
def matmul_tma(a_ptr, b_ptr, c_ptr, M, N, K,
               BM: tl.constexpr, BN: tl.constexpr, BK: tl.constexpr, WS: tl.constexpr):
    # The same tile loop with tensor descriptors: the hardware copy engine (TMA) moves whole tiles,
    # and on Blackwell tl.range(..., warp_specialize=True) asks the compiler to split producer and consumer warps.
    pid_m, pid_n = tl.program_id(0), tl.program_id(1)
    a_desc = tl.make_tensor_descriptor(a_ptr, shape=[M, K], strides=[K, 1], block_shape=[BM, BK])
    b_desc = tl.make_tensor_descriptor(b_ptr, shape=[K, N], strides=[N, 1], block_shape=[BK, BN])
    c_desc = tl.make_tensor_descriptor(c_ptr, shape=[M, N], strides=[N, 1], block_shape=[BM, BN])
    acc = tl.zeros((BM, BN), dtype=tl.float32)
    for k in tl.range(0, tl.cdiv(K, BK), warp_specialize=WS):
        a = a_desc.load([pid_m * BM, k * BK])
        b = b_desc.load([k * BK, pid_n * BN])
        acc = tl.dot(a, b, acc)
    c_desc.store([pid_m * BM, pid_n * BN], acc.to(tl.float16))
