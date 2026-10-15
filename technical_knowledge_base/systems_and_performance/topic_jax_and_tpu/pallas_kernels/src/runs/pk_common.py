"""Shared helpers for the Pallas kernels page (child of Topic: jax-and-tpu). Imported by every pk_*.py script.

Run on CPU only, low priority (see the root's src/data/README.md):
    JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B pk_kernels_run.py
No TPU or GPU is used anywhere. Kernels run in Pallas interpret mode; TPU lowering uses jax.export(platforms=["tpu"]).
"""
import json
import math
import os
import re
import statistics
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.dirname(os.path.dirname(HERE))                       # .../pallas_kernels
ROOT_SRC = os.path.join(os.path.dirname(PAGE), "src")                # the root page's src/
DATA = os.path.join(ROOT_SRC, "data")
TPU_LAB = os.path.join(ROOT_SRC, "tpu")
OUT = os.path.join(HERE, "out")
for p in (DATA, TPU_LAB, HERE):
    if p not in sys.path:
        sys.path.insert(0, p)
os.makedirs(OUT, exist_ok=True)

LABEL_TIME = "measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority"


def scratch(*p):
    d = os.path.join(os.environ["JX_SCRATCH"], "pk", *p)
    os.makedirs(os.path.dirname(d) if p else d, exist_ok=True)
    return d


def jax_src():
    return os.path.join(os.environ["JX_SCRATCH"], "src", "jax")


def src_line(root, rel, pattern, nth=0):
    """1-based line number of the nth line in file root/rel matching regex `pattern` (fails loudly)."""
    hits = [i + 1 for i, l in enumerate(open(os.path.join(root, rel), encoding="utf-8")) if re.search(pattern, l)]
    if len(hits) <= nth:
        raise RuntimeError(f"{pattern!r} not found in {rel}")
    return hits[nth]


def scrub(s):
    """Remove absolute paths (home, scratchpad, site-packages) from text before it is saved."""
    s = re.sub(r"/(?:pri" r"vate/)?(?:tmp|var|Us" r"ers)/[^\s:\"')]*", "<path>", s)
    return s


def save(name, obj):
    p = os.path.join(OUT, name)
    txt = json.dumps(obj, indent=1, ensure_ascii=False)
    if any(x in txt for x in ("/" + "Users/", "Users" + "-", "/" + "private/")):
        raise RuntimeError("path leaked into " + name)
    with open(p, "w") as fh:
        fh.write(txt + "\n")
    print("wrote", os.path.relpath(p, PAGE), len(txt), "bytes")


def maxerr(a, b):
    import jax.numpy as jnp
    return float(jnp.max(jnp.abs(jnp.asarray(a, jnp.float32) - jnp.asarray(b, jnp.float32))))


def timeit(f, *args, n=5):
    """Median wall seconds and median process CPU seconds of n calls after one warm-up."""
    import jax
    jax.block_until_ready(f(*args))
    ws, cs = [], []
    for _ in range(n):
        t0, c0 = time.perf_counter(), time.process_time()
        jax.block_until_ready(f(*args))
        ws.append(time.perf_counter() - t0); cs.append(time.process_time() - c0)
    return statistics.median(ws), statistics.median(cs)


def running_example():
    """The running example's real tensors: layer 0, training batch 0, the shared initial weights (same as the root's
    TPU and Pallas lab, src/tpu/tp_pallas.py). Returns a dict of arrays and the config."""
    import numpy as np
    import jax
    import jax.numpy as jnp
    import common as C
    import model_jax as MJ
    cfg = C.CFG
    params = MJ.from_torch(dict(np.load(C.path("data", "init_torch.npz"))), cfg)
    x, y = C.batch(0)
    p0 = params["blocks"][0]
    D, H, TT, B = cfg["d_model"], cfg["n_heads"], cfg["ctx"], cfg["batch"]
    dh = D // H
    h0 = params["tok_emb"][x] + params["pos_emb"][:TT]                              # [32, 128, 128]
    a_in = MJ.layer_norm(p0["ln1"], h0, cfg["ln_eps"])
    split = lambda t: t.reshape(B, TT, H, dh).transpose(0, 2, 1, 3).reshape(B * H, TT, dh)
    q, k, v = (split(MJ.linear(p0["attn"][n], a_in)) for n in ("wq", "wk", "wv"))  # [128, 128, 32] each
    h1 = h0 + MJ.attention(p0["attn"], a_in, H)
    hid = jax.nn.gelu(MJ.linear(p0["mlp"]["fc1"], MJ.layer_norm(p0["ln2"], h1, cfg["ln_eps"])), approximate=False)
    A = hid.reshape(B * TT, cfg["d_ff"])                                           # [4096, 512]
    W2 = p0["mlp"]["fc2"]["w"]                                                     # [512, 128]
    return dict(cfg=cfg, params=params, x=x, y=y, h0=h0, h1=h1, a_in=a_in, q=q, k=k, v=v, A=A, W2=W2,
                ln1=p0["ln1"], ln2=p0["ln2"], B=B, H=H, T=TT, D=D, dh=dh, MJ=MJ)


def trained_qkv(layer):
    """q, k, v [B*H, T, dh] of `layer` for training batch 0, with the weights after the 500-step run
    (final_torch_500.npz, the root's Training lab). Trained attention is far more peaked than at initialisation."""
    import numpy as np
    import common as C
    import model_jax as MJ
    cfg = C.CFG
    params = MJ.from_torch(dict(np.load(C.path("data", "final_torch_500.npz"))), cfg)
    x, _ = C.batch(0)
    D, H, TT, B = cfg["d_model"], cfg["n_heads"], cfg["ctx"], cfg["batch"]
    dh = D // H
    h = params["tok_emb"][x] + params["pos_emb"][:TT]
    for p in params["blocks"][:layer]:
        h = MJ.block(p, h, cfg)
    pl_ = params["blocks"][layer]
    a_in = MJ.layer_norm(pl_["ln1"], h, cfg["ln_eps"])
    split = lambda t: t.reshape(B, TT, H, dh).transpose(0, 2, 1, 3).reshape(B * H, TT, dh)
    return tuple(split(MJ.linear(pl_["attn"][n], a_in)) for n in ("wq", "wk", "wv"))
