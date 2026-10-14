"""Toy check: run the 12 toy documents through a small datatrove pipeline and record, per document, the stage that
dropped it (or how it was changed). Same input as toy_dolma.py.
Run with the topic's shared venv, outside the repo:  <venv>/bin/python -I toy_datatrove.py <toy_docs.jsonl> <workdir> <out.json> [lid_model_dir]
Stages: (language ID if a lid.176 model is given) -> GopherRepetitionFilter -> GopherQualityFilter -> C4QualityFilter
-> PIIFormatter -> MinHash dedup (signatures, buckets, clusters, filter) with datatrove's default MinhashConfig."""
import json, os, sys, shutil, time, glob, gzip
os.environ.setdefault("OMP_NUM_THREADS", "2")
# macOS workarounds (as in the setup agent's run0.py): fork start method, and a stub for python-magic (WarcReader's
# fallback import; no WARC files are read here)
import types, importlib.machinery, multiprocessing
multiprocessing.set_start_method("fork", force=True)
_m = types.ModuleType("magic"); _m.__spec__ = importlib.machinery.ModuleSpec("magic", None); _m.from_buffer = lambda b, mime=True: "application/octet-stream"; sys.modules["magic"] = _m
import datatrove
from datatrove.executor import LocalPipelineExecutor
from datatrove.pipeline.readers import JsonlReader
from datatrove.pipeline.writers import JsonlWriter
from datatrove.pipeline.filters import GopherRepetitionFilter, GopherQualityFilter, C4QualityFilter, LanguageFilter
from datatrove.pipeline.formatters import PIIFormatter
from datatrove.pipeline.dedup import MinhashDedupSignature, MinhashDedupBuckets, MinhashDedupCluster, MinhashDedupFilter
from datatrove.pipeline.dedup.minhash import MinhashConfig

src, work, out = sys.argv[1], sys.argv[2], sys.argv[3]
shutil.rmtree(work, ignore_errors=True); os.makedirs(work)
indir = os.path.join(work, "in"); os.makedirs(indir); shutil.copy(src, os.path.join(indir, "toy.jsonl"))
stages = []
steps = [JsonlReader(indir, glob_pattern="*.jsonl")]
use_lid = False
try:
    from datatrove.pipeline.filters import LanguageFilter  # noqa
    if len(sys.argv) > 4:
        use_lid = True
except Exception:
    pass
if use_lid:
    steps.append(LanguageFilter(languages=["en"], language_threshold=0.65, exclusion_writer=JsonlWriter(os.path.join(work, "x_lang"), compression=None)))
    stages.append(("lang", "Language ID (lid.176, English score of at least 0.65)"))
steps += [GopherRepetitionFilter(exclusion_writer=JsonlWriter(os.path.join(work, "x_goph_rep"), compression=None)),
          GopherQualityFilter(exclusion_writer=JsonlWriter(os.path.join(work, "x_goph_qual"), compression=None)),
          C4QualityFilter(exclusion_writer=JsonlWriter(os.path.join(work, "x_c4"), compression=None)),
          PIIFormatter(),
          JsonlWriter(os.path.join(work, "filtered"), compression=None)]
stages += [("goph_rep", "Gopher repetition"), ("goph_qual", "Gopher quality"), ("c4", "C4 rules")]
t0 = time.time()
LocalPipelineExecutor(pipeline=steps, tasks=1, workers=1, logging_dir=os.path.join(work, "log1")).run()
cfg = MinhashConfig()
mh = os.path.join(work, "mh")
LocalPipelineExecutor(pipeline=[JsonlReader(os.path.join(work, "filtered")), MinhashDedupSignature(output_folder=mh + "/sigs", config=cfg)], tasks=1, workers=1, logging_dir=os.path.join(work, "log2")).run()
LocalPipelineExecutor(pipeline=[MinhashDedupBuckets(input_folder=mh + "/sigs", output_folder=mh + "/buckets", config=cfg)], tasks=cfg.num_buckets, workers=1, logging_dir=os.path.join(work, "log3")).run()
LocalPipelineExecutor(pipeline=[MinhashDedupCluster(input_folder=mh + "/buckets", output_folder=mh + "/remove_ids", config=cfg)], tasks=1, workers=1, logging_dir=os.path.join(work, "log4")).run()
LocalPipelineExecutor(pipeline=[JsonlReader(os.path.join(work, "filtered")), MinhashDedupFilter(input_folder=mh + "/remove_ids", exclusion_writer=JsonlWriter(os.path.join(work, "x_minhash"), compression=None)),
                                JsonlWriter(os.path.join(work, "final"), compression=None)], tasks=1, workers=1, logging_dir=os.path.join(work, "log5")).run()
stages.append(("minhash", "MinHash dedup (%d-grams, %d buckets of %d hashes)" % (cfg.n_grams, cfg.num_buckets, cfg.hashes_per_bucket)))


def read(folder):
    R = {}
    for f in glob.glob(os.path.join(work, folder, "*")):
        for line in open(f):
            d = json.loads(line); R[d["id"]] = d
    return R


ids = [json.loads(l)["id"] for l in open(src)]
orig = {json.loads(l)["id"]: json.loads(l)["text"] for l in open(src)}
res = {}
for key, label in stages:
    for i, d in read("x_" + key).items():
        res[i] = {"dropped_at": key, "reason": (d.get("metadata") or {}).get("filter_reason")}
final = read("final")
for i in ids:
    if i in final:
        res[i] = {"dropped_at": None, "changed": final[i]["text"] != orig[i], "text_after": final[i]["text"] if final[i]["text"] != orig[i] else None}
    elif i not in res:
        res[i] = {"dropped_at": "unknown"}
json.dump({"tool": "datatrove", "version": __import__("importlib.metadata").metadata.version("datatrove"),
           "stages": stages, "minhash": {"n_grams": cfg.n_grams, "num_buckets": cfg.num_buckets, "hashes_per_bucket": cfg.hashes_per_bucket},
           "docs": res, "seconds": round(time.time() - t0, 1)}, open(out, "w"), indent=1)
print(json.dumps({k: v.get("dropped_at") for k, v in res.items()}))
