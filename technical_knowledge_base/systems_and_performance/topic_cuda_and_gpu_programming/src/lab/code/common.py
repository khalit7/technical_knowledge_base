"""Timing harness shared by the Kernel lab measurements (same method as the hardware root's Roofline lab:
warm up twice, then TRIALS timed trials of REPS calls each, timed with mx.eval + mx.synchronize;
median, min and max seconds per call, and the 1-minute load average, are recorded)."""
import os, time
import mlx.core as mx

TRIALS = 7


def timeit(fn, reps, trials=TRIALS):
    for _ in range(2):
        mx.eval(fn())
    mx.synchronize()
    ts = []
    for _ in range(trials):
        t0 = time.perf_counter()
        for _ in range(reps):
            mx.eval(fn())
        mx.synchronize()
        ts.append((time.perf_counter() - t0) / reps)
    ts.sort()
    return {"median_s": ts[len(ts) // 2], "min_s": ts[0], "max_s": ts[-1], "trials": trials, "reps": reps,
            "load": round(os.getloadavg()[0], 2)}


def kernel(name, inputs, outputs, src, header=""):
    return mx.fast.metal_kernel(name=name, input_names=inputs, output_names=outputs, source=src, header=header)
