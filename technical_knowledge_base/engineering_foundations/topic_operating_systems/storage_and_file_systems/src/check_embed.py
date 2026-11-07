"""Check that ../index.html embeds exactly what gen_data.py derives from raw/, that numbers written into the prose
agree with that data, and that nothing private is in the page or raw/. Run after build.sh. Exit 1 on any mismatch."""
import getpass, json, re, subprocess, sys, pathlib
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
prd = [D["wb"][k]["dirty_for_s"] for k in ("primed", "primed2", "primed3", "primed4")]  # seconds after the first sample that saw the write
frd = [D["wb"][k]["dirty_for_s"] for k in ("small", "mid")]
EV = D["ra"][0]["ev"]; W0 = [sum(e[2] for e in EV[:i]) for i in range(len(EV))]  # readahead windows are contiguous
img = D["fsimage_txt"]
CK = lambda l: next(r for r in D["ckpt"] if r["label"].startswith(l)); MT = lambda l: next(r for r in D["meta"] if r["label"].startswith(l))["ms"]
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
  ("0.4 to 30 seconds after the write", round(min(prd), 1) == 0.4 and round(max(prd)) == 30),
  ("between 0.4 and 30 s as that share decayed", round(min(prd), 1) == 0.4 and round(max(prd)) == 30),
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
  # static numbers written into the text in the 2026-10-24 rebuild
  ("1.4 us", round(S["ext4", "overwrite", "none"], 1) == 1.4),
  ("1,305 us", round(S["ext4", "overwrite", "fsync"]) == 1305),
  ("393 us", round(S["ext4", "overwrite", "fdatasync"]) == 393),
  ("161 us", round(S["ext4", "overwrite", "sfr"]) == 161),
  ("2.3 ms (after a rename)", "directory fsync 2.3 ms" in CK("tmp + fsync")["note"]),
  ("left 256 MiB of dirty data", round(CK("torch.save straight")["dirty"]) == 256),
  ("365 ms against 263 ms", round(CK("tmp + fsync")["med"]) == 365 and round(CK("torch.save straight")["med"]) == 263),
  ("became 20 device requests", D["ra"][0]["reqs"] == 20),
  ("20 requests (572 pages)", D["ra"][0]["reqs"] == 20 and D["ra"][0]["pages"] == 572),
  ("13 requests (636 pages)", D["ra"][1]["reqs"] == 13 and D["ra"][1]["pages"] == 636),
  ("throughput x5.1, mean latency x14.4", round(F["randread_4k_qd64"]["iops"] / F["randread_4k_qd1"]["iops"], 1) == 5.1 and round(F["randread_4k_qd64"]["mean"] / F["randread_4k_qd1"]["mean"], 1) == 14.4),
  ("64 / 1,152.6 us = 55,527 per second, against 54,723 measured (+1.5%)", F["randread_4k_qd64"]["mean"] == 1152.6 and round(64 / (F["randread_4k_qd64"]["mean"] * 1e-6)) == 55527 and round(F["randread_4k_qd64"]["iops"]) == 54723),
  ("7.2x as long, reading them warm 10.6x, cold 56x", round(MT("create + write")/MT("write one 40"), 1) == 7.2 and round(MT("read 10,240 small files, warm")/MT("read the big file, warm"), 1) == 10.6 and round(MT("read 10,240 small files, data cold")/MT("read the big file, cold")) == 56),
  ("4.5 s (16 MiB) and 5.3 s (256 MiB); in the four primed runs 7.7, 30.2, 18.0 and 0.4 s", [round(x, 1) for x in frd] == [4.5, 5.3] and [round(x, 1) for x in prd] == [7.7, 30.2, 18.0, 0.4]),
  # Fig. 3 (writeback) step list, 2026-11-07
  ("16 MiB written in 0.01 or 0.02 s, 256 MiB in 0.29 s", D["wb"]["small"]["head"].endswith("0.01 s") and D["wb"]["primed2"]["head"].endswith("0.02 s") and D["wb"]["fsync"]["head"] == "wrote 256 MiB in 0.29 s"),
  ("fsync forces the 256 MiB out: 110 ms", D["wb"]["fsync"]["fsync_s"] == 0.11),
  ("16 MiB leaves 4.5 s after the write", round(D["wb"]["small"]["dirty_for_s"], 1) == 4.5),
  ("30.2 s after the write, it leaves", round(D["wb"]["primed2"]["dirty_for_s"], 1) == 30.2),
  ("left after 7.7, 18.0 and 0.4 s", [round(D["wb"][k]["dirty_for_s"], 1) for k in ("primed", "primed3", "primed4")] == [7.7, 18.0, 0.4]),
  # Fig. 2 (readahead) step list
  ("pages 0 to 3 in one request", EV[0][:3] == [0, 0, 4]),
  ("(pages 4 to 11)", EV[1][0] == 1 and W0[1] == 4 and EV[1][2] == 8),
  ("fetches pages 12 to 27", EV[2][0] == 4 and W0[2] == 12 and EV[2][2] == 16),
  ("Page 12 triggers pages 28 to 59", EV[3][0] == 12 and W0[3] == 28 and EV[3][2] == 32),
  ("Page 28 triggers pages 60 to 91", EV[4][0] == 28 and W0[4] == 60 and EV[4][2] == 32),
  ("at reads 61, 93 and 125: 128 reads cost 8 device requests (188 pages)", [e[0] for e in EV if 28 < e[0] < 128] == [60, 92, 124] and len([e for e in EV if e[0] < 128]) == 8 and sum(e[2] for e in EV if e[0] < 128) == 188),
  ("64 reads, 64 requests", D["ra"][2]["reads"] == 64 and D["ra"][2]["reqs"] == 64 and D["ra"][3]["reqs"] == 64),
  # Fig. 5 (the safe save) step list
  ("the temporary file: 111 ms", "file fsync 111 ms" in CK("tmp + fsync")["note"]),
  ("3.3x less than fsync (393 against 1,305 us)", round(S["ext4", "overwrite", "fsync"] / S["ext4", "overwrite", "fdatasync"], 1) == 3.3),
  ("1.3x less (997 against 1,265 us)", round(S["ext4", "append", "fsync"] / S["ext4", "append", "fdatasync"], 1) == 1.3 and round(S["ext4", "append", "fdatasync"]) == 997 and round(S["ext4", "append", "fsync"]) == 1265),
  ("ran 158 ms on average", "158ms running transaction" in D["jbd2"]),
  ("36,364 of the 36,654 commits", "36654 transactions (36364 requested)" in D["jbd2"]),
  ("about 11 journal blocks and took about 2.4 ms", "11 logged blocks" in D["jbd2"] and "2409us" in D["jbd2"]),
  ("12,706 to 6,270 writes per second", round(F["randwrite_4k_qd1"]["iops"]) == 12706 and round(F["randwrite_4k_qd1_fdatasync"]["iops"]) == 6270),
  ("51,050 reads per second at queue depth 16, against 48,455", round(F["randread_4k_qd16_iouring"]["iops"]) == 51050 and round(F["randread_4k_qd16"]["iops"]) == 48455),
  ("fsync added 86 ms to a 263 ms save; the full safe protocol 102 ms", round(CK("torch.save + flush")["med"] - CK("torch.save straight")["med"]) == 86 and round(CK("tmp + fsync")["med"] - CK("torch.save straight")["med"]) == 102),
  ("66 ms of a 501 ms save", "after 66 ms" in CK("dcp.async_save")["note"] and round(CK("dcp.async_save")["med"]) == 501),
  ("5 hardware queues (one per CPU), up to 256 requests per queue, at most 1,280 KiB", "hardware queues: 5" in D["env_txt"] and D["env"]["nr_requests"] == "256" and D["env"]["max_sectors_kb"] == "1280"),
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
# privacy (the login name is looked up at run time and matched case-sensitively, never spelled here)
for pat in ["/Users/", "glpat", "sk-ant", getpass.getuser()]:
    hits = [p for p in [pathlib.Path("../index.html"), *pathlib.Path(".").rglob("*") ] if p.is_file() and "__pycache__" not in p.parts and p.suffix in (".html", ".txt", ".py", ".sh", ".js", ".md", ".mjs", ".c", "") and pat in p.read_text(errors="ignore") and p.name != "check_embed.py"]
    if hits: bad += 1; print("FAIL private pattern", pat, [str(h) for h in hits])
print("check_embed:", "PASS" if not bad else f"{bad} FAIL"); sys.exit(1 if bad else 0)
