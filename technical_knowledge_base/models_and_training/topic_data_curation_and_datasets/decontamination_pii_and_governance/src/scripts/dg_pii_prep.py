"""Inputs for the PII lab: the synthetic hand-labelled set (src/inputs/pii_synthetic.txt -> text plus gold spans) and
the real, already scrubbed text of run0's final output (2,617 documents after datatrove's PIIFormatter).

Writes $DC_SCRATCH/data/dg/pii/{synthetic,run0_final}.jsonl and returns the gold spans of the synthetic set.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dg_common as C  # noqa: E402

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "inputs", "pii_synthetic.txt")
MARK = re.compile(r"\[\[([A-Z]+):(.+?)\]\]")


def synthetic():
    rows = []
    for line in open(SRC, encoding="utf-8"):
        line = line.rstrip("\n")
        if not line or line.startswith("#"):
            continue
        note = ""
        if "  ## " in line:
            line, note = line.split("  ## ", 1)
        text, gold, pos = "", [], 0
        for m in MARK.finditer(line):
            text += line[pos:m.start()]
            s = len(text)
            text += m.group(2)
            gold.append({"s": s, "e": len(text), "t": m.group(1)})
            pos = m.end()
        text += line[pos:]
        rows.append({"id": f"syn{len(rows):02d}", "text": text, "gold": gold, "neg": note})
    return rows


def main():
    od = C.out_dir("pii")
    rows = synthetic()
    with open(os.path.join(od, "synthetic.jsonl"), "w") as f:
        for r in rows:
            f.write(json.dumps({"id": r["id"], "text": r["text"]}) + "\n")
    with open(os.path.join(od, "run0_final.jsonl"), "w") as f:
        for d in C.L.run0("final"):
            f.write(json.dumps({"id": d["id"], "text": d["text"]}) + "\n")
    print(len(rows), "synthetic rows,", sum(len(r["gold"]) for r in rows), "gold spans")


if __name__ == "__main__":
    main()
