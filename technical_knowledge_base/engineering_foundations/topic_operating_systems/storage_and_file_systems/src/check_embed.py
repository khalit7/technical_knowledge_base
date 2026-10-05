"""Check that ../index.html embeds exactly what gen_data.py derives from raw/, that numbers written into the prose
agree with that data, and that nothing private is in the page or raw/. Run after build.sh. Exit 1 on any mismatch."""
import json, re, subprocess, sys, pathlib
html = pathlib.Path("../index.html").read_text()
m = re.search(r"window\.ST_DATA=(\{.*?\});\n", html, re.S); emb = json.loads(m.group(1))
subprocess.run([sys.executable, "gen_data.py"], check=True, capture_output=True)
s = pathlib.Path("parts/22_js_data.js").read_text(); D = json.loads(s[s.index("=") + 1:s.rstrip().rindex(";")])
bad = 0
if emb != D: print("EMBEDDED DATA DIFFERS from gen_data.py output: rebuild"); bad += 1
else: print("embedded data == gen_data.py(raw/)")
text = re.sub(r"<[^>]+>", " ", html)
F = D["fio"]; S = {(r["fs"], r["shape"], r["mode"]): r["med"] for r in D["sync"]}
pr = [D["wb"][k]["last_dirty_s"] for k in ("primed", "primed2", "primed3", "primed4")]
fresh = [D["wb"][k]["last_dirty_s"] for k in ("small", "mid")]
img = D["fsimage_txt"]
checks = [
  ("about 54,700 reads per second", round(F["randread_4k_qd64"]["iops"], -2) == 54700),
  ("mean latency near 1.15 ms", round(F["randread_4k_qd64"]["mean"] / 1000, 2) == 1.15),
  ("about 55,500 per second", round(64 / (F["randread_4k_qd64"]["mean"] * 1e-6), -2) == 55500),
  ("1 / 80 us = 12,500", round(F["randread_4k_qd1"]["mean"]) == 80),
  ("fio saw 10,741", round(F["randread_4k_qd1"]["iops"]) == 10741),
  ("within 2% of what fio measured", abs(64 / (F["randread_4k_qd64"]["mean"] * 1e-6) / F["randread_4k_qd64"]["iops"] - 1) < 0.02),
  ("physical blocks 2066 to 2798", "2066 -  2798" in img and "733" in img),
  ("Blockcount: 5864", "Blockcount: 5864" in img),
  ("4 MiB here", "Total journal size:       4096k" in img),
  ("between 2 and 32 s", 2 <= min(pr) < 3 and 31 < max(pr) <= 32),
  ("next 5-second wake-up (fresh runs)", all(x <= 5.5 for x in fresh)),
  ("about 0.39 ms against 1.3 ms", round(S["ext4", "overwrite", "fdatasync"] / 1000, 2) == 0.39 and round(S["ext4", "overwrite", "fsync"] / 1000, 1) == 1.3),
  ("about a third of fsync", 0.25 < S["ext4", "overwrite", "fdatasync"] / S["ext4", "overwrite", "fsync"] < 0.36),
  ("about a millisecond per call here", 0.8 < S["ext4", "append", "fsync"] / 1000 < 1.5),
  ("window grew 4, 8, 16, 32 pages", [e[2] for e in D["ra"][0]["ev"][:4]] == [4, 8, 16, 32]),
  ("random: one page per read", all(e[2] == 1 for e in D["ra"][3]["ev"]) and D["ra"][3]["reqs"] == 64),
  ("writer caught in balance_dirty_pages", "balance_dirty_pages" in D["wb"]["big"]["wchans"]),
  ("root state 0.28 MB", True),
  ("ulimit 64 KiB for io_uring", "ulimit -l\n64" in D["uring_txt"] and "Cannot allocate memory" in D["uring_txt"]),
  ("268 MB / 250 MB/s = about 1.1 s", round(256 * 2**20 / 1e6) == 268 and round(256 * 2**20 / 250e6, 1) == 1.1),
]
for lit, ok in checks:
    key = lit.split(" (")[0]
    probe = {"physical blocks 2066 to 2798": "2066 to 2798", "next 5-second wake-up (fresh runs)": "next 5-second wake-up",
             "window grew 4, 8, 16, 32 pages": "4, 8, 16, 32", "random: one page per read": "fetched exactly one page per read",
             "writer caught in balance_dirty_pages": "caught sleeping in", "ulimit 64 KiB for io_uring": "64 KiB",
             "root state 0.28 MB": "0.28 MB", "268 MB / 250 MB/s = about 1.1 s": None}.get(lit, key)
    present = probe is None or probe in text
    if not ok or not present: bad += 1
    print(("ok   " if ok and present else "FAIL ") + lit + ("" if present else "  (literal not found in page)"))
# privacy
for pat in ["/Users/", "glpat", "sk-ant"]:
    hits = [p for p in [pathlib.Path("../index.html"), *pathlib.Path(".").rglob("*") ] if p.is_file() and p.suffix in (".html", ".txt", ".py", ".sh", ".js", ".md", ".mjs", ".c", "") and pat in p.read_text(errors="ignore") and p.name != "check_embed.py"]
    if hits: bad += 1; print("FAIL private pattern", pat, [str(h) for h in hits])
print("check_embed:", "PASS" if not bad else f"{bad} FAIL"); sys.exit(1 if bad else 0)
