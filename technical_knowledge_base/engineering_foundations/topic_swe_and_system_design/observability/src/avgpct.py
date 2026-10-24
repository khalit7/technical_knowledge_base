"""Why averaged percentiles lie, on the real run (no new measurement): the three retrieval replicas in the incident phase (replica_stats.json): the mean of their p99s
against what the pooled p99 must be (a bound, since per-lookup times are not kept).
Writes out/avgpct.json, read by make_data.py."""
import json, os
S = os.path.dirname(os.path.abspath(__file__))
rs = json.load(open(os.path.join(S, "inputs", "replica_stats.json")))
reps = [{"label": k, "n": rs["incident/" + k]["n"], "p99": rs["incident/" + k]["p99_ms"], "median": rs["incident/" + k]["median_ms"]} for k in ("r1", "r2", "r3-cold")]
meanr = sum(r["p99"] for r in reps) / 3
ntot = sum(r["n"] for r in reps)
# pooled p99: the slowest 1% of all lookups (ceil(0.01*n)) all come from r3-cold, whose median is 909.7 ms,
# and they are the top of r3-cold's 103 lookups, so the pooled p99 is at least r3-cold's median.
top = -(-ntot // 100)
out = {"replicas": {"parts": reps, "mean_of_p99": round(meanr, 1), "pooled_lower_bound": reps[2]["median"], "n": ntot, "top1pct": top}}
os.makedirs(os.path.join(S, "out"), exist_ok=True)
json.dump(out, open(os.path.join(S, "out", "avgpct.json"), "w"), indent=1)
print(json.dumps(out, indent=1))
