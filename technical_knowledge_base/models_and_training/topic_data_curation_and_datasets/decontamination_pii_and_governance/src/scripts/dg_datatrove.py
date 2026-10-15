"""datatrove 0.10.1's own n-gram decontamination (pipeline/decont/n_grams.py) on the running example.

NGramsDecontIndexer cannot be constructed without lighteval installed, even when you feed it your own documents:
PipelineStep.__new__ checks _requires_dependencies (pipeline/base.py:29-31) and the indexer lists "lighteval"
(n_grams.py:68), and its run() imports lighteval unconditionally (n_grams.py:138). So this script builds the index
files with the indexer's own compute_hashes (n_grams.py:94-118, called on a stand-in self with the same tokenizer,
config and hash function) and writes them in the indexer's format (one <task>.index.hashes of uint64 per task,
n_grams.py:157-164). The filter is datatrove's own NGramsDecontFilter, unmodified.

Defaults (NGramsDecontConfig, n_grams.py:45-49): 12-grams; label n-grams plus n-grams that straddle the end of the
query and the start of the label; query-only n-grams off; text normalised with numbers replaced by 0.

Output: $DC_SCRATCH/data/dg/datatrove/<corpus>.json (removed doc ids with the task and n-gram that fired).
"""
import json
import os
import sys
import time
from types import SimpleNamespace

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dg_common as C  # noqa: E402


def build_index(folder, find_query_ngrams=False):
    from datatrove.pipeline.decont.n_grams import NGramsDecontConfig, NGramsDecontIndexer
    from datatrove.utils.hashing import create_hash_func
    from datatrove.utils.word_tokenizers import load_word_tokenizer
    try:
        NGramsDecontIndexer(output_folder=folder)
        print("indexer constructed (lighteval present)")
    except Exception as e:  # expected without lighteval
        print("NGramsDecontIndexer(...) fails without lighteval:", type(e).__name__, str(e)[:120])
    cfg = NGramsDecontConfig(find_query_ngrams=find_query_ngrams)
    fake = SimpleNamespace(tokenizer=load_word_tokenizer("en"), config=cfg, hash_func=create_hash_func(cfg.hash_config))
    by = {}
    for it in C.bench_items():
        by.setdefault(it["bench"], set()).update(NGramsDecontIndexer.compute_hashes(fake, it["label"], it["query"]))
    os.makedirs(folder, exist_ok=True)
    for b, hs in by.items():
        np.array(sorted(hs), dtype=np.uint64).tofile(os.path.join(folder, f"{b}.index.hashes"))
    return {b: len(h) for b, h in by.items()}, cfg


def run(corpus, folder, cfg):
    from datatrove.data import Document
    from datatrove.pipeline.decont.n_grams import NGramsDecontFilter
    f = NGramsDecontFilter(index_folder=folder, config=cfg)
    removed = []
    n = 0
    for doc_id, text in C.corpus_iter(corpus):
        n += 1
        d = Document(text=text or "", id=str(doc_id), metadata={})
        res = f.filter(d)
        if res is not True:
            removed.append({"doc": doc_id, "task": d.metadata.get("contaminated_task"),
                            "ngram": d.metadata.get("contaminated_ngram")})
    return n, removed


def main():
    mode = sys.argv[1]  # "default" or "query"
    corpora = sys.argv[2:] or [c for c in C.CORPORA if not c.endswith("_file0")]
    folder = C.out_dir("datatrove", f"index_{mode}")
    sizes, cfg = build_index(folder, find_query_ngrams=(mode == "query"))
    print("index sizes", sizes, flush=True)
    od = C.out_dir("datatrove")
    for c in corpora:
        t0 = time.time()
        n, rem = run(c, folder, cfg)
        json.dump({"corpus": c, "mode": mode, "docs": n, "removed": rem, "index_sizes": sizes},
                  open(os.path.join(od, f"{c}.{mode}.json"), "w"))
        print(c, mode, n, len(rem), round(time.time() - t0), "s", flush=True)


if __name__ == "__main__":
    main()
