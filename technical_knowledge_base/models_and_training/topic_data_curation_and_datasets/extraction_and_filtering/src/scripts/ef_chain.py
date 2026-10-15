"""The same FineWeb-style filter chain (run0's arguments: LanguageFilter(['en']), Gopher repetition, Gopher quality,
C4 without the terminal-punctuation rule, FineWeb quality; datatrove 0.10.1 objects from the root's pip_common.chain)
on the text of every extractor this page ran, for the same 20,280 pages (shared venv).

Extractors: traf111 (run0's text, from the Pipeline lab), res (resiliparse, Dolma settings), wet (Common Crawl WET),
plus this page's: justext, readability, traf231 (trafilatura 2.3.1), traf111_nodedup / traf111_dedup /
traf111_shuffled (trafilatura 1.11 without a timeout, with and without its cross-document cache).
Output: src/data/ef_chain.json: per extractor, pages with text, characters, English, kept, kept and in FineWeb,
drops by step; and $DC_SCRATCH/data/ef/chain_<name>.jsonl.gz (id -> step dropped or kept).
"""
import collections
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402
sys.path.insert(0, os.path.join(E.ROOT_SRC, "pipe"))
L = E.L


def texts(name):
    if name in ("traf111", "res", "wet"):
        key = {"traf111": "traf", "res": "res", "wet": "wet"}[name]
        for r in E.extract_all():
            t = r[key] if not (key == "traf" and r["traf_status"] != "run0") else None
            yield r["id"], t
    elif name.startswith("traf111_"):
        for r in E.read_jsonl_gz(E.scratch(f"traf111_{name[8:]}.jsonl.gz")):
            yield r["id"], r["text"]
    else:
        for r in E.read_jsonl_gz(E.scratch(f"more_{name}.jsonl.gz")):
            yield r["id"], r["text"]


def main(names):
    import json
    import pip_common as P
    from datatrove.data import Document
    fw = set(L.ids("fineweb_kept"))
    try:
        res = E.load_json("ef_chain.json")
    except FileNotFoundError:
        res = {}
    for name in names:
        steps = P.chain()
        c = collections.Counter()
        out = []
        for i, t in texts(name):
            c["pages"] += 1
            if not t or not t.strip():
                c["no_text"] += 1
                out.append((i, "no_text"))
                continue
            c["with_text"] += 1
            c["chars"] += len(t)
            doc = Document(text=t, id=i, metadata={})
            step, _ = P.run_chain(doc, steps)
            if step != "2_lid":
                c["english"] += 1
            if step is None:
                c["kept"] += 1
                c["kept_chars"] += len(doc.text)
                if i in fw:
                    c["kept_in_fineweb"] += 1
                out.append((i, "kept"))
            else:
                c["drop_" + step] += 1
                out.append((i, step))
        E.write_jsonl_gz(E.scratch(f"chain_{name}.jsonl.gz"), [{"id": i, "o": o} for i, o in out])
        res[name] = dict(c)
        print(name, dict(c), flush=True)
        E.save("ef_chain.json", res)
    print(json.dumps(res)[:400])


if __name__ == "__main__":
    main(sys.argv[1:])
