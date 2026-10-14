"""Step 1 of the Pipeline lab: the same 20,280 pages (run0's HTML documents that pass the URL filter) through three
text extractions, so they can be compared page by page:
  - trafilatura 1.11.0 as run0 ran it (datatrove Trafilatura: favour_precision=True, deduplicate=True, 1 s timeout),
    read from run0/extracted; the 1,039 pages it returned nothing for are re-run here WITHOUT the timeout (with a
    30 s safety cap) to separate "no main text" from "timed out on a loaded machine";
  - resiliparse 1.0.9 with the Dolma toolkit's settings (dolma/warc/linearizers.py:34-47 at v1.2.1: main_content=True,
    alt_texts=False, links=False, comments=True, list_bullets=True, preserve_formatting=True); datatrove ships no
    resiliparse extractor;
  - Common Crawl's own WET text for the same record (WARC-Refers-To = the response's WARC-Record-ID).
Output: $DC_SCRATCH/data/pipe/extract_all.jsonl.gz (id, url, html_chars, traf, traf_status, res, wet) and
src/pipe/out/extract_timing.json (rough timings, labelled as such).
"""
import os
import signal
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pip_common as P  # noqa: E402
L = P.L


def main():
    from resiliparse.extract.html2text import extract_plain_text
    from trafilatura import extract

    removed = P.url_removed_ids()
    traf = {d["id"]: d["text"] for d in L.run0("extracted")}
    print("trafilatura docs", len(traf), flush=True)
    # WET conversion records point at the response record they were made from (WARC-Refers-To)
    wet = {}
    from warcio.archiveiterator import ArchiveIterator
    with open(L._cc("wet"), "rb") as f:
        for r in ArchiveIterator(f):
            if r.rec_type != "conversion":
                continue
            ref = r.rec_headers.get_header("WARC-Refers-To")
            wet[ref] = r.content_stream().read().decode("utf-8", "replace")
    print("wet records", len(wet), flush=True)

    def alarm(*_):
        raise TimeoutError

    signal.signal(signal.SIGALRM, alarm)
    rows, t_res, t_traf, n_rerun = [], 0.0, 0.0, 0
    for i, d in enumerate(P.html_docs()):
        if d.id in removed:
            continue
        html = d.text
        t0 = time.perf_counter()
        res = extract_plain_text(html, preserve_formatting=True, main_content=True, list_bullets=True,
                                 alt_texts=False, links=False, form_fields=False, noscript=False, comments=True)
        t_res += time.perf_counter() - t0
        tr, status = traf.get(d.id), "run0"
        if tr is None:
            n_rerun += 1
            signal.alarm(30)
            t0 = time.perf_counter()
            try:
                tr = extract(html, favor_precision=True, include_comments=False, deduplicate=True)
                status = "rerun_text" if tr else "rerun_empty"
            except TimeoutError:
                tr, status = None, "rerun_timeout30"
            finally:
                signal.alarm(0)
            t_traf += time.perf_counter() - t0
        rows.append({"id": d.id, "url": d.metadata.get("url"), "html_chars": len(html), "traf": tr,
                     "traf_status": status, "res": res, "wet": wet.get(d.id)})
        if len(rows) % 2000 == 0:
            print(len(rows), "rows", round(t_res, 1), "s resiliparse", n_rerun, "reruns", flush=True)
    P.write_jsonl_gz(P.scratch("extract_all.jsonl.gz"), rows)
    P.save_out("extract_timing.json", {
        "note": "rough, measured on a shared machine (Apple M1 Pro, CPU) at low priority; load average about 9",
        "resiliparse_docs": len(rows), "resiliparse_seconds": round(t_res, 1),
        "resiliparse_html_mb": round(sum(r["html_chars"] for r in rows) / 1e6, 1),
        "trafilatura_rerun_docs": n_rerun, "trafilatura_rerun_seconds": round(t_traf, 1)})
    print("done", len(rows))


if __name__ == "__main__":
    main()
