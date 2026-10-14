"""Bloom-filter paragraph dedup with the real Dolma toolkit (dolma 1.2.1, its own venv), false positives measured.

Input: run0 'extracted' (19,241 documents, every language), the stage where line boilerplate is densest.
Dolma's paragraph mode (src/deduper.rs) splits on "\n", and for each non-empty paragraph: if the Bloom filter contains
its hashes, the paragraph is marked as a duplicate span, else its hashes are inserted. A Bloom filter has no false
negatives, so every real repeat is marked and every extra mark is a false positive: FP = marked - exact repeats.
For each filter size we run dolma three times (its hash seeds are random per run: bloom_filter.rs new()).
Expected FPs from the formula: each new paragraph j is wrongly marked with probability (1 - exp(-k j / m))^k.
Also shows a source finding: with --dedupe.min_words > 0 the paragraph branch never dedupes (deduper.rs 338-380).
Writes out/dd_bloom.json; documents and attributes in $DC_SCRATCH/dedup/bloom/.
"""
import glob
import gzip
import hashlib
import json
import math
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dd_common as C  # noqa: E402

DOLMA = os.path.join(C.L.scratch(), "venv_dolma", "bin", "dolma")
W = C.work("bloom")
docs_dir = os.path.join(W, "documents")
if not os.path.exists(os.path.join(docs_dir, "part.jsonl.gz")):
    os.makedirs(docs_dir, exist_ok=True)
    with gzip.open(os.path.join(docs_dir, "part.jsonl.gz"), "wt") as f:
        for d in C.L.run0("extracted"):
            f.write(json.dumps({"id": d["id"], "text": d["text"], "source": "cc"}) + "\n")

# exact counts with the same semantics (split on "\n", skip empty after trim, keep first)
seen, total, rep = set(), 0, 0
for line in gzip.open(os.path.join(docs_dir, "part.jsonl.gz"), "rt"):
    for p in json.loads(line)["text"].split("\n"):
        if not p.strip():
            continue
        total += 1
        k = hashlib.blake2b(p.encode(), digest_size=8).digest()
        if k in seen:
            rep += 1
        else:
            seen.add(k)
uniq = total - rep
print("paragraphs", total, "exact repeats", rep, "unique", uniq)


def dolma(size_bytes, name, extra=()):
    att = os.path.join(W, "attributes", name)
    shutil.rmtree(att, ignore_errors=True)
    bf = os.path.join(W, f"{name}.bloom")
    if os.path.exists(bf):
        os.remove(bf)
    cmd = [DOLMA, "dedupe", "--documents", os.path.join(docs_dir, "*.jsonl.gz"), "--dedupe.name", name,
           "--dedupe.paragraphs.attribute_name", "dup", "--dedupe.skip_empty", "--bloom_filter.file", bf,
           "--bloom_filter.size_in_bytes", str(size_bytes), "--no-bloom_filter.read_only",
           "--bloom_filter.estimated_doc_count", str(uniq), "--bloom_filter.desired_false_positive_rate", "0.001",
           "--processes", "1", *extra]
    p = subprocess.run(cmd, capture_output=True, text=True, env={**os.environ, "RAYON_NUM_THREADS": "4"})
    assert p.returncode == 0, p.stderr[-3000:]
    marked = 0
    for fn in glob.glob(os.path.join(W, "attributes", name, "**", "*.gz"), recursive=True):
        for line in gzip.open(fn, "rt"):
            a = json.loads(line)["attributes"]
            marked += len(a.get("dup", []))
    if os.path.exists(bf):
        os.remove(bf)
    return marked


def k_opt(size_bytes, n):  # BloomFilter::optimal_number_of_hashers, bloom_filter.rs 27-32
    return math.ceil(size_bytes * 8 / n * math.log(2))


def expected_fp(m_bits, k, n_unique):
    return sum((1 - math.exp(-k * j / m_bits)) ** k for j in range(n_unique))


def final_p(m_bits, k, n):  # BloomFilter::prob_of_false_positive, bloom_filter.rs 34-43
    return (1 - (1 - 1 / m_bits) ** (k * n)) ** k


res = {"paragraphs": total, "exact_repeats": rep, "unique": uniq, "sizes": []}
for size in [64 * 2 ** 20, 2 ** 20, 512 * 2 ** 10, 256 * 2 ** 10, 128 * 2 ** 10, 64 * 2 ** 10]:
    m = size * 8
    k = k_opt(size, uniq)
    runs = [dolma(size, f"s{size}_{r}") - rep for r in range(3)]
    row = {"bytes": size, "bits_per_unique": round(m / uniq, 2), "k": k, "fp_runs": runs,
           "fp_expected": round(expected_fp(m, k, uniq), 1), "p_final_formula": final_p(m, k, uniq)}
    res["sizes"].append(row)
    print(row, flush=True)
res["min_words_bug"] = {"marked_with_min_words_1": dolma(64 * 2 ** 20, "minwords", ["--dedupe.min_words", "1"]),
                        "exact_repeats": rep}
print(res["min_words_bug"])
C.save("dd_bloom.json", res)
