"""C4's rule ("discard all but one of any three-sentence span occurring more than once") with datatrove's own
SentenceDedup steps (pipeline/dedup/sentence_dedup.py), on run0's 'filtered' (before MinHash) and 'final' (after).
Writes $DC_SCRATCH/dedup/sent_<stage>/ and out/dd_sent.json.
Note: SentenceDedupSignature.__init__ reads config.hash_config from its argument (sentence_dedup.py:96), so passing
config=None fails; always pass a SentDedupConfig.
"""
import glob
import gzip
import json
import multiprocessing
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dd_common as C  # noqa: E402

multiprocessing.set_start_method("fork", force=True)
from datatrove.executor import LocalPipelineExecutor  # noqa: E402
from datatrove.pipeline.dedup import SentenceDedupFilter, SentenceDedupSignature, SentenceFindDedups  # noqa: E402
from datatrove.pipeline.dedup.sentence_dedup import SentDedupConfig  # noqa: E402
from datatrove.pipeline.readers import JsonlReader  # noqa: E402
from datatrove.pipeline.writers import JsonlWriter  # noqa: E402

cfg = SentDedupConfig(n_sentences=3, split_sentences=True, only_dedup_in_index=True, min_doc_words=50)
res = {}
for stage in ("filtered", "final"):
    W = C.work(f"sent_{stage}")
    shutil.rmtree(W, ignore_errors=True)
    src = C.L.path("run0", stage)
    LocalPipelineExecutor(pipeline=[JsonlReader(src), SentenceDedupSignature(output_folder=f"{W}/sigs", config=cfg)],
                          tasks=1, workers=1, logging_dir=f"{W}/logs/1").run()
    LocalPipelineExecutor(pipeline=[SentenceFindDedups(data_folder=f"{W}/sigs", output_folder=f"{W}/dups", config=cfg)],
                          tasks=1, workers=1, logging_dir=f"{W}/logs/2").run()
    LocalPipelineExecutor(pipeline=[JsonlReader(src),
                                    SentenceDedupFilter(data_folder=f"{W}/dups", config=cfg,
                                                        exclusion_writer=JsonlWriter(f"{W}/removed")),
                                    JsonlWriter(f"{W}/out")], tasks=1, workers=1, logging_dir=f"{W}/logs/3").run()
    st = json.load(open(glob.glob(f"{W}/logs/3/stats.json")[0]))
    flat = {}
    for step in st:
        for k, v in step.get("stats", {}).items():
            flat[f"{step['name']}:{k}"] = v["total"] if isinstance(v, dict) else v
    din = [C.clean_doc(d) for d in C.L.run0(stage)]
    dout = []
    for fn in sorted(glob.glob(f"{W}/out/*.jsonl.gz")):
        dout += [json.loads(l) for l in gzip.open(fn, "rt")]
    cin, cout = sum(len(d["text"]) for d in din), sum(len(d["text"]) for d in dout)
    byid = {d["id"]: d["text"] for d in dout}
    changed = sum(1 for d in din if d["id"] in byid and byid[d["id"]] != d["text"])
    res[stage] = {"docs_in": len(din), "docs_out": len(dout), "docs_dropped": len(din) - len(dout),
                  "docs_shortened": changed, "chars_in": cin, "chars_out": cout,
                  "stats": {k: v for k, v in flat.items() if "sentences" in k or "dropped" in k or "forwarded" in k}}
    print(stage, res[stage])
C.save("dd_sent.json", res)
