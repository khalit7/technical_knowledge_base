#!/usr/bin/env python3
"""Check that ../../index.html embeds exactly ../ry_data.json, that numbers written in prose match the recorded
data (this page's runs and the root's labs), and that nothing private leaked. usage: python3 check_data.py"""
import json, os, re, sys

H = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(H)
PAGE = os.path.join(os.path.dirname(SRC), "index.html")
ROOT = os.path.join(os.path.dirname(os.path.dirname(SRC)), "src")
html = open(PAGE, encoding="utf-8").read()
text = re.sub(r"<[^>]+>", "", html)
fails = 0


def ok(cond, msg):
    global fails
    print(("ok   " if cond else "FAIL ") + msg)
    fails += 0 if cond else 1


m = re.search(r"window\.RY=(\{.*?\});\n", html, re.S)
D = json.load(open(os.path.join(SRC, "ry_data.json")))
ok(m is not None and json.loads(m.group(1)) == D, "page embeds exactly ry_data.json")


t = D["tasks"]
ok("4.0 s instead of 1.1 s" in text, "naps quoted in Mistakes")
ok(round(t["naps"]["get_in_loop"]["secs"], 1) == 4.0 and round(t["naps"]["together"]["secs"], 1) == 1.1, "naps 4.0 / 1.1")
ok(2.5 <= t["rtt"]["median_ms"] <= 3.5, "task round trip 'about 3 ms' = %s" % t["rtt"]["median_ms"])
ev = {e["what"]: e["t"] for e in D["lineage"]["events"]}
ok(round(ev["node marked dead"], 1) == 29.9 and "dead at 29.9 s" in text, "node dead at 29.9 s")
ok(round(D["lineage"]["events"][0]["t"], 1) == 11.7 and "11.7 s after the node was killed" in text, "first failed check 11.7 s")
A = [g for g in D["lineage"]["gets"] if g["obj"] == "A_task_output"][0]
ok(round(A["done_t"]) == 31 and "31 s" in text, "lineage reconstruction answered ~31 s after kill")
r16 = D["objects"]["read16"]
ok(round(r16[0]["secs"], 1) == 0.4 and round(r16[1]["secs"] * 1000) == 5, "16 MB read 0.4 s then 5 ms")
sp = D["spill"]
for s in (f"Spilled {sp['spilled_mib']} MiB, {sp['spilled_n']} objects, avg write throughput {sp['write_mibs']} MiB/s",
          f"Restored {sp['restored_mib']} MiB, {sp['restored_n']} objects, avg read throughput {sp['read_mibs']} MiB/s"):
    ok(s in text, "spill counter quoted: " + s)
ok(D["data"]["streaming"]["rows"] == 17424 and D["data"]["streaming"]["batches"] == 35 and "17,424 samples in 35 batches" in text, "Ray Data rows and batches")
R = D["train"]["runs"]
fr = [[e for e in r["ranks"][0] if e["ev"] == "start"][-1]["step"] for r in R]
ok(fr == [50, 50, 50] and "From step 50, in all three runs" in text, "restart from step 50 in 3/3")
gap = []
for r in R:
    c = [e for e in r["ranks"][3] if e["ev"] == "crash"][0]["t"]
    s2 = min(e["t"] for rk in r["ranks"] for e in rk if e["ev"] == "start" and e["step"] > 0)
    gap.append(s2 - c)
ok(all(6 <= g <= 7 for g in gap) and "about 6 to 7 s from crash" in text, "crash to restart 6 to 7 s: %s" % [round(g, 2) for g in gap])
ref = D["train"]["ref_gloss"]
diffs = sorted({e["step"] for r in R for e in r["ranks"][0] if e["ev"] == "step" and str(e["step"]) in ref and e["g"] != ref[str(e["step"])] and e["t"] > 15})
ok(diffs == [70, 180, 200] and "steps 70, 180 and 200" in text, "loss differs at steps %s" % diffs)
ok(str(int(0.95 * 1500 * 2**20)) == "1494220800" and "1,494,220,800 is 95% of the <em>old</em> 1,500 MiB" in html, "95% of 1500 MiB")
io_rss = sum(int(l.split("\t")[1]) for l in open(os.path.join(SRC, "runs", "debug", "ps_w1_after_spill.txt")) if "IDLE_" in l)
ok(380 <= io_rss <= 420 and "about 400 MB of resident memory" in text, "IO workers RSS %d MB" % io_rss)
# the root's labs
pg = [json.loads(l) for l in open(os.path.join(ROOT, "sched", "runs", "ray", "ray_pg.jsonl")) if l.startswith("{")]
gb = [x for x in pg if x.get("name") == "sc-gang-b"]
ok(round(gb[-1]["t"] - [x for x in pg if x.get("ev") == "removed"][0]["t"], 2) == 0.68 and "0.68 s after the first was removed" in text, "Scheduling lab gang 0.68 s")
fl = json.load(open(os.path.join(ROOT, "fail", "fl_data.json")))
sc = {s["id"]: s for s in fl["scen"]}
ok(sc["r-crash0"]["detect_s"] == 1.27 and sc["r-crash2"]["resume_s"] == 10.15 and sc["r-node"]["resume_s"] == 93.59, "Failure lab Ray numbers 1.27, 10.15, 93.6")
ok("1.27 s" in text and "10.15 s" in text and "93.6 s" in text, "Failure lab numbers in prose")
la = json.load(open(os.path.join(ROOT, "launch", "out", "launch_times.json")))
med = lambda xs: sorted(xs)[len(xs) // 2]
m3 = {k: round(med([r["total_s"] for r in la["systems"][k]["runs"]]), 1) for k in ("ray", "slurm", "k8s") if k in la["systems"]}
ok(m3.get("ray") == 10.0 and "median 10.0 s" in text, "Launch lab medians %s" % m3)
q = json.load(open(os.path.join(SRC, "inputs", "source_quotes.json")))
lines = {x["key"]: x["line"] for x in q["quotes"]}
for key, phrase in [("max_direct_call_object_size", "line 274"), ("object_spilling_threshold", "line 827"), ("memory_usage_threshold", "line 79"),
                    ("scheduler_spread_threshold", "line 252"), ("task_max_retries", "line 633"), ("failure_config_default", "line 368"),
                    ("train_v2_default", "line 149"), ("train_health_interval", "line 35"), ("controller_poll", "line 436"), ("block_size", "line 76"),
                    ("gcs_reconnect", "line 549"), ("max_lineage_bytes", "line 224"), ("lineage_pinning_enabled", "line 208")]:
    ok(phrase == f"line {lines[key]}", f"source line {key} = {lines[key]}")
for k in ("health_check_period_ms", "health_check_timeout_ms", "health_check_failure_threshold"):
    ok(1060 <= lines[k] <= 1064, f"{k} in lines 1060 to 1064")
# Ray Serve defaults (inputs/serve_quotes.json, read from tag ray-2.59.0) and the placement figure (root's ray_pg.jsonl)
sq = {x["key"]: x for x in json.load(open(os.path.join(SRC, "inputs", "serve_quotes.json")))["quotes"]}
for key, val, phrase in [("max_ongoing_requests", "= 5", "max_ongoing_requests</code> = 5"), ("target_ongoing_requests", "= 2", "target_ongoing_requests</code> = 2"),
                         ("upscale_delay_s", "30.0", "upscale_delay_s</code> = 30 s"), ("downscale_delay_s", "600.0", "downscale_delay_s</code> = 600 s"),
                         ("batch_max_batch_size", "= 10", "max_batch_size</code> = 10"), ("batch_wait_timeout_s", "0.01", "batch_wait_timeout_s</code> = 0.01")]:
    ok(val in sq[key]["text"] and phrase in html, f"serve default {key} {val}")
ok("lines 283 and 284" in text and "lines 695 and 704" in text and "lines 803 and 804" in text and
   [sq[k]["line"] for k in ("max_ongoing_requests", "target_ongoing_requests", "downscale_delay_s", "upscale_delay_s", "batch_max_batch_size", "batch_wait_timeout_s")] == [283, 284, 695, 704, 803, 804], "serve source lines")
pgn = {x["name"]: x for x in pg if x.get("ev") == "pg"}
ok(pgn["sc-pack-4"]["nodes"] == ["ray-w2", "ray-w2", "ray-w1", "ray-w1"] and pgn["sc-spread-4"]["nodes"] == ["ray-w2", "ray-w1", "ray-w2", "ray-w1"]
   and pgn["sc-strict_pack-4"]["state"] == pgn["sc-strict_spread-4"]["state"] == "PENDING" and pgn["sc-strict_pack-2"]["ready"] and pgn["sc-strict_spread-2"]["ready"], "placement figure matches ray_pg.jsonl")
ok("{s:'PACK',p:{'ray-w1':[2,3],'ray-w2':[0,1]}" in html and "{s:'SPREAD',p:{'ray-w1':[1,3],'ray-w2':[0,2]}" in html, "placement figure data in page")
# privacy
priv = [r"/Us" + "ers/", r"Us" + "ers-", re.escape(os.environ.get("USER", "nobody-here")), r"gl" + "pat", r"sk" + "-ant", r"[\w.]+@[\w-]+\.\w+", r"\b(?:\d{1,3}\.){3}\d{1,3}\b"]
for root, _, files in os.walk(os.path.dirname(SRC)):
    if ".shots" in root:
        continue
    for f in files:
        p = os.path.join(root, f)
        if p == os.path.abspath(__file__):
            continue
        if os.path.getsize(p) > 4_000_000:
            ok(False, "file too big " + p)
        try:
            s = open(p, encoding="utf-8").read()
        except Exception:
            continue
        for r in priv:
            for hit in re.findall(r, s):
                if r.startswith(r"[\w.]") and hit.endswith((".py", ".js", ".json", ".html", ".md", ".txt", ".sh", ".mjs")):
                    continue
                if r.startswith(r"\b(") and hit in ("127.0.0.1", "0.0.0.0"):
                    continue
                ok(False, f"privacy {r} in {os.path.relpath(p, SRC)}: {hit}")
print("FAILS", fails)
sys.exit(1 if fails else 0)
