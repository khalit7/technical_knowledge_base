"""One line per item of an issue in the old shape (src/issue.md before 2026-11-27, or src/live.md), for the new
design's Further reading: the item's bold lead, the parenthesis that follows it (date, source) and its links with times.
Used once, to rebuild the issues published before the new design (html_utils/issue_page.py).

usage: python3 html_utils/issue_oneliners.py <old issue source>   prints "# Further reading" groups to stdout
"""
import re, sys

GROUP = {"models & releases": "Models", "models": "Models", "research & papers": "Research and papers", "research": "Research and papers",
         "industry": "Industry", "compute & chips": "Compute and chips", "compute": "Compute and chips", "dev tooling & agents": "Tools and agents",
         "dev tooling": "Tools and agents", "security": "Security", "talk of the town": "Hacker News", "policy": "Policy"}
LINK = r"\[[^\]]+\]\([^)\s]+\)(?:\s*\((?:\d+h(?: \d+ ?m(?:in)?)?|\d+ ?min)\))?"


def items(src):
    sec, out = None, {}
    for ln in src.splitlines():
        s = ln.strip()
        if s.startswith("#"):
            sec = s.strip("# ").strip()
            continue
        if not s or sec is None:
            continue
        m = re.match(r"(?:[-*]\s+)?\*\*(.+?)\*\*\s*(.*)", s)
        if m:
            out.setdefault(sec, []).append((m.group(1).strip(), m.group(2)))
    return out


def one(lead, rest):
    par = re.match(r"\s*(\([^()]*(?:\([^()]*\)[^()]*)*\))", rest)
    links = re.findall(LINK, rest)
    lead = lead.rstrip(".") if not lead.endswith("..") else lead
    s = f"**{lead}**" + (f" {par.group(1)}" if par else "")
    return s + (": " + ", ".join(links[:3]) if links else "")


if __name__ == "__main__":
    src = open(sys.argv[1]).read()
    src = re.sub(r"(?s)^.*?<content>\s*", "", src)   # live.md: a saved Notion fetch
    for sec, its in items(src).items():
        if sec.lower() in ("top stories", "at a glance", "further reading", "what happened next"):
            continue
        print(f"## {GROUP.get(sec.lower(), sec)}")
        for lead, rest in its:
            print("- " + one(lead, rest))
        print()
