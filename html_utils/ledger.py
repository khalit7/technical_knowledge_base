"""Knowledge ledger for condensing a page without losing what it teaches (teaching-contract.md).

usage:
  python3 html_utils/ledger.py init <page folder>    draft src/ledger.json: one unit per sentence of the built page, by tab and section
  python3 html_utils/ledger.py check <page folder>   after the rebuild: every unit not labelled fat must be findable

Each unit: {"id", "tab", "section", "text", "label", "key", "where"}.
  label: core | depth | owned:<page path> | volatile | fat   (init leaves it empty; the editor fills it)
  key:   a short distinctive string (a number, a name, a phrase) that must appear wherever the unit now lives
  where: optional page path for units that moved (defaults to the page itself; owned:<path> implies that path;
         volatile units name the tech-news issue or provider page they went to)
init writes the sentence as text and leaves key empty; the editor merges sentences into units and sets each key.
check reports units with no label, units with no key, and units whose key is not in the target page's built text.
"""
import html, json, re, sys
from pathlib import Path

KB = Path(__file__).resolve().parent.parent / "technical_knowledge_base"


def visible(page):
    s = (KB / page / "index.html").read_text(errors="ignore")
    s = re.sub(r"<script.*?</script>|<style.*?</style>", " ", s, flags=re.S)
    return s


def norm(t):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", t))).strip().lower()


def init(page):
    s = visible(page)
    units, n = [], 0
    for tab in re.split(r'(?=<section[^>]+class="tab"|<div[^>]+class="tab")', s):
        m = re.search(r'id="(t-[\w-]+)"', tab)
        tid = m.group(1) if m else "page"
        for sec in re.split(r"(?=<h2)", tab):
            h = re.search(r"<h2[^>]*>(.*?)</h2>", sec, flags=re.S)
            title = norm(h.group(1)) if h else ""
            body = re.sub(r"<svg.*?</svg>", " ", sec, flags=re.S)
            for sent in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9(])", re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", body))).strip()):
                if len(sent.split()) < 4:
                    continue
                n += 1
                units.append({"id": n, "tab": tid, "section": title, "text": sent, "label": "", "key": "", "where": ""})
    out = KB / page / "src" / "ledger.json"
    if out.exists():
        sys.exit(f"{out} exists; not overwriting")
    out.write_text(json.dumps(units, indent=1, ensure_ascii=False) + "\n")
    print(f"{len(units)} units drafted in {out.relative_to(KB.parent)}")


def check(page):
    f = KB / page / "src" / "ledger.json"
    if not f.exists():  # tech-news issues have none (page-kinds/tech-news.md); nothing to check is not a failure
        print(f"{page}: no ledger (src/ledger.json), nothing to check")
        sys.exit(0)
    units = json.loads(f.read_text())
    cache, bad, counts = {}, 0, {}
    for u in units:
        lab = u.get("label", "")
        counts[lab.split(":")[0] or "(none)"] = counts.get(lab.split(":")[0] or "(none)", 0) + 1
        if lab == "fat":
            continue
        if not lab:
            print(f"UNLABELLED {u['id']}: {u['text'][:90]}"); bad += 1; continue
        if not u.get("key"):
            print(f"NO KEY {u['id']} ({lab}): {u['text'][:90]}"); bad += 1; continue
        target = lab.split(":", 1)[1] if lab.startswith("owned:") else (u.get("where") or page)
        if target not in cache:
            p = KB / target / "index.html"
            cache[target] = norm(visible(target)) if p.exists() else None
        if cache[target] is None:
            print(f"NO PAGE {u['id']}: {target}"); bad += 1
        elif norm(u["key"]) not in cache[target]:
            print(f"LOST {u['id']} ({lab}) key {u['key']!r} not in {target}: {u['text'][:80]}"); bad += 1
    print(f"{page}: units {len(units)}, " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())) + f", problems {bad}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    cmd, page = sys.argv[1], sys.argv[2].rstrip("/").removeprefix("technical_knowledge_base/")
    {"init": init, "check": check}[cmd](page)
