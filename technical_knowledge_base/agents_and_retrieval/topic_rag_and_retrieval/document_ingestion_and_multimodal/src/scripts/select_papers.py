"""Pick the QASPER validation papers whose PDFs this page parses.
usage: python -I select_papers.py <qasper_stats.json> <RAG_SCRATCH> <out.json>
12 papers drawn from those with a question answerable only from a table or figure, 12 from the rest; seed 0."""
import json, sys, os, random
import pandas as pd
st = json.load(open(sys.argv[1])); RS = sys.argv[2]
q = pd.read_parquet(os.path.join(RS, "data", "raw", "qasper", "validation.parquet"))
ids = sorted(q["id"].tolist())
flt = sorted(st["float_only_by_paper"])
rest = [i for i in ids if i not in set(flt)]
rng = random.Random(0)
a = rng.sample(flt, 12); b = rng.sample(rest, 12)
sel = sorted(a) + sorted(b)
json.dump({"seed": 0, "float_group": sorted(a), "random_group": sorted(b), "papers": sel}, open(sys.argv[3], "w"), indent=1)
print(sel)
