"""Pallas kernels for the TPU and Pallas lab. Imported by tp_pallas.py (and shown on the page as written here).

Two kernels on the running example's own tensors:
  matmul_kernel : a tiled matmul with a K loop (accumulates into the output block, which stays in VMEM across k).
  flash_kernel  : causal flash attention, forward only (online softmax over key blocks; scratch m, l, acc in VMEM).
Plus three deliberately broken variants used to show what each interpret mode catches.
"""
import functools
import math
import jax
import jax.numpy as jnp
from jax.experimental import pallas as pl
from jax.experimental.pallas import tpu as pltpu


# ---------------------------------------------------------------- 1. tiled matmul
def matmul_kernel(a_ref, b_ref, o_ref):
    # a_ref: (bm, bk) tile of A, b_ref: (bk, bn) tile of B, o_ref: (bm, bn) tile of the output, all in VMEM
    @pl.when(pl.program_id(2) == 0)            # first step of the K loop for this output tile
    def _():
        o_ref[...] = jnp.zeros_like(o_ref)
    o_ref[...] += jnp.dot(a_ref[...], b_ref[...], preferred_element_type=jnp.float32)


def matmul(a, b, bm=512, bn=128, bk=128, interpret=True, kernel=matmul_kernel, semantics=None, a_map=None, debug=False):
    M, K = a.shape
    _, N = b.shape
    kw = {}
    if semantics:
        kw["compiler_params"] = pltpu.CompilerParams(dimension_semantics=semantics)
    return pl.pallas_call(
        kernel,
        out_shape=jax.ShapeDtypeStruct((M, N), jnp.float32),
        grid=(M // bm, N // bn, K // bk),                                  # (i, j, k): k innermost
        in_specs=[pl.BlockSpec((bm, bk), a_map or (lambda i, j, k: (i, k))),   # A tile (i, k)
                  pl.BlockSpec((bk, bn), lambda i, j, k: (k, j))],             # B tile (k, j)
        out_specs=pl.BlockSpec((bm, bn), lambda i, j, k: (i, j)),              # same output tile for every k
        interpret=interpret, debug=debug, **kw)(a, b)


# bug 1: never zeroes the accumulator (the output buffer starts uninitialised)
def matmul_kernel_nozero(a_ref, b_ref, o_ref):
    o_ref[...] += jnp.dot(a_ref[...], b_ref[...], preferred_element_type=jnp.float32)


# bug 2 is a call-site bug: semantics=("parallel", "parallel", "parallel") marks the K loop parallel
# bug 3 is an index-map bug: a_map=lambda i, j, k: (i, k + 1) reads one tile past the end of A


# ---------------------------------------------------------------- 2. causal flash attention (forward)
def flash_kernel(q_ref, k_ref, v_ref, o_ref, m_sc, l_sc, acc_sc, *, scale, bq, bk, nk):
    qi, ki = pl.program_id(1), pl.program_id(2)

    @pl.when(ki == 0)
    def _init():
        m_sc[...] = jnp.full(m_sc.shape, -jnp.inf, jnp.float32)    # running row max
        l_sc[...] = jnp.zeros(l_sc.shape, jnp.float32)             # running softmax denominator
        acc_sc[...] = jnp.zeros(acc_sc.shape, jnp.float32)         # running numerator (p @ v)

    @pl.when(ki * bk <= qi * bq + bq - 1)                         # skip key blocks entirely above the diagonal
    def _body():
        q, k, v = q_ref[0], k_ref[0], v_ref[0]                     # (bq, dh), (bk, dh), (bk, dh)
        s = jax.lax.dot_general(q, k, (((1,), (1,)), ((), ())), preferred_element_type=jnp.float32) * scale
        row = qi * bq + jax.lax.broadcasted_iota(jnp.int32, (bq, bk), 0)
        col = ki * bk + jax.lax.broadcasted_iota(jnp.int32, (bq, bk), 1)
        s = jnp.where(col <= row, s, -jnp.inf)
        m_prev = m_sc[...]
        m_new = jnp.maximum(m_prev, s.max(axis=1, keepdims=True))
        p = jnp.exp(s - m_new)
        alpha = jnp.exp(m_prev - m_new)                            # rescales what was accumulated so far
        l_sc[...] = alpha * l_sc[...] + p.sum(axis=1, keepdims=True)
        acc_sc[...] = alpha * acc_sc[...] + jnp.dot(p, v, preferred_element_type=jnp.float32)
        m_sc[...] = m_new

    @pl.when(ki == nk - 1)
    def _done():
        o_ref[0] = (acc_sc[...] / l_sc[...]).astype(o_ref.dtype)


def flash_attention(q, k, v, bq=64, bk=64, interpret=True, debug=False):
    BH, T, dh = q.shape
    nk = T // bk
    kern = functools.partial(flash_kernel, scale=1.0 / math.sqrt(dh), bq=bq, bk=bk, nk=nk)
    return pl.pallas_call(
        kern,
        out_shape=jax.ShapeDtypeStruct(q.shape, q.dtype),
        grid=(BH, T // bq, nk),
        in_specs=[pl.BlockSpec((1, bq, dh), lambda b, i, j: (b, i, 0)),
                  pl.BlockSpec((1, bk, dh), lambda b, i, j: (b, j, 0)),
                  pl.BlockSpec((1, bk, dh), lambda b, i, j: (b, j, 0))],
        out_specs=pl.BlockSpec((1, bq, dh), lambda b, i, j: (b, i, 0)),
        scratch_shapes=[pltpu.VMEM((bq, 1), jnp.float32), pltpu.VMEM((bq, 1), jnp.float32),
                        pltpu.VMEM((bq, dh), jnp.float32)],
        interpret=interpret, debug=debug)(q, k, v)


def attention_reference(q, k, v):
    """The running example's attention core (model_jax.attention between the projections), per head."""
    BH, T, dh = q.shape
    s = jnp.einsum("btd,bsd->bts", q, k) / math.sqrt(dh)
    s = jnp.where(jnp.tril(jnp.ones((T, T), bool)), s, -jnp.inf)
    return jnp.einsum("bts,bsd->btd", jax.nn.softmax(s, axis=-1), v)
