"""Save sharded on one mesh, restore onto other meshes, keep training (training_stack Resume lab, part 2).

8 simulated CPU devices. The running example with logical sharding annotations (ts_sharded_model.py), the
running example's optimizer, training batches split over 'data'. Mesh A is (data 2, model 4).
  1. Train 40 steps on A without stopping (reference).
  2. Train 20 steps on A, save {model, optimizer} with orbax.
  3. For each target layout (A again; (8, 1); (1, 8); one device): build the model there, restore into its
     shardings, check every restored array equals what was saved (bit for bit), train steps 20..39,
     compare with the reference.
Run: XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 python -I -B ts_ckpt_mesh.py
Output: out/ckpt_mesh.json
"""
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ts_common as T  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402
import numpy as np  # noqa: E402
import orbax.checkpoint as ocp  # noqa: E402
from flax import nnx  # noqa: E402
from jax.sharding import NamedSharding, PartitionSpec as P  # noqa: E402

import model_nnx as MN  # noqa: E402
from ts_sharded_model import RULES, ShardedLM  # noqa: E402

C = T.C
CFG = C.CFG
assert len(jax.devices()) == 8
TOTAL, SAVE_AT = 40, 20
CK = T.scratch("ckpt_mesh")
AUTO = jax.sharding.AxisType.Auto
LAYOUTS = {"A (2 x 4)": (2, 4), "(8 x 1)": (8, 1), "(1 x 8)": (1, 8), "one device": None}
init_sd = dict(np.load(C.path("data", "init_torch.npz")))
plain = MN.from_torch(MN.make_model(CFG), init_sd)
INIT = jax.device_get(nnx.state(plain, nnx.Param))


def mesh_for(shape):
    if shape is None:
        return jax.make_mesh((1, 1), ("data", "model"), axis_types=(AUTO, AUTO), devices=jax.devices()[:1])
    return jax.make_mesh(shape, ("data", "model"), axis_types=(AUTO, AUTO))


def build(mesh):
    with jax.set_mesh(mesh), nnx.logical_axis_rules(RULES):
        m = ShardedLM(CFG, rngs=nnx.Rngs(0))
        st = nnx.state(m, nnx.Param)
        leaves, treedef = jax.tree.flatten(st)          # same paths, different metadata: match leaf by leaf
        init_leaves = jax.tree.leaves(INIT)
        assert [l.shape for l in leaves] == [l.shape for l in init_leaves]
        placed = jax.tree.unflatten(treedef, [jax.device_put(a, v.sharding) for a, v in zip(init_leaves, leaves)])
        nnx.update(m, placed)
        opt = MN.make_optimizer(m, CFG)

        @nnx.jit
        def step(m, o, x, y):
            loss, g = nnx.value_and_grad(MN.loss_fn)(m, x, y)
            o.update(m, g)
            return loss
    return m, opt, step


def train(mesh, m, opt, step, a, b):
    ds = NamedSharding(mesh, P("data", None))
    out = []
    with jax.set_mesh(mesh):
        for i in range(a, b):
            x, y = C.batch(i)
            out.append(float(step(m, opt, jax.device_put(jnp.asarray(x), ds), jax.device_put(jnp.asarray(y), ds))))
    return out


def flat(m, opt):
    return [np.asarray(a) for a in jax.tree.leaves(nnx.state(m, nnx.Param))] + \
           [np.asarray(a) for a in jax.tree.leaves(nnx.state(opt, nnx.Not(nnx.Param)))]


R = {"versions": T.versions(), "total": TOTAL, "save_at": SAVE_AT}
mA = mesh_for((2, 4))
m, o, s = build(mA)
ref_losses = train(mA, m, o, s, 0, TOTAL)
REF = flat(m, o)
m, o, s = build(mA)
first = train(mA, m, o, s, 0, SAVE_AT)
SAVED = flat(m, o)
shutil.rmtree(CK, ignore_errors=True)
mgr = ocp.CheckpointManager(CK)
mgr.save(SAVE_AT, args=ocp.args.Composite(model=ocp.args.StandardSave(nnx.state(m, nnx.Param)),
                                          opt=ocp.args.StandardSave(nnx.state(o, nnx.Not(nnx.Param)))))
mgr.wait_until_finished()
R["files_bytes"] = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(CK) for f in fs)
R["ocdbt_process_dirs"] = sorted(d for d in os.listdir(os.path.join(CK, str(SAVE_AT), "model")) if d.startswith("ocdbt"))
R["ref_losses"] = ref_losses
R["targets"] = {}
def spec(x):
    return str(getattr(x.sharding, "spec", x.sharding))


R["bias_spec_fresh"] = spec(build(mA)[0].blocks[0].mlp.fc1.bias[...])
R["bias_spec_saved"] = spec(m.blocks[0].mlp.fc1.bias[...])
LAYOUTS = dict(LAYOUTS)
LAYOUTS["A, into the saved shardings"] = "saved"
for name, shape in LAYOUTS.items():
    mesh = mesh_for((2, 4) if shape == "saved" else shape)
    m2, o2, s2 = build(mesh)
    if shape == "saved":
        # target = the shardings the training state actually had when it was saved (the compiler re-shards
        # some leaves in the first jitted step), so the continued step compiles to the same program
        tgt_m = jax.tree.map(lambda t, a: jax.ShapeDtypeStruct(t.shape, t.dtype, sharding=a.sharding),
                             nnx.state(m2, nnx.Param), nnx.state(m, nnx.Param))
        tgt_o = jax.tree.map(lambda t, a: jax.ShapeDtypeStruct(t.shape, t.dtype, sharding=a.sharding),
                             nnx.state(o2, nnx.Not(nnx.Param)), nnx.state(o, nnx.Not(nnx.Param)))
    else:
        tgt_m, tgt_o = nnx.state(m2, nnx.Param), nnx.state(o2, nnx.Not(nnx.Param))
    r = ocp.CheckpointManager(CK).restore(SAVE_AT, args=ocp.args.Composite(
        model=ocp.args.StandardRestore(tgt_m), opt=ocp.args.StandardRestore(tgt_o)))
    nnx.update(m2, r.model)
    nnx.update(o2, r.opt)
    got = flat(m2, o2)
    restored_exact = all(np.array_equal(a, b) for a, b in zip(got, SAVED))
    k = m2.blocks[0].mlp.fc1.kernel[...]
    cont = train(mesh, m2, o2, s2, SAVE_AT, TOTAL)
    fin = flat(m2, o2)
    R["targets"][name] = {"mesh": shape, "bias_spec": spec(m2.blocks[0].mlp.fc1.bias[...]), "restored_bitwise": bool(restored_exact),
                          "fc1_spec": str(k.sharding.spec) if hasattr(k.sharding, "spec") else str(k.sharding),
                          "fc1_shard": list(k.addressable_shards[0].data.shape),
                          "n_devices": len(k.sharding.device_set),
                          "continued_bitwise_equal_ref": bool(all(np.array_equal(a, b) for a, b in zip(fin, REF))),
                          "param_maxdiff_vs_ref": float(max(np.abs(a.astype(np.float64) - b.astype(np.float64)).max() for a, b in zip(fin[:69], REF[:69]))),
                          "loss_maxdiff_vs_ref": float(max(abs(a - b) for a, b in zip(first + cont, ref_losses))),
                          "losses": cont}
    print(name, {k_: v for k_, v in R["targets"][name].items() if k_ != "losses"}, flush=True)
R["load"] = T.load_avg()
T.save("ckpt_mesh", R)
