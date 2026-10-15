"""Import check for the Tool map: import each library present in the topic's shared venv, record its version, and probe
a few API-status rows of atlas_api.py against the installed jax (removed names must be gone, new names present).
Run with the shared venv's Python (CPU only):  JAX_PLATFORMS=cpu <venv>/bin/python -I src/map/check_imports.py
Writes src/map/out/imports.json, which gen_data.py merges into the page."""
import importlib, json, os, platform, sys, time, warnings
HERE = os.path.dirname(os.path.abspath(__file__))
os.environ.setdefault("JAX_PLATFORMS", "cpu")
# tool id -> (module, how to read the version)
MODS = {"jax": "jax", "jaxlib": "jaxlib", "mldtypes": "ml_dtypes", "nnx": "flax.nnx", "linen": "flax.linen", "optax": "optax",
        "orbax": "orbax.checkpoint", "grain": "grain", "equinox": "equinox", "chex": "chex", "treescope": "treescope",
        "jaxtyping": "jaxtyping", "stax": "jax.example_libraries.stax", "jax2tf": "jax.export"}
DIST = {"jax": "jax", "jaxlib": "jaxlib", "mldtypes": "ml-dtypes", "nnx": "flax", "linen": "flax", "optax": "optax", "orbax": "orbax-checkpoint",
        "grain": "grain", "equinox": "equinox", "chex": "chex", "treescope": "treescope", "jaxtyping": "jaxtyping", "stax": "jax", "jax2tf": "jax"}
NOTE = {"stax": "example library inside jax", "jax2tf": "jax.export only; jax2tf itself needs TensorFlow, not installed here",
        "linen": "same flax package as NNX"}
from importlib.metadata import version, PackageNotFoundError
out = {}
for tid, mod in MODS.items():
    r = {"mod": mod}
    try:
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            importlib.import_module(mod)
        r["ok"] = True
        dep = [str(x.message)[:120] for x in w if issubclass(x.category, (DeprecationWarning, FutureWarning))]
        if dep: r["warn"] = dep[:2]
    except Exception as e:
        r["ok"] = False; r["err"] = (type(e).__name__ + ": " + str(e))[:160]
    try:
        r["ver"] = version(DIST[tid])
    except PackageNotFoundError:
        r["ver"] = None
        if not r["ok"]: r["err"] = "not installed in the shared venv"
    if tid in NOTE: r["note"] = NOTE[tid]
    out[tid] = r
# API probes against the installed jax
api = {}
try:
    import jax
    def has(path):
        o = jax
        for p in path.split(".")[1:]:
            try: o = getattr(o, p)
            except Exception: return False
        return True
    for name in ["jax.shard_map", "jax.set_mesh", "jax.export", "jax.pmap", "jax.device_put_sharded", "jax.device_put_replicated",
                 "jax.sharding.PmapSharding", "jax.sharding.use_mesh", "jax.sharding.AxisType"]:
        api[name] = has(name)
    for m in ["jax.experimental.pjit", "jax.experimental.shard_map", "jax.experimental.maps", "jax.experimental.export"]:
        try:
            with warnings.catch_warnings(record=True) as w:
                warnings.simplefilter("always"); importlib.import_module(m)
            api[m] = "still imports" + ("; warns: " + str(w[0].message)[:100] if w else " (no warning on import)") + \
                ("; deprecated since 0.8.0, see the table above" if m in ("jax.experimental.pjit", "jax.experimental.shard_map") else "")
        except Exception as e:
            api[m] = "fails: " + type(e).__name__
    api["devices"] = [str(d) for d in jax.devices()][:2]
except Exception as e:
    api["error"] = str(e)[:120]
out["_meta"] = {"date": time.strftime("%Y-%m-%d"), "python": platform.python_version(), "machine": platform.machine(), "api": api,
                "note": f"Imported on {time.strftime('%Y-%m-%d')} in the topic's shared environment (Python {platform.python_version()}, macOS {platform.machine()}, JAX_PLATFORMS=cpu). Only libraries installed there are listed; the others on this map were not installed (no TPU or GPU here)."}
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
json.dump(out, open(os.path.join(HERE, "out", "imports.json"), "w"), indent=1)
for k, v in out.items():
    print(k, json.dumps(v)[:300])
