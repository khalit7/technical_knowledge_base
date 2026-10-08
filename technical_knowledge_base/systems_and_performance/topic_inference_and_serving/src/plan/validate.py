"""How much the simulated latencies move with the random arrivals: the planner simulates 3,000 requests with one
fixed seed; this reruns the calibration operating points and the running example with five seeds and records
the spread. Writes out/validate.json."""
import json, os
from plan import *
from calibrate import CASES as CAL, PUB
import json as _j

H = os.path.dirname(os.path.abspath(__file__))
FITS = _j.load(open(os.path.join(H, "out", "calib.json")))["fits"]
POINTS = [
    ("Llama 3.1 8B, H100, vLLM, 39.56 req/s", dict(CAL["h100_srv"], eff_c=FITS["h100"]["eff_c"], tovh=FITS["h100"]["tovh"]), PUB["h100_srv_qps"]),
    ("Llama 3.1 8B, L40S, vLLM, 9.36 req/s", dict(CAL["l40s_srv"], eff_c=FITS["l40s"]["eff_c"], tovh=FITS["l40s"]["tovh"]), PUB["l40s_srv_qps"]),
    ("Llama 3.1 8B, H200, TensorRT-LLM, 62.9 req/s", dict(CAL["h200_srv"], eff_c=FITS["h200"]["eff_c"], tovh=FITS["h200"]["tovh"]), PUB["h200_srv_qps"]),
    ("Running example, 70B on H200, 2 req/s", dict(DEFAULT, eff_c=FITS["h100"]["eff_c"], tovh=FITS["h100"]["tovh"]), 2.0),
]

if __name__ == "__main__":
    out = []
    for name, o, lam in POINTS:
        s = setup(o)
        runs = [simulate(o, s, lam, seed=sd) for sd in (7, 11, 23, 42, 99)]
        row = dict(name=name, lam=lam)
        for k in ("tpot", "ttft_p50", "ttft_p99"):
            v = [r[k] for r in runs]
            row[k] = dict(seed7=v[0], lo=min(v), hi=max(v))
        out.append(row)
        print(name, {k: (round(row[k]["lo"] * 1e3, 1), round(row[k]["hi"] * 1e3, 1)) for k in ("tpot", "ttft_p50", "ttft_p99")})
    json.dump(out, open(os.path.join(H, "out", "validate.json"), "w"), indent=1)
