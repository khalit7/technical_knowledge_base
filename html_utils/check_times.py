"""Find reading times quoted for other pages that no longer match those pages' own headers.

usage: python3 html_utils/check_times.py [--page <page path>] [--json out.json] [--fix]
Each page's header states "Reading: N min, plus M in closed details." (writing-style.md). This script reads every
header, then scans every page's src/parts/*.html for links to another page ({{text|n:<id>...}} or a raw Notion URL) and the time
written within 160 characters after the link ("28 min", "about 31 min", "28 min, plus 3"). A quoted core time that
differs from the target's header is printed as: <page part>: <target title> quotes N, header says M.
Pages without a header in the new format are listed once as "no header" and their quotes are not judged.
A time preceded by "Reading:" (the page's own header), a range ("17 to 27 min") or a tab name is skipped, as is a
link to one tab (#t-...). Only the text up to the next link, list item, heading, summary or <a> is searched.
--fix rewrites the unambiguous quotes in place (core and, when quoted, the closed-details figure); a quote followed
by a second time before the next link ("19 min and 20 min") is printed as AMBIGUOUS and left for a person.
Tech-news issues are dated records and are never judged. --fix also re-keys ledger units on the fixed page whose
key quoted the old time. Rebuild every page --fix touched, then run ledger.py check on it.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
pages = json.loads((ROOT / "technical_knowledge_base/pages.json").read_text())["pages"]
by_id = {}
for p in pages:
    by_id[p["id"].replace("-", "")] = p
    for a in p.get("aliases", []):
        by_id[a.replace("-", "")] = p
HDR = re.compile(r"Reading:\s*(\d+)\s*min(?:,\s*plus\s*(\d+)\s*in closed details)?")
LINK = re.compile(r"\{\{([^|{}]+)\|n:([0-9a-f]{32})([^}]*)\}\}"
                  r"|<a\s[^>]*href=\"https://(?:app\.notion\.com|www\.notion\.so)/p/([0-9a-f]{32})([^\"]*)\"[^>]*>(.*?)</a>", re.S)


class Link:
    """One link, written {{Title|n:<id>#anchor}} or as a raw Notion URL in an <a> (the site build rewrites both):
    group(1) text, group(2) id, group(3) anchor."""
    def __init__(self, m):
        self.m = m
        raw = m.group(2) is None
        self.g = (None, m.group(6) if raw else m.group(1), m.group(4) if raw else m.group(2), (m.group(5) if raw else m.group(3)) or "")

    def group(self, i):
        return self.g[i]

    def start(self):
        return self.m.start()

    def end(self):
        return self.m.end()
TIME = re.compile(r"(?:about\s+)?(\d+)\s*min(?:utes)?\b(?:,?\s*plus\s*(\d+))?")


def header(p):
    f = ROOT / p["path"] / "src/parts/10_header.html"
    if not f.exists():
        f = ROOT / p["path"] / "index.html"
        if not f.exists():
            return None
    m = HDR.search(f.read_text(errors="ignore")[:20000])
    return (int(m.group(1)), int(m.group(2) or 0)) if m else None


def rekey(path, swaps):
    """A ledger key may quote the time just fixed ("45 min caching every ..."): change it too, so ledger.py check
    still finds it. Covers the page's own ledger; a unit on another page owned by this one is rare and is left to
    ledger.py check."""
    lf = ROOT / path / "src/ledger.json"
    if not lf.exists():
        return
    units = json.loads(lf.read_text())
    n = 0
    for u in units:
        for q, q2 in swaps:
            k = u.get("key") or ""
            i = k.lower().find(q.lower())
            if i >= 0:
                u["key"] = k[:i] + q2 + k[i + len(q):]
                n += 1
    if n:
        lf.write_text(json.dumps(units, indent=1, ensure_ascii=False) + "\n")


def main():
    a = sys.argv[1:]
    only = a[a.index("--page") + 1].rstrip("/") if "--page" in a else None
    hdr = {p["id"].replace("-", ""): header(p) for p in pages}
    fix = "--fix" in a
    out, missing, fixed = [], set(), set()
    for p in pages:
        if "/tech_news/" in p["path"]:
            continue
        if only and p["path"] != only and p["path"] != "technical_knowledge_base/" + only:
            continue
        for f in sorted((ROOT / p["path"] / "src/parts").glob("*.html")) if (ROOT / p["path"] / "src/parts").is_dir() else []:
            s = f.read_text(errors="ignore")
            links = [Link(m) for m in LINK.finditer(s)]
            edits = []
            for i, m in enumerate(links):
                tid = m.group(2)
                t = by_id.get(tid)
                if not t or t is p or "#" in m.group(3) or re.search(r"\b(tab|lab)\b", m.group(1), re.I):  # a tab's time
                    continue
                end = links[i + 1].start() if i + 1 < len(links) else len(s)
                seg = s[m.end():min(end, m.end() + 400)]
                seg = re.split(r"<(?:summary|/summary|details|/details|h[1-6]|li|/li|a\s)", seg)[0]  # stay in this item
                tm = TIME.search(seg)
                if not tm or len(re.sub(r"<[^>]+>", " ", seg[:tm.start()])) > 160:
                    continue
                before = re.sub(r"<[^>]+>", " ", seg[:tm.start()])
                if re.search(r"\b(tab|lab)\b", before) or re.search(r"(Reading:|\bto|\d\s*[-\u2013]|calculator)\s*\(?\s*$", before):  # own header, a range, a tab's time
                    continue
                # a quoted reading time follows a tag, punctuation or "about"/"Reading"; "streams for 3 minutes" is a duration
                if not (seg[:tm.start()].rstrip().endswith(">") or re.search(r"(^|[(~.,;:)]|about|About|Reading|read)\s*$", before.rstrip())):
                    continue
                h = hdr.get(t["id"].replace("-", ""))
                if h is None:
                    missing.add(t["title"])
                    continue
                if int(tm.group(1)) != h[0] or (tm.group(2) and int(tm.group(2)) != h[1]):
                    amb = seg[tm.end():tm.end() + 6].strip().startswith("each") or TIME.search(seg, tm.end()) is not None and len(re.sub(r"<[^>]+>", " ", seg[tm.end():TIME.search(seg, tm.end()).start()])) < 40
                    out.append({"file": str(f.relative_to(ROOT)), "target": t["title"], "target_path": t["path"],
                                "quoted": tm.group(0), "header": f"{h[0]} min, plus {h[1]}", "ambiguous": amb})
                    if not amb:
                        a0 = m.end() + tm.start()
                        q = tm.group(0)
                        q2 = re.sub(r"\d+", str(h[0]), q, count=1)
                        if tm.group(2):
                            q2 = re.sub(r"(plus\s*)\d+", lambda x: x.group(1) + str(h[1]), q2)
                        edits.append((a0, a0 + len(q), q2, q))
            if fix and edits:
                for a0, a1, q2, _ in sorted(edits, reverse=True):
                    s = s[:a0] + q2 + s[a1:]
                f.write_text(s)
                fixed.add(p["path"])
                rekey(p["path"], [(q, q2) for *_, q2, q in edits])
    for o in out:
        print(f"{'AMBIGUOUS ' if o['ambiguous'] else ''}{o['file']}: {o['target']} quotes \"{o['quoted']}\", header says {o['header']}")
    for t in sorted(missing):
        print(f"no header: {t}")
    print(f"{len(out)} stale quotes ({sum(o['ambiguous'] for o in out)} ambiguous); {len(missing)} targets without a new-format header")
    if fix:
        print("fixed pages:\n" + "\n".join(sorted(fixed)))
    if "--json" in a:
        Path(a[a.index("--json") + 1]).write_text(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
