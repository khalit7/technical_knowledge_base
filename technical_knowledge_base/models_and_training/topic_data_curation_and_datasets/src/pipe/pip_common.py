"""Shared helpers for the Pipeline lab scripts (Topic: data-curation-and-datasets, tab t-pipe).

Run every script with the shared venv, at low priority, 4 threads:
    export DC_SCRATCH=<shared dc folder> HF_HOME=$DC_SCRATCH/hf OMP_NUM_THREADS=4
    nice -n 15 $DC_SCRATCH/venv/bin/python -I -B src/pipe/<script>.py
Large intermediate files go to $DC_SCRATCH/data/pipe/ (outside the repo); small JSON the page embeds goes to
src/pipe/out/. Nothing here writes an absolute path into an output file.
"""
import gzip
import importlib.machinery
import json
import multiprocessing
import os
import sys
import types

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
sys.path.insert(0, os.path.join(HERE, "..", "data"))
import load as L  # noqa: E402

# The same two macOS workarounds as the setup agent's run0.py: a stub python-magic (WarcReader imports it; only a
# fallback for records without WARC-Identified-Payload-Type, which this crawl always sets) and the 'fork' start method
# (datatrove's extractor sandbox cannot be pickled under macOS's default 'spawn').
try:
    multiprocessing.set_start_method("fork", force=True)
except RuntimeError:
    pass
_m = types.ModuleType("magic")
_m.__spec__ = importlib.machinery.ModuleSpec("magic", None)
_m.from_buffer = lambda b, mime=True: "application/octet-stream"
sys.modules.setdefault("magic", _m)


def scratch(*p):
    d = os.path.join(L.scratch(), "data", "pipe", *p)
    os.makedirs(os.path.dirname(d) if p else d, exist_ok=True)
    return d


def write_jsonl_gz(path, rows):
    with gzip.open(path, "wt") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def read_jsonl_gz(path):
    with gzip.open(path, "rt") as f:
        return [json.loads(x) for x in f]


def save_out(name, obj):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, name)
    with open(p, "w") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"), sort_keys=False)
    return p


def clean_meta(doc):
    """Drop metadata.file_path (an absolute scratch path) from a run0 document."""
    md = dict(doc.get("metadata", {}))
    md.pop("file_path", None)
    return md


def html_docs():
    """The 20,463 HTML documents exactly as datatrove's WarcReader yields them in run0 (id, decoded HTML, url)."""
    from datatrove.pipeline.readers import WarcReader
    r = WarcReader(os.path.dirname(L.warc_path()), glob_pattern="*.warc.gz", default_metadata={"dump": L.CRAWL})
    for d in r.run():
        yield d


def url_removed_ids():
    return {d["id"] for d in L.run0_removed("1_url")}


def chain(languages=("en",), char_dup=0.01, c4_kwargs=None, fw_kwargs=None):
    """The FineWeb-style filter chain of run0 (after extraction), as datatrove objects, in run0's order."""
    from datatrove.pipeline.filters import (LanguageFilter, GopherRepetitionFilter, GopherQualityFilter,
                                            C4QualityFilter, FineWebQualityFilter)
    c4k = dict(filter_no_terminal_punct=False)
    c4k.update(c4_kwargs or {})
    fwk = dict(char_duplicates_ratio=char_dup)
    fwk.update(fw_kwargs or {})
    return [("2_lid", LanguageFilter(languages=list(languages) if languages else None)),
            ("3_gopher_rep", GopherRepetitionFilter()),
            ("4_gopher_qual", GopherQualityFilter()),
            ("5_c4", C4QualityFilter(**c4k)),
            ("6_fineweb_qual", FineWebQualityFilter(**fwk))]


def run_chain(doc, steps):
    """Apply the steps in order; returns (step_name, reason) of the first drop, or (None, None) if kept.
    The C4 step edits doc.text (drops short, policy and javascript lines), as in run0."""
    for name, f in steps:
        r = f.filter(doc)
        ok, reason = (r, None) if isinstance(r, bool) else (r[0], r[1] if len(r) > 1 else None)
        if not ok:
            return name, reason or "n/a"
    return None, None
