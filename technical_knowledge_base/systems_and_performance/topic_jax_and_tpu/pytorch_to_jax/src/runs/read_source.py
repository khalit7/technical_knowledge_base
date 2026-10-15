"""Excerpts of the defaults that differ, read in the pinned sources and located by pattern, so the line numbers
are checked rather than typed. Writes out/source.json.

Sources: jax tag jax-v0.11.2, flax v0.12.10, optax v0.2.8 (shallow clones in $JX_SCRATCH/src); torch 2.14.1 and
transformers 5.19.0 as installed (the wheel's Python files; GitHub links point at the matching tags).

$JX_SCRATCH/venv/bin/python -I -B read_source.py
"""
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pjcommon as P  # noqa: E402

S = P.SCRATCH
TORCH = os.path.join(S, "venv", "lib", "python3.12", "site-packages", "torch")
TRANS = os.path.join(S, "pj", "site", "transformers")
REPOS = {
    "jax": (os.path.join(S, "src", "jax"), "https://github.com/jax-ml/jax/blob/jax-v0.11.2/", "jax-ml/jax at tag jax-v0.11.2"),
    "flax": (os.path.join(S, "src", "flax"), "https://github.com/google/flax/blob/v0.12.10/", "google/flax at tag v0.12.10"),
    "optax": (os.path.join(S, "src", "optax"), "https://github.com/google-deepmind/optax/blob/v0.2.8/", "google-deepmind/optax at tag v0.2.8"),
    "torch": (os.path.dirname(TORCH), "https://github.com/pytorch/pytorch/blob/v2.14.1/", "torch 2.14.1 as installed (wheel)"),
    "tunix": (os.path.join(S, "src", "tunix"), "https://github.com/google/tunix/blob/v0.1.7/", "google/tunix at tag v0.1.7"),
    "transformers": (os.path.dirname(TRANS), "https://github.com/huggingface/transformers/blob/v5.19.0/src/", "transformers 5.19.0 as installed (wheel)"),
}

# (id, title, repo, file, start pattern, end: number of lines or a pattern ending the excerpt (inclusive))
SPECS = [
    ("t_ln", "PyTorch LayerNorm: eps=1e-5", "torch", "torch/nn/modules/normalization.py",
     r"^class LayerNorm\(Module\):", None),
    ("f_ln", "Flax NNX LayerNorm: epsilon=1e-6 and use_fast_variance=True", "flax", "flax/nnx/nn/normalization.py",
     r"^class LayerNorm\(Module\):", None),
    ("f_fastvar", "Flax: the 'fast variance' is E[x^2] - E[x]^2", "flax", "flax/nnx/nn/normalization.py",
     r"^    if use_fast_variance:\n      mu, mu2", 5),
    ("j_gelu", "jax.nn.gelu: approximate=True by default", "jax", "jax/_src/nn/functions.py", r"^def gelu\(x: ArrayLike, approximate: bool = True\)", 1),
    ("t_gelu", "torch GELU: approximate='none' by default", "torch", "torch/nn/modules/activation.py",
     r"^    def __init__\(self, approximate: str = \"none\"\) -> None:", 3),
    ("t_lin_init", "torch nn.Linear init: kaiming_uniform_(a=sqrt(5))", "torch", "torch/nn/modules/linear.py",
     r"^        # Setting a=sqrt\(5\) in kaiming_uniform", 4),
    ("f_lin_init", "Flax NNX Linear and Embed default initialisers", "flax", "flax/nnx/nn/linear.py",
     r"^default_kernel_init = initializers.lecun_normal\(\)", 1),
    ("f_emb_init", "Flax NNX Embed default initialiser", "flax", "flax/nnx/nn/linear.py",
     r"^default_embed_init = initializers.variance_scaling\(", 3),
    ("t_emb_init", "torch nn.Embedding init: normal_(0, 1)", "torch", "torch/nn/modules/sparse.py",
     r"^    def reset_parameters\(self\) -> None:\n        init.normal_\(self.weight\)", 2),
    ("t_bn", "torch BatchNorm: momentum=0.1 weights the NEW batch", "torch", "torch/nn/modules/batchnorm.py",
     r"^        momentum: float \| None = 0.1,", 1),
    ("f_bn", "Flax BatchNorm: momentum weights the OLD running average", "flax", "flax/nnx/nn/normalization.py",
     r"^      self.mean\[...\] = stop_gradient\(", 5),
    ("t_adamw", "torch AdamW: weight_decay=1e-2", "torch", "torch/optim/adamw.py", r"^        weight_decay: float = 1e-2,", 1),
    ("o_adamw", "optax.adamw: weight_decay=1e-4, mask=None (decays every leaf)", "optax", "optax/_src/alias.py",
     r"^def adamw\(\n", r"^    nesterov: bool = False,"),
    ("o_adamw_body", "optax.adamw is a chain of three transformations", "optax", "optax/_src/alias.py",
     r"^  return combine.chain\(\n      transform.scale_by_adam\(\n          b1=b1,\n          b2=b2,\n          eps=eps,\n          eps_root=eps_root,\n          mu_dtype=mu_dtype,\n          nesterov=nesterov,\n      \),\n      transform.add_decayed_weights",
     r"^      transform.scale_by_learning_rate\(learning_rate\),"),
    ("t_clip", "torch clip_grad_norm_: max_norm / (total_norm + 1e-6), clamped to 1", "torch", "torch/nn/utils/clip_grad.py",
     r"^    clip_coef = max_norm / \(total_norm \+ 1e-6\)", r"^    clip_coef_clamped = torch.clamp\(clip_coef, max=1.0\)"),
    ("o_clip", "optax.clip_by_global_norm: max_norm / g_norm when g_norm >= max_norm", "optax", "optax/transforms/_clipping.py",
     r"^    trigger = jnp.squeeze\(g_norm < max_norm\)", r"^      return jax.lax.select\(trigger, t, \(t / g_norm.astype\(t.dtype\)\) \* max_norm\)"),
    ("o_ce", "optax integer-label cross-entropy: a gather, no ignore_index, no reduction", "optax", "optax/losses/_classification.py",
     r"^  label_logits = jnp.take_along_axis\(", r"^  return out"),
    ("t_sdpa_mask", "torch scaled_dot_product_attention: True = take part", "torch", "torch/nn/functional.py",
     r"^            A boolean mask where a value of True indicates that the element \*should\* take part in attention.", 1),
    ("t_mha_mask", "torch nn.MultiheadAttention: True = NOT allowed to attend", "torch", "torch/nn/modules/activation.py",
     r"^                Binary and float masks are supported. For a binary mask, a ``True`` value indicates that the", 2),
    ("j_dpa_mask", "jax.nn.dot_product_attention: True = take part", "jax", "jax/_src/nn/functions.py",
     r"^    mask: optional, mask array used to filter out logits. It is a boolean mask", 2),
    ("f_bigneg", "Flax attention fills masked scores with finfo.min, not -inf", "flax", "flax/nnx/nn/attention.py",
     r"^    big_neg = jnp.finfo\(dtype\).min", r"^    attn_weights = jnp.where\(combined_mask, attn_weights, big_neg\)"),
    ("f_dropout", "Flax NNX Dropout draws a fresh key from its Rngs stream on every call", "flax", "flax/nnx/nn/stochastic.py",
     r"^    if isinstance\(rngs, rnglib.Rngs\):\n      key = rngs\[self.rng_collection\]\(\)", 6),
    ("f_rngstream", "An Rngs stream: fold_in(key, count), then count += 1", "flax", "flax/nnx/rnglib.py",
     r"^    key = random.fold_in\(self.key\[...\], self.count\[...\]\)", 2),
    ("hf_conv1d", "Hugging Face Conv1D (GPT-2): weight is [in, out], the transpose of nn.Linear", "transformers", "transformers/pytorch_utils.py",
     r"^    def __init__\(self, nf, nx\):", r"^        x = torch.addmm\(self.bias, x.view\(-1, x.size\(-1\)\), self.weight\)"),
    ("tunix_map", "Tunix's Llama 3 loader: a regex from Hugging Face name to JAX path, plus a transpose", "tunix", "tunix/models/llama3/params.py",
     r"^def _get_key_and_transform_mapping\(cfg: model_lib.ModelConfig\):", 10),
    ("tunix_head", "... and the untied head, transposed", "tunix", "tunix/models/llama3/params.py",
     r"^      r\"lm_head\\.weight\": \(\"lm_head.w\", \(\(1, 0\), None\)\),", 1),
]


def find(text, pat):
    m = re.search(pat, text, flags=re.M)
    if not m:
        raise SystemExit("pattern not found: " + pat)
    return text.count("\n", 0, m.start()) + 1


out = {"excerpts": [], "commits": {}}
for name, (root, url, label) in REPOS.items():
    if os.path.isdir(os.path.join(root, ".git")):
        out["commits"][name] = subprocess.run(["git", "-C", root, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    out["commits"].setdefault(name, label)
for sid, title, repo, rel, start, end in SPECS:
    root, url, label = REPOS[repo]
    path = os.path.join(root, rel)
    text = open(path, encoding="utf-8").read()
    lines = text.split("\n")
    a = find(text, start)
    if end is None:      # a class header: take the __init__ signature lines with eps/epsilon defaults
        b = a
        for i in range(a, min(a + 140, len(lines))):
            if re.search(r"^\s+(eps|epsilon): float = |^\s+use_fast_variance: bool = ", lines[i - 1]):
                b = i
        keep = [i for i in range(a, b + 1) if i == a or re.search(r"(eps|epsilon): float = |use_fast_variance: bool = |def __init__", lines[i - 1])]
        txt = "\n".join("%5d  %s" % (i, lines[i - 1]) for i in keep)
        e = b
    elif isinstance(end, int):
        e = a + end - 1
        txt = "\n".join("%5d  %s" % (i, lines[i - 1]) for i in range(a, e + 1))
    else:
        e = a + text[sum(len(l) + 1 for l in lines[:a - 1]):].count("\n", 0, re.search(end, text[sum(len(l) + 1 for l in lines[:a - 1]):], flags=re.M).start())
        txt = "\n".join("%5d  %s" % (i, lines[i - 1]) for i in range(a, e + 1))
    out["excerpts"].append(dict(id=sid, title=title, repo=repo, label=label, file=rel, start=a, end=e,
                                url=url + rel + "#L%d" % a + ("-L%d" % e if e > a else ""), text=txt))
    print(sid, rel, a, e)
P.save("source", out)
