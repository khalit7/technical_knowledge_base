"""Toy check: the same 12 toy documents through the Dolma toolkit's tag -> dedupe -> mix design.
Run with the Dolma venv, outside the repo:  <venv_dolma>/bin/python -I toy_dolma.py <toy_docs.jsonl> <workdir> <out.json>
1. dolma tag: gopher_v1, c4_v1, pii_regex_with_counts_fast_v2 write attribute files next to the documents.
2. dolma dedupe twice with Bloom filters: whole documents keyed on $.text, then paragraphs (split on newlines).
3. dolma mix: exclude rules written here to mirror datatrove's Gopher and C4 defaults (the toolkit ships taggers,
   not thresholds: the thresholds are always the user's), span replacement deletes duplicate paragraphs, C4's
   no-terminal-punctuation lines and PII spans.
Records, per document, which rule removed it or what changed."""
import gzip, json, os, shutil, subprocess, sys, time, glob
src, work, out = sys.argv[1], sys.argv[2], sys.argv[3]
BIN = os.path.join(os.path.dirname(sys.executable), "dolma")
shutil.rmtree(work, ignore_errors=True)
docs_dir = os.path.join(work, "documents"); os.makedirs(docs_dir)
rows = [json.loads(l) for l in open(src)]
with gzip.open(os.path.join(docs_dir, "toy.jsonl.gz"), "wt") as f:
    for r in rows:
        f.write(json.dumps({"id": r["id"], "text": r["text"], "source": r["source"], "added": r["added"]}) + "\n")
DOCS = os.path.join(docs_dir, "*.jsonl.gz")
env = dict(os.environ, OMP_NUM_THREADS="2", RAYON_NUM_THREADS="2")


def run(args, cfg=None):
    if cfg is not None:
        p = os.path.join(work, args[0] + "_" + str(len(glob.glob(os.path.join(work, "*.json")))) + ".json")
        json.dump(cfg, open(p, "w"), indent=1)
        args = ["-c", p] + args
    r = subprocess.run([BIN] + args, capture_output=True, text=True, env=env)
    if r.returncode:
        print(r.stdout[-2000:], r.stderr[-3000:]); sys.exit(1)


t0 = time.time()
TAGGERS = ["gopher_v1", "c4_v1", "pii_regex_with_counts_fast_v2"]
run(["tag", "--documents", DOCS, "--experiment", "exp", "--taggers", *TAGGERS, "--processes", "1"])
run(["dedupe"], {"documents": [DOCS], "processes": 1,
                 "dedupe": {"name": "dup_doc", "documents": {"key": "$.text", "attribute_name": "bff_duplicate_doc"}, "skip_empty": True},
                 "bloom_filter": {"file": os.path.join(work, "bloom_doc.bin"), "read_only": False, "estimated_doc_count": 1000, "desired_false_positive_rate": 1e-6}})
run(["dedupe"], {"documents": [DOCS], "processes": 1,
                 "dedupe": {"name": "dup_para", "paragraphs": {"attribute_name": "bff_duplicate_paragraph_spans"}, "skip_empty": True},
                 "bloom_filter": {"file": os.path.join(work, "bloom_para.bin"), "read_only": False, "estimated_doc_count": 1000, "desired_false_positive_rate": 1e-6}})
G = "exp__gopher_v1__"
def lt(a, v): return f"$.attributes[?(@.{a} && @.{a}[0] && @.{a}[0][2] < {v})]"
def gt(a, v): return f"$.attributes[?(@.{a} && @.{a}[0] && @.{a}[0][2] > {v})]"
def has(a): return f"$.attributes[?(@.{a} && @.{a}[0])]"
RULES = [  # (label, expression); mirrors datatrove's GopherQuality / GopherRepetition / C4 defaults where Dolma has the attribute
    ("gopher: fewer than 50 words", lt(G + "word_count", 50)),
    ("gopher: more than 100,000 words", gt(G + "word_count", 100000)),
    ("gopher: median word length outside 3 to 10", lt(G + "median_word_length", 3)),
    ("gopher: median word length outside 3 to 10", gt(G + "median_word_length", 10)),
    ("gopher: symbol to word ratio above 0.1", gt(G + "symbol_to_word_ratio", 0.1)),
    ("gopher: over 90% of lines start with a bullet", gt(G + "fraction_of_lines_starting_with_bullet_point", 0.9)),
    ("gopher: over 30% of lines end with an ellipsis", gt(G + "fraction_of_lines_ending_with_ellipsis", 0.3)),
    ("gopher: under 80% of words contain a letter", lt(G + "fraction_of_words_with_alpha_character", 0.8)),
    ("gopher: fewer than 2 of the required stop words", lt(G + "required_word_count", 2)),
    ("gopher repetition: over 30% duplicate lines", gt(G + "fraction_of_duplicate_lines", 0.3)),
    ("gopher repetition: over 20% of characters in duplicate lines", gt(G + "fraction_of_characters_in_duplicate_lines", 0.2)),
    ("gopher repetition: top 2-gram over 20% of characters", gt(G + "fraction_of_characters_in_most_common_2grams", 0.2)),
    ("gopher repetition: top 3-gram over 18% of characters", gt(G + "fraction_of_characters_in_most_common_3grams", 0.18)),
    ("gopher repetition: top 4-gram over 16% of characters", gt(G + "fraction_of_characters_in_most_common_4grams", 0.16)),
    ("gopher repetition: duplicate 5-grams over 15% of characters", gt(G + "fraction_of_characters_in_duplicate_5grams", 0.15)),
    ("c4: contains lorem ipsum", has("exp__c4_v1__has_lorem_ipsum")),
    ("c4: contains a curly bracket", has("exp__c4_v1__has_curly_brace")),
    ("Bloom filter: exact duplicate document", has("bff_duplicate_doc")),
]
attrs_present = {}
for f in glob.glob(os.path.join(work, "attributes", "*", "*.jsonl.gz")):
    for line in gzip.open(f, "rt"):
        d = json.loads(line); attrs_present.setdefault(d["id"], {}).update(d["attributes"])
stream = {"name": "toy", "documents": [DOCS], "attributes": ["exp", "dup_doc", "dup_para"],
          "output": {"path": os.path.join(work, "mixed"), "max_size_in_bytes": 10_000_000},
          "filter": {"exclude": [r[1] for r in RULES]},
          "span_replacement": [{"span": "$.attributes.bff_duplicate_paragraph_spans", "min_score": 0.5, "replacement": ""},
                               {"span": "$.attributes.exp__c4_v1__lines_with_no_ending_punctuation", "min_score": -1, "replacement": ""}]}
pii_keys = sorted({k for a in attrs_present.values() for k in a if k.startswith("exp__pii") and ("EMAIL" in k or "IP" in k)})
for k in pii_keys:
    stream["span_replacement"].append({"span": "$.attributes." + k, "min_score": -1, "replacement": "|||PII|||"})
run(["mix"], {"streams": [stream], "processes": 1})
mixed = {}
for f in glob.glob(os.path.join(work, "mixed", "*")):
    op = gzip.open if f.endswith(".gz") else open
    for line in op(f, "rt"):
        d = json.loads(line); mixed[d["id"]] = d["text"]


def first_rule(a):
    """Re-evaluate the exclude rules in Python on the attribute values, to name the first rule that fired."""
    def v(k):
        x = a.get(k); return x[0][2] if x and x[0] and len(x[0]) > 2 else (1 if x else None)
    for label, expr in RULES:
        k = expr.split("@.")[1].split(" ")[0]
        val = v(k)
        if val is None: continue
        if " < " in expr and val < float(expr.rsplit("< ", 1)[1].split(")")[0]): return label, val
        if " > " in expr and val > float(expr.rsplit("> ", 1)[1].split(")")[0]): return label, val
        if " < " not in expr and " > " not in expr: return label, val
    return None, None


res = {}
for r in rows:
    i, a = r["id"], attrs_present.get(r["id"], {})
    if i in mixed and mixed[i].strip():
        res[i] = {"dropped_at": None, "changed": mixed[i] != r["text"], "text_after": mixed[i] if mixed[i] != r["text"] else None,
                  "dup_paragraphs": len(a.get("bff_duplicate_paragraph_spans") or [])}
    elif i in mixed:
        res[i] = {"dropped_at": "emptied", "reason": "every paragraph removed by span replacement"}
    else:
        lab, val = first_rule(a)
        res[i] = {"dropped_at": "mix", "reason": lab, "value": val}
import importlib.metadata as md
json.dump({"tool": "dolma", "version": md.version("dolma"), "taggers": TAGGERS, "rules": [r[0] for r in RULES], "pii_attributes": pii_keys,
           "docs": res, "seconds": round(time.time() - t0, 1)}, open(out, "w"), indent=1)
print(json.dumps({k: (v.get("dropped_at"), v.get("reason")) for k, v in res.items()}))
