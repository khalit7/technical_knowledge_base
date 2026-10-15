"""How much does jusText's dead 'good headings' pass matter? (this page's venv)

In jusText 3.0.2 revise_paragraph_classification (core.py:313-325) copies cf_class into class_type while it iterates,
so when it looks ahead for a good paragraph after a short heading, the paragraphs ahead still have class_type ''
(paragraph.py:22) and the pass never fires (reported upstream as issue #45, open since 2022-11-09). This script runs
the 20,280 pages twice: the library as shipped, and with class_type copied for every paragraph before the pass (the
behaviour the documentation describes), and counts pages whose kept text changes.
Output: src/data/ef_jt_fix.json
"""
import os
import signal
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402


def main():
    import justext
    import justext.core as jc
    stop = justext.get_stoplist("English")
    orig = jc.revise_paragraph_classification

    def fixed(paragraphs, max_heading_distance=jc.MAX_HEADING_DISTANCE_DEFAULT):
        for p in paragraphs:
            p.class_type = p.cf_class
        return orig(paragraphs, max_heading_distance)

    def alarm(*_):
        raise TimeoutError
    signal.signal(signal.SIGALRM, alarm)
    n = changed = more_chars = fewer_chars = 0
    add_chars = 0
    for p in E.html_pages():
        signal.alarm(30)
        try:
            jc.revise_paragraph_classification = orig
            a = "\n".join(x.text for x in justext.justext(p["html"], stop) if not x.is_boilerplate)
            jc.revise_paragraph_classification = fixed
            b = "\n".join(x.text for x in justext.justext(p["html"], stop) if not x.is_boilerplate)
        except Exception:  # noqa: BLE001
            continue
        finally:
            signal.alarm(0)
        n += 1
        if a != b:
            changed += 1
            add_chars += len(b) - len(a)
            more_chars += len(b) > len(a)
            fewer_chars += len(b) < len(a)
    res = {"pages": n, "changed": changed, "longer": more_chars, "shorter": fewer_chars, "net_chars": add_chars}
    E.save("ef_jt_fix.json", res)
    print(res)


if __name__ == "__main__":
    main()
