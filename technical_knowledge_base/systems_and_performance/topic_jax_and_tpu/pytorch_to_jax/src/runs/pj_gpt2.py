"""Porting a Hugging Face model by hand: GPT-2 small (124M) from its safetensors file to ~60 lines of plain JAX,
checked against transformers' own PyTorch GPT2LMHeadModel by logits and by greedy text, plus the three
mistakes this particular checkpoint invites (it is NOT laid out like nn.Linear).

Checkpoint: openai-community/gpt2 at revision 607a30d783dfa663caf39e06633721c8d4cfcd7e (model.safetensors,
548,105,171 bytes, sha256 248dfc39...), in $JX_SCRATCH/pj/gpt2. transformers 5.19.0 from $JX_SCRATCH/pj/site.
Writes out/gpt2.json.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B pj_gpt2.py
"""
import json
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pjcommon as P  # noqa: E402

P.add_site()
os.environ.setdefault("JAX_PLATFORMS", "cpu")
import numpy as np  # noqa: E402
import torch  # noqa: E402

torch.set_num_threads(4)
import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import transformers  # noqa: E402
from safetensors.flax import load_file  # noqa: E402
from tokenizers import Tokenizer  # noqa: E402

G = os.path.join(P.PJ, "gpt2")
cfg = json.load(open(os.path.join(G, "config.json")))
tok = Tokenizer.from_file(os.path.join(G, "tokenizer.json"))
PROMPT = "The quick brown fox"
ids = tok.encode(PROMPT).ids
R = {"prompt": PROMPT, "ids": ids, "versions": dict(P.versions(), torch=torch.__version__, transformers=transformers.__version__),
     "config": {k: cfg[k] for k in ("n_layer", "n_head", "n_embd", "n_positions", "vocab_size", "layer_norm_epsilon", "activation_function")},
     "flax_classes_in_transformers": [n for n in dir(transformers) if n.startswith("Flax")]}

# ------------------------------------------------------------------ reference: transformers' PyTorch model
t0 = time.perf_counter()
hf = transformers.GPT2LMHeadModel.from_pretrained(G, torch_dtype=torch.float32).eval()
R["hf_load_s"] = round(time.perf_counter() - t0, 1)
R["hf_tied"] = bool(hf.lm_head.weight.data_ptr() == hf.transformer.wte.weight.data_ptr())
R["hf_conv1d_class"] = type(hf.transformer.h[0].attn.c_attn).__name__
with torch.no_grad():
    ref = hf(torch.tensor([ids])).logits[0].numpy()


def greedy_torch(n):
    seq = list(ids)
    with torch.no_grad():
        for _ in range(n):
            seq.append(int(hf(torch.tensor([seq])).logits[0, -1].argmax()))
    return seq


# ------------------------------------------------------------------ the port: plain JAX on the safetensors dict
W = load_file(os.path.join(G, "model.safetensors"))       # {name: jax.Array}; Conv1D weights are [in, out] already
import re  # noqa: E402
is_buf = lambda k: re.fullmatch(r"h\.\d+\.attn\.bias", k) is not None      # the causal-mask buffer, not a weight
R["n_tensors"] = len(W); R["n_params"] = int(sum(int(np.prod(v.shape)) for k, v in W.items() if not is_buf(k)))
R["tensors_shown"] = [dict(name=k, shape=list(W[k].shape)) for k in sorted(W) if (k.startswith("h.0.") or not k.startswith("h.")) and not is_buf(k)]
R["tile"] = dict(name="h.0.attn.c_proj.weight", stored_corner=np.round(np.asarray(W["h.0.attn.c_proj.weight"])[:6, :8], 4).tolist())
R["mask_buffers_in_file"] = sum(is_buf(k) for k in W); R["mask_buffer_shape"] = list(W["h.0.attn.bias"].shape)


def ln(x, p, eps):
    mu = x.mean(-1, keepdims=True); var = ((x - mu) ** 2).mean(-1, keepdims=True)
    return (x - mu) / jnp.sqrt(var + eps) * W[p + ".weight"] + W[p + ".bias"]


def gpt2(tokens, opts=None):
    o = {**dict(transpose=False, exact_gelu=False, eps=cfg["layer_norm_epsilon"]), **(opts or {})}
    H, D = cfg["n_head"], cfg["n_embd"]; T = tokens.shape[0]; dh = D // H
    lin = lambda x, p: x @ (W[p + ".weight"].T if (o["transpose"] and W[p + ".weight"].shape[0] == W[p + ".weight"].shape[1]) else W[p + ".weight"]) + W[p + ".bias"]
    x = W["wte.weight"][tokens] + W["wpe.weight"][:T]
    mask = jnp.tril(jnp.ones((T, T), bool))
    for i in range(cfg["n_layer"]):
        p = f"h.{i}."
        h = ln(x, p + "ln_1", o["eps"])
        q, k, v = jnp.split(lin(h, p + "attn.c_attn"), 3, axis=-1)                 # one fused [768, 2304] projection
        q, k, v = (t.reshape(T, H, dh).transpose(1, 0, 2) for t in (q, k, v))
        s = q @ k.transpose(0, 2, 1) / math.sqrt(dh)
        s = jnp.where(mask, s, jnp.finfo(s.dtype).min)                            # HF fills with finfo.min
        a = (jax.nn.softmax(s, axis=-1) @ v).transpose(1, 0, 2).reshape(T, D)
        x = x + lin(a, p + "attn.c_proj")
        h = ln(x, p + "ln_2", o["eps"])
        x = x + lin(jax.nn.gelu(lin(h, p + "mlp.c_fc"), approximate=not o["exact_gelu"]), p + "mlp.c_proj")   # gelu_new = tanh
    return ln(x, "ln_f", o["eps"]) @ W["wte.weight"].T                           # tied: the head IS the embedding


lj = np.asarray(gpt2(jnp.asarray(ids)))
R["logits_maxdiff"] = P.maxdiff(lj, ref); R["max_abs_logit"] = float(np.abs(ref).max())
R["logits_rel"] = R["logits_maxdiff"] / R["max_abs_logit"]
R["top5_next"] = [tok.decode([int(t)]) for t in np.argsort(-ref[-1])[:5]]
R["top5_agree"] = bool((np.argsort(-ref[-1])[:5] == np.argsort(-lj[-1])[:5]).all())


def greedy_jax(n, opts=None):
    seq = list(ids)
    for _ in range(n):
        seq.append(int(np.asarray(gpt2(jnp.asarray(seq), opts))[-1].argmax()))
    return seq


NG = 20
t0 = time.perf_counter(); gt = greedy_torch(NG); R["greedy_torch_s"] = round(time.perf_counter() - t0, 1)
t0 = time.perf_counter(); gj = greedy_jax(NG); R["greedy_jax_s"] = round(time.perf_counter() - t0, 1)
R["greedy_torch"] = tok.decode(gt); R["greedy_jax"] = tok.decode(gj); R["greedy_same"] = gt == gj

# ------------------------------------------------------------------ the three mistakes this checkpoint invites
M = {}
for name, opts, why in [
    ("transpose", dict(transpose=True), "treat Conv1D like nn.Linear and transpose: c_attn [768,2304] and c_fc fail on shape, so a "
                                        "'fix' that transposes only square matrices loads c_proj [768,768] wrong silently"),
    ("exact_gelu", dict(exact_gelu=True), "use exact erf GELU (right for the running example, wrong for GPT-2's gelu_new)"),
    ("eps", dict(eps=1e-6), "LayerNorm epsilon 1e-6 instead of the config's 1e-5"),
]:
    l = np.asarray(gpt2(jnp.asarray(ids), opts))
    g = greedy_jax(NG, opts)
    M[name] = dict(why=why, logits_maxdiff=P.maxdiff(l, ref), greedy=tok.decode(g), greedy_same=g == gt,
                   first_token_diverges=next((i - len(ids) for i in range(len(ids), len(g)) if g[i] != gt[i]), None))
R["mistakes"] = M
R["transpose_all_error"] = P.err(lambda: jnp.ones((4, 768)) @ W["h.0.attn.c_attn.weight"].T, 2)

# safetensors refuses tied tensors from a plain state_dict
from safetensors.torch import save_file  # noqa: E402
R["tied_save_error"] = P.err(lambda: save_file(hf.state_dict(), os.path.join(P.PJ, "convert", "gpt2_tied.safetensors")), 2)
R["label"] = P.LABEL; R["load"] = P.load1()
P.save("gpt2", R)
