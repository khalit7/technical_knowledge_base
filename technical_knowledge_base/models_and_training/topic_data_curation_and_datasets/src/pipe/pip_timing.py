"""Step 7 of the Pipeline lab (a timing, so rough): trafilatura 1.11.0 (run0's settings, no sandbox, no timeout)
against resiliparse 1.0.9 (Dolma's settings) on the same 500 pages drawn at random (seed 0) from the 20,280,
one process, one core, at low priority on a shared machine. Each page is timed by both, in alternating order.
Output: src/pipe/out/timing.json
"""
import os
import random
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pip_common as P  # noqa: E402


def main():
    from resiliparse.extract.html2text import extract_plain_text
    from trafilatura import extract
    removed = P.url_removed_ids()
    docs = [d for d in P.html_docs() if d.id not in removed]
    rnd = random.Random(0)
    pick = rnd.sample(docs, 500)
    tt = tr = 0.0
    nbytes = 0
    per = []
    for i, d in enumerate(pick):
        h = d.text
        nbytes += len(h.encode("utf-8"))
        def a():
            return extract(h, favor_precision=True, include_comments=False, deduplicate=True)
        def b():
            return extract_plain_text(h, preserve_formatting=True, main_content=True, list_bullets=True,
                                      alt_texts=False, links=False, form_fields=False, noscript=False, comments=True)
        order = (a, b) if i % 2 == 0 else (b, a)
        ts = {}
        for f in order:
            t0 = time.perf_counter()
            f()
            ts[f] = time.perf_counter() - t0
        tt += ts[a]
        tr += ts[b]
        per.append(ts[a])
    per.sort()
    load = os.getloadavg()[0]
    out = {"note": "rough: one core, nice 15, shared Apple M1 Pro; load average at the end %.1f" % load,
           "pages": len(pick), "html_mb": round(nbytes / 1e6, 1),
           "trafilatura_s": round(tt, 1), "resiliparse_s": round(tr, 1),
           "trafilatura_mb_per_s": round(nbytes / 1e6 / tt, 2), "resiliparse_mb_per_s": round(nbytes / 1e6 / tr, 2),
           "speedup": round(tt / tr, 1), "trafilatura_pages_over_1s": sum(1 for x in per if x > 1.0),
           "trafilatura_p50_ms": round(1000 * per[len(per) // 2]), "trafilatura_p99_ms": round(1000 * per[int(len(per) * .99)]),
           "load_avg_1min": round(load, 1)}
    P.save_out("timing.json", out)
    print(out)


if __name__ == "__main__":
    main()
