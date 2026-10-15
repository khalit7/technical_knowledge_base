"""Weight conversion both ways, through safetensors, generically (by rule on the parameter path), checked by logits.

PyTorch state_dict -> safetensors file -> Flax NNX state (rename + transpose by rule) -> logits vs PyTorch;
NNX -> safetensors -> torch.load_state_dict(strict=True) -> bit-for-bit round trip. Also the conversion
errors a port meets (non-contiguous tensors, bfloat16 through numpy, wrong shapes, missing keys), with their
real messages. Writes out/convert.json. Files go to $JX_SCRATCH/pj/convert/.

JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B pj_convert.py
"""
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
import safetensors  # noqa: E402
from flax import nnx  # noqa: E402
from safetensors.flax import load_file as load_flax  # noqa: E402
from safetensors.numpy import save_file as save_np  # noqa: E402
from safetensors.torch import load_file as load_torch  # noqa: E402
from safetensors.torch import save_file as save_torch  # noqa: E402

import common as C  # noqa: E402
import model_nnx as MN  # noqa: E402
import model_torch as MT  # noqa: E402

D = os.path.join(P.PJ, "convert"); os.makedirs(D, exist_ok=True)
R = {"versions": dict(P.versions(), torch=torch.__version__, flax=__import__("flax").__version__, safetensors=safetensors.__version__)}
sd0 = dict(np.load(C.path("data", "init_torch.npz")))
# use the trained weights (500 steps): converted logits are then compared at realistic magnitudes
sdT = dict(np.load(C.path("data", "final_torch_500.npz")))
tm = MT.make_model(C.CFG, 0); tm.load_state_dict({k: torch.from_numpy(v) for k, v in sdT.items()})
x0, _ = C.batch(0)
with torch.no_grad():
    ref = tm(torch.from_numpy(x0).long()).numpy()


# ------------------------------------------------------------------ the rule: NNX path <-> PyTorch name
def torch_name(path):
    """('blocks', 0, 'attn', 'wq', 'kernel') -> ('blocks.0.attn.wq.weight', transpose?)"""
    *mods, leaf = [str(p) for p in path]
    leaf_map = {"kernel": ("weight", True), "bias": ("bias", False), "scale": ("weight", False), "embedding": ("weight", False)}
    tname, tr = leaf_map[leaf]
    return ".".join(mods + [tname]), tr


# 1. PyTorch -> safetensors (torch side)
f1 = os.path.join(D, "tinylm_torch.safetensors")
t0 = time.perf_counter()
save_torch(tm.state_dict(), f1, metadata={"format": "pt", "source": "running example, 500 steps"})
R["save_torch_s"] = time.perf_counter() - t0
R["file_bytes"] = os.path.getsize(f1)
R["param_bytes"] = int(sum(v.nbytes for v in sdT.values()))
with open(f1, "rb") as fh:
    n = int.from_bytes(fh.read(8), "little")
R["header_bytes"] = n

# 2. safetensors -> JAX arrays -> NNX, by rule
flat_in = load_flax(f1)                      # {name: jax.Array}
model = MN.make_model(C.CFG, seed=123)       # fresh NNX model with its own random init
state = nnx.state(model, nnx.Param)
rows, used = [], set()
flat = nnx.to_flat_state(state)
new_leaves = []
for path, var in flat:
    name, tr = torch_name(path)
    w = flat_in[name]
    w = w.T if tr else w
    assert w.shape == var[...].shape, (name, w.shape, var[...].shape)
    new_leaves.append((path, var.replace(w)))
    used.add(name)
    rows.append(dict(nnx="/".join(str(p) for p in path), torch=name, torch_shape=list(sdT[name].shape),
                     nnx_shape=list(w.shape), transpose=tr, n=int(np.prod(w.shape))))
nnx.update(model, nnx.from_flat_state(new_leaves))
R["unused_torch_keys"] = sorted(set(flat_in) - used)
R["tensors"] = rows
R["n_tensors"] = len(rows); R["n_transposed"] = sum(r["transpose"] for r in rows)
R["n_params"] = sum(r["n"] for r in rows)
lj = np.asarray(nnx.jit(lambda m, x: m(x))(model, x0))
R["torch_to_nnx_logits_maxdiff"] = P.maxdiff(lj, ref); R["max_abs_logit"] = float(np.abs(ref).max())
R["torch_to_nnx_argmax_agree"] = float((lj.argmax(-1) == ref.argmax(-1)).mean())

# 3. NNX -> safetensors (numpy side) -> PyTorch, strict load, bit-for-bit
back = {}
for path, var in nnx.to_flat_state(nnx.state(model, nnx.Param)):
    name, tr = torch_name(path)
    a = np.asarray(var[...])
    back[name] = np.ascontiguousarray(a.T if tr else a)
f2 = os.path.join(D, "tinylm_from_nnx.safetensors")
save_np(back, f2, metadata={"format": "pt"})
tm2 = MT.make_model(C.CFG, 1)
missing = tm2.load_state_dict(load_torch(f2), strict=True)
R["roundtrip_bitwise_equal"] = all(torch.equal(tm2.state_dict()[k], tm.state_dict()[k]) for k in tm.state_dict())
R["roundtrip_strict_load"] = str(missing)
with torch.no_grad():
    R["roundtrip_logits_maxdiff"] = P.maxdiff(tm2(torch.from_numpy(x0).long()).numpy(), ref)

# 4. A real weight tile for the visualiser: the top-left 6 x 8 corner of blocks.0.attn.wq.weight, both layouts
w = sdT["blocks.0.attn.wq.weight"]
R["tile"] = dict(name="blocks.0.attn.wq.weight", torch_corner=np.round(w[:6, :8], 4).tolist(),
                 nnx_corner=np.round(w.T[:8, :6], 4).tolist())
R["tile_fc1"] = dict(name="blocks.0.mlp.fc1.weight", torch_shape=list(sdT["blocks.0.mlp.fc1.weight"].shape))

# 5. The errors a conversion meets (real messages)
E = {}
E["noncontiguous_save"] = P.err(lambda: save_torch({"w": torch.from_numpy(sdT["blocks.0.mlp.fc1.weight"]).T}, os.path.join(D, "x.safetensors")), 2)
bf = torch.from_numpy(sdT["head.weight"]).bfloat16()
E["bf16_numpy"] = P.err(lambda: bf.numpy())
fb = os.path.join(D, "bf16.safetensors"); save_torch({"head.weight": bf}, fb)
lb = load_flax(fb)["head.weight"]
E["bf16_via_safetensors_flax"] = dict(dtype=str(lb.dtype), equal_to_torch_bf16=bool(np.array_equal(np.asarray(lb.astype(jnp.float32)), bf.float().numpy())))
dl = jax.dlpack.from_dlpack(bf) if hasattr(jax, "dlpack") else None
E["bf16_via_dlpack"] = dict(dtype=str(dl.dtype), equal=bool(np.array_equal(np.asarray(dl.astype(jnp.float32)), bf.float().numpy())))
E["bf16_via_view_int16"] = dict(ok=bool(np.array_equal(
    np.asarray(jnp.asarray(bf.view(torch.int16).numpy()).view(jnp.bfloat16).astype(jnp.float32)), bf.float().numpy())))
m_bad = MN.make_model(C.CFG)


def assign_wrong():
    m_bad.blocks[0].mlp.fc1.kernel[...] = jnp.asarray(sdT["blocks.0.mlp.fc1.weight"])   # [512,128] into [128,512]


E["wrong_shape_slice_assign"] = P.err(assign_wrong, 3)
# nnx.update with a wrong-shaped leaf: does it check?
m_bad2 = MN.make_model(C.CFG)
st2 = nnx.state(m_bad2, nnx.Param)
fl2 = [(p_, (v_.replace(jnp.asarray(sdT["blocks.0.mlp.fc1.weight"])) if tuple(str(q) for q in p_) == ("blocks", "0", "mlp", "fc1", "kernel") else v_))
       for p_, v_ in nnx.to_flat_state(st2)]
E["wrong_shape_update"] = P.err(lambda: nnx.update(m_bad2, nnx.from_flat_state(fl2)), 3) or "no error at update time"
E["wrong_shape_update_then_call"] = P.err(lambda: m_bad2(x0), 3)
sd_missing = {k: torch.from_numpy(v) for k, v in sdT.items() if k != "ln_f.bias"}
E["torch_strict_missing"] = P.err(lambda: MT.make_model(C.CFG, 0).load_state_dict(sd_missing, strict=True), 3)
E["torch_nonstrict_missing"] = str(MT.make_model(C.CFG, 0).load_state_dict(sd_missing, strict=False))
R["errors"] = E
P.save("convert", R)
