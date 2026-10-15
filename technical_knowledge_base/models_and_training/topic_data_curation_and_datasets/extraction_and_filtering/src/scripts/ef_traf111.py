"""trafilatura 1.11.0 (the version datatrove 0.10.1 pins, as run0 used it) on the 20,280 URL-passed pages, three ways.

Run in the topic's shared venv, one process per mode, no timeout (run0 used datatrove's 1 s sandbox timeout):
  nodedup   deduplicate=False, instrumented: which of trafilatura's paths produced the text (its own XPath
            extraction and which BODY_XPATH expression matched, the readability-lxml fallback, the jusText rescue,
            the 'baseline' rescue, or nothing)
  dedup     deduplicate=True (datatrove's default), pages in WARC order, one fresh process: the process-wide LRU
            cache (deduplication.py:231, 4,096 entries) drops any text segment over 100 characters from its 4th
            sighting on (settings.cfg MIN_DUPLCHECK_SIZE 100, MAX_REPETITIONS 2; htmlprocessing.py:237-238,
            core.py:228)
  shuffled  deduplicate=True, the same pages in a random order (seed 0)
Settings otherwise as datatrove's Trafilatura extractor (extractors/trafilatura.py:49-54): favor_precision=True,
include_comments=False. Output: $DC_SCRATCH/data/ef/traf111_<mode>.jsonl.gz (id, text, path, xpath, seconds).
"""
import os
import random
import signal
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402


def main(mode):
    import trafilatura
    import trafilatura.core as core
    import trafilatura.external as ext
    import trafilatura.main_extractor as mx
    import trafilatura.xpaths as xp

    st = {}
    if mode == "nodedup":
        orig_cmp, orig_read, orig_jt, orig_base, orig_wild = (core.compare_extraction, ext.try_readability,
                                                             ext.justext_rescue, core.baseline, mx.recover_wild_text)

        def read_(*a, **k):
            r = orig_read(*a, **k)
            st["read_el"] = r
            return r

        def jt_(*a, **k):
            r = orig_jt(*a, **k)
            st["jt"] = r[3]
            return r

        def cmp_(tree, backup, body, text, n, options):
            r = orig_cmp(tree, backup, body, text, n, options)
            if st.get("jt"):
                st["path"] = "justext"
            elif r[0] is st.get("read_el"):
                st["path"] = "readability"
            else:
                st["path"] = "own"
            return r

        def base_(*a, **k):
            st["path"] = "baseline"
            return orig_base(*a, **k)

        def wild_(*a, **k):
            st["wild"] = True
            return orig_wild(*a, **k)

        ext.try_readability, ext.justext_rescue, core.compare_extraction, core.baseline = read_, jt_, cmp_, base_
        mx.recover_wild_text = wild_

        class W:  # wraps one BODY_XPATH expression and records the last one that matched
            def __init__(self, i, x):
                self.i, self.x = i, x

            def __call__(self, tree):
                r = self.x(tree)
                if r:
                    st["xpath"] = self.i
                return r
        mx.BODY_XPATH = [W(i, x) for i, x in enumerate(xp.BODY_XPATH)]

    if mode == "shuffled":  # random order needs every page in memory: keep them zlib-compressed (about 0.6 GB)
        import zlib
        packed = [(p["id"], zlib.compress(p["html"].encode("utf-8"), 3)) for p in E.html_pages()]
        random.Random(0).shuffle(packed)
        pages = ({"id": i, "html": zlib.decompress(b).decode("utf-8")} for i, b in packed)
    else:
        pages = E.html_pages()
    def alarm(*_):
        raise TimeoutError
    signal.signal(signal.SIGALRM, alarm)
    out, t_all = [], 0.0
    for i, p in enumerate(pages):
        st.clear()
        t0 = time.perf_counter()
        signal.alarm(30)  # safety cap only; run0 used 1 s
        try:
            txt = trafilatura.extract(p["html"], favor_precision=True, include_comments=False,
                                      deduplicate=(mode != "nodedup"))
        except Exception as e:  # noqa: BLE001
            txt, st["err"] = None, type(e).__name__
        finally:
            signal.alarm(0)
        dt = time.perf_counter() - t0
        t_all += dt
        row = {"id": p["id"], "text": txt, "s": round(dt, 4)}
        if st.get("err"):
            row["err"] = st["err"]
        if mode == "nodedup":
            row["path"] = st.get("path") if txt else "none"
            row["xpath"] = st.get("xpath")
            row["wild"] = bool(st.get("wild"))
        out.append(row)
        if (i + 1) % 2000 == 0:
            print(mode, i + 1, round(t_all, 1), flush=True)
    E.write_jsonl_gz(E.scratch(f"traf111_{mode}.jsonl.gz"), out)
    print("done", mode, len(out), round(t_all, 1), flush=True)


if __name__ == "__main__":
    main(sys.argv[1])
