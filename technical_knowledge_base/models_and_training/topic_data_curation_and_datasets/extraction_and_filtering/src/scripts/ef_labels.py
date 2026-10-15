"""Turn the hand labels (../labels/ef_labels_raw.json, by sample order) into the page's label data.

Adds the Pipeline lab's 8 labels per rule (root src/pipe/labels/drops.json, seed 0, same label letters) so each rule
has up to 28. For every group: counts of R/W/U (or K/J/U for kept), the wrong-drop share W/(R+W+U) with a 95% Wilson
interval, and the rows for the label browser: host, label, note, short excerpt. Excerpts: first 300 characters of the
trafilatura text, emails, phone numbers and IPs replaced, em-dashes written as '--'; rows flagged A (adult) or P
(private individual) keep their label but carry no host and no excerpt.
Output: src/data/ef_labels.json and the id -> label map in $DC_SCRATCH/data/ef/labels_by_id.json.
"""
import json
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402

EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE = re.compile(r"(?:\+?\d[\d ().-]{7,}\d)")
IP = re.compile(r"\b\d{1,3}(?:\.\d{1,3}){3}\b")


def scrub(t, n=300):
    t = " / ".join(x.strip() for x in t.split("\n") if x.strip())
    t = EMAIL.sub("email@example.com", t)
    t = IP.sub("0.0.0.0", t)
    t = PHONE.sub("[phone]", t)
    t = t.replace("—", "--")
    return t[:n] + ("..." if len(t) > n else "")


def wilson(k, n, z=1.96):
    if n == 0:
        return [0.0, 0.0]
    p = k / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return [round((c - h) / d, 3), round((c + h) / d, 3)]


def main():
    raw = json.load(open(os.path.join(E.SRC, "labels", "ef_labels_raw.json")))
    sample = list(E.read_jsonl_gz(E.scratch("label_sample.jsonl.gz")))
    by_group = {}
    for r in sample:
        by_group.setdefault(r["group"], []).append(r)
    order = {r["id"]: i for i, r in enumerate(E.read_jsonl_gz(E.pipe_scratch("rule_values.jsonl.gz")))}
    rows, by_id = [], {}
    for g, lab in raw["labels"].items():
        items = by_group[g]
        assert len(items) == len(lab), (g, len(items), len(lab))
        flags = raw["flags"].get(g, {})
        notes = raw["notes"].get(g, {})
        for j, (r, L) in enumerate(zip(items, lab)):
            f = flags.get(str(j), "")
            show = not f
            rows.append({"g": g, "src": "ef", "l": L, "f": f, "note": notes.get(str(j), ""), "d": order.get(r["id"], -1),
                         "host": r["host"] if not f else "", "t": scrub(r["text"]) if show else "",
                         "fw": int(r["in_fineweb"]), "v": {k: (round(x, 3) if isinstance(x, float) else x)
                                                           for k, x in r["v"].items()}})
            by_id[r["id"]] = {"g": g, "l": L}
    # the Pipeline lab's labels (seed 0)
    pipe = json.load(open(os.path.join(E.ROOT_SRC, "pipe", "labels", "drops.json")))
    for x in pipe:
        g = "kept" if x["group"] == "kept" else "drop:" + x["group"]
        rows.append({"g": g, "src": "pipe", "l": x["label"], "f": "", "note": x.get("note", ""),
                     "host": x.get("domain", ""), "t": "", "fw": None, "v": {}})
        by_id.setdefault(x["id"], {"g": g, "l": x["label"]})
    summ = {}
    for r in rows:
        s = summ.setdefault(r["g"], {"R": 0, "W": 0, "U": 0, "K": 0, "J": 0, "ef": 0, "pipe": 0})
        s[r["l"]] += 1
        s[r["src"]] += 1
    for g, s in summ.items():
        n = s["R"] + s["W"] + s["U"]
        if g == "kept":
            n = s["K"] + s["J"] + s["U"]
            s["junk_share"] = round(s["J"] / n, 3)
            s["junk_ci"] = wilson(s["J"], n)
        else:
            s["wrong_share"] = round(s["W"] / n, 3) if n else None
            s["wrong_ci"] = wilson(s["W"], n)
        s["n"] = n
    E.save("ef_labels.json", {"about": raw["_about"], "summary": summ,
                              "rows": [r for r in rows if r["src"] == "ef"]})
    with open(E.scratch("labels_by_id.json"), "w") as f:
        json.dump(by_id, f)
    for g, s in sorted(summ.items()):
        print(g, s)


if __name__ == "__main__":
    main()
