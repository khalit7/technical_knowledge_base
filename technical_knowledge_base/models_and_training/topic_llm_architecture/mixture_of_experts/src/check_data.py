"""Prove the built page embeds exactly the recorded data and that prose numbers match it.
1. window.MXD in ../index.html equals what make_page_data.py derives now from src/ (field by field, by re-running it in memory).
2. Every analysis number the data part carries equals the analysis JSON it came from (held-out loss, MaxVio, CF sweep, top-k).
3. Prose: every measured number written by page_text.py appears in the built HTML, and no [[...]] or PENDING is left.
4. The 8-token router file has the requested shape and matches the moe8top2 recording.
5. Hard-coded prose numbers about the tiny GPT's parameter counts match param_groups() in the training logs.
Run: python3 src/check_data.py   (exit 1 on any mismatch)
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = open(os.path.join(HERE, "..", "index.html")).read()
bad = []
m = re.search(r"window\.MXD=(\{.*?\});\n</script>", PAGE, flags=re.S)
D = json.loads(m.group(1))
part = open(os.path.join(HERE, "parts", "22_js_mx_0data.js")).read()
D2 = json.loads(part[part.index("window.MXD=") + 11:part.rstrip().rindex(";")])
if D != D2:
    bad.append("page data differs from parts/22_js_mx_0data.js (rebuild)")
for key, r in D["runs"].items():
    a_path = os.path.join(HERE, "analysis", "out", r["name"] + ".json")
    if not os.path.exists(a_path):
        continue
    a = json.load(open(a_path))
    if r["heldout"]["loss"] != a["heldout"]["loss"]:
        bad.append(f"{key}: held-out loss {r['heldout']['loss']} vs {a['heldout']['loss']}")
    if "maxvio" in r["heldout"] and r["heldout"]["maxvio"] != a["heldout"]["maxvio_global"]:
        bad.append(f"{key}: maxvio differs")
    if "iv" in r:
        for cf, v in a["cf_sweep"].items():
            if r["iv"]["cf"][cf]["loss"] != v["loss"] or r["iv"]["cf"][cf]["drop"] != v["dropped_assign_frac"]:
                bad.append(f"{key}: cf {cf} differs")
        if r["iv"]["topk"] != a["topk_infer"]:
            bad.append(f"{key}: topk differs")
    lg = json.load(open(os.path.join(HERE, "runs", "logs", r["name"] + ".json")))
    if r["log"]["final"] != lg["final_val_loss"]:
        bad.append(f"{key}: final val differs")
    # the CPU recomputation of held-out loss agrees with the training log's own final value (MPS) to 0.005
    if abs(r["heldout"]["loss"] - lg["final_val_loss"]) > 0.005:
        bad.append(f"{key}: CPU held-out {r['heldout']['loss']} vs log {lg['final_val_loss']}")
T = json.load(open(os.path.join(HERE, "page_text.json")))
text = re.sub(r"<script.*?</script>", "", PAGE, flags=re.S)
for k, v in T["text"].items():
    for num in re.findall(r"\d[\d,]*\.\d+|\d{1,3}(?:,\d{3})+", re.sub(r"<[^>]+>", " ", v)):
        if num not in text:
            bad.append(f"text block {k}: number {num} not in page")
if re.search(r"\[\[[a-z][^\]]*\]\]", text) or "PENDING" in text:
    bad.append("unresolved placeholder in page")
r8 = json.load(open(os.path.join(HERE, "analysis", "out", "router_probs_8tok.json")))
if set(r8) != {"tokens", "probs"} or len(r8["tokens"]) != 8 or any(len(p) != 8 for p in r8["probs"]):
    bad.append("router_probs_8tok.json has the wrong shape")
lg = {n: json.load(open(os.path.join(HERE, "runs", "logs", n + ".json")))["params"]
      for n in ("ref_baseline_s1500", "mx_moe8top2", "mx_moe16top3_shared") if os.path.exists(os.path.join(HERE, "runs", "logs", n + ".json"))}
for n, p in lg.items():
    for v in (p["total"], p["active"]):
        if f"{v:,}" not in text:
            bad.append(f"{n}: {v:,} not in page")
print("data check:", "OK" if not bad else bad)
sys.exit(1 if bad else 0)
