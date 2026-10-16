#!/usr/bin/env python3
"""Storage lab: reading training data from a local volume and from an S3-compatible store.

The data: 64 MiB of the running example's token ids (TinyShakespeare characters as uint16, repeated),
stored two ways: 16 shards of 4 MiB, or 16,384 files of 4 KiB (the same bytes).
Measures, on each store:
  read_all   : read every byte, one request at a time and with 16 threads in parallel
  prefetch   : a training loop that needs one 4 MiB shard per step and computes for --step-ms per step
               (a sleep standing in for the GPU), reading each shard when needed (no prefetch) or
               keeping 2 shards in flight in a background thread (prefetch)
usage (inside a container on the store's network): data_read.py --text /opt/mi/input.txt --dir /vol/io_data --endpoint http://io-s3:8333
"""
import argparse, json, os, time
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import boto3, botocore

MiB = 1 << 20


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text", required=True); ap.add_argument("--dir", required=True); ap.add_argument("--endpoint", required=True)
    ap.add_argument("--step-ms", type=float, default=100); ap.add_argument("--bucket", default="io-data")
    a = ap.parse_args()
    text = open(a.text, encoding="utf-8").read()
    chars = sorted(set(text)); stoi = {c: i for i, c in enumerate(chars)}
    ids = np.array([stoi[c] for c in text], dtype=np.uint16)
    total = 64 * MiB
    blob = np.resize(ids, total // 2).tobytes()
    layouts = {"big": (16, 4 * MiB), "small": (16384, 4096)}
    s3 = boto3.client("s3", endpoint_url=a.endpoint, aws_access_key_id="lab", aws_secret_access_key="lab", region_name="us-east-1",
                      config=botocore.config.Config(s3={"addressing_style": "path"}, max_pool_connections=32))
    try: s3.create_bucket(Bucket=a.bucket)
    except Exception: pass

    def emit(**kw): print(json.dumps(kw), flush=True)

    # write both layouts to both stores (timed too: creating 16,384 objects is itself the small-files problem)
    for lay, (n, sz) in layouts.items():
        d = os.path.join(a.dir, lay); os.makedirs(d, exist_ok=True)
        t = time.perf_counter()
        for i in range(n):
            with open(os.path.join(d, f"{i:05d}.bin"), "wb") as f: f.write(blob[i * sz:(i + 1) * sz])
        os.sync(); tl = time.perf_counter() - t
        t = time.perf_counter()
        with ThreadPoolExecutor(16) as ex:
            list(ex.map(lambda i: s3.put_object(Bucket=a.bucket, Key=f"{lay}/{i:05d}.bin", Body=blob[i * sz:(i + 1) * sz]), range(n)))
        ts = time.perf_counter() - t
        emit(test="write", layout=lay, files=n, file_bytes=sz, local_s=round(tl, 3), s3_16threads_s=round(ts, 3))

    def drop(path):
        fd = os.open(path, os.O_RDONLY)
        try: os.posix_fadvise(fd, 0, 0, os.POSIX_FADV_DONTNEED)
        finally: os.close(fd)

    def rd_local(lay, i):
        p = os.path.join(a.dir, lay, f"{i:05d}.bin")
        with open(p, "rb") as f: return len(f.read())

    def rd_s3(lay, i):
        return len(s3.get_object(Bucket=a.bucket, Key=f"{lay}/{i:05d}.bin")["Body"].read())

    for rep in range(3):
        for lay, (n, sz) in layouts.items():
            for store, fn in (("local", rd_local), ("s3", rd_s3)):
                for par in (1, 16):
                    if store == "local":
                        for i in range(n): drop(os.path.join(a.dir, lay, f"{i:05d}.bin"))
                    t = time.perf_counter()
                    if par == 1: got = sum(fn(lay, i) for i in range(n))
                    else:
                        with ThreadPoolExecutor(par) as ex: got = sum(ex.map(lambda i: fn(lay, i), range(n)))
                    dt = time.perf_counter() - t
                    emit(test="read_all", rep=rep, layout=lay, store=store, threads=par, files=n, bytes=got,
                         s=round(dt, 4), MBps=round(got / dt / 1e6, 1), per_file_ms=round(dt / n * 1000 * par, 3))

    # prefetch: one shard per step
    n, sz = layouts["big"]
    for rep in range(3):
        for store, fn in (("local", rd_local), ("s3", rd_s3)):
            for mode in ("none", "prefetch2"):
                if store == "local":
                    for i in range(n): drop(os.path.join(a.dir, "big", f"{i:05d}.bin"))
                stall = 0.0; t0 = time.perf_counter(); steps = []
                if mode == "none":
                    for i in range(n):
                        t = time.perf_counter(); fn("big", i); w = time.perf_counter() - t; stall += w
                        time.sleep(a.step_ms / 1000); steps.append(round(w * 1000, 1))
                else:
                    with ThreadPoolExecutor(2) as ex:
                        futs = [ex.submit(fn, "big", i) for i in range(min(2, n))]
                        for i in range(n):
                            t = time.perf_counter(); futs[i].result(); w = time.perf_counter() - t; stall += w
                            if i + 2 < n: futs.append(ex.submit(fn, "big", i + 2))
                            time.sleep(a.step_ms / 1000); steps.append(round(w * 1000, 1))
                dt = time.perf_counter() - t0
                emit(test="prefetch", rep=rep, store=store, mode=mode, steps=n, step_ms=a.step_ms, total_s=round(dt, 3),
                     stall_s=round(stall, 3), wait_ms_per_step=steps)


if __name__ == "__main__":
    main()
