"""The Pallas kernels of the Pallas kernels page (child of Topic: jax-and-tpu). Shown on the page verbatim (cut out by
pk_data.py between the '# ---- name' markers) and run in interpret mode on CPU by pk_run_kernels.py.

The root's TPU and Pallas lab (src/tpu/tp_kernels.py) already has the tiled matmul and the causal flash attention forward;
they are imported from there, not copied. This file adds:
  bias_gelu       elementwise: the MLP's bias add and exact GELU in one pass
  softmax_rows    fused softmax over rows that fit in one block (the attention scores)
  xent_rows       fused cross-entropy per row (logsumexp minus the label's logit), vocabulary 65
  layer_norm      forward and backward kernels joined by jax.custom_vjp
  flash_attention forward that also saves the logsumexp, and the two backward kernels (dK dV, then dQ)
  matmul_manual   the matmul of the root lab, with the HBM to VMEM copies written by hand (what BlockSpec automates)
  matmul_emit     the same with pltpu.emit_pipeline
  paged_decode    decode attention over a paged KV cache: the page table arrives by scalar prefetch
"""
import functools
import math

import jax
import jax.numpy as jnp
from jax.experimental import pallas as pl
from jax.experimental.pallas import tpu as pltpu

F32 = jnp.float32


def _cp(semantics):
    return pltpu.CompilerParams(dimension_semantics=semantics)


# ---- bias_gelu
def bias_gelu_kernel(x_ref, b_ref, o_ref):
    x = x_ref[...] + b_ref[...]                                  # (bm, N) + (1, N): broadcast inside the tile
    o_ref[...] = 0.5 * x * (1.0 + jax.lax.erf(x * (1.0 / math.sqrt(2.0))))   # exact GELU, as the model uses


def bias_gelu(x, b, bm=512, interpret=True):
    M, N = x.shape
    return pl.pallas_call(
        bias_gelu_kernel,
        out_shape=jax.ShapeDtypeStruct((M, N), x.dtype),
        grid=(M // bm,),
        in_specs=[pl.BlockSpec((bm, N), lambda i: (i, 0)),       # a band of rows
                  pl.BlockSpec((1, N), lambda i: (0, 0))],       # the bias: same block every step, copied once
        out_specs=pl.BlockSpec((bm, N), lambda i: (i, 0)),
        compiler_params=_cp(("parallel",)),
        interpret=interpret)(x, b.reshape(1, N))
# ---- end


# ---- softmax_rows
def softmax_kernel(x_ref, o_ref):
    x = x_ref[...].astype(F32)                                   # (bm, N): whole rows are in the block
    m = jnp.max(x, axis=-1, keepdims=True)                       # one pass for the max ...
    e = jnp.exp(x - m)
    o_ref[...] = (e / jnp.sum(e, axis=-1, keepdims=True)).astype(o_ref.dtype)   # ... all in VMEM, one HBM write


def softmax_rows(x, bm=512, interpret=True):
    M, N = x.shape
    return pl.pallas_call(
        softmax_kernel,
        out_shape=jax.ShapeDtypeStruct((M, N), x.dtype),
        grid=(M // bm,),
        in_specs=[pl.BlockSpec((bm, N), lambda i: (i, 0))],
        out_specs=pl.BlockSpec((bm, N), lambda i: (i, 0)),
        compiler_params=_cp(("parallel",)),
        interpret=interpret)(x)
# ---- end


# ---- xent_rows
def xent_kernel(z_ref, y_ref, loss_ref):
    z = z_ref[...]                                               # (bm, V) logits, V = 65 = the whole row
    m = jnp.max(z, axis=-1, keepdims=True)
    lse = m + jnp.log(jnp.sum(jnp.exp(z - m), axis=-1, keepdims=True))
    col = jax.lax.broadcasted_iota(jnp.int32, z.shape, 1)
    picked = jnp.sum(jnp.where(col == y_ref[...], z, 0.0), axis=-1, keepdims=True)   # the label's logit
    loss_ref[...] = lse - picked                                 # (bm, 1): never stores the softmax


def xent_rows(logits, labels, bm=512, interpret=True):
    M, V = logits.shape
    return pl.pallas_call(
        xent_kernel,
        out_shape=jax.ShapeDtypeStruct((M, 1), F32),
        grid=(M // bm,),
        in_specs=[pl.BlockSpec((bm, V), lambda i: (i, 0)),       # V = 65 is legal only because it is the full width
                  pl.BlockSpec((bm, 1), lambda i: (i, 0))],
        out_specs=pl.BlockSpec((bm, 1), lambda i: (i, 0)),
        compiler_params=_cp(("parallel",)),
        interpret=interpret)(logits, labels.reshape(M, 1).astype(jnp.int32))
# ---- end


# ---- layer_norm
def ln_fwd_kernel(x_ref, g_ref, b_ref, y_ref, mu_ref, rs_ref, *, eps):
    x = x_ref[...]                                               # (bm, D)
    mu = jnp.mean(x, axis=-1, keepdims=True)
    xc = x - mu
    rs = jax.lax.rsqrt(jnp.mean(xc * xc, axis=-1, keepdims=True) + eps)   # 1 / sqrt(var + eps)
    y_ref[...] = xc * rs * g_ref[...] + b_ref[...]
    mu_ref[...] = mu                                             # residuals for the backward: 2 numbers per row
    rs_ref[...] = rs


def ln_bwd_kernel(x_ref, g_ref, mu_ref, rs_ref, dy_ref, dx_ref, dg_ref, db_ref):
    @pl.when(pl.program_id(0) == 0)                              # dg, db: one block for the whole grid, so
    def _():                                                     # the row axis must be "arbitrary"
        dg_ref[...] = jnp.zeros_like(dg_ref)
        db_ref[...] = jnp.zeros_like(db_ref)
    xhat = (x_ref[...] - mu_ref[...]) * rs_ref[...]
    dy = dy_ref[...]
    gdy = dy * g_ref[...]
    dx_ref[...] = rs_ref[...] * (gdy - jnp.mean(gdy, axis=-1, keepdims=True)
                                 - xhat * jnp.mean(gdy * xhat, axis=-1, keepdims=True))
    dg_ref[...] += jnp.sum(dy * xhat, axis=0, keepdims=True)     # accumulated across row blocks
    db_ref[...] += jnp.sum(dy, axis=0, keepdims=True)


def _ln_fwd_call(x, g, b, eps, bm, interpret):
    M, D = x.shape
    row = pl.BlockSpec((bm, D), lambda i: (i, 0))
    col = pl.BlockSpec((bm, 1), lambda i: (i, 0))
    par = pl.BlockSpec((1, D), lambda i: (0, 0))
    return pl.pallas_call(
        functools.partial(ln_fwd_kernel, eps=eps),
        out_shape=(jax.ShapeDtypeStruct((M, D), x.dtype), jax.ShapeDtypeStruct((M, 1), F32),
                   jax.ShapeDtypeStruct((M, 1), F32)),
        grid=(M // bm,), in_specs=[row, par, par], out_specs=(row, col, col),
        compiler_params=_cp(("parallel",)), interpret=interpret)(x, g.reshape(1, D), b.reshape(1, D))


def _ln_bwd_call(x, g, mu, rs, dy, bm, interpret, semantics=("arbitrary",)):
    M, D = x.shape
    row = pl.BlockSpec((bm, D), lambda i: (i, 0))
    col = pl.BlockSpec((bm, 1), lambda i: (i, 0))
    par = pl.BlockSpec((1, D), lambda i: (0, 0))
    return pl.pallas_call(
        ln_bwd_kernel,
        out_shape=(jax.ShapeDtypeStruct((M, D), x.dtype), jax.ShapeDtypeStruct((1, D), F32),
                   jax.ShapeDtypeStruct((1, D), F32)),
        grid=(M // bm,), in_specs=[row, par, col, col, row], out_specs=(row, par, par),
        compiler_params=_cp(semantics), interpret=interpret)(x, g.reshape(1, D), mu, rs, dy)


@functools.partial(jax.custom_vjp, nondiff_argnums=(3, 4, 5))
def layer_norm(x, g, b, eps=1e-5, bm=256, interpret=True):
    return _ln_fwd_call(x, g, b, eps, bm, interpret)[0]


def _layer_norm_fwd(x, g, b, eps, bm, interpret):
    y, mu, rs = _ln_fwd_call(x, g, b, eps, bm, interpret)
    return y, (x, g, mu, rs)                                     # saved: x and 2 floats per row, not x_hat


def _layer_norm_bwd(eps, bm, interpret, res, dy):
    x, g, mu, rs = res
    dx, dg, db = _ln_bwd_call(x, g, mu, rs, dy, bm, interpret)
    return dx, dg.reshape(g.shape), db.reshape(g.shape)


layer_norm.defvjp(_layer_norm_fwd, _layer_norm_bwd)
# ---- end


# ---- flash_fwd
def flash_fwd_kernel(q_ref, k_ref, v_ref, o_ref, lse_ref, m_sc, l_sc, acc_sc, *, scale, bq, bk, nk):
    qi, ki = pl.program_id(1), pl.program_id(2)

    @pl.when(ki == 0)
    def _init():
        m_sc[...] = jnp.full(m_sc.shape, -jnp.inf, F32)
        l_sc[...] = jnp.zeros(l_sc.shape, F32)
        acc_sc[...] = jnp.zeros(acc_sc.shape, F32)

    @pl.when(ki * bk <= qi * bq + bq - 1)                        # skip key blocks entirely above the diagonal
    def _body():
        q, k, v = q_ref[0], k_ref[0], v_ref[0]
        s = jax.lax.dot_general(q, k, (((1,), (1,)), ((), ())), preferred_element_type=F32) * scale
        row = qi * bq + jax.lax.broadcasted_iota(jnp.int32, (bq, bk), 0)
        col = ki * bk + jax.lax.broadcasted_iota(jnp.int32, (bq, bk), 1)
        s = jnp.where(col <= row, s, -jnp.inf)
        m_prev = m_sc[...]
        m_new = jnp.maximum(m_prev, s.max(axis=1, keepdims=True))
        p = jnp.exp(s - m_new)
        alpha = jnp.exp(m_prev - m_new)
        l_sc[...] = alpha * l_sc[...] + p.sum(axis=1, keepdims=True)
        acc_sc[...] = alpha * acc_sc[...] + jnp.dot(p, v, preferred_element_type=F32)
        m_sc[...] = m_new

    @pl.when(ki == nk - 1)
    def _done():
        o_ref[0] = (acc_sc[...] / l_sc[...]).astype(o_ref.dtype)
        lse_ref[0] = m_sc[...] + jnp.log(l_sc[...])              # the one extra output the backward needs


def kv_map_clamped(bq, bk):
    """Index map for K and V that re-uses the last needed block instead of fetching a masked one (no new copy)."""
    def f(b, i, j):
        last = (i * bq + bq - 1) // bk                           # last key block this query block needs
        return (b, jnp.minimum(j, last), 0)
    return f


def flash_fwd(q, k, v, bq=64, bk=64, interpret=True, clamp=True):
    BH, T, dh = q.shape
    nk = T // bk
    kern = functools.partial(flash_fwd_kernel, scale=1.0 / math.sqrt(dh), bq=bq, bk=bk, nk=nk)
    kv_map = kv_map_clamped(bq, bk) if clamp else (lambda b, i, j: (b, j, 0))
    return pl.pallas_call(
        kern,
        out_shape=(jax.ShapeDtypeStruct(q.shape, q.dtype), jax.ShapeDtypeStruct((BH, T, 1), F32)),
        grid=(BH, T // bq, nk),
        in_specs=[pl.BlockSpec((1, bq, dh), lambda b, i, j: (b, i, 0)),
                  pl.BlockSpec((1, bk, dh), kv_map),
                  pl.BlockSpec((1, bk, dh), kv_map)],
        out_specs=(pl.BlockSpec((1, bq, dh), lambda b, i, j: (b, i, 0)),
                   pl.BlockSpec((1, bq, 1), lambda b, i, j: (b, i, 0))),
        scratch_shapes=[pltpu.VMEM((bq, 1), F32), pltpu.VMEM((bq, 1), F32), pltpu.VMEM((bq, dh), F32)],
        compiler_params=_cp(("parallel", "parallel", "arbitrary")),
        interpret=interpret)(q, k, v)
# ---- end


# ---- flash_bwd
def flash_dkv_kernel(q_ref, k_ref, v_ref, do_ref, lse_ref, d_ref, dk_ref, dv_ref, dk_sc, dv_sc, *, scale, bq, bk, nq):
    kj, qi = pl.program_id(1), pl.program_id(2)                  # one key block, looping over query blocks

    @pl.when(qi == 0)
    def _init():
        dk_sc[...] = jnp.zeros(dk_sc.shape, F32)
        dv_sc[...] = jnp.zeros(dv_sc.shape, F32)

    @pl.when(qi * bq + bq - 1 >= kj * bk)                        # same causal skip as the forward
    def _body():
        q, k, v, do = q_ref[0], k_ref[0], v_ref[0], do_ref[0]
        s = jax.lax.dot_general(q, k, (((1,), (1,)), ((), ())), preferred_element_type=F32) * scale
        row = qi * bq + jax.lax.broadcasted_iota(jnp.int32, (bq, bk), 0)
        col = kj * bk + jax.lax.broadcasted_iota(jnp.int32, (bq, bk), 1)
        p = jnp.where(col <= row, jnp.exp(s - lse_ref[0]), 0.0)     # P recomputed from the saved logsumexp
        dv_sc[...] += jax.lax.dot_general(p, do, (((0,), (0,)), ((), ())), preferred_element_type=F32)   # P^T dO
        dp = jax.lax.dot_general(do, v, (((1,), (1,)), ((), ())), preferred_element_type=F32)           # dO V^T
        ds = p * (dp - d_ref[0])                                 # softmax backward, D = rowsum(dO * O)
        dk_sc[...] += jax.lax.dot_general(ds, q, (((0,), (0,)), ((), ())), preferred_element_type=F32) * scale

    @pl.when(qi == nq - 1)
    def _done():
        dk_ref[0] = dk_sc[...].astype(dk_ref.dtype)
        dv_ref[0] = dv_sc[...].astype(dv_ref.dtype)


def flash_dq_kernel(q_ref, k_ref, v_ref, do_ref, lse_ref, d_ref, dq_ref, dq_sc, *, scale, bq, bk, nk):
    qi, kj = pl.program_id(1), pl.program_id(2)                  # one query block, looping over key blocks

    @pl.when(kj == 0)
    def _init():
        dq_sc[...] = jnp.zeros(dq_sc.shape, F32)

    @pl.when(kj * bk <= qi * bq + bq - 1)
    def _body():
        q, k, v, do = q_ref[0], k_ref[0], v_ref[0], do_ref[0]
        s = jax.lax.dot_general(q, k, (((1,), (1,)), ((), ())), preferred_element_type=F32) * scale
        row = qi * bq + jax.lax.broadcasted_iota(jnp.int32, (bq, bk), 0)
        col = kj * bk + jax.lax.broadcasted_iota(jnp.int32, (bq, bk), 1)
        p = jnp.where(col <= row, jnp.exp(s - lse_ref[0]), 0.0)
        dp = jax.lax.dot_general(do, v, (((1,), (1,)), ((), ())), preferred_element_type=F32)
        ds = p * (dp - d_ref[0])
        dq_sc[...] += jnp.dot(ds, k, preferred_element_type=F32) * scale

    @pl.when(kj == nk - 1)
    def _done():
        dq_ref[0] = dq_sc[...].astype(dq_ref.dtype)


def flash_bwd(q, k, v, o, lse, do, bq=64, bk=64, interpret=True):
    BH, T, dh = q.shape
    nq, nk, scale = T // bq, T // bk, 1.0 / math.sqrt(dh)
    d = jnp.sum(o.astype(F32) * do.astype(F32), axis=-1, keepdims=True)  # (BH, T, 1), plain jnp outside
    qs = lambda b, j, i: (b, i, 0)                               # dK dV grid: (head, key block j, query block i)
    ks = lambda b, j, i: (b, j, 0)
    dk, dv = pl.pallas_call(
        functools.partial(flash_dkv_kernel, scale=scale, bq=bq, bk=bk, nq=nq),
        out_shape=(jax.ShapeDtypeStruct(k.shape, k.dtype), jax.ShapeDtypeStruct(v.shape, v.dtype)),
        grid=(BH, nk, nq),
        in_specs=[pl.BlockSpec((1, bq, dh), qs), pl.BlockSpec((1, bk, dh), ks), pl.BlockSpec((1, bk, dh), ks),
                  pl.BlockSpec((1, bq, dh), qs), pl.BlockSpec((1, bq, 1), qs), pl.BlockSpec((1, bq, 1), qs)],
        out_specs=(pl.BlockSpec((1, bk, dh), ks), pl.BlockSpec((1, bk, dh), ks)),
        scratch_shapes=[pltpu.VMEM((bk, dh), F32), pltpu.VMEM((bk, dh), F32)],
        compiler_params=_cp(("parallel", "parallel", "arbitrary")),
        interpret=interpret)(q, k, v, do, lse, d)
    qm = lambda b, i, j: (b, i, 0)                               # dQ grid: (head, query block i, key block j)
    km = lambda b, i, j: (b, j, 0)
    dq = pl.pallas_call(
        functools.partial(flash_dq_kernel, scale=scale, bq=bq, bk=bk, nk=nk),
        out_shape=jax.ShapeDtypeStruct(q.shape, q.dtype),
        grid=(BH, nq, nk),
        in_specs=[pl.BlockSpec((1, bq, dh), qm), pl.BlockSpec((1, bk, dh), km), pl.BlockSpec((1, bk, dh), km),
                  pl.BlockSpec((1, bq, dh), qm), pl.BlockSpec((1, bq, 1), qm), pl.BlockSpec((1, bq, 1), qm)],
        out_specs=pl.BlockSpec((1, bq, dh), qm),
        scratch_shapes=[pltpu.VMEM((bq, dh), F32)],
        compiler_params=_cp(("parallel", "parallel", "arbitrary")),
        interpret=interpret)(q, k, v, do, lse, d)
    return dq, dk, dv


@functools.partial(jax.custom_vjp, nondiff_argnums=(3, 4, 5))
def flash_attention(q, k, v, bq=64, bk=64, interpret=True):
    return flash_fwd(q, k, v, bq, bk, interpret)[0]


def _fa_fwd(q, k, v, bq, bk, interpret):
    o, lse = flash_fwd(q, k, v, bq, bk, interpret)
    return o, (q, k, v, o, lse)                                  # saved: O and one float per row, never P


def _fa_bwd(bq, bk, interpret, res, do):
    q, k, v, o, lse = res
    return flash_bwd(q, k, v, o, lse, do, bq, bk, interpret)


flash_attention.defvjp(_fa_fwd, _fa_bwd)
# ---- end


# ---- matmul_manual
def matmul_manual_kernel(a_hbm, b_ref, o_ref, a_buf, sem, *, bm, nsteps):
    # a_hbm stays in HBM (memory_space=pl.ANY): nothing is copied for us. a_buf is (2, bm, K) in VMEM: two slots.
    def copy(i, slot):
        return pltpu.make_async_copy(a_hbm.at[pl.ds(i * bm, bm), :], a_buf.at[slot], sem.at[slot])

    copy(0, 0).start()                                           # prologue: fetch block 0

    def body(i, carry):
        slot = i % 2
        @pl.when(i + 1 < nsteps)
        def _():
            copy(i + 1, 1 - slot).start()                        # fetch the next block while this one is used
        copy(i, slot).wait()                                     # block i has arrived
        o_ref[pl.ds(i * bm, bm), :] = jnp.dot(a_buf[slot], b_ref[...], preferred_element_type=F32)
        return carry

    jax.lax.fori_loop(0, nsteps, body, 0)


def matmul_manual(a, b, bm=512, interpret=True):
    M, K = a.shape
    _, N = b.shape
    return pl.pallas_call(
        functools.partial(matmul_manual_kernel, bm=bm, nsteps=M // bm),
        out_shape=jax.ShapeDtypeStruct((M, N), F32),
        in_specs=[pl.BlockSpec(memory_space=pl.ANY),             # A: left in HBM, copied by hand
                  pl.BlockSpec(memory_space=pltpu.VMEM)],        # B: whole, in VMEM
        out_specs=pl.BlockSpec(memory_space=pltpu.VMEM),
        scratch_shapes=[pltpu.VMEM((2, bm, K), a.dtype), pltpu.SemaphoreType.DMA((2,))],
        interpret=interpret)(a, b)
# ---- end


# ---- matmul_emit
def matmul_emit_kernel(a_hbm, b_hbm, o_hbm, *, bm, bn, bk, grid):
    def inner(a_ref, b_ref, o_ref):                              # the same body as the root lab's matmul kernel
        @pl.when(pl.program_id(2) == 0)
        def _():
            o_ref[...] = jnp.zeros_like(o_ref)
        o_ref[...] += jnp.dot(a_ref[...], b_ref[...], preferred_element_type=F32)

    pltpu.emit_pipeline(                                         # a pipeline written inside the kernel
        inner, grid=grid,
        in_specs=[pl.BlockSpec((bm, bk), lambda i, j, k: (i, k)), pl.BlockSpec((bk, bn), lambda i, j, k: (k, j))],
        out_specs=pl.BlockSpec((bm, bn), lambda i, j, k: (i, j)))(a_hbm, b_hbm, o_hbm)


def matmul_emit(a, b, bm=512, bn=128, bk=128, interpret=True):
    M, K = a.shape
    _, N = b.shape
    grid = (M // bm, N // bn, K // bk)
    return pl.pallas_call(
        functools.partial(matmul_emit_kernel, bm=bm, bn=bn, bk=bk, grid=grid),
        out_shape=jax.ShapeDtypeStruct((M, N), F32),
        in_specs=[pl.BlockSpec(memory_space=pl.ANY), pl.BlockSpec(memory_space=pl.ANY)],
        out_specs=pl.BlockSpec(memory_space=pl.ANY),
        interpret=interpret)(a, b)
# ---- end


# ---- paged_decode
def paged_decode_kernel(table_ref, lens_ref, q_ref, k_ref, v_ref, o_ref, m_sc, l_sc, acc_sc, *, scale, page, npp):
    s, p = pl.program_id(0), pl.program_id(1)                    # sequence s, logical page p
    n = lens_ref[s]                                              # a scalar read from SMEM

    @pl.when(p == 0)
    def _init():
        m_sc[...] = jnp.full(m_sc.shape, -jnp.inf, F32)
        l_sc[...] = jnp.zeros(l_sc.shape, F32)
        acc_sc[...] = jnp.zeros(acc_sc.shape, F32)

    @pl.when(p * page < n)                                       # pages past the sequence's end do no work
    def _body():
        q, k, v = q_ref[...], k_ref[...], v_ref[...]             # (1, dh), (page, dh), (page, dh)
        sc = jax.lax.dot_general(q, k, (((1,), (1,)), ((), ())), preferred_element_type=F32) * scale
        pos = p * page + jax.lax.broadcasted_iota(jnp.int32, sc.shape, 1)
        sc = jnp.where(pos < n, sc, -jnp.inf)                    # the last page may be part full
        m_prev = m_sc[...]
        m_new = jnp.maximum(m_prev, sc.max(axis=1, keepdims=True))
        pr = jnp.exp(sc - m_new)
        alpha = jnp.exp(m_prev - m_new)
        l_sc[...] = alpha * l_sc[...] + pr.sum(axis=1, keepdims=True)
        acc_sc[...] = alpha * acc_sc[...] + jnp.dot(pr, v, preferred_element_type=F32)
        m_sc[...] = m_new

    @pl.when(p == npp - 1)
    def _done():
        o_ref[...] = (acc_sc[...] / l_sc[...]).astype(o_ref.dtype)


def page_map(page):
    def f(s, p, table_ref, lens_ref):                            # index maps also receive the prefetched scalars
        last = (lens_ref[s] - 1) // page                         # last page that holds a token
        return (table_ref[s, jnp.minimum(p, last)], 0, 0)        # physical page; clamped, so no copy past the end
    return f


def paged_decode(q, k_pages, v_pages, table, lens, interpret=True):
    S, _, dh = q.shape                                           # q: (S, 1, dh), one new token per sequence
    P, page, _ = k_pages.shape                                   # the pool: P physical pages of `page` tokens
    npp = table.shape[1]                                         # pages per sequence in the table
    qmap = lambda s, p, table_ref, lens_ref: (s, 0, 0)
    return pl.pallas_call(
        functools.partial(paged_decode_kernel, scale=1.0 / math.sqrt(dh), page=page, npp=npp),
        out_shape=jax.ShapeDtypeStruct(q.shape, q.dtype),
        grid_spec=pltpu.PrefetchScalarGridSpec(
            num_scalar_prefetch=2,                               # table and lens go to SMEM before the grid runs
            grid=(S, npp),
            in_specs=[pl.BlockSpec((None, 1, dh), qmap),
                      pl.BlockSpec((None, page, dh), page_map(page)),
                      pl.BlockSpec((None, page, dh), page_map(page))],
            out_specs=pl.BlockSpec((None, 1, dh), qmap),
            scratch_shapes=[pltpu.VMEM((1, 1), F32), pltpu.VMEM((1, 1), F32), pltpu.VMEM((1, dh), F32)]),
        compiler_params=_cp(("parallel", "arbitrary")),
        interpret=interpret)(table, lens, q, k_pages, v_pages)
# ---- end
