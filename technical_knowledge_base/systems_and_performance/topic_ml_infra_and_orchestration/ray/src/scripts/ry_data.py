#!/usr/bin/env python3
"""Ray child page: a tiny Ray Data pipeline over the running example's text, streamed and then staged.

  docker exec mi-ray-head python /shared/ry/ry_data.py streaming|staged

The input is TinyShakespeare (the running example's /opt/mi/input.txt) cut into 24 chunks. Two map stages
stand in for real preprocessing: "encode" (characters to ids, 0.3 s of pretend work per block) and "window"
(cut into 64-character training samples, 0.2 s per block). The consumer is a pretend training loop that
takes 0.1 s per batch. Every stage appends one line per block to /shared/ry/out/data_<mode>.log (host, pid,
start, end), so the page can draw which block ran where and when. "staged" calls materialize() after the
first stage: the same work, bulk-synchronous instead of streaming. "streaming" lets Ray Data fuse the two map
stages into one task per block (same resources); "pipelined" asks window for num_cpus=0.5, which stops the fusion,
so two operators stream blocks to each other.
Rough timings: shared laptop, Docker Desktop VM.
"""
import json, os, socket, sys, time
import numpy as np
import ray

MODE = sys.argv[1]
OUT = "/shared/ry/out"
LOG = os.path.join(OUT, f"data_{MODE}.log")
if os.path.exists(LOG):
    os.remove(LOG)
ray.init(address="auto", logging_level="ERROR", log_to_driver=False)
ctx = ray.data.DataContext.get_current()
ctx.enable_progress_bars = False
ctx.verbose_stats_logs = False

text = open("/opt/mi/input.txt").read()
chars = sorted(set(text))
NCH = 24
size = len(text) // NCH + 1
items = [{"chunk": i, "text": text[i * size:(i + 1) * size]} for i in range(NCH)]


def note(stage, i, t0):
    with open(LOG, "a") as f:
        f.write(json.dumps({"stage": stage, "block": int(i), "host": socket.gethostname(), "pid": os.getpid(),
                            "s": round(t0, 4), "e": round(time.time(), 4)}) + "\n")


def encode(batch):
    t0 = time.time()
    stoi = {c: k for k, c in enumerate(chars)}
    ids = [np.array([stoi[c] for c in s], dtype=np.int16) for s in batch["text"]]
    time.sleep(0.3)
    note("encode", batch["chunk"][0], t0)
    return {"chunk": batch["chunk"], "ids": np.array(ids, dtype=object)}


def window(batch):
    t0 = time.time()
    out_x, out_c = [], []
    for c, ids in zip(batch["chunk"], batch["ids"]):
        n = (len(ids) - 1) // 64
        out_x.append(np.asarray(ids[: n * 64]).reshape(n, 64))
        out_c.append(np.full(n, c))
    time.sleep(0.2)
    note("window", batch["chunk"][0], t0)
    return {"chunk": np.concatenate(out_c), "x": np.concatenate(out_x)}


T0 = time.time()
ds = ray.data.from_items(items, override_num_blocks=NCH)
ds = ds.map_batches(encode, batch_size=1)
if MODE == "staged":
    ds = ds.materialize()
    print(json.dumps({"ev": "materialized", "t": round(time.time() - T0, 3)}), flush=True)
if MODE == "pipelined":
    ds = ds.map_batches(window, batch_size=1, num_cpus=0.5)  # different resources: not fused with encode
else:
    ds = ds.map_batches(window, batch_size=1)
first = None
rows = 0
nb = 0
for b in ds.iter_batches(batch_size=512, batch_format="numpy"):
    if first is None:
        first = time.time() - T0
    rows += len(b["x"])
    nb += 1
    t = time.time()
    time.sleep(0.1)  # a pretend training step
    with open(LOG, "a") as f:
        f.write(json.dumps({"stage": "train", "block": nb - 1, "host": "ray-head (driver)", "pid": os.getpid(),
                            "s": round(t, 4), "e": round(time.time(), 4), "rows": int(len(b["x"]))}) + "\n")
total = time.time() - T0
print(json.dumps({"ev": "done", "mode": MODE, "t0": round(T0, 4), "first_batch_s": round(first, 3), "total_s": round(total, 3),
                  "rows": rows, "batches": nb, "blocks": NCH}), flush=True)
print("STATS_BEGIN", flush=True)
print(ds.stats(), flush=True)
print("STATS_END", flush=True)
