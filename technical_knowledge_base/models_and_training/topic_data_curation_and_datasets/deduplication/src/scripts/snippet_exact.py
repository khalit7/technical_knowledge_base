# Exact dedup at three units on run0's extracted documents (the code shown on the page, plus the loader).
import hashlib, re, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "src", "data"))
import load  # the running example's loader (root page, src/data/load.py)

docs = [d["text"] for d in load.run0("extracted")]

def h(s):                                   # 8 bytes of SHA-1 is plenty below ~10^9 items
    return hashlib.sha1(s.encode("utf-8")).digest()[:8]

def norm(s):                                # a light normalisation: case, punctuation, digits, spaces
    s = re.sub(r"\d", "0", s.lower())
    return " ".join(re.sub(r"[^\w\s]", " ", s).split())

seen_doc, seen_norm, seen_line = set(), set(), set()
dup_doc = dup_norm = lines = dup_lines = 0
for t in docs:
    k = h(t);           dup_doc += k in seen_doc;   seen_doc.add(k)
    k = h(norm(t));     dup_norm += k in seen_norm; seen_norm.add(k)
    for line in t.split("\n"):
        if line.strip():
            lines += 1; k = h(line)
            dup_lines += k in seen_line; seen_line.add(k)
print(f"documents {len(docs):,}: exact copies {dup_doc}, after normalising {dup_norm}")
print(f"non-blank lines {lines:,}: repeats of an earlier line {dup_lines:,} ({dup_lines/lines:.1%})")
