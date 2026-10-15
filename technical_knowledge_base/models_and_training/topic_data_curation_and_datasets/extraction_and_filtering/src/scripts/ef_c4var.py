"""C4's two numbers, as datatrove ships them and as the T5 paper states them (shared venv, datatrove 0.10.1).

datatrove's C4QualityFilter defaults: min_num_sentences=5, min_words_per_line=3 (c4_filters.py:66-67); the T5 paper
(arXiv 1910.10683, section 2.2) and TFDS c4_utils.py (_MIN_NUM_SENTENCES = 3, _MIN_WORDS_PER_LINE = 5, lines 41-42)
say 3 sentences and 5 words. The whole run0 chain (FineWeb settings otherwise) is run on the 6,971 English documents
with the four combinations; reports kept, kept and in FineWeb, characters kept.
Output: src/data/ef_c4var.json
"""
import collections
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402
sys.path.insert(0, os.path.join(E.ROOT_SRC, "pipe"))
L = E.L


def main():
    import pip_common as P
    from datatrove.data import Document
    eng = {r["id"] for r in E.read_jsonl_gz(E.pipe_scratch("rule_values.jsonl.gz"))}
    fw = set(L.ids("fineweb_kept"))
    docs = [(d["id"], d["text"]) for d in L.run0("extracted") if d["id"] in eng]
    res = {}
    for sent, words in ((5, 3), (3, 5), (5, 5), (3, 3)):
        steps = P.chain(c4_kwargs={"min_num_sentences": sent, "min_words_per_line": words})[1:]  # LID already passed
        c = collections.Counter()
        for i, t in docs:
            doc = Document(text=t, id=i, metadata={})
            step, _ = P.run_chain(doc, steps)
            if step is None:
                c["kept"] += 1
                c["kept_chars"] += len(doc.text)
                c["kept_in_fineweb"] += i in fw
            else:
                c[step] += 1
        res[f"s{sent}_w{words}"] = dict(c)
        print(sent, words, dict(c), flush=True)
    E.save("ef_c4var.json", res)


if __name__ == "__main__":
    main()
