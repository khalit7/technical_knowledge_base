"""Is x.at[i].set(v) in place under jit? Checks an old-page claim ("XLA turns these into true in-place updates,
so no copy cost in practice") on a 4096 x 1024 float32 array (16 MiB): the optimised HLO (is there a copy?)
and memory_analysis (temp, alias) without and with donation, and for an update of an intermediate value.
Output: lab/out/inplace.json
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xp_common as X  # noqa: E402

import jax  # noqa: E402
import jax.numpy as jnp  # noqa: E402

x = jnp.zeros((4096, 1024), jnp.float32)


def upd(x):
    return x.at[0].set(1.0)


def upd_intermediate(x):
    y = x * 2.0
    return y.at[0].set(1.0)


cases = [("argument, not donated", jax.jit(upd)), ("argument, donated", jax.jit(upd, donate_argnums=0)),
         ("intermediate value", jax.jit(upd_intermediate))]
out = []
for name, f in cases:
    co = f.lower(x).compile()
    txt = X.hlo_no_tables(co.as_text())
    entry = txt.split("ENTRY", 1)[1]
    ops = [l.split("=", 1)[1].split("(")[0].split()[-1] for l in entry.splitlines() if " = " in l]
    ma = co.memory_analysis()
    out.append({"case": name, "entry_ops": ops,
                "has_copy": any(o in ("copy",) for o in ops) or "copy" in " ".join(l for l in txt.splitlines() if "fusion" in l and "copy" in l),
                "temp": ma.temp_size_in_bytes, "alias": ma.alias_size_in_bytes, "output": ma.output_size_in_bytes,
                "entry": [X.strip_meta(l.strip())[:200] for l in entry.splitlines()[1:] if l.strip() and l.strip() != "}"][:6]})
    print(name, ops, "temp", ma.temp_size_in_bytes, "alias", ma.alias_size_in_bytes)
X.save("inplace.json", {"versions": X.versions(), "array_bytes": 4096 * 1024 * 4, "cases": out})
