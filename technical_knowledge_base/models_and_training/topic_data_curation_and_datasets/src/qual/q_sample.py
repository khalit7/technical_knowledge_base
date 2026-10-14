"""Draw the stratified sample of run0 final documents for hand labelling (seed 0, 20 per stratum).
Strata by the two published classifiers at their published cut-offs:
  edu >= 2.5 is FineWeb-Edu's keep (int_score >= 3); dclm >= DCLM_CUT is DCLM-baseline's keep
  (DCLM_CUT = lowest fasttext_score among the first 50,000 DCLM-baseline rows, out/q_check_models.json).
  S1 both drop, edu < 1.5 | S2 both drop, edu 1.5-2.5 | S3 edu keeps, DCLM drops | S4 DCLM keeps, edu drops | S5 both keep
Writes $DC_SCRATCH/q/sample_for_labels.txt (texts to read; outside the repo) and out/q_sample_ids.json."""
import json
import random
import q_common as Q

L = Q.L
cut = json.load(open(Q.os.path.join(Q.OUT, "q_check_models.json")))["dclm_baseline_50k_min_score"]
sc = [json.loads(x) for x in open(Q.qdir("run0_final_scores.jsonl"))]
txt = {d["id"]: d["text"] for d in L.run0("final")}


def stratum(r):
    ek, dk = r["edu"] >= 2.5, r["dclm"] >= cut
    if ek and dk: return "S5"
    if ek: return "S3"
    if dk: return "S4"
    return "S1" if r["edu"] < 1.5 else "S2"


groups = {}
for r in sc:
    groups.setdefault(stratum(r), []).append(r)
rng = random.Random(0)
pick, sizes = [], {k: len(v) for k, v in sorted(groups.items())}
for k in sorted(groups):
    v = sorted(groups[k], key=lambda r: r["id"])
    pick += [(k, r) for r in rng.sample(v, min(20, len(v)))]
with open(Q.qdir("sample_for_labels.txt"), "w") as f:
    for n, (k, r) in enumerate(pick):
        t = txt[r["id"]]
        f.write(f"=== {n} {k} {r['id']} edu={r['edu']:.2f} dclm={r['dclm']:.4f} words={r['words']} url={r['url']}\n")
        f.write(t[:900].replace("\n", " / ") + ("" if len(t) <= 900 else " ...") + "\n")
Q.dump("q_sample_ids.json", {"dclm_cut": cut, "stratum_sizes": sizes, "ids": [[k, r["id"]] for k, r in pick]}, indent=1)
print(sizes, len(pick))
