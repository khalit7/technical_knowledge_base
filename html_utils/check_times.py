"""Find reading times quoted for other pages that no longer match those pages' own headers.

usage: python3 html_utils/check_times.py [--page <page path>] [--json out.json]
Each page's header states "Reading: N min, plus M in closed details." (writing-style.md). This script reads every
header, then scans every page's src/parts/*.html for links to another page ({{text|n:<id>...}}) and the time
written within 160 characters after the link ("28 min", "about 31 min", "28 min, plus 3"). A quoted core time that
differs from the target's header is printed as: <page part>: <target title> quotes N, header says M.
Pages without a header in the new format are listed once as "no header" and their quotes are not judged.
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
LINK = re.compile(r"\{\{([^|{}]+)\|n:([0-9a-f]{32})[^}]*\}\}")
TIME = re.compile(r"(?:about\s+)?(\d+)\s*min(?:utes)?\b(?:,?\s*plus\s*(\d+))?")


def header(p):
    f = ROOT / p["path"] / "src/parts/10_header.html"
    if not f.exists():
        f = ROOT / p["path"] / "index.html"
        if not f.exists():
            return None
    m = HDR.search(f.read_text(errors="ignore")[:20000])
    return (int(m.group(1)), int(m.group(2) or 0)) if m else None


def main():
    a = sys.argv[1:]
    only = a[a.index("--page") + 1].rstrip("/") if "--page" in a else None
    hdr = {p["id"].replace("-", ""): header(p) for p in pages}
    out, missing = [], set()
    for p in pages:
        if only and p["path"] != only and p["path"] != "technical_knowledge_base/" + only:
            continue
        for f in sorted((ROOT / p["path"] / "src/parts").glob("*.html")) if (ROOT / p["path"] / "src/parts").is_dir() else []:
            s = f.read_text(errors="ignore")
            for m in LINK.finditer(s):
                tid = m.group(2)
                t = by_id.get(tid)
                if not t or t is p:
                    continue
                tail = re.sub(r"<[^>]+>", " ", s[m.end():m.end() + 400])[:160]
                tm = TIME.search(tail)
                if not tm:
                    continue
                h = hdr.get(t["id"].replace("-", ""))
                if h is None:
                    missing.add(t["title"])
                    continue
                if int(tm.group(1)) != h[0]:
                    out.append({"file": str(f.relative_to(ROOT)), "target": t["title"], "target_path": t["path"],
                                "quoted": tm.group(0), "header": f"{h[0]} min, plus {h[1]}"})
    for o in out:
        print(f"{o['file']}: {o['target']} quotes \"{o['quoted']}\", header says {o['header']}")
    for t in sorted(missing):
        print(f"no header: {t}")
    print(f"{len(out)} stale quotes; {len(missing)} targets without a new-format header")
    if "--json" in a:
        Path(a[a.index("--json") + 1]).write_text(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
