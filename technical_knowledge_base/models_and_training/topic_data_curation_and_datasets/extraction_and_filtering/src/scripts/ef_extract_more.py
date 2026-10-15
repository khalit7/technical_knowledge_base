"""Three more extractors on the same 20,280 pages (this page's own venv):
  justext   jusText 3.0.2 with its defaults (core.py:28-36: length_low 70, length_high 200, stopwords_low 0.30,
            stopwords_high 0.32, max_link_density 0.2) and the English stoplist; output = the paragraphs it does
            not mark as boilerplate, one per line (the way Nemotron-CC and trafilatura's rescue use it)
  readability  readability-lxml 0.9 Document(html).summary(), turned into text with resiliparse's plain-text
            serialiser (main_content=False), so only readability's choice of nodes matters
  traf231   trafilatura 2.3.1 (latest release, 2026-10-06) with datatrove's settings except the cross-document
            cache (favor_precision=True, include_comments=False, deduplicate=False)
Each call has a 30 s safety cap. Output: $DC_SCRATCH/data/ef/more_<name>.jsonl.gz (id, text, s).
Usage: python ef_extract_more.py justext|readability|traf231
"""
import os
import signal
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402


def make(name):
    if name == "justext":
        import justext
        stop = justext.get_stoplist("English")

        def f(html):
            ps = justext.justext(html, stop)
            return "\n".join(p.text for p in ps if not p.is_boilerplate)
        return f
    if name == "readability":
        from readability import Document
        from resiliparse.extract.html2text import extract_plain_text

        def f(html):
            s = Document(html).summary()
            return extract_plain_text(s, preserve_formatting=True, main_content=False, list_bullets=True,
                                      alt_texts=False, links=False, form_fields=False, noscript=False)
        return f
    if name == "traf231":
        import trafilatura

        def f(html):
            return trafilatura.extract(html, favor_precision=True, include_comments=False, deduplicate=False)
        return f
    raise SystemExit("unknown extractor " + name)


def main(name):
    import logging
    logging.disable(logging.WARNING)
    fn = make(name)

    def alarm(*_):
        raise TimeoutError
    signal.signal(signal.SIGALRM, alarm)
    out, t_all = [], 0.0
    for i, p in enumerate(E.html_pages()):
        t0 = time.perf_counter()
        signal.alarm(30)
        err = None
        try:
            txt = fn(p["html"])
        except Exception as e:  # noqa: BLE001
            txt, err = None, type(e).__name__
        finally:
            signal.alarm(0)
        dt = time.perf_counter() - t0
        t_all += dt
        row = {"id": p["id"], "text": txt or None, "s": round(dt, 4)}
        if err:
            row["err"] = err
        out.append(row)
        if (i + 1) % 2000 == 0:
            print(name, i + 1, round(t_all, 1), flush=True)
    E.write_jsonl_gz(E.scratch(f"more_{name}.jsonl.gz"), out)
    print("done", name, len(out), round(t_all, 1), flush=True)


if __name__ == "__main__":
    main(sys.argv[1])
