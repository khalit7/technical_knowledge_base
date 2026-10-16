#!/usr/bin/env python3
"""Object storage semantics and throughput, on SeaweedFS (S3 gateway and filer), from a container on its network.

  chunkmap   upload one 64 MiB file through the filer and print where its chunks live (filer metadata + master lookup)
  multipart  one 256 MiB object uploaded with boto3 at several part sizes and concurrencies; downloaded with ranged GETs
  list       5,000 keys under one prefix, listed with ListObjectsV2 (1,000 keys per page): requests and time
  semantics  conditional create (If-None-Match: *), "rename" by copy + delete, a too-small multipart part,
             read-after-write and overwrite visibility; records the real responses
Prints JSON lines.
"""
import argparse, io, json, os, sys, time, urllib.request

import boto3, botocore
from boto3.s3.transfer import TransferConfig

MiB = 1 << 20


def client(ep):
    return boto3.client("s3", endpoint_url=ep, aws_access_key_id="lab", aws_secret_access_key="lab", region_name="us-east-1",
                        config=botocore.config.Config(retries={"max_attempts": 1}))


def ensure(s3, b):
    try: s3.create_bucket(Bucket=b)
    except Exception: pass


def chunkmap(a):
    data = os.urandom(64 * MiB)
    url = a.filer + "/sd/chunkmap.bin?maxMB=4"
    req = urllib.request.Request(url, data=data, method="PUT"); t0 = time.time(); urllib.request.urlopen(req).read(); tw = time.time() - t0
    meta = json.loads(urllib.request.urlopen(a.filer + "/sd/chunkmap.bin?metadata=true").read())
    chunks = meta.get("chunks") or meta.get("Chunks") or []
    out = []
    vols = {}
    for c in chunks:
        fid = c.get("file_id") or c.get("fileId") or ""
        vid = fid.split(",")[0]
        if vid not in vols:
            lk = json.loads(urllib.request.urlopen(a.master + "/dir/lookup?volumeId=" + vid).read())
            vols[vid] = [l["url"] for l in lk.get("locations", [])]
        out.append({"offset": int(c.get("offset", 0)), "size": int(c.get("size", 0)), "fid": fid, "volume": vid, "servers": vols[vid]})
    print(json.dumps({"exp": "chunkmap", "bytes": len(data), "write_s": round(tw, 3), "n_chunks": len(out), "chunks": out,
                      "meta_keys": sorted(meta.keys())}), flush=True)


def multipart(a):
    s3 = client(a.s3); ensure(s3, a.bucket)
    body = os.urandom(256 * MiB)
    def vacuum():  # deleted needles keep their space until the master vacuums the volumes
        s3.delete_object(Bucket=a.bucket, Key="mp/obj")
        urllib.request.urlopen(a.master + "/vol/vacuum?garbageThreshold=0.01", timeout=120).read()
    for part in (8, 64):
        for conc in (1, 8):
            for rep in range(a.reps):
                cfg = TransferConfig(multipart_threshold=1 * MiB, multipart_chunksize=part * MiB, max_concurrency=conc, use_threads=conc > 1)
                t0 = time.time(); s3.upload_fileobj(io.BytesIO(body), a.bucket, "mp/obj", Config=cfg); tu = time.time() - t0
                print(json.dumps({"exp": "upload", "part_mib": part, "conc": conc, "rep": rep, "bytes": len(body), "s": round(tu, 4),
                                  "parts": (len(body) + part * MiB - 1) // (part * MiB)}), flush=True)
                vacuum()
    s3.upload_fileobj(io.BytesIO(body), a.bucket, "mp/obj", Config=TransferConfig(multipart_chunksize=8 * MiB, max_concurrency=8))
    for conc in (1, 8):
        for rep in range(a.reps):
            cfg = TransferConfig(multipart_threshold=1 * MiB, multipart_chunksize=8 * MiB, max_concurrency=conc, use_threads=conc > 1)
            buf = io.BytesIO(); t0 = time.time(); s3.download_fileobj(a.bucket, "mp/obj", buf, Config=cfg); td = time.time() - t0
            assert buf.getbuffer().nbytes == len(body)
            print(json.dumps({"exp": "download", "range_mib": 8, "conc": conc, "rep": rep, "bytes": len(body), "s": round(td, 4)}), flush=True)
    vacuum()


def listing(a):
    s3 = client(a.s3); ensure(s3, a.bucket)
    from concurrent.futures import ThreadPoolExecutor
    keys = ["ls/shard-%05d.bin" % i for i in range(5000)]
    with ThreadPoolExecutor(8) as ex: list(ex.map(lambda k: s3.put_object(Bucket=a.bucket, Key=k, Body=b""), keys))
    for rep in range(a.reps):
        t0 = time.time(); n = 0; reqs = 0; tok = None
        while True:
            kw = dict(Bucket=a.bucket, Prefix="ls/")
            if tok: kw["ContinuationToken"] = tok
            r = s3.list_objects_v2(**kw); reqs += 1; n += r.get("KeyCount", 0)
            if not r.get("IsTruncated"): break
            tok = r["NextContinuationToken"]
        print(json.dumps({"exp": "list", "rep": rep, "keys": n, "requests": reqs, "s": round(time.time() - t0, 4),
                          "max_keys_default": r.get("MaxKeys")}), flush=True)
    with ThreadPoolExecutor(8) as ex: list(ex.map(lambda k: s3.delete_object(Bucket=a.bucket, Key=k), keys))


def err(e):
    if isinstance(e, botocore.exceptions.ClientError):
        r = e.response; return {"http": r["ResponseMetadata"]["HTTPStatusCode"], "code": r["Error"].get("Code"), "message": r["Error"].get("Message")}
    return {"exception": type(e).__name__, "message": str(e)[:300]}


def semantics(a):
    s3 = client(a.s3); ensure(s3, a.bucket); res = {}
    # 1. conditional create: the object store's "create only if absent"
    try: s3.delete_object(Bucket=a.bucket, Key="sem/marker")
    except Exception: pass
    r = []
    for i in range(2):
        try: s3.put_object(Bucket=a.bucket, Key="sem/marker", Body=b"run-%d" % i, IfNoneMatch="*"); r.append({"ok": True})
        except Exception as e: r.append(err(e))
    res["if_none_match"] = r
    res["marker_now"] = s3.get_object(Bucket=a.bucket, Key="sem/marker")["Body"].read().decode()
    # 2. read-after-write and overwrite
    s3.put_object(Bucket=a.bucket, Key="sem/latest", Body=b"step_000100"); v1 = s3.get_object(Bucket=a.bucket, Key="sem/latest")["Body"].read().decode()
    s3.put_object(Bucket=a.bucket, Key="sem/latest", Body=b"step_000150"); v2 = s3.get_object(Bucket=a.bucket, Key="sem/latest")["Body"].read().decode()
    res["read_after_write"] = [v1, v2]
    # 3. rename = copy + delete, timed against the PUT of the same 64 MiB object
    body = os.urandom(64 * MiB)
    cfg = TransferConfig(multipart_threshold=8 * MiB, multipart_chunksize=8 * MiB, max_concurrency=8)
    t0 = time.time(); s3.upload_fileobj(io.BytesIO(body), a.bucket, "sem/ckpt.tmp", Config=cfg); tput = time.time() - t0
    t0 = time.time(); s3.copy({"Bucket": a.bucket, "Key": "sem/ckpt.tmp"}, a.bucket, "sem/ckpt", Config=cfg); s3.delete_object(Bucket=a.bucket, Key="sem/ckpt.tmp"); tren = time.time() - t0
    res["rename"] = {"bytes": len(body), "put_s": round(tput, 3), "copy_delete_s": round(tren, 3)}
    # 4. a multipart upload whose first part is 1 MiB (S3's minimum for every part but the last is 5 MiB)
    up = s3.create_multipart_upload(Bucket=a.bucket, Key="sem/small_parts")["UploadId"]; parts = []
    for n in (1, 2):
        e = s3.upload_part(Bucket=a.bucket, Key="sem/small_parts", UploadId=up, PartNumber=n, Body=os.urandom(1 * MiB)); parts.append({"PartNumber": n, "ETag": e["ETag"]})
    try: s3.complete_multipart_upload(Bucket=a.bucket, Key="sem/small_parts", UploadId=up, MultipartUpload={"Parts": parts}); res["small_part"] = {"ok": True}
    except Exception as e: res["small_part"] = err(e)
    # 5. an incomplete multipart upload: invisible as an object, but listed as an upload (and billed on AWS)
    up2 = s3.create_multipart_upload(Bucket=a.bucket, Key="sem/abandoned")["UploadId"]
    s3.upload_part(Bucket=a.bucket, Key="sem/abandoned", UploadId=up2, PartNumber=1, Body=os.urandom(5 * MiB))
    try: s3.head_object(Bucket=a.bucket, Key="sem/abandoned"); res["abandoned_head"] = {"ok": True}
    except Exception as e: res["abandoned_head"] = err(e)
    ups = s3.list_multipart_uploads(Bucket=a.bucket, Prefix="sem/").get("Uploads", [])
    res["abandoned_listed"] = [u["Key"] for u in ups]
    s3.abort_multipart_upload(Bucket=a.bucket, Key="sem/abandoned", UploadId=up2)
    # 6. a missing key
    try: s3.get_object(Bucket=a.bucket, Key="sem/nope")
    except Exception as e: res["missing"] = err(e)
    print(json.dumps({"exp": "semantics", **res}), flush=True)
    for k in ("sem/marker", "sem/latest", "sem/ckpt", "sem/small_parts"):
        try: s3.delete_object(Bucket=a.bucket, Key=k)
        except Exception: pass


def strange(a):
    """One tensor out of a safetensors checkpoint on the object store, by byte ranges, against downloading the file."""
    import struct
    s3 = client(a.s3); ensure(s3, a.bucket)
    src = "/fmt/model.safetensors"; size = os.path.getsize(src)
    s3.upload_file(src, a.bucket, "st/model.safetensors", Config=TransferConfig(multipart_chunksize=8 * MiB, max_concurrency=8))
    want = "blocks.0.qkv.weight"; res = {"exp": "range", "file_bytes": size, "tensor": want, "reps": []}
    for rep in range(a.reps):
        t0 = time.time(); reqs = 0; moved = 0
        b = s3.get_object(Bucket=a.bucket, Key="st/model.safetensors", Range="bytes=0-7")["Body"].read(); reqs += 1; moved += len(b)
        hl = struct.unpack("<Q", b)[0]
        h = s3.get_object(Bucket=a.bucket, Key="st/model.safetensors", Range="bytes=8-%d" % (8 + hl - 1))["Body"].read(); reqs += 1; moved += len(h)
        hdr = json.loads(h); lo, hi = hdr[want]["data_offsets"]
        t = s3.get_object(Bucket=a.bucket, Key="st/model.safetensors", Range="bytes=%d-%d" % (8 + hl + lo, 8 + hl + hi - 1))["Body"].read(); reqs += 1; moved += len(t)
        tr = time.time() - t0
        assert len(t) == hi - lo
        t0 = time.time(); full = s3.get_object(Bucket=a.bucket, Key="st/model.safetensors")["Body"].read(); tf = time.time() - t0
        res["reps"].append({"range_s": round(tr, 4), "range_requests": reqs, "range_bytes": moved, "full_s": round(tf, 4), "full_bytes": len(full)})
        res.update({"header_len": hl, "dtype": hdr[want]["dtype"], "shape": hdr[want]["shape"], "data_offsets": [lo, hi]})
    s3.delete_object(Bucket=a.bucket, Key="st/model.safetensors")
    print(json.dumps(res), flush=True)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("exp")
    ap.add_argument("--s3", default="http://sd-sw-f:8333"); ap.add_argument("--filer", default="http://sd-sw-f:8888")
    ap.add_argument("--master", default="http://sd-sw-m:9333"); ap.add_argument("--bucket", default="sd-lab"); ap.add_argument("--reps", type=int, default=3)
    a = ap.parse_args()
    {"chunkmap": chunkmap, "multipart": multipart, "list": listing, "semantics": semantics, "strange": strange}[a.exp](a)


if __name__ == "__main__":
    main()
