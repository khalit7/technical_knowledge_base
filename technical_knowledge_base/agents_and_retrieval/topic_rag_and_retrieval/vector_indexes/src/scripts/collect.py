"""Collect the experiment outputs ($RAG_SCRATCH/vix/out/*.json and the Quora embedding log) into the page's small
data file ../data/results.json (only what the page shows). Run after the e_*.py scripts."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json

import vixlib as V

O = lambda n: V.load_out(n)
R = {}
R["ivf"] = O("ivf")
h = O("hnsw")
R["hnsw"] = h
pc = O("port_check_5183_16_200")
pc.pop("diff_examples", None)
R["port_check"] = pc
R["variants"] = O("variants")
R["vamana"] = O("vamana_scifact")
R["scann"] = O("scann")
R["updates"] = O("updates")
R["quant"] = O("quant")
f = O("filter")
R["filter"] = f
R["acorn"] = O("acorn")
R["qdrant"] = O("qdrant")
R["qdrant_paths"] = O("qdrant_paths")
R["bench"] = {}
for s in ("scifact", "all4", "quora"):
    b = O("bench_" + s)
    for r in b["rows"]:
        r.pop("bytes", None)
    R["bench"][s] = b
R["scale"] = O("scale") if os.path.exists(os.path.join(V.OUT, "scale.json")) else None
R["quora_embed"] = json.load(open(os.path.join(V.WORK, "quora", "embed_log.json")))
json.dump(R, open(os.path.join(V.DATA, "results.json"), "w"), separators=(",", ":"))
print("bytes", os.path.getsize(os.path.join(V.DATA, "results.json")))
