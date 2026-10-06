"""Grade needle-test replies and write inputs/needle_<name>.json.
Usage: grade.py NAME CASES.json RESULTS.jsonl [more CASES RESULTS pairs]
lit and nolit: right if the expected answer appears in the reply (case-insensitive) and, for nolit, no other city is
named before it (a reply that says "Boston" and later mentions that the Semperoper is in Dresden is wrong).
track: the answer is the number after "final value is" or "end of the file is" if the reply says so, else the last
bold number, else the integer on the first line (the reply was asked to be the answer only); also recorded: how many
of the five assignments the reply listed, when it listed them."""
import json, os, re, sys
name, pairs = sys.argv[1], sys.argv[2:]
EM = chr(0x2014)
WRONG_CITIES = ["berlin", "boston", "munich", "vienna", "prague", "leipzig", "hamburg", "paris", "london", "new york", "san francisco", "seattle", "portland"]
rows, seen = [], set()
for cp, rp in zip(pairs[::2], pairs[1::2]):
    cases = {c["id"]: c for c in json.load(open(cp))["cases"]}
    for l in open(rp):
        r = json.loads(l)
        if r["id"] not in cases or r["id"] in seen:
            continue
        seen.add(r["id"])
        c = cases[r["id"]]
        rep = (r.get("reply") or "").strip()
        row = {"id": r["id"], "task": r["task"], "target": r["target"], "depth": r["depth"], "answer": r["answer"],
               "input_tokens": r.get("input_total") or ((r.get("usage") or {}).get("prompt_tokens")), "error": r.get("error"),
               "reply": rep[:600].replace(EM, ", ")}
        if r["task"] == "track":
            fin = None
            for pat in (r"final value is \**`?(?:RETRY_LIMIT = )?(\d+)", r"end of the file is \**`?(?:RETRY_LIMIT = )?(\d+)", r"\*\*(\d+)\*\*"):
                m = re.findall(pat, rep)
                if m:
                    fin = m[-1]; break
            if fin is None:
                m = re.match(r"^\W*(?:RETRY_LIMIT = )?(\d+)", rep)
                fin = m.group(1) if m else None
            row["final"] = fin
            row["ok"] = fin == r["answer"]
            listed = set(re.findall(r"RETRY_LIMIT = (\d+)", rep))
            row["listed"] = len(listed) if len(listed) >= 2 else None
            row["values_in_order"] = c.get("values_in_order")
        else:
            low = rep.lower(); i = low.find(r["answer"].lower())
            row["ok"] = i >= 0 and not (r["task"] == "nolit" and any(w in low[:i] for w in WRONG_CITIES))
        rows.append(row)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "inputs", f"needle_{name}.json")
json.dump({"rows": rows}, open(out, "w"), indent=0)
from collections import defaultdict
agg = defaultdict(lambda: [0, 0])
for r in rows:
    agg[(r["task"], r["target"])][0] += r["ok"]; agg[(r["task"], r["target"])][1] += 1
for k in sorted(agg, key=lambda x: (x[0], x[1])):
    print(k, agg[k])
