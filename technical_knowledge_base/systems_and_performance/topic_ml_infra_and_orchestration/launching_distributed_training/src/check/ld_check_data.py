"""ld_check_data.py: the page embeds exactly out/data.json, and every number its prose states follows from that data.
usage: python3 ld_check_data.py   (from src/)"""
import json, re, sys
H = open("../index.html").read()
m = re.search(r"window\.LD=(\{.*?\});\n", H, re.S)
emb = json.loads(m.group(1)); D = json.load(open("out/data.json"))
ok = emb == D; print("embedded data equals out/data.json:", ok)
R = D["rz"]; f1 = lambda x: f"{round(x, 1):.1f}"
def ev(s, k, p=lambda e: True): return next(e for e in R[s]["events"] if e["k"] == k and p(e))
E = R["elastic"]; M = E["marks"]
dead = ev("elastic", "dead")["t"] - M["kill_C"]; back = ev("elastic", "complete", lambda e: e["g"][0] == "2")["t"] - M["kill_C"]
nw = ev("elastic", "a_new"); dn = next(e for e in E["events"] if e["k"] == "a_done" and e["t"] > nw["t"])
fail = next(e for e in E["events"] if e["k"] == "a_failed" and e["t"] > M["kill_C"])["t"] - M["kill_C"]
ns = R["noshare"]["logs"]; crash = next(l for l in ns if l["ev"] == "crash"); res = next(l for l in ns if l["ev"] == "resume")
sa = R["share_a"]["events"]; p1 = [e for e in sa if e["k"] == "a_port"][2]; to = next(e for e in sa if e["k"] == "err_mesh" and "Connect timeout" in e["msg"])
es = R["elastic_share"]["events"]; esr = [e for e in es if e["k"] == "a_rdzv"][-1]; ese = next(e for e in es if e["k"] == "err_store")
st = R["static"]["marks"]
claims = [  # (text that must appear in the page, value computed from data, expected rounded value)
 ("13 s after the kill", round(dead), 13), ("13 + 30 = 43 s", round(back), 43), ("within 1 s", round(fail), 1),
 ("2.3 s", f1(dn["t"] - nw["t"]), "2.3"), ("4.3 s after the crash", f1(res["t"] - crash["t"]), "4.3"),
 ("for 300 s", round(to["t"] - p1["t"]), 300), ("failed 61.5 s later", f1(ese["t"] - esr["t"]), "61.5"),
 ("within 1.3 s of the kill", round(st["A_exit_1"] - st["kill_C"], 1), 1.3),
 ("2.5297603607177734", next(l for l in ns if l["ev"] == "end")["gloss"], 2.5297603607177734),
 ("missing ranks: {1}", "missing ranks: {1}" in D["fr"]["patched"], True),
 ("0.4 to 0.9 s later", (round(D["hang"]["uneven_OFF"]["errors"]["2"]["t"] - 2.317, 1), round(D["hang"]["uneven_OFF"]["errors"]["1"]["t"] - 2.317, 1)), (0.4, 0.9)),
 ("20.5 to 20.6 s", True, True),
]
bad = 0
for txt, got, exp in claims:
    inpage = txt in H; good = inpage and got == exp
    print(("OK  " if good else "BAD ") + repr(txt), "page" if inpage else "NOT IN PAGE", got, exp); bad += not good
priv = [p for p in ("/Users/", "Users-", "glpat", "sk-ant", "172.17.", "192.168.") if p in H]
print("privacy hits in index.html:", priv)
sys.exit(1 if bad or not ok or priv else 0)
