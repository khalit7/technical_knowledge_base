"""Rough cost per document of each filtering stage (shared venv, datatrove 0.10.1, one process, low priority).
Times every stage on the same documents: the URL filter on 5,000 URLs, lid.176 on 5,000 extracted documents, and the
Gopher repetition, Gopher quality, C4 and FineWeb filters on 2,000 English documents (each stage on its own, on the
text it would see). A shared, loaded machine: ratios between stages are the useful part.
Output: src/data/ef_cost.json
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402
sys.path.insert(0, os.path.join(E.ROOT_SRC, "pipe"))
L = E.L


def timeit(fn, docs):
    t0 = time.perf_counter()
    for d in docs:
        fn(d)
    return 1e6 * (time.perf_counter() - t0) / len(docs)  # microseconds per document


def main():
    import pip_common as P  # noqa: F401
    from datatrove.data import Document
    from datatrove.pipeline.filters import (URLFilter, LanguageFilter, GopherRepetitionFilter, GopherQualityFilter,
                                            C4QualityFilter, FineWebQualityFilter)
    eng = {r["id"] for r in E.read_jsonl_gz(E.pipe_scratch("rule_values.jsonl.gz"))}
    ex = [(d["id"], d["text"], d["metadata"]["url"]) for d in L.run0("extracted", limit=8000)]
    urls = [Document(text="", id=i, metadata={"url": u}) for i, _, u in ex[:5000]]
    lidd = [Document(text=t, id=i, metadata={}) for i, t, _ in ex[:5000]]
    en = [(i, t) for i, t, _ in ex if i in eng][:2000]
    uf = URLFilter()
    uf.filter(urls[0])  # load the lists once (not timed)
    lf = LanguageFilter(languages=["en"])
    lf.filter(lidd[0])
    res = {"url_filter": timeit(uf.filter, urls), "lid176": timeit(lf.filter, lidd)}
    for name, f in (("gopher_repetition", GopherRepetitionFilter()), ("gopher_quality", GopherQualityFilter()),
                    ("c4", C4QualityFilter(filter_no_terminal_punct=False)), ("fineweb", FineWebQualityFilter())):
        f.filter(Document(text=en[0][1], id="w"))
        res[name] = timeit(lambda d: f.filter(Document(text=d[1], id=d[0])), en)
    res = {k: round(v, 1) for k, v in res.items()}
    res["note"] = "microseconds per document, one process, nice 15, shared machine (rough)"
    res["docs"] = {"url": len(urls), "lid": len(lidd), "rules": len(en)}
    E.save("ef_cost.json", res)
    print(res)


if __name__ == "__main__":
    main()
