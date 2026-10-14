"""Load helper for the running example of Topic: data-curation-and-datasets.

Every tab imports this. Large artefacts live outside the repo, under the folder named by the
environment variable DC_SCRATCH (the shared setup folder: venv, venv_dolma, data, hf, src).
Nothing here hard-codes a user path. See README.md in this folder for what each artefact is.

    import os, sys; sys.path.insert(0, "<root>/src/data"); import load as L
    for rec in L.warc_records(limit=5): ...          # raw HTML responses from the WARC (dicts)
    for rec in L.wet_records(limit=5): ...           # Common Crawl's own text extraction (WET)
    docs = L.run0("extracted")                       # list of dicts from datatrove run0 (any stage, see STAGES)
    dropped = L.run0_removed("3_gopher_rep")         # documents a stage removed, with the filter's reason
    fw = L.curated("fineweb_warc")                   # pandas DataFrame (FineWeb rows from our WARC)
    b = L.bench("gsm8k_test"); p = L.post("tulu3_sft_5k"); n = L.nemotron("medium")
    L.model_path("lid176") / L.model_path("fineweb_edu_classifier") / L.model_path("dclm_fasttext")

Run with the shared venv: $DC_SCRATCH/venv/bin/python -I -B your_script.py (-B: no __pycache__ in the repo).
The Dolma toolkit has its own venv ($DC_SCRATCH/venv_dolma) because its pins (numpy<2, tokenizers<=0.19.1)
conflict with transformers 5 in the main venv.
"""
import glob
import gzip
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))

CRAWL = "CC-MAIN-2024-30"
SEGMENT = "1720763514387.30"
FILE = "CC-MAIN-20240712094214-20240712124214-00000"

# run0 stage folders under data/run0, in pipeline order (see README.md for the count table).
STAGES = ["extracted", "filtered", "deduped", "final"]
REMOVED = ["1_url", "2_lid", "3_gopher_rep", "4_gopher_qual", "5_c4", "6_fineweb_qual", "7_minhash"]

CURATED = {
    "fineweb_warc": f"curated/fineweb_{FILE}.parquet",          # FineWeb rows whose file_path is our WARC
    "fineweb_edu_warc": f"curated/fineweb_edu_{FILE}.parquet",  # FineWeb-Edu rows from our WARC (int_score >= 3)
    "fineweb_rand50k": "curated/fineweb_2024-30_rand50k.parquet",
    "fineweb_edu_rand50k": "curated/fineweb_edu_2024-30_rand50k.parquet",
    "dclm_first50k": "curated/dclm_baseline_first50k.parquet",
    "edu_annotations": "curated/fineweb_edu_llama3_annotations_first4files.parquet",
}
BENCH = ["mmlu_test", "gsm8k_test", "arc_challenge_test", "arc_easy_test", "humaneval_test", "math500_test",
         "hellaswag_validation"]
POST = ["tulu3_sft_5k", "ultrafeedback_binarized_prefs_5k", "rlvr_gsm_math_if_all", "cosmopedia_web_samples_v2_2k"]
MODELS = {
    "lid176": "models/lid176/lid.176.bin",
    "fineweb_edu_classifier": "models/fineweb-edu-classifier",
    "dclm_fasttext": "models/dclm-fasttext-oh-eli5/openhermes_reddit_eli5_vs_rw_v2_bigram_200k_train.bin",
}


def scratch():
    s = os.environ.get("DC_SCRATCH")
    if not s or not os.path.isdir(s):
        raise RuntimeError("set DC_SCRATCH to the shared dc setup folder (see src/data/README.md)")
    return s


def path(*parts):
    return os.path.join(scratch(), "data", *parts)


def model_path(name):
    return path(MODELS[name])


# ---------------------------------------------------------------- raw Common Crawl
def _cc(kind):
    ext = {"warc": ".warc.gz", "wet": ".warc.wet.gz", "wat": ".warc.wat.gz", "robotstxt": ".warc.gz"}[kind]
    return path("cc", kind, FILE + ext)


def warc_path():
    return _cc("warc")


def _iter(kind, rec_type, limit, html_only):
    from warcio.archiveiterator import ArchiveIterator
    n = 0
    with open(_cc(kind), "rb") as f:
        for r in ArchiveIterator(f):
            if r.rec_type != rec_type:
                continue
            h = r.rec_headers
            mime = h.get_header("WARC-Identified-Payload-Type")
            if html_only and mime not in ("text/html", "application/xhtml+xml"):
                continue
            body = r.content_stream().read()
            yield {"id": h.get_header("WARC-Record-ID"), "url": h.get_header("WARC-Target-URI"),
                   "date": h.get_header("WARC-Date"), "mime": mime,
                   "http_status": r.http_headers.get_statuscode() if r.http_headers else None,
                   "body": body}
            n += 1
            if limit and n >= limit:
                return


def warc_records(limit=None, html_only=True):
    """Response records of the WARC: body is the raw HTTP payload (bytes)."""
    return _iter("warc", "response", limit, html_only)


def wet_records(limit=None):
    """Conversion records of the matching WET: body is Common Crawl's plain-text extraction (bytes, UTF-8)."""
    for r in _iter("wet", "conversion", limit, False):
        r["text"] = r.pop("body").decode("utf-8", "replace")
        yield r


def wat_records(limit=None):
    """Metadata records of the matching WAT: body is JSON bytes (links, headers)."""
    return _iter("wat", "metadata", limit, False)


def robots_records(limit=None):
    return _iter("robotstxt", "response", limit, False)


# ---------------------------------------------------------------- datatrove run0
def _jsonl(folder, limit=None):
    out = []
    for fn in sorted(glob.glob(os.path.join(folder, "*.jsonl.gz"))):
        with gzip.open(fn, "rt") as f:
            for line in f:
                out.append(json.loads(line))
                if limit and len(out) >= limit:
                    return out
    return out


def run0(stage="filtered", limit=None):
    """Documents surviving a run0 stage: one of STAGES. Each: text, id, metadata (url, dump, ...)."""
    assert stage in STAGES, stage
    return _jsonl(path("run0", stage), limit)


def run0_removed(step, limit=None):
    """Documents removed by one run0 step (REMOVED); metadata.filter_reason says which rule fired."""
    assert step in REMOVED, step
    return _jsonl(path("run0", "removed", step), limit)


def run0_stats():
    """Per-stage counts from run0 (also tabulated in README.md and run0_counts.json here)."""
    return json.load(open(os.path.join(HERE, "run0_counts.json")))


# ---------------------------------------------------------------- parquet samples
def _pq(rel, columns=None):
    import pandas as pd
    return pd.read_parquet(path(rel), columns=columns)


def curated(name, columns=None):
    return _pq(CURATED[name], columns)


def bench(name, columns=None):
    assert name in BENCH, name
    return _pq(f"bench/{name}.parquet", columns)


def post(name, columns=None):
    assert name in POST, name
    return _pq(f"post/{name}.parquet", columns)


def nemotron(quality="high", kind="actual", kind2="actual", limit=None):
    """Head sample of Nemotron-CC CC-MAIN-2024-30 part-00000 for one partition (see nemotron_cc/manifest.json)."""
    fn = path("nemotron_cc", f"quality-{quality}__kind-{kind}__kind2-{kind2}__{CRAWL}-part-00000.jsonl.gz")
    out = []
    with gzip.open(fn, "rt") as f:
        for line in f:
            out.append(json.loads(line))
            if limit and len(out) >= limit:
                break
    return out


def ids(name):
    """Committed id lists in src/data/ids/<name>.json."""
    return json.load(open(os.path.join(HERE, "ids", name + ".json")))
