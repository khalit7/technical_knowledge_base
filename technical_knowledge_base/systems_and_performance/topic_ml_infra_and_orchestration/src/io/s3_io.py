#!/usr/bin/env python3
"""Storage lab: the same checkpoints as ckpt_io.py, written to and read from an S3-compatible object store.

Write = torch.save into memory + upload (boto3 upload_fileobj: one PUT up to 8 MiB, multipart above, 10 threads,
boto3's defaults). The object exists only once the upload completes: there is no partial object to read, which
is the object store's version of train.py's write-then-rename. Read = download + torch.load.
The store here is SeaweedFS's S3 gateway in one container (MinIO's images could not be pulled on 2026-10-16).

usage: s3_io.py --train-py PATH --endpoint URL --label NAME [--sizes ex,m,l] [--reps 5]
"""
import argparse, importlib.util, io, json, time, platform
import boto3, botocore, torch
from boto3.s3.transfer import TransferConfig

SIZES = {"ex": (64, 2, 2), "m": (256, 4, 4), "l": (512, 8, 8)}


def load_train(path):
    spec = importlib.util.spec_from_file_location("mi_train", path)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod


def make_state(T, d, layers, heads):
    torch.manual_seed(1234)
    m = T.GPT(65, d, layers, heads, 64)
    opt = torch.optim.AdamW(m.parameters(), lr=3e-3)
    x = torch.randint(65, (8, 64))
    torch.nn.functional.cross_entropy(m(x).view(-1, 65), x.view(-1)).backward(); opt.step()
    return {"model": m.state_dict(), "opt": opt.state_dict(), "step": 1}, sum(p.numel() for p in m.parameters())


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--train-py", required=True); p.add_argument("--endpoint", required=True)
    p.add_argument("--label", required=True); p.add_argument("--sizes", default="ex,m,l")
    p.add_argument("--reps", type=int, default=5); p.add_argument("--bucket", default="io-ckpt")
    a = p.parse_args()
    torch.set_num_threads(2)
    T = load_train(a.train_py)
    s3 = boto3.client("s3", endpoint_url=a.endpoint, aws_access_key_id="lab", aws_secret_access_key="lab",
                      region_name="us-east-1", config=botocore.config.Config(s3={"addressing_style": "path"}))
    try: s3.create_bucket(Bucket=a.bucket)
    except Exception: pass
    cfg = TransferConfig()  # defaults: multipart threshold 8 MiB, part 8 MiB, 10 threads
    for sz in a.sizes.split(","):
        st, n = make_state(T, *SIZES[sz])
        for rep in range(a.reps):
            key = f"run1/step_000050.pt"
            t0 = time.perf_counter()
            buf = io.BytesIO(); torch.save(st, buf); nbytes = buf.tell(); buf.seek(0)
            t_ser = time.perf_counter()
            s3.upload_fileobj(buf, a.bucket, key, Config=cfg)
            t_w = time.perf_counter() - t0
            head = s3.head_object(Bucket=a.bucket, Key=key)
            t1 = time.perf_counter()
            out = io.BytesIO(); s3.download_fileobj(a.bucket, key, out, Config=cfg); out.seek(0)
            back = torch.load(out, map_location="cpu", weights_only=True)
            t_r = time.perf_counter() - t1
            ok = torch.equal(back["model"]["head.weight"], st["model"]["head.weight"])
            parts = head.get("ETag", "").strip('"').split("-")
            print(json.dumps({"label": a.label, "size": sz, "params": n, "bytes": nbytes, "rep": rep,
                              "write_s": round(t_w, 5), "save_s": round(t_ser - t0, 5), "upload_s": round(t_w - (t_ser - t0), 5),
                              "read_s": round(t_r, 5), "ok": ok, "multipart_parts": int(parts[1]) if len(parts) > 1 else 1,
                              "os": platform.system(), "torch": torch.__version__, "boto3": boto3.__version__}), flush=True)
            s3.delete_object(Bucket=a.bucket, Key=key)


if __name__ == "__main__":
    main()
