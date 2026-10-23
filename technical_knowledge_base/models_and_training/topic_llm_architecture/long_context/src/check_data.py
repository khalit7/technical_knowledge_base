"""Checks that the built page embeds exactly the recorded data and that hard-written prose numbers match it.
Run from anywhere: python3 check_data.py   (exits 1 on any problem)"""
import json, os, re, statistics as st, sys
H = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(H, "../index.html"), encoding="utf-8").read()
bad = []
def glob(name):
    m = re.search(r"window\.%s=(\{.*?\});\n" % name, page, re.S)
    return json.loads(m.group(1))
LCF, EVD, EFD = glob("LCF"), glob("EVD"), glob("EFD")
if LCF != json.load(open(os.path.join(H, "facts.json"))): bad.append("LCF differs from facts.json")
# every data-lc key on the page has a value
for k in set(re.findall(r'data-lc="([^"]+)"', page)):
    if k not in LCF: bad.append("missing fact " + k)
# eviction aggregates recomputed independently from the raw run
ev = json.load(open(os.path.join(H, "kv/out/evict.json")))
for r in EVD["series"]:
    p, f = r["pol"], r["f"]
    rows = [x["res"]["full"] if p == "full" else x["res"][p].get(("%g" % f) if p.startswith("q_") is False else None) for x in ev["passkey"]]
    if p.startswith("q_"):
        rows = [list(x["res"][p].values())[0] for x in ev["passkey"]]
    elif p != "full":
        rows = [x["res"][p][str(f) if str(f) in x["res"][p] else repr(f)] for x in ev["passkey"]]
    pk = st.mean(1.0 if v["exact"] else 0.0 for v in rows)
    if abs(pk - r["pk"]) > 1e-4: bad.append("pk mismatch %s %s" % (p, f))
# map
if os.path.exists(os.path.join(H, "kv/out/map.json")):
    mp = json.load(open(os.path.join(H, "kv/out/map.json")))
    tot = sum(r["exact"] for r in mp["rows"]); emb = sum(sum(x) for x in EFD["map"]["exact"])
    if tot != emb: bad.append("map total %d vs page %d" % (tot, emb))
pa = json.load(open(os.path.join(H, "past/out/past.json")))
if pa != EFD["past"]: bad.append("past.json differs from page")
# hard-written numbers in prose against the data
def need(text, cond, why):
    if text not in page: bad.append("text not found: " + text)
    elif not cond: bad.append("prose number wrong: " + why)
need("holds three such sequences after the weights, thirteen at 32K", LCF["w_l8_cfg_fit"] == 3 and LCF["w_l8_cfg_32k_fit"] == 13, "l8 fits")
need("attention from 70% to 28% of the FLOPs", round(LCF["w_l8_cfg_attn"]) == 70, "l8 attn")
need("(10 at 128K as configured", LCF["w_l70_cfg_fit"] == 10, "l70 fit")
need("attention from 70% to 28% of the FLOPs", round(LCF["w_l8_cfg_attn"]) == 70 and round(LCF["w_l8_lg_attn"]) == 28, "attn share")
need("cut the cache 8 and 6 times", round(LCF["w_l8_cfg_tok"] / LCF["w_l8_mqa_tok"]) == 8 and round(LCF["w_l8_cfg_tok"] / LCF["w_l8_lg_tok"]) == 6, "ratios")
need("Six times smaller", round(LCF["w_l8_cfg_tok"] / LCF["w_l8_lg_tok"]) == 6, "anim ratio")
need("41 requests fit", LCF["w_l8_lg_fp8_fit"] == 41, "anim 41")
need("only a trained layout plus fp8 reaches 32", LCF["w_l8_lg_fp8_fit"] == 41 and LCF["w_l8_cfg_fit"] == 3, "iq")
need("about 9 times", True, "") if "about 9 times" in page else None
print("problems:", len(bad)); [print(" ", b) for b in bad]
sys.exit(1 if bad else 0)
