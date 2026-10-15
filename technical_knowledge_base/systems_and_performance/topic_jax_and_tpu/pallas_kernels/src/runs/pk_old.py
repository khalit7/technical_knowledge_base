"""Checks of the claims about Pallas on the old Notion page "TPU architecture and Pallas" (saved verbatim in the root's
src/read/old/tpu_and_pallas.md). Writes out/old.json.

1. The old page's matmul snippet, run as written (full-K blocks, out_shape in x.dtype) on the running example's MLP
   matmul, in float32 and in bf16.
2. "Pallas kernels are jit/vmap/shard_map-compatible": vmap of a pallas_call (adds a grid axis) checked here; jit is
   used everywhere on the page; shard_map is not run here (the Sharding pages own it).
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import jax, jax.numpy as jnp
from jax.experimental import pallas as pl
import pk_common as P
import pk_kernels as K

R = P.running_example()
x, y = R["A"], R["W2"]
M, Kd = x.shape
_, N = y.shape
bm, bn = 512, 128


def matmul_kernel(x_ref, y_ref, o_ref):        # refs live in VMEM   (the old page's code, verbatim)
    o_ref[...] = x_ref[...] @ y_ref[...]


def old(x, y):
    return pl.pallas_call(
        matmul_kernel,
        grid=(M // bm, N // bn),
        in_specs=[pl.BlockSpec((bm, Kd), lambda i, j: (i, 0)),
                  pl.BlockSpec((Kd, bn), lambda i, j: (0, j))],
        out_specs=pl.BlockSpec((bm, bn), lambda i, j: (i, j)),
        out_shape=jax.ShapeDtypeStruct((M, N), x.dtype),
        interpret=True,
    )(x, y)


ref = jnp.dot(x, y, precision="highest")
o32 = jax.jit(old)(x, y)
o16 = jax.jit(old)(x.astype(jnp.bfloat16), y.astype(jnp.bfloat16))
f16 = jnp.dot(x.astype(jnp.bfloat16), y.astype(jnp.bfloat16), preferred_element_type=jnp.float32)
res = dict(old_f32_err=P.maxerr(o32, ref), old_bf16_dtype=str(o16.dtype), old_bf16_err=P.maxerr(o16, ref),
           f32_accum_bf16_in_err=P.maxerr(f16, ref))
# vmap of a pallas_call: 4 independent score matrices at once
S = jax.random.normal(jax.random.key(0), (4, 1024, 128))
ov = jax.vmap(lambda s: K.softmax_rows(s))(S)
res["vmap_err"] = P.maxerr(ov, jax.nn.softmax(S, -1))
res["vmap_jaxpr_grid"] = str([e.params["grid_mapping"].grid for e in jax.make_jaxpr(jax.vmap(lambda s: K.softmax_rows(s)))(S).eqns
                              if e.primitive.name == "pallas_call"][0])
# a row with every entry masked: the fused softmax returns NaN for it (and only for it)
Sm = jnp.where(jnp.arange(128)[None, :] < 0, 0.0, -jnp.inf) * jnp.ones((512, 128))
Sm = jnp.where(jnp.arange(512)[:, None] == 0, Sm, jax.random.normal(jax.random.key(1), (512, 128)))
o = K.softmax_rows(Sm)
res["masked_row_nan"] = bool(jnp.isnan(o[0]).all())
res["other_rows_nan"] = bool(jnp.isnan(o[1:]).any())
P.save("old.json", res)
print(res)
