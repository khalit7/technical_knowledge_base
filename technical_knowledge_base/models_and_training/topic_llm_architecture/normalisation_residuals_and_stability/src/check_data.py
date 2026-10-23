"""Checks for the Normalisation page (run after build.sh):
 1. the data part equals a fresh regeneration from out/ (make_page_data.py is deterministic);
 2. every run in NSD matches its recorded log (final loss, eval curve) in out/runs or the Block lab's out/runs;
 3. no placeholder left, no run pending, no "pending" in the built page;
 4. numbers typed by hand in the parts equal their recorded sources (Block lab, sibling pages, Inside lab);
 5. every Notion id linked from the page exists in pages.json, and every tab link points at a tab.
  python3 check_data.py
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
TOPIC = os.path.abspath(os.path.join(HERE, "..", ".."))
REPO = os.path.abspath(os.path.join(TOPIC, "..", "..", ".."))
bad = []
part = os.path.join(HERE, "parts", "22_js_ns_0data.js")
before = open(part).read()
subprocess.run([sys.executable, os.path.join(HERE, "make_page_data.py")], check=True, capture_output=True)
if open(part).read() != before:
    bad.append("data part differs from a fresh regeneration: rebuild")
D = json.loads(before.split("window.NSD=", 1)[1].rstrip().rstrip(";"))
for n, R in D["runs"].items():
    if R["lab"] == "ns":
        L = json.load(open(os.path.join(HERE, "out", "runs", n + ".json")))
        ev = [[e["step"], round(e["val_loss"], 4)] for e in L["eval"]]
    else:
        L = json.load(open(os.path.join(TOPIC, "src", "block", "out", "runs", n + ".json")))
        ev = [[s, round(v, 4)] for s, v in L["eval"]]
    if R["final"] != L["final_val_loss"] or [[a, round(b, 4)] for a, b in R["ev"]] != ev:
        bad.append(f"run {n}: page data differs from its log")
html = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
nums = json.load(open(os.path.join(HERE, "out", "page_numbers.json")))
if "{%" in html:
    bad.append("unfilled placeholder in index.html")
if nums.get("pending_runs"):
    bad.append("pending runs: " + ", ".join(nums["pending_runs"]))
if re.search(r">\s*pending\b|\bpending:", re.sub(r"<script.*?</script>", "", html, flags=re.S)):
    bad.append("the word 'pending' is visible on the page")
# 4. hand-typed numbers against their sources
bl = lambda n: json.load(open(os.path.join(TOPIC, "src", "block", "out", "runs", n + ".json")))["final_val_loss"]
tz = lambda n: json.load(open(os.path.join(TOPIC, "the_transformer_from_zero", "src", "train", "out", "runs", n + ".json")))["final_val"]
gn = json.load(open(os.path.join(TOPIC, "src", "block", "out", "gradnorm.json")))["runs"]["bl_post_lr3e-3"]
ins = json.load(open(os.path.join(TOPIC, "src", "inside", "out", "facts.json")))
uni = json.load(open(os.path.join(TOPIC, "src", "block", "out", "unigram.json")))["val_cross_entropy_under_train_unigram_nats"]
typed = {
    "5.943": round(bl("bl_post_lr3e-3"), 3), "2.138": round(bl("bl_post_warm500"), 3), "2.276": round(tz("tz_base"), 3),
    "6.011": round(tz("tz_noresid"), 3), "2.546": round(tz("tz_nonorm"), 3), "3.061": round(tz("tz_nonorm_lr1e-3"), 3),
    "2.464": round(bl("bl_pre_lr1e-3"), 3), "5.1e-7": float(f"{gn['trained']['per_block'][0]:.1e}"), "0.027": round(gn["trained"]["per_block"][-1], 3),
    "0.074": round(min(gn["init"]["per_block"]), 3), "20,155": int(ins["smol_big_max"]), "1.56": round(ins["smol_med12"], 2),
    "0.085": ins["smol_sink_below12_max"], "0.31": round(ins["smol_sink_from12_min"], 2), "0.74": round(ins["smol_sink_from12_max"], 2),
    "35.8": round(ins["tiny_max_after"], 1), "6,160": round(ins["qwen_big_max"]), "5.54": round(ins["qwen_med"], 2), "6.006": round(uni, 3),
}
# units absorbed from the root's Block lab (2026-10-23): the residual trace, the learning-rate sweep, the gradient by block
tr = lambda n: json.load(open(os.path.join(TOPIC, "src", "block", "out", "trace_" + n + ".json")))["norms"]
tp, tq, tf = tr("bl_pre_lr1e-3"), tr("bl_post_lr1e-3"), tr("ref_baseline_s1500")
blr = lambda n: json.load(open(os.path.join(TOPIC, "src", "block", "out", "runs", n + ".json")))
gj = json.load(open(os.path.join(TOPIC, "src", "block", "out", "gradnorm.json")))["runs"]
ok_runs = [gj[k]["trained"]["per_block"] for k in ("bl_pre_lr1e-3", "bl_post_lr1e-3", "bl_post_warm500")]
typed.update({
    "0.9": round(tp["stream_token"][0], 1), "14.8": round(tp["stream_token"][-1], 1),
    "16.0": round(min(tq["stream_token"][1:-1]), 1), "16.4": round(max(tq["stream_token"][1:-1]), 1), "24.6": round(tq["stream_token"][-1], 1),
    "1.3": round(tf["stream_token"][0], 1), "65.8": round(tf["stream_token"][-1], 1), "53.0": round(tf["branch_token"][1], 1),
    "40.8": round(max(t[2] for t in blr("bl_pre_lr3e-2")["train"]), 1), "6.04": round([t for t in blr("bl_post_lr3e-3")["train"] if t[0] == 30][0][1], 2),
    "2.734": round(bl("bl_pre_lr1e-2"), 3), "2.534": round(bl("bl_post_lr1e-3"), 3), "3.215": round(bl("bl_post_lr3e-4"), 3), "4.361": round(bl("bl_pre_lr3e-2"), 3),
    "0.27": round(min(min(v) for v in ok_runs), 2), "0.92": round(max(max(v) for v in ok_runs), 2),
    "0.075": round(max(gj["bl_post_lr1e-3"]["init"]["per_block"]), 3), "2.21": round(gj["bl_pre_lr1e-3"]["init"]["per_block"][0], 2),
    "1.57": round(gj["bl_pre_lr1e-3"]["init"]["per_block"][-1], 2),
})
sg = D["spike_gn"]
if len(sg["ns_pre_lr3e-2_c0"]["hits"]) != 9 or len(sg["ns_pre_lr3e-2_c0_qk"]["hits"]) != 0:
    bad.append("spike chart title (9 flagged without a fix, 0 with QK-norm) no longer matches the data")
if [len(sg[n]["hits"]) for n in sg] != [D["spike_scores"][n]["gn"] for n in sg]:
    bad.append("spike flags differ from the spike-score table")
for s, v in typed.items():
    want = float(s.replace(",", ""))
    if abs(want - v) > 1e-9:
        bad.append(f"typed {s} but the source says {v}")
    if s not in html:
        bad.append(f"typed number {s} not found on the page (remove it from the check or the page)")
# 5. links
pages = json.load(open(os.path.join(REPO, "technical_knowledge_base", "pages.json")))
items = pages if isinstance(pages, list) else pages.get("pages", pages)
items = items if isinstance(items, list) else list(items.values())
ids = {str(p.get("notion_id") or p.get("id") or "").replace("-", "") for p in items}
for nid in sorted(set(re.findall(r"app\.notion\.com/p/([0-9a-f]{32})", html))):
    if nid not in ids:
        bad.append(f"Notion id {nid} not in pages.json")
tabs = set(re.findall(r'data-t="(t-[\w-]+)"', html))
for t in set(re.findall(r'data-tab="(t-[\w-]+)"', html)):
    if t not in tabs:
        bad.append(f"tab link to missing tab {t}")
print("check_data:", "OK" if not bad else "\n  " + "\n  ".join(bad))
sys.exit(1 if bad else 0)
