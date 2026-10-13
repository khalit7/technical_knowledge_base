"""Write parts/22_fst_data.js (window.FST) from the recorded inputs in exp/inputs/. Every number the page shows comes
from here; check_data.py verifies the page embeds exactly this and that prose numbers match it."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
IN = os.path.join(HERE, "exp", "inputs")


def load(n):
    p = os.path.join(IN, n)
    return json.load(open(p)) if os.path.exists(p) else None


CURVES = {("big", "plain"), ("big", "ckpt"), ("big", "sac_mm"), ("big", "sac_attn"), ("big_v50k", "plain"), ("big_v50k", "lce")}


def mem():
    d = load("mem_step.json"); out = []
    for r in d["runs"]:
        m = r["mem"]; cats = m["categories"]
        curve = None
        if (r["config"], r["how"]) in CURVES:
            pts = m["curve"]; tot = [sum(p[1:]) for p in pts]; ipk = tot.index(max(tot))
            step = max(1, len(pts) // 150)
            keep = sorted(set(list(range(0, len(pts), step)) + [ipk, len(pts) - 1]))
            curve = [[round(pts[i][0], 1)] + [round(v / 1e6, 1) for v in pts[i][1:]] for i in keep]
        out.append({"config": r["config"], "how": r["how"], "cfg": r["cfg"], "params": r["params"], "loss": r["loss_counted_step"],
                    "saved": r["saved_bytes"], "calls": r["calls"], "peak": m["peak_total"], "start": m["start_total"],
                    "peak_ms": m["peak_ms"], "peak_by": m["peak_by_category"], "max_by": m["max_by_category"],
                    "marks": m["marks_ms"], "cats": cats, "curve": curve})
    return {"env": d["env"], "runs": out}


def attn():
    d = load("attn_backends.json")
    cases = []
    for c in d["cases"]:
        cases.append({k: c.get(k) for k in ("device", "dtype", "shape", "is_causal", "mask", "dropout", "requires_grad", "max_abs_err_vs_f64", "default_ops", "default_error")}
                     | {"forced": {k: (v["ops"][-1] if v["ok"] else "error: " + v["error"]) for k, v in c["forced"].items()}})
    return {"env": d["env"], "cases": cases, "saved": d["saved"]}


def build():
    data = {"mem": mem(), "attn": attn(), "flex": load("flex_lab.json"), "ao": load("torchao_lab.json"),
            "probe": {k: v for k, v in (load("probe_api.json") or {}).items() if k in ("torch", "SDPBackend", "mem_categories", "ckpt_policy", "torchao")}}
    for n in ("hunt_time_mps", "hunt_time_cpu", "hunt_phases_mps", "hunt_phases_cpu", "hunt_trace", "budget", "saved_formula",
              "time_optim", "time_attn", "time_flex", "time_ckpt", "time_lce", "time_amp", "time_ao", "time_data", "time_timer", "varlen"):
        data[n] = load(n + ".json")
    if data["ao"]:
        f8 = data["ao"].get("float8_emulated_small", {})
        for k in ("float32", "float8_emulated"):
            if k in f8:
                f8[k] = [round(v, 5) for v in f8[k]]
    s = "window.FST=" + json.dumps(data, separators=(",", ":")) + ";\n"
    open(os.path.join(HERE, "parts", "22_fst_data.js"), "w").write(s)
    print("22_fst_data.js", len(s), "bytes")
    return data


if __name__ == "__main__":
    build()
