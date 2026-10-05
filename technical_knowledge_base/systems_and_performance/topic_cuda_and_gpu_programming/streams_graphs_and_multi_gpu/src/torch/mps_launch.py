"""Eager PyTorch launch cost on the M1 Pro GPU (MPS backend), PyTorch 2.14.1: 200 dependent tiny ops
(x = x * a + b on 1,024 floats, 2 ops each), synchronising after every op pair versus once at the end.
Median of 7 trials; one JSON line per run."""
import json, os, statistics, sys, time
import torch

N, TRIALS = 200, 7
x0 = torch.zeros(1024, device="mps")


def step(sync_each):
    x = x0.clone(); torch.mps.synchronize()
    t = time.perf_counter()
    for _ in range(N):
        x = x * 1.0001 + 0.5
        if sync_each:
            torch.mps.synchronize()
    torch.mps.synchronize()
    return (time.perf_counter() - t) / N * 1e6, x[0].item()


if __name__ == "__main__":
    run, outdir = int(sys.argv[1]), sys.argv[2]
    step(True); step(False)
    res = dict(run=run, torch=torch.__version__, n=N)
    for name, s in (("sync_each", True), ("sync_once", False)):
        ts, vals = zip(*[step(s) for _ in range(TRIALS)])
        res[name] = dict(us_per_iter=statistics.median(ts), trials=list(ts), value=vals[0])
    res["load"] = os.getloadavg()
    with open(os.path.join(outdir, "mps_launch.jsonl"), "a") as fh:
        fh.write(json.dumps(res) + "\n")
    print(res["sync_each"]["us_per_iter"], res["sync_once"]["us_per_iter"], res["sync_each"]["value"], res["load"])
