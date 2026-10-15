"""Shared helpers for the Extraction and filtering child page (prefix ef).

Two Python environments are used, both outside the repo:
  - the topic's shared venv ($DC_SCRATCH/venv): datatrove 0.10.1 and trafilatura 1.11.0 (the versions run0 and the
    root's Pipeline lab used);
  - this page's own venv ($DC_SCRATCH/ef/venv): trafilatura 2.3.1, jusText 3.0.2, readability-lxml 0.9,
    resiliparse 1.0.9, fastText (for lid.176, GlotLID and Dolma's Jigsaw classifiers).
Every script runs with `nice -n 15`, at most 4 threads, and writes large files under $DC_SCRATCH/data/ef/ and small
JSON for the page under src/data/. Nothing written here contains an absolute path.
"""
import gzip
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
DATA = os.path.join(SRC, "data")
ROOT_SRC = os.path.normpath(os.path.join(SRC, "..", "..", "src"))
sys.path.insert(0, os.path.join(ROOT_SRC, "data"))
import load as L  # noqa: E402  (the root's loader: stdlib only)


def scratch(*p):
    d = os.path.join(L.scratch(), "data", "ef", *p)
    os.makedirs(os.path.dirname(d), exist_ok=True)
    return d


def pipe_scratch(*p):
    return os.path.join(L.scratch(), "data", "pipe", *p)


def write_jsonl_gz(path, rows):
    with gzip.open(path, "wt") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def read_jsonl_gz(path):
    with gzip.open(path, "rt") as f:
        for x in f:
            yield json.loads(x)


def save(name, obj):
    os.makedirs(DATA, exist_ok=True)
    p = os.path.join(DATA, name)
    with open(p, "w") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    return p


def load_json(name):
    with open(os.path.join(DATA, name)) as f:
        return json.load(f)


def url_removed_ids():
    return {d["id"] for d in L.run0_removed("1_url")}


def page_ids():
    """The 20,280 page ids (cached in the scratch folder)."""
    p = scratch("ids_20280.txt")
    if not os.path.exists(p):
        with open(p, "w") as f:
            f.write("\n".join(r["id"] for r in extract_all()))
    with open(p) as f:
        return set(f.read().split("\n"))


def html_pages(skip_url_removed=True):
    """The HTML pages of the running example's WARC, decoded exactly as datatrove 0.10.1's WarcReader does
    (readers/warc.py:86-131: response records whose WARC-Identified-Payload-Type is text/html or
    application/xhtml+xml, UTF-8 first, then cchardet). Yields dicts id, url, html. With skip_url_removed, only
    the 20,280 pages of run0 that passed the URL filter are yielded (the ids of the root Pipeline lab's
    extract_all; this also skips the 79 records datatrove drops as documents without text)."""
    import cchardet
    from warcio.archiveiterator import ArchiveIterator
    keep = page_ids() if skip_url_removed else None
    with open(L.warc_path(), "rb") as f:
        for rec in ArchiveIterator(f):
            if rec.rec_type != "response":
                continue
            mt = rec.rec_headers.get_header("WARC-Identified-Payload-Type")
            if mt not in ("text/html", "application/xhtml+xml"):
                continue
            b = rec.content_stream().read()
            try:
                html = b.decode("UTF-8")
            except UnicodeDecodeError:
                enc = cchardet.detect(b)["encoding"]
                if not enc or enc == "UTF-8":
                    continue
                try:
                    html = b.decode(enc)
                except (UnicodeDecodeError, LookupError):
                    continue
            rid = rec.rec_headers.get_header("WARC-Record-ID")
            if keep is not None and rid not in keep:
                continue
            yield {"id": rid, "url": rec.rec_headers.get_header("WARC-Target-URI"), "html": html}


def extract_all():
    """The root Pipeline lab's per-page extractions (trafilatura 1.11 as run0, resiliparse with Dolma's settings,
    Common Crawl's WET) for the 20,280 pages: dicts id, url, html_chars, traf, traf_status, res, wet."""
    return read_jsonl_gz(pipe_scratch("extract_all.jsonl.gz"))
