"""Every default that differs between PyTorch and JAX / Flax NNX / optax, measured one at a time in isolation.

Each entry records the two defaults as the installed libraries report them (read from the objects, not typed)
and a small measurement of what the difference does. Deterministic except where noted. Writes out/defaults.json.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B pj_defaults.py
"""
import inspect
import math
import os
import sys
import warnings

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pjcommon as P  # noqa: E402

os.environ.setdefault("JAX_PLATFORMS", "cpu")
import numpy as np  # noqa: E402
import torch  # noqa: E402

torch.set_num_threads(4)
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import optax  # noqa: E402
from flax import nnx  # noqa: E402

import common as C  # noqa: E402
import model_jax as MJ  # noqa: E402

R = {}
dflt = lambda f, name: inspect.signature(f).parameters[name].default

# 1. LayerNorm epsilon, and why it matters at init: the variance of the block-0 input is small.
sd0 = dict(np.load(C.path("data", "init_torch.npz")))
x0, y0 = C.batch(0)
emb = sd0["tok_emb.weight"][x0] + sd0["pos_emb.weight"][: x0.shape[1]]
var = emb.var(-1)
eps_t, eps_f = torch.nn.LayerNorm(8).eps, nnx.LayerNorm(8, rngs=nnx.Rngs(0)).epsilon
ratio = np.sqrt((var + eps_f) / (var + eps_t))
R["ln_eps"] = dict(torch=eps_t, flax=eps_f, block0_input_var_median=float(np.median(var)),
                   block0_input_var_min=float(var.min()),
                   ln_output_scale_ratio_median=float(np.median(ratio)), ln_output_scale_ratio_max=float(ratio.max()),
                   formula="LN output scales by sqrt((var + 1e-6) / (var + 1e-5)) when only epsilon differs")
ln_scale = lambda v, eps: 1 / np.sqrt(v + eps)
R["ln_eps"]["trained_var_note"] = "same ratio at var = 1 (a trained model's residual stream is larger): %.7f" % float(np.sqrt((1 + eps_f) / (1 + eps_t)))

# 2. Flax's use_fast_variance (E[x^2] - E[x]^2) vs the two-pass variance, float32, mean offsets.
fv = dflt(nnx.LayerNorm.__init__, "use_fast_variance")
rows = []
rng = np.random.default_rng(0)
base = rng.standard_normal((64, 128)).astype(np.float32)
for off in (0.0, 10.0, 100.0, 1000.0, 3000.0):
    x = jnp.asarray(base + off)
    out = {}
    for fast in (True, False):
        ln = nnx.LayerNorm(128, use_fast_variance=fast, epsilon=1e-5, rngs=nnx.Rngs(0))
        out[fast] = np.asarray(ln(x))
    ref = torch.nn.functional.layer_norm(torch.from_numpy(np.asarray(x, np.float64)), (128,), eps=1e-5).numpy()
    rows.append(dict(mean_offset=off, fast_max_err=P.maxdiff(out[True], ref), twopass_max_err=P.maxdiff(out[False], ref)))
R["fast_variance"] = dict(flax_default=fv, torch="two-pass (Welford-style) variance", rows=rows,
                          note="reference: PyTorch layer_norm in float64; data N(0,1) plus the offset, float32")

# 3. GELU: jax.nn.gelu approximate=True (tanh) by default, torch exact erf.
xs = np.linspace(-6, 6, 120001).astype(np.float32)
g_t = torch.nn.functional.gelu(torch.from_numpy(xs)).numpy()
g_j = np.asarray(jax.nn.gelu(jnp.asarray(xs)))
g_je = np.asarray(jax.nn.gelu(jnp.asarray(xs), approximate=False))
i = int(np.abs(g_t - g_j).argmax())
R["gelu"] = dict(torch=dflt(torch.nn.GELU.__init__, "approximate"), jax_approximate=dflt(jax.nn.gelu, "approximate"),
                 max_abs_diff_tanh_vs_erf=P.maxdiff(g_t, g_j), at_x=float(xs[i]),
                 max_abs_diff_exact_vs_torch=P.maxdiff(g_t, g_je), flax_nnx_gelu_is=str(nnx.gelu is jax.nn.gelu))

# 4-6. Initialisers: measured std of a fresh layer (seeded), and the formula.
torch.manual_seed(0)
tl = torch.nn.Linear(128, 512)
fl = nnx.Linear(128, 512, rngs=nnx.Rngs(0))
te = torch.nn.Embedding(65, 128)
fe = nnx.Embed(65, 128, rngs=nnx.Rngs(0))
R["init"] = dict(
    linear_weight=dict(torch="kaiming_uniform_(a=sqrt(5)) = U(-1/sqrt(in), 1/sqrt(in)), std 1/sqrt(3 in)",
                       flax="lecun_normal = truncated normal, std 1/sqrt(in)",
                       torch_std=float(tl.weight.detach().std()), flax_std=float(fl.kernel[...].std()),
                       predicted_torch=1 / math.sqrt(3 * 128), predicted_flax=1 / math.sqrt(128)),
    linear_bias=dict(torch="U(-1/sqrt(in), 1/sqrt(in))", flax="zeros",
                     torch_absmax=float(tl.bias.detach().abs().max()), flax_absmax=float(jnp.abs(fl.bias[...]).max())),
    embedding=dict(torch="normal_(0, 1)", flax="variance_scaling(1.0, 'fan_in', 'normal', out_axis=0)",
                   torch_std=float(te.weight.detach().std()), flax_std=float(fe.embedding[...].std())),
    layernorm=dict(torch="weight 1, bias 0", flax="scale 1, bias 0 (same)"),
)

# 7. Layout: shapes of the same layer.
conv_t = torch.nn.Conv2d(3, 16, 5)
conv_f = nnx.Conv(3, 16, (5, 5), rngs=nnx.Rngs(0))
R["layout"] = dict(linear_torch=list(tl.weight.shape), linear_flax=list(fl.kernel[...].shape),
                   conv_torch=list(conv_t.weight.shape), conv_flax=list(conv_f.kernel[...].shape),
                   conv_input_torch="NCHW [batch, channels, height, width]", conv_input_flax="NHWC [batch, height, width, channels]")

# 8. BatchNorm momentum: opposite conventions.
bn_t = torch.nn.BatchNorm1d(4); bn_f = nnx.BatchNorm(4, rngs=nnx.Rngs(0))
xb = np.ones((16, 4), np.float32)
bn_t.train(); bn_t(torch.from_numpy(xb))
bn_f(jnp.asarray(xb))
R["batchnorm"] = dict(torch_momentum=bn_t.momentum, flax_momentum=bn_f.momentum,
                      torch_rule="running = (1 - momentum) * running + momentum * batch",
                      flax_rule="ra = momentum * ra + (1 - momentum) * batch",
                      running_mean_after_one_batch_of_ones=dict(torch=float(bn_t.running_mean[0]), flax=float(bn_f.mean[...][0])),
                      equivalent="torch momentum 0.1 = flax momentum 0.9; flax default 0.99 = torch 0.01",
                      torch_eps=bn_t.eps, flax_eps=bn_f.epsilon)

# 9. Dropout: same meaning of the rate; mode and RNG differ.
d_f = nnx.Dropout(0.5, rngs=nnx.Rngs(dropout=0))
ones = jnp.ones((1000,))
m1, m2 = np.asarray(d_f(ones)), np.asarray(d_f(ones))
key = jax.random.key(0)
k1 = np.asarray(jax.random.bernoulli(key, 0.5, (1000,))); k2 = np.asarray(jax.random.bernoulli(key, 0.5, (1000,)))
d_f.eval() if hasattr(d_f, "eval") else None
m_eval = np.asarray(d_f(ones))
R["dropout"] = dict(torch_p=dflt(torch.nn.Dropout.__init__, "p"), torch_meaning="p = probability of zeroing",
                    flax_meaning="rate = probability of zeroing (same)",
                    nnx_two_calls_same_mask=bool((m1 == m2).all()), nnx_kept_fraction=float((m1 > 0).mean()),
                    raw_key_reused_same_mask=bool((k1 == k2).all()),
                    nnx_eval_is_identity=bool((m_eval == 1).all()), has_module_eval=hasattr(nnx.Module, "eval"),
                    scale_kept="both scale kept values by 1/(1-p): kept value %.1f" % float(m1.max()))

# 10. Attention masks: who means "attend" by True.
T = 5
q = torch.randn(1, 1, T, 8, generator=torch.Generator().manual_seed(0)); k = torch.randn(1, 1, T, 8, generator=torch.Generator().manual_seed(1)); v = torch.randn(1, 1, T, 8, generator=torch.Generator().manual_seed(2))
causal = torch.ones(T, T, dtype=torch.bool).tril()
ref = torch.nn.functional.scaled_dot_product_attention(q, k, v, is_causal=True)
sdpa_bool = torch.nn.functional.scaled_dot_product_attention(q, k, v, attn_mask=causal)
sdpa_inv = torch.nn.functional.scaled_dot_product_attention(q, k, v, attn_mask=~causal)
qj, kj, vj = (jnp.asarray(t.numpy().transpose(0, 2, 1, 3)) for t in (q, k, v))    # jax wants [B, T, H, D]
jdpa = np.asarray(jax.nn.dot_product_attention(qj, kj, vj, mask=jnp.asarray(causal.numpy())[None, None])).transpose(0, 2, 1, 3)
jdpa_c = np.asarray(jax.nn.dot_product_attention(qj, kj, vj, is_causal=True)).transpose(0, 2, 1, 3)
mha = torch.nn.MultiheadAttention(8, 1, batch_first=True)
xq = torch.randn(1, T, 8, generator=torch.Generator().manual_seed(3))
o_tm, w_tm = mha(xq, xq, xq, attn_mask=causal)            # True = NOT allowed in nn.MultiheadAttention
o_tm2, w_tm2 = mha(xq, xq, xq, attn_mask=~causal)
R["attn_mask"] = dict(
    sdpa_true_means="attend (bool mask: True = take part in attention)",
    nn_multiheadattention_true_means="masked out (bool mask: True = not allowed to attend)",
    jax_flax_true_means="attend",
    sdpa_bool_tril_vs_is_causal=P.maxdiff(sdpa_bool, ref), sdpa_inverted_has_nan=bool(torch.isnan(sdpa_inv).any()),
    sdpa_inverted_nan_rows=int(torch.isnan(sdpa_inv).any(-1).sum()),
    sdpa_inverted_last_row_all_zero=bool((sdpa_inv[0, 0, -1] == 0).all()),
    mha_with_triu1_equals_sdpa_causal="see mha weights: nn.MultiheadAttention needs the inverted mask (True above the diagonal)",
    jax_mask_vs_torch=P.maxdiff(jdpa, ref), jax_is_causal_vs_torch=P.maxdiff(jdpa_c, ref),
    mha_tril_weights_row0=[round(float(w), 4) for w in w_tm[0, 0]],
    mha_inverted_weights_row0=[round(float(w), 4) for w in w_tm2[0, 0]],
)

# 11. Fully masked rows (left padding): -inf gives NaN in a hand-written softmax; what the libraries return.
s = torch.randn(1, 1, 3, 3, generator=torch.Generator().manual_seed(4))
full = torch.tensor([[False, False, False], [True, True, False], [True, True, True]])
hand = s.masked_fill(~full, float("-inf")).softmax(-1)
sd_full = torch.nn.functional.scaled_dot_product_attention(q[:, :, :3], k[:, :, :3], v[:, :, :3], attn_mask=full)
jfull = np.asarray(jax.nn.dot_product_attention(qj[:, :3], kj[:, :3], vj[:, :3], mask=jnp.asarray(full.numpy())[None, None]))
sj = jnp.asarray(s.numpy())
jhand = np.asarray(jax.nn.softmax(jnp.where(jnp.asarray(full.numpy()), sj, -jnp.inf), axis=-1))
flax_big = np.asarray(jax.nn.softmax(jnp.where(jnp.asarray(full.numpy()), sj, jnp.finfo(jnp.float32).min), axis=-1))
R["masked_row"] = dict(
    torch_hand_softmax_row0=[None if math.isnan(float(t)) else float(t) for t in hand[0, 0, 0]],
    torch_sdpa_row0_finite=bool(torch.isfinite(sd_full[0, 0, 0]).all()), torch_sdpa_row0=[round(float(t), 5) for t in sd_full[0, 0, 0][:4]],
    jax_dpa_row0_finite=bool(np.isfinite(jfull[0, 0]).all()), jax_dpa_row0=[round(float(t), 5) for t in jfull[0, 0, 0][:4]],
    jax_hand_softmax_row0=[None if math.isnan(float(t)) else float(t) for t in jhand[0, 0, 0]],
    jax_dpa_row0_equals_mean_of_v=P.maxdiff(jfull[0, 0, 0], np.asarray(vj[0, :3, 0]).mean(0)),
    flax_finfo_min_row0=[round(float(t), 4) for t in flax_big[0, 0, 0]],
    note="row 0 has no key it may attend to (as a left-padded position would)")

# 12. AdamW defaults and the clipping formula.
R["adamw"] = dict(torch=dict(lr=dflt(torch.optim.AdamW.__init__, "lr"), betas=list(dflt(torch.optim.AdamW.__init__, "betas")),
                             eps=dflt(torch.optim.AdamW.__init__, "eps"), weight_decay=dflt(torch.optim.AdamW.__init__, "weight_decay")),
                  optax=dict(lr="required", b1=dflt(optax.adamw, "b1"), b2=dflt(optax.adamw, "b2"), eps=dflt(optax.adamw, "eps"),
                             eps_root=dflt(optax.adamw, "eps_root"), weight_decay=dflt(optax.adamw, "weight_decay"), mask=str(dflt(optax.adamw, "mask"))))
clip_rows = []
for n in (0.5, 1.0, 1.0 + 1e-7, 1.000001, 1.5, 4.6):
    t_scale = min(1.0, 1.0 / (n + 1e-6))
    o_scale = 1.0 if n < 1.0 else 1.0 / n
    clip_rows.append(dict(norm=n, torch_scale=t_scale, optax_scale=o_scale, rel_diff=abs(t_scale - o_scale) / o_scale))
R["clip"] = dict(torch="clip_coef = max_norm / (total_norm + 1e-6), applied when clip_coef < 1 (clamped to 1)",
                 optax="scale = max_norm / g_norm, applied when g_norm >= max_norm", rows=clip_rows)

# 13. Cross-entropy: reduction, ignore_index, label smoothing; and an out-of-range label.
logits = torch.randn(4, 65, generator=torch.Generator().manual_seed(5))
lab = torch.tensor([3, 7, -100, 11])
t_ce = float(torch.nn.functional.cross_entropy(logits, lab))
t_ce_3 = float(torch.nn.functional.cross_entropy(logits[[0, 1, 3]], lab[[0, 1, 3]]))
o_ce = np.asarray(optax.softmax_cross_entropy_with_integer_labels(jnp.asarray(logits.numpy()), jnp.asarray(lab.numpy())))
R["cross_entropy"] = dict(
    torch_defaults=dict(reduction="mean", ignore_index=-100, label_smoothing=0.0),
    optax="per-example losses, no reduction, no ignore_index",
    torch_mean_with_minus100=t_ce, torch_mean_of_other_three=t_ce_3,
    optax_per_example=[None if not np.isfinite(v) else float(v) for v in o_ce], optax_label_minus100_finite=bool(np.isfinite(o_ce[2])),
    note="optax does not raise on label -100 or on a label past the vocabulary: that row's loss is NaN, and so is the mean")
try:
    torch.nn.functional.cross_entropy(logits, torch.tensor([3, 7, 70, 11]))
    R["cross_entropy"]["torch_label_70"] = "no error"
except Exception as e:  # noqa: BLE001
    R["cross_entropy"]["torch_label_70"] = P.scrub(type(e).__name__ + ": " + str(e).splitlines()[0])
R["cross_entropy"]["optax_label_70"] = str(optax.softmax_cross_entropy_with_integer_labels(jnp.asarray(logits.numpy()), jnp.asarray([3, 7, 70, 11]))[2])

# 14. Out-of-bounds indexing: torch raises, jnp clamps (gather) or drops (scatter).
a = jnp.arange(10.0)
try:
    torch.arange(10.0)[12]
    t_oob = "no error"
except Exception as e:  # noqa: BLE001
    t_oob = type(e).__name__ + ": " + str(e)
R["oob"] = dict(torch=t_oob, jax_get=float(a[12]), jax_get_jit=float(jax.jit(lambda v, i: v[i])(a, 12)),
                jax_set=[float(t) for t in a.at[12].set(99.0)[-2:]], jax_embed_lookup_row70_equals_row64=bool(
                    (jnp.asarray(sd0["tok_emb.weight"])[70] == jnp.asarray(sd0["tok_emb.weight"])[64]).all()))

# 15. dtypes: integer and float defaults.
with warnings.catch_warnings(record=True) as w:
    warnings.simplefilter("always")
    z = jnp.array(1.0, dtype=jnp.float64)
    wmsg = P.scrub(str(w[0].message)) if w else None
R["dtypes"] = dict(torch_arange=str(torch.arange(3).dtype), jnp_arange=str(jnp.arange(3).dtype),
                   torch_tensor_int=str(torch.tensor([1, 2]).dtype), jnp_array_int=str(jnp.array([1, 2]).dtype),
                   float64_request=str(z.dtype), float64_warning=wmsg,
                   torch_var_default=float(torch.tensor([1.0, 2.0, 3.0, 4.0]).var()), jnp_var_default=float(jnp.var(jnp.array([1.0, 2.0, 3.0, 4.0]))),
                   torch_std_default=float(torch.tensor([1.0, 2.0, 3.0, 4.0]).std()), jnp_std_default=float(jnp.std(jnp.array([1.0, 2.0, 3.0, 4.0]))))

# 16. Matmul precision: CPU float32 is exact in both; a TPU's DEFAULT precision rounds f32 matmul inputs to bfloat16.
# Emulated here: every matmul of the running example with inputs rounded to bfloat16, products accumulated in float32.
params = MJ.from_torch(sd0, C.CFG)
lg32 = np.asarray(jax.jit(lambda p, x: MJ.apply(p, x, C.CFG))(params, x0))
with jax.default_matmul_precision("bfloat16"):
    lgflag = np.asarray(jax.jit(lambda p, x: MJ.apply(p, x, C.CFG))(params, x0))
orig_matmul = jnp.matmul


def bf16_matmul(a, b, **kw):
    return jnp.matmul(a.astype(jnp.bfloat16), b.astype(jnp.bfloat16), preferred_element_type=jnp.float32)


def apply_bf16(p, idx, cfg):
    Tn = idx.shape[1]
    lin = lambda q, x: bf16_matmul(x, q["w"]) + q["b"]

    def attn(q, x, h):
        B, Tt, D = x.shape; dh = D // h
        sp = lambda t: t.reshape(B, Tt, h, dh).transpose(0, 2, 1, 3)
        qq, kk, vv = (sp(lin(q[n], x)) for n in ("wq", "wk", "wv"))
        s_ = bf16_matmul(qq, kk.transpose(0, 1, 3, 2)) / math.sqrt(dh)
        s_ = jnp.where(jnp.tril(jnp.ones((Tt, Tt), bool)), s_, -jnp.inf)
        o = bf16_matmul(jax.nn.softmax(s_, axis=-1), vv)
        return lin(q["wo"], o.transpose(0, 2, 1, 3).reshape(B, Tt, D))
    x = p["tok_emb"][idx] + p["pos_emb"][:Tn]
    for b in p["blocks"]:
        x = x + attn(b["attn"], MJ.layer_norm(b["ln1"], x, cfg["ln_eps"]), cfg["n_heads"])
        h = MJ.layer_norm(b["ln2"], x, cfg["ln_eps"])
        x = x + lin(b["mlp"]["fc2"], jax.nn.gelu(lin(b["mlp"]["fc1"], h), approximate=False))
    return bf16_matmul(MJ.layer_norm(p["ln_f"], x, cfg["ln_eps"]), p["head"]["w"])


lgbf = np.asarray(jax.jit(lambda p, x: apply_bf16(p, x, C.CFG))(params, x0))
fin = dict(np.load(C.path("data", "final_torch_500.npz")))
pf = MJ.from_torch(fin, C.CFG)
lg32f = np.asarray(jax.jit(lambda p, x: MJ.apply(p, x, C.CFG))(pf, x0))
lgbff = np.asarray(jax.jit(lambda p, x: apply_bf16(p, x, C.CFG))(pf, x0))
R["matmul_precision"] = dict(
    cpu_flag_bfloat16_changes_logits=P.maxdiff(lg32, lgflag),
    emulated_bf16_inputs_init_max_logit_diff=P.maxdiff(lg32, lgbf), init_max_abs_logit=float(np.abs(lg32).max()),
    emulated_bf16_inputs_trained500_max_logit_diff=P.maxdiff(lg32f, lgbff), trained500_max_abs_logit=float(np.abs(lg32f).max()),
    trained500_argmax_agree=float((lg32f.argmax(-1) == lgbff.argmax(-1)).mean()),
    note="emulation of TPU DEFAULT precision (one bfloat16 pass, float32 accumulation); not run on a TPU")

R["versions"] = dict(P.versions(), torch=torch.__version__, flax=__import__("flax").__version__, optax=optax.__version__)
P.save("defaults", R)
