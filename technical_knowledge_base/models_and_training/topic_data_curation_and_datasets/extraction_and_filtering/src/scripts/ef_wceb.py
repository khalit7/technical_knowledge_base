"""Extractors against human-annotated main content: the Web Content Extraction Benchmark (Bevendorff et al.,
SIGIR 2023; chatnoir-eu/web-content-extraction-benchmark @ 36be6d9c, Apache-2.0): 3,985 pages from 8 datasets
(CleanEval, Dragnet, CETD, L3S-GN1, Google-Trends-2017, Readability, Scrapinghub, CleanPortalEval), each with its
hand-marked main text.

Score per page: bag-of-words precision, recall and F1 (lower-cased \\w+ tokens, multiset overlap). This is NOT the
paper's ROUGE-LSum; the page compares rankings with the paper's table, not values.
Usage (extractor name picks the venv):
  shared venv:  ef_wceb.py traf111            trafilatura 1.11.0, datatrove's settings, deduplicate=False
  own venv:     ef_wceb.py traf231|resiliparse|justext|readability|alltext
Output: $DC_SCRATCH/data/ef/wceb_<name>.json (per page id: p, r, f1, n_out) and a summary line on stdout.
"""
import collections
import json
import os
import re
import signal
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402

TOK = re.compile(r"\w+")


def bag(t):
    return collections.Counter(TOK.findall((t or "").lower()))


def make(name):
    if name in ("traf111", "traf231"):
        import trafilatura
        return lambda h: trafilatura.extract(h, favor_precision=True, include_comments=False, deduplicate=False)
    if name in ("resiliparse", "alltext"):
        from resiliparse.extract.html2text import extract_plain_text
        main = name == "resiliparse"
        return lambda h: extract_plain_text(h, preserve_formatting=True, main_content=main, list_bullets=True,
                                            alt_texts=False, links=False, form_fields=False, noscript=False,
                                            comments=True)
    if name == "justext":
        import justext
        stop = justext.get_stoplist("English")
        return lambda h: "\n".join(p.text for p in justext.justext(h, stop) if not p.is_boilerplate)
    if name == "readability":
        from readability import Document
        from resiliparse.extract.html2text import extract_plain_text
        return lambda h: extract_plain_text(Document(h).summary(), preserve_formatting=True, main_content=False,
                                            alt_texts=False, links=False)
    raise SystemExit("unknown " + name)


def main(name):
    import logging
    logging.disable(logging.WARNING)
    fn = make(name)
    base = E.scratch("wceb", "combined", "combined")

    def alarm(*_):
        raise TimeoutError
    signal.signal(signal.SIGALRM, alarm)
    res = {}
    for gt in sorted(os.listdir(os.path.join(base, "ground-truth"))):
        ds = gt[:-6]
        for line in open(os.path.join(base, "ground-truth", gt)):
            g = json.loads(line)
            with open(os.path.join(base, "html", ds, g["page_id"] + ".html"), "rb") as f:
                html = f.read().decode("utf-8", "replace")
            signal.alarm(30)
            try:
                out = fn(html) or ""
            except Exception:  # noqa: BLE001
                out = ""
            finally:
                signal.alarm(0)
            a, b = bag(out), bag(g["plaintext"])
            inter = sum((a & b).values())
            p = inter / sum(a.values()) if a else 0.0
            r = inter / sum(b.values()) if b else 0.0
            f1 = 2 * p * r / (p + r) if p + r else 0.0
            res[ds + "/" + g["page_id"]] = {"p": round(p, 4), "r": round(r, 4), "f1": round(f1, 4), "n": len(out)}
    with open(E.scratch(f"wceb_{name}.json"), "w") as f:
        json.dump(res, f)
    n = len(res)
    print(name, n, "mean P %.3f R %.3f F1 %.3f" % tuple(sum(v[k] for v in res.values()) / n for k in "p r f1".split()))


if __name__ == "__main__":
    main(sys.argv[1])
