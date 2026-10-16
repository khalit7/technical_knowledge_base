#!/usr/bin/env python3
"""Every derived number on the page, recomputed; the sizing model size() that parts/32_js_sd_size.js must equal;
writes out/size_cases.json (inputs and outputs the UI check compares against the page's JS).
usage: python3 -I recompute.py   (from anywhere; stdlib only)"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, "runs", "out", "sd_data.json")))
TiB = 2 ** 40


def size(x):
    S = x["p"] * 1e9 * x["bpp"]; nodes = math.ceil(x["g"] / x["gn"])
    W = S / (x["stall"] if x["mode"] == "sync" else x["int"] * 60); R = S / x["rest"]
    data = x["tok"] * 1e12 * x["bpt"] / (x["days"] * 86400); M = x["g"] * x["mc"] / x["st"]
    cap = x["k"] * S + x["ds"] * 1e12
    return {"S": S, "nodes": nodes, "W": W, "R": R, "Wn": W / nodes, "data": data, "M": M, "cap": cap,
            "drain": S / (x["bw"] * 1e9), "s3_month_k": x["k"] * S / 1e9 * 0.023}


checks = []
def chk(name, got, want, tol=0.005):
    ok = abs(got - want) <= tol * max(1, abs(want)); checks.append((ok, name, got, want)); return got

# sizing presets and the prose numbers they back
P70 = dict(p=70, bpp=14, g=1024, gn=8, mode="async", stall=30, int=30, rest=60, k=10, bw=80, tok=2, days=30, bpt=4, ds=50, mc=652, st=60)
s = size(P70)
chk("70B checkpoint TB", s["S"] / 1e12, 0.98)
chk("70B async GB/s", s["W"] / 1e9, 0.544, 0.01)
chk("70B sync 30 s GB/s", size(dict(P70, mode="sync"))["W"] / 1e9, 32.67, 0.01)
chk("70B restore 60 s GB/s", s["R"] / 1e9, 16.33, 0.01)
tib = size(dict(P70, mode="sync"))["W"] / 125e6
chk("FSx-125 TiB for 32.7 GB/s", tib, 261.3, 0.01)
chk("FSx-125 cost per month", tib * 1024 * 0.145, 38803, 0.01)
P405 = dict(P70, p=405, g=16384, mode="sync", bw=2000)
s4 = size(P405)
chk("405B checkpoint TB", s4["S"] / 1e12, 5.67)
chk("405B MB per GPU", s4["S"] / 16384 / 1e6, 346, 0.01)
chk("405B stall at 2 TB/s", s4["drain"], 2.835, 0.01)
# MLPerf Storage v2.0 Table 2 bytes per parameter
chk("MLPerf 70B B/param", 912e9 / 70e9, 13.03, 0.01)
chk("MLPerf 405B B/param", 5.29e12 / 405e9, 13.06, 0.01)
# start-up storm
imp = D["import"]["import torch"]
chk("import torch calls", imp["total_calls"], 17983, 0); chk("import torch failed", imp["total_errors"], 652, 0)
chk("16,384 x 652 / 3,000 s", 16384 * imp["total_errors"] / 3000, 3561, 0.001)
chk("all calls hours", 16384 * imp["total_calls"] / 3000 / 3600, 27.3, 0.01)
chk("FSx 1,200 GiB opens/s", D["prices"]["fsx_metadata"]["auto_metadata_iops"]["1200GiB"] * 2, 3000, 0)
# object store arithmetic
chk("prefix write overload", 16384 / 3500, 4.68, 0.01)
chk("1M PUT dollars", 1e6 * D["prices"]["s3_put_per_1000"] / 1000, 5.0, 0)
chk("1M x 4 KiB storage GB", 1e6 * 4096 / 1e9, 4.1, 0.01)
chk("405B to us-west-2 dollars", 5.29e12 / 1e9 * 0.02, 106, 0.01)
chk("405B out to internet dollars", 5.29e12 / 1e9 * 0.09, 476, 0.01)
chk("5.29 TB over 100 Gb/s s", 5.29e12 / 12.5e9, 423, 0.01)
chk("100 TB over 100 Gb/s h", 100e12 / 12.5e9 / 3600, 2.2, 0.02)
chk("3FS line rate TB/s", 180 * 2 * 200e9 / 8 / 1e12, 9.0, 0)
chk("6.6 TiB/s in TB/s", 6.6 * TiB / 1e12, 7.26, 0.01)
# measured numbers quoted in prose
T = D["tpfs"]
for c, v in (("1", 22.2), ("2", 44.8), ("4", 88.7)): chk("stripe %s MB/s" % c, T["stripe"][c]["write_MBps"], v, 0.001)
for m, v in (("fpp_balanced", 88.9), ("shared_c4", 97.8), ("fpp_ost0", 25.0), ("shared_c1", 24.9)): chk(m, T["nproc"][m]["MBps"], v, 0.001)
chk("toy 1 MDS 16 clients", T["meta"]["1_16"]["ops_per_s"], 1603, 0.001)
chk("toy 2 MDS 16 clients", T["meta"]["2_16"]["ops_per_s"], 2635, 0.001)
chk("4->3 read amplification", D["load_amp"]["3"], 1.50, 0.01)
chk("4->2 read amplification", D["load_amp"]["2"], 1.00, 0.01)
mp = D["multipart"]
for k, v in (("upload_8_1", 80), ("upload_8_8", 112), ("download_8_1", 363), ("download_8_8", 477)): chk(k, mp[k]["MBps"], v, 0.01)
chk("rename put s", D["semantics"]["rename"]["put_s"], 0.66, 0.01); chk("rename copy s", D["semantics"]["rename"]["copy_delete_s"], 0.49, 0.01)
chk("multipart try1 uploads", D["multipart_try1"]["uploads_before_error"], 16, 0)
chk("dcp entries", D["dcp"]["n_entries"], 408, 0)

cases = []
for over in ({}, {"mode": "sync"}, {"p": 405, "g": 16384, "bw": 2000}, {"p": 0.000112577, "bpp": 12.31, "g": 4, "gn": 2, "k": 3},
             {"mc": 0}, {"mc": 17983, "g": 2048, "st": 30}, {"int": 5, "rest": 300, "ds": 0}, {"bpp": 2, "gn": 4, "tok": 15, "days": 54}):
    x = dict(P70, **over)
    o = size(x); cases.append({"in": x, "out": {k: v for k, v in o.items()}})
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
json.dump(cases, open(os.path.join(HERE, "out", "size_cases.json"), "w"), indent=1)
bad = [c for c in checks if not c[0]]
for ok, n, g, w in checks: print(("ok   " if ok else "FAIL ") + "%s: %.4g (page %.4g)" % (n, g, w))
print("%d checks, %d failed; %d sizing cases written" % (len(checks), len(bad), len(cases)))
raise SystemExit(1 if bad else 0)
