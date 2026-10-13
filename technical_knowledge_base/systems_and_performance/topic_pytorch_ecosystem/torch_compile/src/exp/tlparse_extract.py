"""Summarise a tlparse report (made from trace_run.py's TORCH_TRACE log with tlparse 0.4.3) into ../inputs/tlparse.json:
each compile id, the artifacts tlparse lists for it (names with their sequence numbers and hashes removed), and the first
lines of the graph-break and recompile files. Usage: PY tlparse_extract.py <tlparse output dir>"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import clean, save
D = sys.argv[1]
cd = json.load(open(os.path.join(D, "compile_directory.json")))
out = []
for cid, v in cd.items():
    arts = v.get("artifacts", [])
    row = {"id": cid, "artifacts": [re.sub(r"_[a-z0-9]{40,}", "", re.sub(r"_\d+(\.\w+)$", r"\1", a["name"])) for a in arts], "notes": {}}
    for a in arts:
        if a["name"].startswith(("dynamo_graph_break_reason", "recompile_reasons", "dynamo_error")):
            txt = open(os.path.join(D, a["url"])).read()
            row["notes"][re.sub(r"_\d+(\.\w+)$", r"\1", a["name"])] = clean(txt)[:700]
    out.append(row)
save("tlparse.json", {"tlparse": "0.4.3", "compiles": out})
for r in out:
    print(r["id"], len(r["artifacts"]), list(r["notes"]))
