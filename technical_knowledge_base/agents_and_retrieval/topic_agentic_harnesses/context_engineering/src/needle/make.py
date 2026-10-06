#!/usr/bin/env python3
"""Build needle-test prompts from real Python 3.9 standard-library source (the haystack).
Tasks:
  lit   literal needle: RELEASE_PORT = 8371 ; question names RELEASE_PORT
  nolit non-literal needle (NoLiMa style): the release box sits next to the Semperoper ; question asks the city (Dresden)
  track state tracking: RETRY_LIMIT assigned 5 times at random depths; question asks the final value
Usage: make.py OUTDIR TARGET_TOKENS... (chars per token assumed 3.3 for sizing only; real counts come from the model usage)."""
import json, os, random, sys, glob

out = sys.argv[1]
targets = [int(x) for x in sys.argv[2:]]
os.makedirs(out, exist_ok=True)
lib = "/Applications/Xcode.app/Contents/Developer/Library/Frameworks/Python3.framework/Versions/3.9/lib/python3.9"
files = sorted(glob.glob(lib + "/*.py"))
rnd = random.Random(3)
rnd.shuffle(files)
lines = []
for f in files:
    lines.append(f"# ---- file: {os.path.basename(f)} ----")
    lines += open(f, encoding="utf-8", errors="replace").read().splitlines()
    if sum(len(l) + 1 for l in lines) > 3.3 * max(targets) * 1.1:
        break

def hay(n_tokens):
    budget = 3.3 * n_tokens
    acc, n = [], 0
    for l in lines:
        if n + len(l) + 1 > budget:
            break
        acc.append(l); n += len(l) + 1
    return acc

def insert(acc, depth, text):
    i = int(len(acc) * depth)
    # move to a blank line or a line start of a top-level statement so the needle reads as code
    return acc[:i] + [text] + acc[i:]

SYS = "You answer questions about a source file the user pastes. Reply with the answer only, no explanation."
Q = {
    "lit": ("What value is RELEASE_PORT set to in the file above?", "8371"),
    "nolit": ("In which city is the textstats release box located? Use what the file says plus general knowledge.", "dresden"),
    "track": ("The file above runs top to bottom. What is the value of RETRY_LIMIT at the end of the file?", None),
}
cases = []
for T in targets:
    base = hay(T)
    for depth in (() if os.environ.get("ONLY_TRACK") else (0.1, 0.3, 0.5, 0.7, 0.9)):
        for task, needle in (("lit", "RELEASE_PORT = 8371  # port of the textstats release box"),
                             ("nolit", "# Ops note: the textstats release box sits in the rack right next to the Semperoper.")):
            acc = insert(base, depth, needle)
            q, a = Q[task]
            cases.append({"id": f"{task}_{T}_{int(depth*100)}", "task": task, "target": T, "depth": depth, "answer": a,
                          "prompt": "<file>\n" + "\n".join(acc) + "\n</file>\n\n" + q})
    for seed in [int(x) for x in os.environ.get("SEEDS", "1,2,3").split(",")]:
        r = random.Random(seed * 100 + T)
        acc = list(base)
        vals = r.sample(range(2, 60), 5)
        depths = sorted(r.uniform(0.05, 0.95) for _ in range(5))
        for k, (d, v) in enumerate(reversed(list(zip(depths, vals)))):
            acc = insert(acc, d, f"RETRY_LIMIT = {v}")
        final = vals[-1]
        q, _ = Q["track"]
        cases.append({"id": f"track_{T}_s{seed}", "task": "track", "target": T, "depth": None, "answer": str(final),
                      "values_in_order": vals, "prompt": "<file>\n" + "\n".join(acc) + "\n</file>\n\n" + q})
json.dump({"system": SYS, "cases": cases}, open(os.path.join(out, "cases.json"), "w"))
print(len(cases), "cases", [len(c["prompt"]) for c in cases[:1]])
