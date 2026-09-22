#!/usr/bin/env python3
"""
Check the mirrored pages against the knowledge base's writing conventions.

    uv run tools/check_conventions.py
    uv run tools/check_conventions.py --glob 'topics/llms/**/*.md'

The conventions live in the Update technical knowledge base skill, and each
one exists because the defect it names spread across dozens of pages before
anybody noticed. That is exactly the shape of thing a person is bad at finding
and a regular expression is good at, so they are checked here rather than
re-read.

Run it over the mirror after a sync. Every hit is a defect on the Notion page,
and the fix belongs there: editing the file here is overwritten by the next
sync and changes nothing.

What it looks for:

  auto-link       Notion turns a bare `setup.py`, `mistral.rs` or `Z.ai` into
                  a link to a URL that does not exist, because the extension
                  looks like a top-level domain. It renders as a real link and
                  goes nowhere.
  broken-link     a page mention whose target no longer exists. A relative
                  link is how this mirror renders a mention, so it is correct
                  by itself and only a defect when it points at nothing
  notion-link     a markdown link wrapping an app.notion.com URL. This one
                  resolves, so it looks fine, which is why it spreads. It
                  still carries no icon, does not follow a rename, and makes
                  no backlink.
  bookkeeping     a page recording its own edit history: "Last updated:",
                  "Created 2026-", "Added 2026-", "(updated 2026-...)"
  superseded      a collapsed copy of the page's former self
  em-dash         banned outright
  doubled-tail    a line that is a suffix of the line above it, which is the
                  signature of a botched search and replace rather than a
                  style choice

An as-of date that qualifies a volatile fact is content and is NOT flagged:
"as of 2026-08-24" and "(2026-08)" are how a page dates a claim honestly. Only
dates describing the page's own editing are bookkeeping.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

CHECKS = (
    # [name.ext](http://name.ext) with no path: Notion auto-linked a bare word.
    ("auto-link", re.compile(r"\[([^\]\s]+\.[A-Za-z]{2,4})\]\(https?://\1/?\)")),
    ("notion-link", re.compile(r"\[[^\]]*\]\(https?://(?:www\.)?(?:app\.)?notion\.so[^)]*\)"
                               r"|\[[^\]]*\]\(https?://app\.notion\.com[^)]*\)")),
    ("bookkeeping", re.compile(r"^\s*\*?\*?(?:Last updated|Created|Seeded|Added)\b[^\n]{0,20}\d{4}",
                               re.M)),
    ("bookkeeping", re.compile(r"\((?:updated|added|revised|rewritten)\s+\d{4}-\d{2}-\d{2}\)",
                               re.I)),
    ("superseded", re.compile(r"<summary>[^<]*(?:superseded|previous version|"
                              r"original map|kept for reference)", re.I)),
    ("em-dash", re.compile(r"—")),
)


# A relative link to another page is how the MIRROR renders a Notion page
# mention, so it is correct here and must not be flagged: the first version of
# this check reported a thousand of them and was measuring its own renderer.
# What IS a defect is one of those pointing at a page that does not exist.
RELATIVE = re.compile(r"\[([^\]]*)\]\((?!https?:|#|mailto:)([^)]+)\)")


def broken_links(path: Path, text: str) -> list[tuple[int, str]]:
    out = []
    for m in RELATIVE.finditer(text):
        target = m.group(2).split("#", 1)[0]
        if not target:
            continue
        if not (path.parent / target).exists():
            line = text[:m.start()].count("\n") + 1
            out.append((line, f"{m.group(1)[:40]} -> {target[:70]}"))
    return out


def doubled_tails(text: str) -> list[tuple[int, str]]:
    """A line whose text is the tail of the line before it."""
    out = []
    lines = text.splitlines()
    for i in range(1, len(lines)):
        a = lines[i - 1].strip().lstrip("-*# ").strip()
        b = lines[i].strip().lstrip("-*# ").strip()
        if len(b) >= 25 and a.endswith(b):
            out.append((i + 1, b[:80]))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--glob", default="topics/**/*.md")
    ap.add_argument("--also", nargs="*", default=["news/*.md", "papers/*/summary.md"])
    args = ap.parse_args()

    paths = sorted(REPO.glob(args.glob))
    for pattern in args.also:
        paths += sorted(REPO.glob(pattern))

    counts: dict[str, int] = {}
    pages = 0
    for path in paths:
        text = path.read_text(encoding="utf-8")
        hits: list[tuple[str, str]] = []
        for name, pattern in CHECKS:
            for m in pattern.finditer(text):
                line = text[:m.start()].count("\n") + 1
                hits.append((name, f"line {line}: {m.group(0)[:90]}"))
        for line, snippet in doubled_tails(text):
            hits.append(("doubled-tail", f"line {line}: {snippet}"))
        for line, snippet in broken_links(path, text):
            hits.append(("broken-link", f"line {line}: {snippet}"))
        if hits:
            pages += 1
            print(f"\n{path.relative_to(REPO)}")
            for name, detail in hits[:8]:
                counts[name] = counts.get(name, 0) + 1
                print(f"    {name:14s} {detail}")
            if len(hits) > 8:
                print(f"    ... and {len(hits) - 8} more")
            for name, _ in hits[8:]:
                counts[name] = counts.get(name, 0) + 1

    print(f"\n{pages} of {len(paths)} pages have something.")
    for name, n in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"    {n:4d}  {name}")
    if not counts:
        print("    nothing found")
    print("\nEvery hit is a defect on the Notion page. Fix it there: this "
          "mirror is generated, and an edit here is overwritten by the next "
          "sync.")
    return 1 if counts else 0


if __name__ == "__main__":
    raise SystemExit(main())
