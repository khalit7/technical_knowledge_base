"""Check that the page embeds exactly the data built from src/recordings, and that the numbers and claims written
in the prose agree with the recordings. Usage: python3 check_numbers.py   (after sh build.sh)"""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "code"))
from conv import QUESTIONS, grade
part = open(os.path.join(HERE, "parts", "22_js_fmem_data.js")).read()
page = open(os.path.join(HERE, "..", "index.html")).read()
ok = n = 0
def chk(name, cond):
    global ok, n
    n += 1; ok += bool(cond)
    print(("ok   " if cond else "FAIL ") + name)
# 1. data part regenerates identically and is embedded verbatim
subprocess.run([sys.executable, os.path.join(HERE, "build_data.py")], check=True, capture_output=True)
chk("data part regenerates identically", open(os.path.join(HERE, "parts", "22_js_fmem_data.js")).read() == part)
chk("page embeds the data part verbatim", part.strip() in page)
F = json.loads(part.split("window.FMEM=", 1)[1].rstrip().rstrip(";").replace("<\\/", "</"))
R = lambda n: json.load(open(os.path.join(HERE, "recordings", n)))
# 2. grades recomputed from the redacted answers
ans = R("answers.json"); QI = {q["id"]: q for q in QUESTIONS}
for k, d in ans.items():
    chk(f"grades {k}", all(F["A"][k][q][1] == grade(QI[q], d[q]["answer"]) for q in d))
# 3. prose claims
A = F["A"]
chk("Mem0 re-dated the tests/ deletion to 26 September", "26" in A["mem0|haiku"]["q_incident_when"][0] and not A["mem0|haiku"]["q_incident_when"][1])
chk("Mem0 fallback total summed duplicates (61)", "61" in A["mem0|haiku"]["q_fallback_total"][0])
chk("full history dated the deletion to the report day (17)", "17" in A["full|haiku"]["q_incident_when"][0] and not A["full|haiku"]["q_incident_when"][1])
chk("full history put the outage first (wrong order)", not A["full|haiku"]["q_order"][1])
g = R("graphiti_haiku.json"); facts = " ".join(e["fact"].lower() for e in g["sessions"][-1]["edges"]); summ = " ".join((x["summary"] or "").lower() for x in g["nodes"]["entities"])
for kw in ["200", "143", "four", "python3 tests", "friday", "outline"]:
    chk(f"Graphiti (Haiku) has no edge or summary with '{kw}'", kw not in facts and kw not in summ)
chk("NFC reached entity summaries but no edge", "nfc" in summ and "nfc" not in facts)
chk("every Graphiti closed edge is judged", all(x.get("v") for x in F["GR"]["haiku"]["e"] if x["sc"] is not None))
chk("Graphiti local lost at least one episode", "local" not in F["GR"] or any(F["GR"]["local"]["err"]))
p = R("mem0_haiku.json")
chk("Mem0 events are all ADD", all(e.get("event", "ADD") == "ADD" for s in p["sessions"] for e in s["events"]))
chk("paper loop (local) lost session 5 silently (bulleted reply)", any(x[0] == 4 and x[1].lstrip().startswith("-") for x in F["PA"]["local"]["lost"]))
chk("Letta notes hold the evidence its searches missed", F["V"]["ev.lettastore"] > F["V"]["ev.letta"])
lt = F.get("LT")
if lt:
    chk("Letta core block barely changed after session 1", lt["ses"][-1]["h"].strip() == lt["ses"][0]["h"].strip() or len(lt["ses"][-1]["h"]) < 400)
print(f"{ok}/{n} checks passed")
sys.exit(0 if ok == n else 1)
