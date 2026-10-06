"""Dump Graphiti entity nodes (name, summary) and episode count from FalkorDB. Usage: python dump_nodes.py GRAPH OUT.json"""
import json, sys
from falkordb import FalkorDB
g = FalkorDB(host="127.0.0.1", port=6380).select_graph(sys.argv[1])
nodes = g.query("MATCH (n:Entity) RETURN n.name, n.summary, labels(n)").result_set
eps = g.query("MATCH (e:Episodic) RETURN count(e)").result_set
json.dump({"entities": [{"name": a, "summary": b, "labels": c} for a, b, c in nodes], "episodes": eps[0][0]}, open(sys.argv[2], "w"), indent=1)
print(len(nodes), "entities", eps[0][0], "episodes")
