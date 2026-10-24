#!/usr/bin/env python3
"""The page embeds exactly runs/out/sd_data.json; numbers quoted in prose appear in the page and agree with the data
(recompute.py checks the arithmetic); privacy grep over the page folder. usage: python3 -I check/check_embed.py (from src/)"""
import json, math, os, re, sys
r0 = lambda x: "{:,.0f}".format(math.floor(x + 0.5))
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.dirname(HERE); PAGE = os.path.dirname(SRC)
html = open(os.path.join(PAGE, "index.html"), encoding="utf-8").read()
D = json.load(open(os.path.join(SRC, "runs", "out", "sd_data.json")))
m = re.search(r"window\.SD=(\{.*?\});\n", html, re.S)
fail = 0
def ok(c, msg):
    global fail
    print(("ok   " if c else "FAIL ") + msg); fail += 0 if c else 1
ok(m is not None and json.loads(m.group(1)) == D, "page embeds exactly runs/out/sd_data.json")
T = D["tpfs"]; f1 = lambda x: "%.1f" % x
prose = {  # literal in the HTML -> value from the data
    "22.2 MB/s": f1(T["stripe"]["1"]["write_MBps"]) + " MB/s", "44.8 with 2": f1(T["stripe"]["2"]["write_MBps"]) + " with 2",
    "88.7 with 4": f1(T["stripe"]["4"]["write_MBps"]) + " with 4", "88.9 MB/s for four files": f1(T["nproc"]["fpp_balanced"]["MBps"]) + " MB/s for four files",
    "97.8 MB/s for one file": f1(T["nproc"]["shared_c4"]["MBps"]) + " MB/s for one file", "25.0 and 24.9 MB/s": f1(T["nproc"]["fpp_ost0"]["MBps"]) + " and " + f1(T["nproc"]["shared_c1"]["MBps"]) + " MB/s",
    "2,635 operations per second against 1,603": r0(T["meta"]["2_16"]["ops_per_s"]) + " operations per second against " + r0(T["meta"]["1_16"]["ops_per_s"]),
    "17,983 file-system calls": "{:,.0f} file-system calls".format(D["import"]["import torch"]["total_calls"]),
    "652 failed lookups": "{:,.0f} failed lookups".format(D["import"]["import torch"]["total_errors"]),
    "(363 to 477 MB/s)": "(%s to %s MB/s)" % (r0(D["multipart"]["download_8_1"]["MBps"]), r0(D["multipart"]["download_8_8"]["MBps"])),
    "(80 to 112 MB/s)": "({:.0f} to {:.0f} MB/s)".format(D["multipart"]["upload_8_1"]["MBps"], D["multipart"]["upload_8_8"]["MBps"]),
    "after 16 uploads": "after %d uploads" % D["multipart_try1"]["uploads_before_error"],
    "0.49 s to": "%.2f s to" % D["semantics"]["rename"]["copy_delete_s"], "0.66 s to upload": "%.2f s to upload" % D["semantics"]["rename"]["put_s"],
    "4 ranks to 3 read 1.50 times": "4 ranks to 3 read %.2f times" % D["load_amp"]["3"], "4 to 2 read 1.00 times": "4 to 2 read %.2f times" % D["load_amp"]["2"],
    "1,386,049 bytes": "1,386,049 bytes", "25,319,489-parameter": "{:,}-parameter".format(D["dcp"]["params"]),
}
for lit, want in prose.items():
    ok(lit in html and lit == want, "prose %r present and equal to data %r" % (lit, want))
# privacy
pat = re.compile(r"/Users/|Users-|" + re.escape(__import__("getpass").getuser()) + r"|glpat|sk-ant|scratchpad|private/tmp|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}|\b(?:\d{1,3}\.){3}\d{1,3}\b")
hits = []
for root, dirs, files in os.walk(PAGE):
    if ".shots" in root: continue
    for fn in files:
        p = os.path.join(root, fn)
        if fn.endswith((".png", ".pyc")) or fn == "check_embed.py": continue
        try: s = open(p, encoding="utf-8").read()
        except Exception: continue
        for mm in pat.finditer(s):
            if mm.group(0) in ("19.5.1.1", "19.3.1.2", "0.0.0.0"): continue  # manual section numbers and the bind-all address
            hits.append((os.path.relpath(p, PAGE), mm.group(0)))
# the root Storage lab's charts drawn here since 2026-10-19 read the root's recorded data unchanged (single source)
_m = re.search(r"window\.IO_D=(\{.*?\});\n", html, re.S)
_ref = json.load(open(os.path.join(SRC, "..", "..", "src", "io", "out", "io_data.json"))); _ref["anatomy"].pop("entry_names_sample", None)
ok(_m is not None and json.loads(_m.group(1)) == _ref, "page embeds the root's src/io/out/io_data.json exactly (window.IO_D)")
for _id in ("io-tiers-card", "io-anat-bar", "io-scale-rows", "io-lay-card", "io-as-card", "io-pf-card", "io-errs"):
    ok('id="' + _id + '"' in html, "moved chart present: " + _id)
ok(not hits, "privacy grep clean " + str(hits[:8]))
big = [(fn, os.path.getsize(os.path.join(r, fn))) for r, _, fs in os.walk(PAGE) for fn in fs if os.path.getsize(os.path.join(r, fn)) > 1_000_000 and ".shots" not in r]
ok(not big, "no file over 1 MB " + str(big))
print("FAILED %d" % fail if fail else "all embed checks passed"); sys.exit(1 if fail else 0)
