#!/usr/bin/env python3
"""Metadata storm on real stores: P processes, each in its own directory (or key prefix), run four phases
over N empty files, in lock step (a barrier between phases):
  create  open(O_CREAT|O_WRONLY|O_EXCL) + close    | S3: PUT of a 0-byte object
  stat    stat() of each file                      | S3: HEAD of each object
  miss    stat() of a name that does not exist      | S3: HEAD of a missing key (404)
            (what Python's import does for every directory on sys.path)
  unlink  unlink() of each file                    | S3: DELETE of each object
Prints one JSON line per (P, rep): aggregate operations per second per phase = P * N / (last end - first start).

usage: meta_real.py --dir /vol/meta --label volume [--procs 1,4,16] [--files 500] [--reps 3]
       meta_real.py --s3 http://sd-sw-f:8333 --label s3 ...
"""
import argparse, json, os, sys, time
from multiprocessing import Process, Barrier, Queue

PHASES = ("create", "stat", "miss", "unlink")


def fs_worker(i, a, P, rep, bar, q):
    d = os.path.join(a.dir, "p%d_r%d_%02d" % (P, rep, i)); os.makedirs(d, exist_ok=True)
    names = [os.path.join(d, "f%06d" % k) for k in range(a.files)]
    out = {}
    for ph in PHASES:
        bar.wait(); t0 = time.time()
        if ph == "create":
            for n in names: os.close(os.open(n, os.O_CREAT | os.O_WRONLY | os.O_EXCL, 0o644))
        elif ph == "stat":
            for n in names: os.stat(n)
        elif ph == "miss":
            for n in names:
                try: os.stat(n + ".missing")
                except FileNotFoundError: pass
        else:
            for n in names: os.unlink(n)
        out[ph] = (t0, time.time())
    os.rmdir(d); q.put(out)


def s3_worker(i, a, P, rep, bar, q):
    import boto3, botocore
    s3 = boto3.client("s3", endpoint_url=a.s3, aws_access_key_id="lab", aws_secret_access_key="lab", region_name="us-east-1",
                      config=botocore.config.Config(retries={"max_attempts": 1}))
    pre = "p%d_r%d_%02d/" % (P, rep, i); keys = [pre + "f%06d" % k for k in range(a.files)]
    out = {}
    for ph in PHASES:
        bar.wait(); t0 = time.time()
        if ph == "create":
            for k in keys: s3.put_object(Bucket=a.bucket, Key=k, Body=b"")
        elif ph == "stat":
            for k in keys: s3.head_object(Bucket=a.bucket, Key=k)
        elif ph == "miss":
            for k in keys:
                try: s3.head_object(Bucket=a.bucket, Key=k + ".missing")
                except botocore.exceptions.ClientError: pass
        else:
            for k in keys: s3.delete_object(Bucket=a.bucket, Key=k)
        out[ph] = (t0, time.time())
    q.put(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir"); ap.add_argument("--s3"); ap.add_argument("--bucket", default="sd-meta")
    ap.add_argument("--label", required=True); ap.add_argument("--procs", default="1,4,16")
    ap.add_argument("--files", type=int, default=500); ap.add_argument("--reps", type=int, default=3)
    a = ap.parse_args()
    if a.s3:
        import boto3
        s3 = boto3.client("s3", endpoint_url=a.s3, aws_access_key_id="lab", aws_secret_access_key="lab", region_name="us-east-1")
        try: s3.create_bucket(Bucket=a.bucket)
        except Exception: pass
    else:
        os.makedirs(a.dir, exist_ok=True)
    W = s3_worker if a.s3 else fs_worker
    for P in [int(x) for x in a.procs.split(",")]:
        for rep in range(a.reps):
            bar, q = Barrier(P), Queue()
            ps = [Process(target=W, args=(i, a, P, rep, bar, q)) for i in range(P)]
            for p in ps: p.start()
            res = [q.get() for _ in ps]
            for p in ps: p.join()
            rate = {}
            for ph in PHASES:
                t0 = min(r[ph][0] for r in res); t1 = max(r[ph][1] for r in res)
                rate[ph] = round(P * a.files / (t1 - t0), 1)
            print(json.dumps({"label": a.label, "procs": P, "rep": rep, "files_per_proc": a.files, "ops_per_s": rate}), flush=True)


if __name__ == "__main__":
    main()
