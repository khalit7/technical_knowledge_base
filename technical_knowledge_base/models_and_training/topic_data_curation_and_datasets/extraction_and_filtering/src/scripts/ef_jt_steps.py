"""jusText step by step on one real page, for the Reading tab's animation (this page's venv).

jusText 3.0.2 (core.py) splits the cleaned DOM into paragraphs (ParagraphMaker), gives each a context-free class
(classify_paragraphs, core.py:243-275) from length, stop-word density and link density, then revises the 'short' and
'near-good' ones from their neighbours (revise_paragraph_classification, core.py:307-371) in four passes. This script
runs the library's own functions and snapshots the classes after each pass (the passes are the library's code, split
at its comments: good headings, classify short, revise neargood, more good headings).
Usage: ef_jt_steps.py candidates        -> prints candidate pages (organisation hosts, 12 to 45 paragraphs)
       ef_jt_steps.py dump <id> [<id>..]  -> src/data/ef_jt_steps.json
"""
import json
import os
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402


def run(html):
    import justext
    from justext.core import (ParagraphMaker, classify_paragraphs, html_to_dom, preprocessor,
                              get_prev_neighbour, get_next_neighbour, MAX_HEADING_DISTANCE_DEFAULT)
    stop = justext.get_stoplist("English")
    dom = preprocessor(html_to_dom(html))
    ps = ParagraphMaker.make_paragraphs(dom)
    classify_paragraphs(ps, stop)
    snaps = [[p.cf_class for p in ps]]
    # pass 1: good headings (core.py:313-325)
    for i, p in enumerate(ps):
        p.class_type = p.cf_class
        if not (p.heading and p.class_type == "short"):
            continue
        j, dist = i + 1, 0
        while j < len(ps) and dist <= MAX_HEADING_DISTANCE_DEFAULT:
            if ps[j].class_type == "good":
                p.class_type = "neargood"
                break
            dist += len(ps[j].text)
            j += 1
    snaps.append([p.class_type for p in ps])
    # pass 2: classify short (core.py:327-346)
    new = {}
    for i, p in enumerate(ps):
        if p.class_type != "short":
            continue
        a, b = get_prev_neighbour(i, ps, True), get_next_neighbour(i, ps, True)
        if a == "good" and b == "good":
            new[i] = "good"
        elif a == "bad" and b == "bad":
            new[i] = "bad"
        elif (a == "bad" and get_prev_neighbour(i, ps, False) == "neargood") or \
             (b == "bad" and get_next_neighbour(i, ps, False) == "neargood"):
            new[i] = "good"
        else:
            new[i] = "bad"
    for i, c in new.items():
        ps[i].class_type = c
    snaps.append([p.class_type for p in ps])
    # pass 3: revise neargood (core.py:348-357)
    for i, p in enumerate(ps):
        if p.class_type != "neargood":
            continue
        a, b = get_prev_neighbour(i, ps, True), get_next_neighbour(i, ps, True)
        p.class_type = "bad" if (a, b) == ("bad", "bad") else "good"
    snaps.append([p.class_type for p in ps])
    # pass 4: more good headings (core.py:359-370)
    for i, p in enumerate(ps):
        if not (p.heading and p.class_type == "bad" and p.cf_class != "bad"):
            continue
        j, dist = i + 1, 0
        while j < len(ps) and dist <= MAX_HEADING_DISTANCE_DEFAULT:
            if ps[j].class_type == "good":
                p.class_type = "good"
                break
            dist += len(ps[j].text)
            j += 1
    snaps.append([p.class_type for p in ps])
    # check against the library's own end-to-end result
    ref = [p.class_type for p in justext.justext(html, stop)]
    assert ref == snaps[-1], "pass split differs from justext.justext"
    feats = [{"t": p.text, "len": len(p), "sw": round(p.stopwords_density(stop), 3), "ld": round(p.links_density(), 3),
              "h": bool(p.heading), "path": p.dom_path[-40:]} for p in ps]
    return feats, snaps


def candidates():
    import random
    jt = {r["id"]: r["text"] for r in E.read_jsonl_gz(E.scratch("more_justext.jsonl.gz"))}
    fw = set(E.L.ids("fineweb_kept"))
    rows = [r for r in E.extract_all() if r["id"] in fw and r["traf"]]
    random.Random(3).shuffle(rows)
    n = 0
    pages = {p["id"]: p for p in E.html_pages() if p["id"] in {r["id"] for r in rows[:400]}}
    for r in rows[:400]:
        host = urllib.parse.urlsplit(r["url"]).netloc
        if not host.endswith((".org", ".edu", ".gov", ".ac.uk", ".org.uk", ".gov.uk", ".int")):
            continue
        feats, snaps = run(pages[r["id"]]["html"])
        changed = sum(a != b for a, b in zip(snaps[0], snaps[-1]))
        if 12 <= len(feats) <= 45 and changed >= 4:
            print(r["id"], host, len(feats), "changed", changed, "good", snaps[-1].count("good"),
                  "| jt chars", len(jt.get(r["id"]) or ""), "traf chars", len(r["traf"]))
            n += 1
        if n >= 12:
            break


def dump(ids):
    pages = {p["id"]: p for p in E.html_pages() if p["id"] in ids}
    ex = {r["id"]: r for r in E.extract_all() if r["id"] in ids}
    out = []
    for i in ids:
        feats, snaps = run(pages[i]["html"])
        out.append({"id": i, "host": urllib.parse.urlsplit(ex[i]["url"]).netloc, "paras": feats, "snaps": snaps,
                    "traf": ex[i]["traf"], "res": ex[i]["res"]})
    import re
    E.save("ef_jt_steps_raw.json", json.loads(re.sub(r"[\w.+-]+@[\w-]+\.[\w.-]+", "email@example.com",
                                                     json.dumps(out[:1], ensure_ascii=False))))  # the page shown only
    print("saved", len(out))


if __name__ == "__main__":
    if sys.argv[1] == "candidates":
        candidates()
    else:
        dump(sys.argv[2:])
