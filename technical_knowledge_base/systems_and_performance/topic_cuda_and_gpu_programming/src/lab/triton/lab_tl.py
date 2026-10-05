"""The Kernel lab's ladder in Triton: the same math as the Metal kernels in ../code/, one program per
row (softmax) or per tile (matmul, fused, attention). Triton programs work on blocks, not threads:
the compiler chooses which thread holds which element, the vector widths, the shared-memory staging
and (for tl.dot) the tensor-core instructions.
Run on the CPU with TRITON_INTERPRET=1 (interp_check.py) and compiled for NVIDIA targets without a
GPU (compile_lab.py). Every function is shown verbatim on the page.
"""
import triton
import triton.language as tl


@triton.jit
def softmax_3pass(x_ptr, y_ptr, C, BLOCK: tl.constexpr):
    # Metal S4: three passes over the row (max, sum, write), BLOCK columns at a time.
    row = tl.program_id(0)
    x_row = x_ptr + row * C
    m = tl.full([BLOCK], float("-inf"), tl.float32)
    for c0 in range(0, C, BLOCK):
        cols = c0 + tl.arange(0, BLOCK)
        m = tl.maximum(m, tl.load(x_row + cols, mask=cols < C, other=float("-inf")))
    m_row = tl.max(m, axis=0)
    s = tl.zeros([BLOCK], tl.float32)
    for c0 in range(0, C, BLOCK):
        cols = c0 + tl.arange(0, BLOCK)
        s += tl.exp(tl.load(x_row + cols, mask=cols < C, other=float("-inf")) - m_row)
    s_row = tl.sum(s, axis=0)
    for c0 in range(0, C, BLOCK):
        cols = c0 + tl.arange(0, BLOCK)
        x = tl.load(x_row + cols, mask=cols < C, other=float("-inf"))
        tl.store(y_ptr + row * C + cols, tl.exp(x - m_row) / s_row, mask=cols < C)


@triton.jit
def softmax_online(x_ptr, y_ptr, C, BLOCK: tl.constexpr):
    # Metal S5: one pass finds max and sum together (rescale the sum when the max grows), then write.
    row = tl.program_id(0)
    x_row = x_ptr + row * C
    m = tl.full([BLOCK], float("-inf"), tl.float32)
    l = tl.zeros([BLOCK], tl.float32)
    for c0 in range(0, C, BLOCK):
        cols = c0 + tl.arange(0, BLOCK)
        x = tl.load(x_row + cols, mask=cols < C, other=float("-inf"))
        m_new = tl.maximum(m, x)
        l = l * tl.exp(m - m_new) + tl.exp(x - m_new)
        m = m_new
    m_row = tl.max(m, axis=0)
    s_row = tl.sum(l * tl.exp(m - m_row), axis=0)
    for c0 in range(0, C, BLOCK):
        cols = c0 + tl.arange(0, BLOCK)
        x = tl.load(x_row + cols, mask=cols < C, other=float("-inf"))
        tl.store(y_ptr + row * C + cols, tl.exp(x - m_row) / s_row, mask=cols < C)


@triton.jit
def softmax_row(x_ptr, y_ptr, C, BLOCK: tl.constexpr):
    # Metal S6: the whole row is one block, held on chip: read once, write once
    # (the Triton fused-softmax tutorial; BLOCK = next power of two >= C).
    row = tl.program_id(0)
    cols = tl.arange(0, BLOCK)
    x = tl.load(x_ptr + row * C + cols, mask=cols < C, other=float("-inf"))
    e = tl.exp(x - tl.max(x, axis=0))
    tl.store(y_ptr + row * C + cols, e / tl.sum(e, axis=0), mask=cols < C)


@triton.jit
def matmul(a_ptr, b_ptr, c_ptr, M, N, K, BM: tl.constexpr, BN: tl.constexpr, BK: tl.constexpr):
    # Metal M7: one program per BM x BN tile of C; tl.dot becomes tensor-core instructions
    # (mma.sync on sm_80, wgmma on sm_90a). Row-major A (M x K), B (K x N), C (M x N).
    pm, pn = tl.program_id(0), tl.program_id(1)
    rm = pm * BM + tl.arange(0, BM)
    rn = pn * BN + tl.arange(0, BN)
    rk = tl.arange(0, BK)
    acc = tl.zeros([BM, BN], tl.float32)
    for k0 in range(0, K, BK):
        a = tl.load(a_ptr + rm[:, None] * K + (k0 + rk)[None, :])
        b = tl.load(b_ptr + (k0 + rk)[:, None] * N + rn[None, :])
        acc += tl.dot(a, b)
    tl.store(c_ptr + rm[:, None] * N + rn[None, :], acc)


@triton.jit
def softmax_matmul(s_ptr, v_ptr, o_ptr, N, D: tl.constexpr, BM: tl.constexpr, BK: tl.constexpr):
    # Metal F1: O = softmax(S) V in one pass with the online rescale; P never leaves the chip.
    pm = tl.program_id(0)
    rm = pm * BM + tl.arange(0, BM)
    rd = tl.arange(0, D)
    m = tl.full([BM], float("-inf"), tl.float32)
    l = tl.zeros([BM], tl.float32)
    acc = tl.zeros([BM, D], tl.float32)
    for k0 in range(0, N, BK):
        rk = k0 + tl.arange(0, BK)
        s = tl.load(s_ptr + rm[:, None] * N + rk[None, :])
        m_new = tl.maximum(m, tl.max(s, axis=1))
        alpha = tl.exp(m - m_new)
        p = tl.exp(s - m_new[:, None])
        l = l * alpha + tl.sum(p, axis=1)
        v = tl.load(v_ptr + rk[:, None] * D + rd[None, :])
        acc = acc * alpha[:, None] + tl.dot(p, v)
        m = m_new
    tl.store(o_ptr + rm[:, None] * D + rd[None, :], acc / l[:, None])


@triton.jit
def flash_attn(q_ptr, k_ptr, v_ptr, o_ptr, N, scale, D: tl.constexpr, BM: tl.constexpr, BK: tl.constexpr):
    # Metal flash kernel: softmax_matmul with the scores computed on chip, S = Q K^T * scale.
    # Grid: (N / BM, heads). Q, K, V, O: heads x N x D, contiguous.
    pm, h = tl.program_id(0), tl.program_id(1)
    base = h * N * D
    rm = pm * BM + tl.arange(0, BM)
    rd = tl.arange(0, D)
    q = tl.load(q_ptr + base + rm[:, None] * D + rd[None, :])
    m = tl.full([BM], float("-inf"), tl.float32)
    l = tl.zeros([BM], tl.float32)
    acc = tl.zeros([BM, D], tl.float32)
    for k0 in range(0, N, BK):
        rk = k0 + tl.arange(0, BK)
        k = tl.load(k_ptr + base + rk[None, :] * D + rd[:, None])        # D x BK: K transposed
        s = tl.dot(q, k) * scale
        m_new = tl.maximum(m, tl.max(s, axis=1))
        alpha = tl.exp(m - m_new)
        p = tl.exp(s - m_new[:, None])
        l = l * alpha + tl.sum(p, axis=1)
        v = tl.load(v_ptr + base + rk[:, None] * D + rd[None, :])
        acc = acc * alpha[:, None] + tl.dot(p.to(v.dtype), v)
        m = m_new
    tl.store(o_ptr + base + rm[:, None] * D + rd[None, :], (acc / l[:, None]).to(o_ptr.dtype.element_ty))
