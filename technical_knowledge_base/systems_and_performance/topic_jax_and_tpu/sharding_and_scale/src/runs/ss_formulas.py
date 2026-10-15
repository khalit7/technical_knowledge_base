"""Textbook predictions of the bytes each layout's collectives carry per train step, checked against the compiled
HLO of ss_scale.py (../out/scale.json). Writes ../out/formula_check.json.

Quantities are 'logical bytes' as the root Sharding lab's parser counts them: an all-gather's output, a reduce-scatter's
input, an all-reduce's operand, summed over the step. Symbols: P = parameter bytes (float32), Pdev = parameter bytes
held per device under the layout, L = layers, A = one activation [batch per data group, T, d_model] in float32.

  DP         all-reduce of the gradients                         AR = P
  FSDP       all-gather the weights once (XLA keeps them for the  AG = P
             backward pass here), reduce-scatter the gradients    RS = P   (on CPU: all-reduce + slice, so AR = P)
  HSDP r x f FSDP inside a group of f, then all-reduce the        AG = P, RS = P (CPU: AR), AR = P / f
             1/f gradient shard across the r replicas
  TP d x t   Megatron: 2 all-reduces of A per layer forward,      AR = 2 L A (fwd) + 2 L A (bwd) + Pdev (if d > 1)
             2 backward, plus the gradient all-reduce over data   (on CPU the backward has 4 L A: no AllReduceReassociate,
                                                                   so q, k and v input gradients are reduced separately)
The scaling book states the same structure as time: AllGather or ReduceScatter V / W_ici, AllReduce 2 V / W_ici.

    python3 -I -B ss_formulas.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "out")


def predict(lay, cfg, P_bytes, cpu=True):
    L, T, D = cfg["n_layers"], cfg["ctx"], cfg["d_model"]
    mesh = lay["mesh"]
    lid = lay["id"]
    if lid == "single":
        return {}
    if lid == "dp":
        return {"all-reduce": P_bytes}
    if lid == "fsdp":
        return {"all-gather": P_bytes, ("all-reduce" if cpu else "reduce-scatter"): P_bytes}
    if lid == "hsdp":
        r, f = mesh
        if cpu:
            return {"all-gather": P_bytes, "all-reduce": P_bytes + P_bytes / f}
        return {"all-gather": P_bytes, "reduce-scatter": P_bytes, "all-reduce": P_bytes / f}
    if lid in ("tp", "tp8"):
        d, t = mesh
        A = cfg["batch"] // d * T * D * 4
        bwd = (4 if cpu else 2) * L * A
        return {"all-reduce": 2 * L * A + bwd + (lay["param_bytes_per_device"] if d > 1 else 0)}
    return None                                     # FSDP x TP: not predicted (see the page)


def main():
    sc = json.load(open(os.path.join(OUT, "scale.json")))
    rows = []
    for cname, c in sc["configs"].items():
        cfg = c["cfg"]
        P_bytes = c["params"] * 4
        for lay in c["layouts"]:
            pred = predict(lay, cfg, P_bytes)
            meas = {k: v["bytes"] for k, v in lay["summary"].items() if k != "collective-permute" or v["bytes"]}
            row = {"config": cname, "id": lay["id"], "label": lay["label"], "predicted": pred, "measured": meas,
                   "predicted_tpu": predict(lay, cfg, P_bytes, cpu=False)}
            if pred is not None:
                tot_p = sum(pred.values())
                tot_m = sum(meas.values())
                row["ratio_measured_over_predicted"] = (tot_m / tot_p) if tot_p else None
            rows.append(row)
            print(cname, lay["id"], {k: round(v / 1e6, 3) for k, v in (pred or {}).items()},
                  {k: round(v / 1e6, 3) for k, v in meas.items()}, row.get("ratio_measured_over_predicted"))
    with open(os.path.join(OUT, "formula_check.json"), "w") as f:
        json.dump({"what": "Predicted vs compiled collective bytes per train step (logical bytes, MB = 1e6 B)", "rows": rows}, f, indent=1)
        f.write("\n")


if __name__ == "__main__":
    main()
