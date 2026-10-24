"""After build.sh: the page embeds exactly the data build_data.py makes from inputs/, and every number written into
the tab's prose matches the recorded data. Plain Python 3. Also greps the tab's files for private paths."""
import json, os, re, subprocess, sys, glob
HERE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
m = re.search(r"window\.DST=(\{.*?\});\n", html)
emb = json.loads(m.group(1))
js = open(os.path.join(HERE, "..", "parts", "33_dst_0data.js")).read()
gen = json.loads(js[len("window.DST="):].rstrip().rstrip(";"))
fails = []
if emb != gen: fails.append("embedded data differs from parts/33_dst_0data.js")
I = lambda n: json.load(open(os.path.join(HERE, "inputs", n + ".json")))
tab = html[html.index('id="t-dist"'):html.index('id="t-map"')]
txt = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", tab).replace("&amp;", "&"))
def claim(s, ok):
    if s not in txt: fails.append("prose missing: " + s)
    elif not ok: fails.append("prose does not match data: " + s)
d = I("ddp_w2")["ranks"][0]
claim("12,747,776", d["state"]["params"] == 12747776 and d["init_coll"][2]["in_bytes"] == 12747776)
claim("1,120 bytes", d["init_coll"][1]["in_bytes"] == 1120)
claim("all-gather of 8 bytes", d["init_coll"][0]["in_bytes"] == 8)
claim("212 and 8 bytes", [c["in_bytes"] for c in d["steps"][1]["coll"][:2]] == [212, 8])
claim("1,051,648 and 11,696,128", [c["in_bytes"] for c in d["steps"][2]["coll"]] == [1051648, 11696128])
claim("3,186,944", sum(v for v in d["param_numel"].values()) == 3186944)
b = I("ddp_w2_big")["ranks"][0]; claim("25,274,880", b["state"]["params"] == 25274880 * 4)
claim("(3.80137)", round(d["steps"][0]["loss"], 5) == 3.80137)
claim("13 all-reduces", len(I("ddp_w2_b1")["ranks"][0]["steps"][2]["coll"]) == 13)
f = I("fsdp_w2")["ranks"][0]
claim("1.58 MB", round(f["steps"][2]["coll"][1]["in_bytes"] / 1e6, 2) == 1.58)
claim("303 MB", round((b["state"]["params"] + b["state"]["opt_state"]) / 1e6) == 303)
claim("131,072 bytes", all(p["bytes"] == 131072 for r in I("pp_gpipe")["ranks"] for p in r["p2p"]) and len(I("pp_gpipe")["ranks"][0]["p2p"]) == 8)
g, o = I("pp_gpipe")["ranks"][0]["mem"]["peak_delta"], I("pp_1f1b")["ranks"][0]["mem"]["peak_delta"]
claim("peak 21.1 MB with GPipe, 16.8 MB with 1F1B", round(g / 1e6, 1) == 21.1 and round(o / 1e6, 1) == 16.8)
claim("(8 per step on this 4-block model)", len(I("tp_w2")["ranks"][0]["mlp_tp"]["coll"]) == 8)
claim("ValueError: not enough values to unpack (expected 3, got 2)", "expected 3, got 2" in I("tp_w2")["ranks"][0]["qkv_tp"]["error"])
claim("only Shard to Partial(sum) redistribution is supported", any("only Shard to Partial(sum)" in (p.get("error") or "") for p in I("dtensor_w2")["ranks"][0]["meshes"][0]["pairs"]))
claim("10 minutes for NCCL, 30 for other backends", True)
# privacy: nothing private in the files this tab commits
bad = []
for p in glob.glob(os.path.join(HERE, "**", "*"), recursive=True) + glob.glob(os.path.join(HERE, "..", "parts", "33_*")):
    if os.path.isdir(p) or "__pycache__" in p: continue
    s = open(p, encoding="utf-8", errors="ignore").read()
    for pat in ("/Users/", "Users-", "glpat", "sk-ant", "/private/tmp"):
        if pat in s and not p.endswith("check_data.py"): bad.append((os.path.relpath(p, HERE), pat))
if bad: fails.append("private strings: %s" % bad)
for x in ("NaN", "undefined"):
    if x in txt: fails.append(x + " in tab text")
print("\n".join(fails) if fails else "all checks pass"); sys.exit(1 if fails else 0)
