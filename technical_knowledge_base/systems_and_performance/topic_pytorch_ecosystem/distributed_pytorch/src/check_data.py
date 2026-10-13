"""After the build: (1) the page embeds exactly what build_data.py makes from inputs/ now; (2) every number written
in prose (not filled by JavaScript) equals the recorded value; (3) no private paths, no em dashes.
    python3 check_data.py"""
import json, os, re, subprocess, sys
H = os.path.dirname(os.path.abspath(__file__))
I = os.path.join(H, "inputs")
J = lambda n: json.load(open(os.path.join(I, n + ".json")))
page = open(os.path.join(H, "..", "index.html"), encoding="utf-8").read()
bad = 0

# (1) embedded data
before = open(os.path.join(H, "parts", "22_dpt_data.js")).read()
subprocess.run([sys.executable, os.path.join(H, "build_data.py")], check=True, capture_output=True)
after = open(os.path.join(H, "parts", "22_dpt_data.js")).read()
emb = re.search(r"window\.DPT=(\{.*?\});\n</script>", page, re.S)
ok1 = before == after and emb and after.strip() == ("window.DPT=" + emb.group(1) + ";")
print("embedded data = inputs:", bool(ok1)); bad |= not ok1
D = json.loads(emb.group(1))

# (2) prose numbers against data
def has(s):
    return s in page
chk = []
def c(lit, val, cond=True):
    chk.append((lit, val, cond and has(lit)))
r0 = lambda n: J(n)["ranks"][0]
fs = {m: r0("fsdpm_" + m) for m in ("fsdp4", "hsdp", "raf2", "ddp4")}
c("3,187,200", fs["fsdp4"]["mem"]["state"]["params"], fs["fsdp4"]["mem"]["state"]["params"] == 3187200)
c("6,374,400", fs["hsdp"]["mem"]["state"]["params"], fs["hsdp"]["mem"]["state"]["params"] == 6374400)
c("14: 9 all-gathers, 5 gradient reductions", len(fs["fsdp4"]["steps"][1]["coll"]), len(fs["fsdp4"]["steps"][1]["coll"]) == 14)
c("19 collectives in all", len(fs["hsdp"]["steps"][1]["coll"]), len(fs["hsdp"]["steps"][1]["coll"]) == 19)
c("3.801371, 3.171438, 3.121909", [s["loss"] for s in fs["hsdp"]["steps"]], [s["loss"] for s in fs["hsdp"]["steps"]] == [s["loss"] for s in fs["fsdp4"]["steps"]] == [3.801371, 3.171438, 3.121909])
c("from 43.9 MB to 48.6 MB", (fs["fsdp4"]["mem"]["peak_delta"], fs["raf2"]["mem"]["peak_delta"]), round(fs["fsdp4"]["mem"]["peak_delta"] / 1e6, 1) == 43.9 and round(fs["raf2"]["mem"]["peak_delta"] / 1e6, 1) == 48.6)
c("789,760 bytes in per block", 789760, any(e["in"] == 789760 and e["pg"] == "world" for e in fs["raf2"]["steps"][1]["coll"]))
c("1,579,520 bytes in, from the pair", 1579520, any(e["in"] == 1579520 and e["pg"] == "mesh_dim_1" for e in fs["raf2"]["steps"][1]["coll"]))
tp = {m: r0("tp_" + m) for m in ("tp", "tp1", "tpsp")}
c("24 all-reduces of 524,288 bytes", len(tp["tp"]["steps"][0]["coll"]), len(tp["tp"]["steps"][0]["coll"]) == 24 and all(e["in"] == 524288 for e in tp["tp"]["steps"][0]["coll"]))
c("<b>16</b> with the second", len(tp["tp1"]["steps"][0]["coll"]), len(tp["tp1"]["steps"][0]["coll"]) == 16)
c("18 all-gathers of 262,144 B, 16 reduce-scatters", tp["tpsp"]["steps"][0]["comm_debug_total"], tp["tpsp"]["steps"][0]["comm_debug_total"] == {"all_gather_into_tensor": 18, "reduce_scatter_tensor": 16})
c("from 22.17 MB to 20.06 MB", (tp["tp1"]["steps"][0]["saved_activation_bytes"], tp["tpsp"]["steps"][0]["saved_activation_bytes"]), round(tp["tp1"]["steps"][0]["saved_activation_bytes"] / 1e6, 2) == 22.17 and round(tp["tpsp"]["steps"][0]["saved_activation_bytes"] / 1e6, 2) == 20.06)
c("47.41 MB", tp["tp"]["saved_activation_bytes_one_process"], round(tp["tp"]["saved_activation_bytes_one_process"] / 1e6, 2) == 47.41)
c("3.801371, 3.187931, 3.167831", [s["loss"] for s in tp["tp1"]["steps"]], [s["loss"] for s in tp["tp1"]["steps"]] == [s["ref_loss"] for s in tp["tp1"]["steps"]] == [3.801371, 3.187931, 3.167831])
c("agree to 2.1e-6", max(s["max_grad_diff"] for s in tp["tp"]["steps"]), "%.1e" % max(s["max_grad_diff"] for s in tp["tp"]["steps"]) == "2.1e-06")
c("one process to 1.7e-6", max(s["max_grad_diff"] for s in tp["tpsp"]["steps"]), "%.1e" % max(s["max_grad_diff"] for s in tp["tpsp"]["steps"]) == "1.7e-06")
ct2 = J("coll_time_w2")["ops"]
c("Broadcast, 10.7 ms against 25.7 ms for all-reduce and 26.9 ms", [ct2[k][-1]["median_s"] for k in ("broadcast", "all_reduce", "all_gather_into_tensor")],
  [round(ct2[k][-1]["median_s"] * 1e3, 1) for k in ("broadcast", "all_reduce", "all_gather_into_tensor")] == [10.7, 25.7, 26.9])
c("in 25.7 ms, about 2.6 GB/s", 67108864 / ct2["all_reduce"][-1]["median_s"], round(67108864 / ct2["all_reduce"][-1]["median_s"] / 1e9, 1) == 2.6)
pp = {k: J("pps_" + k) for k in ("ZBVZeroBubble_w2_m4", "1F1B_w2_m4")}
zb = [round(r["median"]["bubble"], 2) for r in pp["ZBVZeroBubble_w2_m4"]["ranks"]]; ob = [round(r["median"]["bubble"], 2) for r in pp["1F1B_w2_m4"]["ranks"]]
c("ZBVZeroBubble 0.08 and 0.07 at m = 4", zb, zb == [0.08, 0.07])
c("idled 0.08 and 0.07 of the step against 1F1B's 0.19 and 0.10", (zb, ob), zb == [0.08, 0.07] and ob == [0.19, 0.10])
gmax = max(r["max_grad_diff_untied"] for f in os.listdir(I) if f.startswith("pps_") for r in J(f[:-5])["ranks"])
c("largest difference 1.3e-7 on the untied", gmax, "%.1e" % gmax == "1.3e-07")
tl = [r["tied_grad_diff"] for f in os.listdir(I) if f.startswith("pps_") and not ("ZBV" in f or "DualPipe" in f) for r in J(f[:-5])["ranks"] if r["tied_grad_diff"] is not None]
c("largest difference 1.6e-7 over these runs", max(tl), "%.1e" % max(tl) == "1.6e-07")
c("0.37 of the right one", pp["ZBVZeroBubble_w2_m4"]["ranks"][0]["tied_grad_ratio_to_reference"], round(pp["ZBVZeroBubble_w2_m4"]["ranks"][0]["tied_grad_ratio_to_reference"], 2) == 0.37)
c("(3.0912256)", r0("dcp_more")["reshard_to_hsdp"]["next_loss_hsdp"], round(r0("dcp_more")["reshard_to_hsdp"]["next_loss_hsdp"], 7) == 3.0912256 and r0("dcp_more")["reshard_to_hsdp"]["next_loss_fsdp4"] == r0("dcp_more")["reshard_to_hsdp"]["next_loss_hsdp"])
c("1,051,648 and 11,696,128 bytes", fs["ddp4"]["steps"][1]["coll"], [e["in"] for e in fs["ddp4"]["steps"][1]["coll"] if e["op"] == "all_reduce"] == [1051648, 11696128])
for lit, val, ok in chk:
    print(("ok  " if ok else "BAD ") + lit + "  <- " + str(val)[:80]); bad |= not ok

# (3) privacy and dashes over everything that will be committed
priv = re.compile("/Us" + "ers/|Us" + "ers-|kha" + "lid|gl" + "pat|sk-" + "ant|@gm" + "ail|Mac" + "Book|claude-" + "502")
for root, _, files in os.walk(os.path.join(H, "..")):
    if ".shots" in root: continue
    for f in files:
        p = os.path.join(root, f)
        try: t = open(p, encoding="utf-8").read()
        except Exception: continue
        if priv.search(t): print("PRIVATE string in", os.path.relpath(p, H), priv.search(t).group(0)); bad = 1
        if chr(0x2014) in t: print("EM DASH in", os.path.relpath(p, H)); bad = 1
print("FAIL" if bad else "OK"); sys.exit(bad)
