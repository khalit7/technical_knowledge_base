"""Reference implementation of the Mesh designer tab's arithmetic (the page's JavaScript must agree: checked by
../check_data.mjs). Writes ../out/mesh_ref.json for a set of test cases. All results are calculations from published
specs and the scaling book's formulas, not measurements.

    python3 -I -B ss_mesh.py
"""
import itertools
import json
import math
import os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "out")

MODELS = {   # d, L, heads, kv heads, ff, vocab, ctx-type, mlp kind
    "small": dict(d=128, L=4, H=4, KV=4, F=512, V=65, pos=128, mlp="gelu", bias=True, tied=False),
    "big": dict(d=512, L=8, H=8, KV=8, F=2048, V=65, pos=256, mlp="gelu", bias=True, tied=False),
    "llama3_8b": dict(d=4096, L=32, H=32, KV=8, F=14336, V=128256, pos=0, mlp="swiglu", bias=False, tied=False),
    "llama3_70b": dict(d=8192, L=80, H=64, KV=8, F=28672, V=128256, pos=0, mlp="swiglu", bias=False, tied=False),
}


def n_params(m):
    d, L, H, KV, F, V = m["d"], m["L"], m["H"], m["KV"], m["F"], m["V"]
    hd = d // H
    b = 1 if m["bias"] else 0
    attn = d * d + 2 * d * KV * hd + d * d + b * (d + 2 * KV * hd + d)
    mlp = (3 * d * F) if m["mlp"] == "swiglu" else (2 * d * F + b * (F + d))
    norms = 2 * d * (2 if m["bias"] else 1)
    per = attn + mlp + norms
    emb = V * d + m["pos"] * d + (0 if m["tied"] else V * d)
    final = d * (2 if m["bias"] else 1)
    return emb + L * per + final


def factor_axes(phys, size):
    """Smallest set of physical axes whose sizes multiply to `size` (indices), or None."""
    idx = list(range(len(phys)))
    for k in range(0, len(phys) + 1):
        for comb in itertools.combinations(idx, k):
            if math.prod(phys[i] for i in comb) == size:
                return list(comb)
    return None


def calc(model, chip, phys, B, X, Y, remat):
    """model: dict; chip: {bf16, hbm, link} (link = one-way bytes/s per link); phys: slice shape; B: global tokens per
    step; X: FSDP degree; Y: tensor degree; the rest is data parallel. Returns memory per chip and times per step."""
    N = n_params(model)
    chips = math.prod(phys)
    assert chips % (X * Y) == 0, "X * Y must divide the number of devices"
    D = chips // (X * Y)
    W = 2 * chip["link"]                                     # bidirectional bandwidth of one ICI axis
    yax = factor_axes(phys, Y)
    rest = [p for i, p in enumerate(phys) if yax is None or i not in yax]
    xax = factor_axes(rest, X) if yax is not None else None
    dax = None
    if xax is not None:
        rest2 = [p for i, p in enumerate(rest) if i not in xax]
        dax = factor_axes(rest2, D)
    ok = yax is not None and xax is not None and dax is not None
    MY, MX, MD = (max(1, len(yax)) if yax else 1), (max(1, len(xax)) if xax else 1), (max(1, len(dax)) if dax else 1)
    tok_dev = B / (D * X)                                    # tokens each device processes (TP devices share them)
    state = 16 * N / (X * Y)
    act = model["L"] * tok_dev * (2 * model["d"] if remat else 34 * model["d"] / Y)
    compute = 6 * N * B / (chips * chip["bf16"])
    t_fsdp = 3 * (2 * N / Y) / (MX * W) if X > 1 else 0.0
    t_dp = 2 * (2 * N / (X * Y)) / (MD * W) if D > 1 else 0.0
    t_tp = 4 * model["L"] * 2 * (tok_dev * model["d"] * 2) / (MY * W) if Y > 1 else 0.0
    alpha = chip["bf16"] / W
    per_chip = B / chips
    if Y == 1:
        batch_ok = per_chip >= alpha / (MX + (MD if D > 1 else 0))     # scaling book: B/N > C/W_ici, per axis used
    else:
        batch_ok = per_chip >= alpha ** 2 / (MX * MY * model["F"])     # mixed FSDP + TP bound
    return {"N": N, "chips": chips, "D": D, "ok_topology": ok, "MX": MX, "MY": MY, "MD": MD, "tok_dev": tok_dev,
            "state_bytes": state, "act_bytes": act, "mem_bytes": state + act, "fits": state + act <= chip["hbm"],
            "compute_s": compute, "t_fsdp_s": t_fsdp, "t_dp_s": t_dp, "t_tp_s": t_tp,
            "ici_intensity": alpha, "per_chip_tokens": per_chip, "batch_ok": batch_ok,
            "tp_ok": (Y <= MY * model["F"] / alpha) if Y > 1 else True}


def main():
    spec = json.load(open(os.path.join(os.path.dirname(OUT), "..", "..", "src", "tpu", "out", "specs.json")))
    chips = {g["gen"]: {"bf16": g["bf16"], "hbm": g["hbm"], "link": g["sb"]["link_oneway"]} for g in spec["gens"]}
    # TPU7x: JAX sees 2 devices per chip (one per TensorCore chiplet); the designer treats each as half a chip
    chips["7x"] = {"bf16": chips["7x"]["bf16"] / 2, "hbm": chips["7x"]["hbm"] / 2, "link": chips["7x"]["link"]}
    cases = [("llama3_70b", "v5p", [16, 20, 28], 4194304, 2240, 4, True),
             ("llama3_70b", "v5p", [8, 8, 8], 4194304, 128, 4, True),
             ("llama3_8b", "v5e", [16, 16], 1048576, 256, 1, True),
             ("llama3_8b", "v6e", [16, 16], 1048576, 64, 4, False),
             ("big", "v5e", [4, 4], 65536, 4, 4, False),
             ("llama3_70b", "7x", [2, 4, 4, 4], 1048576, 32, 4, True),
             ("llama3_70b", "v5p", [8, 8, 8], 4194304, 64, 8, True)]
    out = {"params": {k: n_params(m) for k, m in MODELS.items()}, "cases": []}
    for mname, g, phys, B, X, Y, remat in cases:
        r = calc(MODELS[mname], chips[g], phys, B, X, Y, remat)
        out["cases"].append({"model": mname, "gen": g, "phys": phys, "B": B, "X": X, "Y": Y, "remat": remat, "out": r})
        print(mname, g, phys, X, Y, {k: (round(v, 4) if isinstance(v, float) else v) for k, v in r.items()})
    print(out["params"])
    with open(os.path.join(OUT, "mesh_ref.json"), "w") as f:
        json.dump(out, f, indent=1)
        f.write("\n")


if __name__ == "__main__":
    main()
