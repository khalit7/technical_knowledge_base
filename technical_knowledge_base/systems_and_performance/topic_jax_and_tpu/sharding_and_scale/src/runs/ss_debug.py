"""Debugging tools for shardings, run on the running example (8 simulated CPU devices). Records their real output:

  1. jax.debug.visualize_array_sharding on a weight under the FSDP x TP layout
  2. jax.debug.inspect_array_sharding inside jit (prints the sharding the compiler chose for an intermediate)
  3. jax.typeof on an Explicit mesh
  4. the 'Involuntary full rematerialization' warning XLA prints for the FSDP x TP layout (stderr of a child process)
  5. a surprise all-gather found by attributing collectives to source lines (the unconstrained FSDP layout)

    XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 \
        $JX_SCRATCH/venv/bin/python -I -B ss_debug.py
Writes ../out/debug.json.
"""
import io
import contextlib
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def child_warning():
    """Compile the FSDP x TP layout of the running example in a child process and keep XLA's warnings."""
    code = ("import sys; sys.path.insert(0, %r); import ss_scale as S; "
            "S.run(S.SMALL, [l for l in S.LAYOUTS if l[0]=='fsdp_tp'][0])" % HERE)
    env = dict(os.environ)
    p = subprocess.run([sys.executable, "-I", "-B", "-c", code], env=env, capture_output=True, text=True, timeout=600)
    lines = [ln for ln in p.stderr.splitlines() if "Involuntary" in ln or "rematerializ" in ln]
    import ss_common as SC
    out = []
    for ln in lines:
        ln = SC.H.scrub(ln)
        ln = re.sub(r"^W\d{4} [\d:.]+\s+\d+\s+", "", ln)       # drop the timestamp and thread id
        out.append(ln)
    return out


def main():
    os.environ["COLUMNS"] = "160"                      # rich (used by visualize_array_sharding) reads the width here
    import ss_common as SC
    import jax
    import jax.numpy as jnp
    import numpy as np
    from jax.sharding import AxisType, NamedSharding, PartitionSpec as P
    import common as C
    import model_jax as MJ
    res = {"jax": jax.__version__}
    sd = dict(np.load(C.path("data", "init_torch.npz")))
    params = MJ.from_torch(sd, C.CFG)
    mesh = jax.make_mesh((2, 4), ("data", "model"), axis_types=(AxisType.Auto,) * 2)
    w = jax.device_put(params["blocks"][0]["mlp"]["fc1"]["w"], NamedSharding(mesh, P("data", "model")))
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        jax.debug.visualize_array_sharding(w, use_color=False, max_width=100)
    res["visualize_fc1_fsdp_tp"] = buf.getvalue()
    res["shard_shapes"] = sorted({str(s.data.shape) for s in w.addressable_shards})
    res["devices_indices_map"] = {str(d): [[sl.start, sl.stop] for sl in idx] for d, idx in w.sharding.devices_indices_map(w.shape).items()}

    seen = {}
    x0, _ = C.batch(0)
    m8 = jax.make_mesh((8,), ("data",), axis_types=(AxisType.Auto,))
    xs = jax.device_put(x0, NamedSharding(m8, P("data", None)))
    for name, wspec in (("weights replicated", P()), ("fc1 weight split on its rows (FSDP)", P("data", None))):
        pb = jax.device_put(params["blocks"][0]["mlp"]["fc1"], {"w": NamedSharding(m8, wspec), "b": NamedSharding(m8, P())})

        def f(p, idx, name=name):
            h = params["tok_emb"][idx] + params["pos_emb"][:idx.shape[1]]
            hid = jax.nn.gelu(MJ.linear(p, h), approximate=False)
            jax.debug.inspect_array_sharding(hid, callback=lambda s: seen.setdefault(name, str(s.spec)))
            return hid.sum()
        jax.jit(f).lower(pb, xs).compile()
    res["inspect_hidden"] = seen

    emesh = jax.make_mesh((2, 4), ("data", "model"), axis_types=(AxisType.Explicit,) * 2)
    with jax.set_mesh(emesh):
        we = jax.device_put(params["blocks"][0]["mlp"]["fc1"]["w"], P(None, "model"))
        xe = jax.device_put(np.ones((32, 128), np.float32), P("data", None))
        res["typeof"] = {"w": str(jax.typeof(we)), "x": str(jax.typeof(xe)), "x @ w": str(jax.typeof(jax.jit(lambda a, b: a @ b)(xe, we)))}

    res["involuntary_warning"] = child_warning()
    print(res["inspect_hidden"], res["typeof"], len(res["involuntary_warning"]), flush=True)
    SC.dump("debug.json", res)


if __name__ == "__main__":
    main()
