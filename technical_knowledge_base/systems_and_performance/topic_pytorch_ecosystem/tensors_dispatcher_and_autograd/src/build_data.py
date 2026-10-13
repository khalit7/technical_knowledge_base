"""Embed the recorded inputs into the page: writes parts/22_tda_data.js (window.TDA).

Nothing is computed here except dropping fields the page does not use; check_data.py checks the embedding.
"""
import json
import os

H = os.path.dirname(os.path.abspath(__file__))


def J(n):
    p = os.path.join(H, "inputs", n)
    return json.load(open(p)) if os.path.exists(p) else None


ten = J("tensors.json")
dsp = J("dispatch.json")
eng = J("engine.json")
ag = J("autograd.json")
mod = J("module.json")
dl = J("dataloader.json")
src = J("sources.json")
tim = J("timing.json")
how = J("howto.json")

# engine: keep what the stepper draws
E = {}
for v in ["plain", "checkpoint"]:
    r = eng["cpu"][v]
    E["cpu_" + v] = {"nodes": r["nodes"], "order": r["order"], "ops": r["backward_ops"], "live": r["live_after_forward"],
                     "y": r["y_bytes"], "sim": r["simulated_order_matches"], "diff": r["max_grad_diff_vs_plain"], "caller": r["engine_thread_is_caller"]}
for v in ["plain", "offload"]:
    r = eng["mps"][v]
    E["mps_" + v] = {"nodes": r["nodes"], "order": r["order"], "dev": r["mps_bytes_after_forward"], "packed": r["n_packed"],
                     "packed_bytes": r["packed_bytes"], "sim": r["simulated_order_matches"], "diff": r["max_grad_diff_vs_plain"], "caller": r["engine_thread_is_caller"]}
E["mps_checkpoint_dev"] = eng["mps"]["checkpoint"]["mps_bytes_after_forward"]
E["config"] = eng["config"]

data = {"ten": ten, "dsp": dsp, "eng": E, "ag": ag, "mod": mod, "dl": dl, "src": src, "tim": tim, "how": how}
s = "window.TDA=" + json.dumps(data, separators=(",", ":"), ensure_ascii=True) + ";\n"
open(os.path.join(H, "parts", "22_tda_data.js"), "w").write(s)
print("22_tda_data.js", len(s), "bytes")
