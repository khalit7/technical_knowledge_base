#!/usr/bin/env python3
"""
Mirror the Notion "Technical knowledge base" page tree into this repository.

The mirror is derived from Notion's current state, not from a diff of recent
edits: every run walks the whole tree from the root page, writes every page to
its mapped file, and deletes managed files whose Notion page no longer exists.
A sync that cannot delete is how a mirror rots.

Usage:
    export NOTION_TOKEN=ntn_...          # or put it in .notion-token
    python3 tools/notion_mirror.py               # full sync
    python3 tools/notion_mirror.py --dry-run     # report, write nothing
    python3 tools/notion_mirror.py --no-pdfs     # skip arXiv PDF downloads
    python3 tools/notion_mirror.py --render-svg  # re-render changed taxonomy diagrams

The token is an internal integration secret from notion.so/profile/integrations,
with the integration connected to the "Technical knowledge base" page. Only read
access is used: this script never writes to Notion.

Nothing outside the managed paths is touched. Paper PDFs, sources/ and video/
are repo-only assets and are never deleted.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

import requests

REPO = Path(__file__).resolve().parent.parent
ROOT_PAGE_ID = "3c65c17b-0d0d-81c7-b646-e548e65d9446"
API = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"
MANIFEST = REPO / "tools" / ".notion-mirror.json"

# Files this script owns. Anything matching these globs and not written by a run
# is an orphan and gets deleted.
MANAGED_GLOBS = (
    "topics/**/*.md",
    "topics/**/*.mmd",
    "news/*.md",
    "updates/*.md",
    "papers/*/summary.md",
    "papers/INDEX.md",
    "TRACKER.md",
    "known-gaps.md",
)

# Never deleted, whatever Notion says. Paper PDFs and article snapshots live
# only here, and the video toolchain is repo-only.
PROTECTED_GLOBS = (
    "papers/*/paper.pdf",
    "sources/**",
    "video/**",
    "tools/**",
)


# --------------------------------------------------------------------------
# Notion API
# --------------------------------------------------------------------------


class Notion:
    def __init__(self, token: str):
        self.s = requests.Session()
        self.s.headers.update(
            {
                "Authorization": f"Bearer {token}",
                "Notion-Version": NOTION_VERSION,
                "Content-Type": "application/json",
            }
        )
        self.calls = 0

    def _request(self, method: str, path: str, **kw):
        for attempt in range(6):
            r = self.s.request(method, f"{API}{path}", timeout=60, **kw)
            self.calls += 1
            if r.status_code == 429:
                time.sleep(float(r.headers.get("Retry-After", 2)))
                continue
            if r.status_code >= 500:
                time.sleep(1.5 * (attempt + 1))
                continue
            if not r.ok:
                raise RuntimeError(f"{method} {path} -> {r.status_code}: {r.text[:400]}")
            return r.json()
        raise RuntimeError(f"{method} {path}: gave up after retries")

    def page(self, page_id: str) -> dict:
        return self._request("GET", f"/pages/{page_id}")

    def block(self, block_id: str) -> dict:
        return self._request("GET", f"/blocks/{block_id}")

    def children(self, block_id: str) -> list[dict]:
        out, cursor = [], None
        while True:
            q = f"?page_size=100" + (f"&start_cursor={cursor}" if cursor else "")
            data = self._request("GET", f"/blocks/{block_id}/children{q}")
            out.extend(data["results"])
            if not data.get("has_more"):
                return out
            cursor = data["next_cursor"]

    def db_rows(self, database_id: str) -> list[dict]:
        out, cursor = [], None
        while True:
            body = {"page_size": 100}
            if cursor:
                body["start_cursor"] = cursor
            data = self._request("POST", f"/databases/{database_id}/query", data=json.dumps(body))
            out.extend(data["results"])
            if not data.get("has_more"):
                return out
            cursor = data["next_cursor"]

    def database(self, database_id: str) -> dict:
        return self._request("GET", f"/databases/{database_id}")


# --------------------------------------------------------------------------
# Tree
# --------------------------------------------------------------------------


@dataclass
class Node:
    page_id: str
    title: str
    parent_id: str | None
    blocks: list[dict] = field(default_factory=list)
    path: Path | None = None          # repo-relative destination
    props: dict = field(default_factory=dict)   # database row properties
    last_edited: str = ""
    kind: str = "page"                # page | db_row


def slugify(title: str) -> str:
    """Kebab-case file stem, matching the names already in the repo."""
    t = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    t = t.lower()
    t = re.sub(r"^topic:\s*", "", t)
    t = re.sub(r"[^a-z0-9]+", "-", t)
    return t.strip("-") or "untitled"


def plain(rich: list[dict]) -> str:
    return "".join(r.get("plain_text", "") for r in rich or [])


def title_of(obj: dict) -> str:
    """Title of a page object, whether it is a plain page or a database row."""
    props = obj.get("properties", {})
    for value in props.values():
        if value.get("type") == "title":
            return plain(value["title"]).strip()
    return "untitled"


DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")


def dated_name(title: str) -> str:
    """news/updates file stem: 2026-09-21, or 2026-09-07-t5-added for extras."""
    m = DATE_RE.search(title)
    if not m:
        return slugify(title)
    date = m.group(1)
    rest = title[m.end():].lstrip(": -").strip()
    generic = {"tech news", "weekly update", "update", "weekly research pass"}
    if not rest or rest.lower() in generic:
        return date
    return f"{date}-{slugify(rest)}"


class Walker:
    """Builds the full page inventory and decides where each page goes."""

    def __init__(self, api: Notion):
        self.api = api
        self.nodes: dict[str, Node] = {}
        self.order: list[str] = []
        self.rows_of_db: dict[str, list[str]] = {}   # child_database block id -> row page ids

    def walk(self) -> None:
        root = self.api.page(ROOT_PAGE_ID)
        self._visit(ROOT_PAGE_ID, title_of(root), None, root.get("last_edited_time", ""))

    def _visit(self, page_id: str, title: str, parent_id: str | None, last_edited: str,
               props: dict | None = None, kind: str = "page") -> None:
        node = Node(page_id=page_id, title=title, parent_id=parent_id,
                    props=props or {}, last_edited=last_edited, kind=kind)
        self.nodes[page_id] = node
        self.order.append(page_id)
        node.blocks = self.api.children(page_id)
        print(f"  read {title}", file=sys.stderr)

        for b in node.blocks:
            if b["type"] == "child_page":
                child = self.api.page(b["id"])
                self._visit(b["id"], b["child_page"]["title"], page_id,
                            child.get("last_edited_time", ""))
            elif b["type"] == "child_database":
                db_id = b["id"]
                self.rows_of_db[db_id] = []
                for row in self.api.db_rows(db_id):
                    self.rows_of_db[db_id].append(row["id"])
                    self._visit(row["id"], title_of(row), page_id,
                                row.get("last_edited_time", ""),
                                props=row.get("properties", {}), kind="db_row")

    # -- path mapping -------------------------------------------------------

    def assign_paths(self, existing_papers: dict[str, Path]) -> None:
        root = self.nodes[ROOT_PAGE_ID]
        root.path = None  # the root page is the repo itself, not a file

        for page_id in self.order:
            node = self.nodes[page_id]
            if page_id == ROOT_PAGE_ID:
                continue
            node.path = self._path_for(node, existing_papers)

    def _ancestry(self, node: Node) -> list[Node]:
        chain, cur = [], node
        while cur is not None:
            chain.append(cur)
            cur = self.nodes.get(cur.parent_id) if cur.parent_id else None
        return list(reversed(chain))          # root first

    def _path_for(self, node: Node, existing_papers: dict[str, Path]) -> Path | None:
        chain = self._ancestry(node)          # [root, ..., node]
        if len(chain) < 2:
            return None
        top = chain[1]                        # direct child of the KB root
        t = top.title.strip()

        if t.lower().startswith("topic:"):
            topic = slugify(t)
            if node is top:
                return Path("topics") / topic / "summary.md"
            middle = [slugify(n.title) for n in chain[2:-1]]
            return Path("topics").joinpath(topic, *middle, slugify(node.title) + ".md")

        if t == "Papers":
            if node is top:
                return Path("papers") / "INDEX.md"
            folder = existing_papers.get(node.title.strip().lower())
            if folder is None:
                folder = Path("papers") / self._new_paper_folder(node)
            return folder / "summary.md"

        if t == "Tech news":
            if node is top:
                return None                    # the index page has no repo file
            return Path("news") / (dated_name(node.title) + ".md")

        if t == "Updates":
            if node is top:
                return None
            return Path("updates") / (dated_name(node.title) + ".md")

        if t == "Tracker":
            return Path("TRACKER.md") if node is top else None

        # Any other page hanging off the KB root, such as "Known gaps".
        if node is top:
            return Path(slugify(t) + ".md")
        return Path(slugify(t)) / (slugify(node.title) + ".md")

    def _new_paper_folder(self, node: Node) -> str:
        """YYYY-MM_short-name, taking the date from the arXiv id where possible."""
        text = "\n".join(plain(v.get(v["type"], [])) if isinstance(v.get(v["type"]), list) else ""
                         for v in node.props.values())
        text += json.dumps(node.blocks)
        m = re.search(r"arxiv\.org/(?:abs|pdf)/(\d{2})(\d{2})\.\d{4,5}", text)
        if m:
            yy, mm = m.group(1), m.group(2)
            return f"20{yy}-{mm}_{slugify(node.title)[:40].strip('-')}"
        year = ""
        for key, value in node.props.items():
            if key.lower() == "year":
                year = plain(value.get("rich_text", []))[:4]
        year = year if re.fullmatch(r"\d{4}", year) else "0000"
        return f"{year}-00_{slugify(node.title)[:40].strip('-')}"


def scan_existing_papers() -> dict[str, Path]:
    """Map an existing paper folder to the title in its summary, so a re-run
    keeps the folder name (and the PDF next to it) instead of creating a twin."""
    out: dict[str, Path] = {}
    for summary in sorted((REPO / "papers").glob("*/summary.md")):
        first = ""
        for line in summary.read_text(encoding="utf-8").splitlines():
            if line.startswith("# "):
                first = line[2:].strip()
                break
        if first:
            out[first.lower()] = summary.parent.relative_to(REPO)
    return out


# --------------------------------------------------------------------------
# Blocks to markdown
# --------------------------------------------------------------------------


class Renderer:
    def __init__(self, walker: Walker):
        self.w = walker

    # -- inline -----------------------------------------------------------

    def rich(self, items: list[dict], source: Path | None) -> str:
        out = []
        for r in items or []:
            out.append(self._one(r, source))
        return "".join(out)

    def _one(self, r: dict, source: Path | None) -> str:
        rtype = r.get("type")
        if rtype == "mention":
            text = self._mention(r, source)
            if text is not None:
                return text
        if rtype == "equation":
            return f"`{r['equation']['expression']}`"

        text = r.get("plain_text", "")
        ann = r.get("annotations", {})
        if ann.get("code"):
            text = f"`{text}`"
        if ann.get("bold"):
            text = f"**{text}**"
        if ann.get("italic"):
            text = f"*{text}*"
        if ann.get("strikethrough"):
            text = f"~~{text}~~"
        href = r.get("href")
        if href and not (rtype == "mention"):
            text = f"[{text}]({href})"
        return text

    def _mention(self, r: dict, source: Path | None) -> str | None:
        m = r["mention"]
        if m["type"] in ("page", "database"):
            target_id = m[m["type"]]["id"]
            node = self.w.nodes.get(target_id)
            label = r.get("plain_text", "").strip() or (node.title if node else "page")
            if node and node.path and source:
                rel = os.path.relpath(REPO / node.path, (REPO / source).parent)
                return f"[{label}]({rel})"
            return label
        if m["type"] == "date":
            d = m["date"]
            return d["start"] + (f" to {d['end']}" if d.get("end") else "")
        if m["type"] == "user":
            return r.get("plain_text", "")
        return None

    # -- blocks -----------------------------------------------------------

    def blocks(self, blocks: list[dict], source: Path | None, indent: str = "") -> list[str]:
        lines: list[str] = []
        number = 0
        for b in blocks:
            btype = b["type"]
            if btype == "numbered_list_item":
                number += 1
            else:
                number = 0
            lines.extend(self.block(b, source, indent, number))
        return lines

    def block(self, b: dict, source: Path | None, indent: str, number: int) -> list[str]:
        t = b["type"]
        body = b.get(t, {})
        rt = body.get("rich_text", [])
        text = self.rich(rt, source)
        kids = b.get("_children", [])

        def nested(prefix_indent: str) -> list[str]:
            return self.blocks(kids, source, indent + prefix_indent) if kids else []

        if t == "paragraph":
            if not text.strip():
                return [""]
            return [indent + text, ""] + nested("")
        if t in ("heading_1", "heading_2", "heading_3"):
            level = {"heading_1": "##", "heading_2": "###", "heading_3": "####"}[t]
            return ["", f"{level} {text}", ""] + nested("")
        if t == "bulleted_list_item":
            return [f"{indent}- {text}"] + nested("  ")
        if t == "numbered_list_item":
            return [f"{indent}{number}. {text}"] + nested("   ")
        if t == "to_do":
            box = "x" if body.get("checked") else " "
            return [f"{indent}- [{box}] {text}"] + nested("  ")
        if t == "toggle":
            inner = nested("")
            return ["", "<details>", f"<summary>{text}</summary>", ""] + inner + ["</details>", ""]
        if t == "code":
            lang = body.get("language", "")
            lang = {"plain text": ""}.get(lang, lang)
            code = plain(rt)
            return ["", f"```{lang}"] + code.split("\n") + ["```", ""]
        if t == "quote":
            quoted = [f"{indent}> {line}" for line in text.split("\n")]
            return [""] + quoted + [""] + nested("")
        if t == "callout":
            icon = (body.get("icon") or {}).get("emoji", "")
            head = f"{indent}> {icon} {text}".rstrip()
            return ["", head] + [f"{indent}> {ln}" for ln in nested("")] + [""]
        if t == "divider":
            return ["", "---", ""]
        if t == "equation":
            return ["", "```", body.get("expression", ""), "```", ""]
        if t == "image":
            url = self._file_url(body)
            cap = self.rich(body.get("caption", []), source) or "image"
            return ["", f"![{cap}]({url})", ""]
        if t in ("video", "file", "pdf"):
            url = self._file_url(body)
            cap = self.rich(body.get("caption", []), source) or t
            return ["", f"[{cap}]({url})", ""]
        if t in ("bookmark", "embed", "link_preview"):
            url = body.get("url", "")
            cap = self.rich(body.get("caption", []), source) or url
            return ["", f"[{cap}]({url})", ""]
        if t == "table":
            return self.table(b, source)
        if t == "child_page":
            node = self.w.nodes.get(b["id"])
            if node and node.path and source:
                rel = os.path.relpath(REPO / node.path, (REPO / source).parent)
                return [f"- [{node.title}]({rel})"]
            return []
        if t == "child_database":
            return self.child_database(b, source)
        if t in ("column_list", "column", "synced_block"):
            return nested("")
        if t in ("table_of_contents", "breadcrumb", "template", "unsupported"):
            return []
        if text:
            return [indent + text, ""]
        return []

    @staticmethod
    def _file_url(body: dict) -> str:
        f = body.get("file") or body.get("external") or {}
        return f.get("url", "")

    def table(self, b: dict, source: Path | None) -> list[str]:
        rows = [r for r in b.get("_children", []) if r["type"] == "table_row"]
        if not rows:
            return []
        has_header = b["table"].get("has_column_header", False)
        out = [""]
        for i, row in enumerate(rows):
            cells = [self.rich(c, source).replace("|", "\\|").replace("\n", " ")
                     for c in row["table_row"]["cells"]]
            out.append("| " + " | ".join(cells) + " |")
            if i == 0 and has_header:
                out.append("|" + "|".join([" --- "] * len(cells)) + "|")
        out.append("")
        return out

    def child_database(self, b: dict, source: Path | None) -> list[str]:
        """Inline databases render as a table of their rows, each linking to the
        row's mirrored page."""
        rows = [self.w.nodes[rid] for rid in self.w.rows_of_db.get(b["id"], [])
                if rid in self.w.nodes]
        if not rows:
            return []
        cols = self._db_columns(rows)
        out = ["", "| " + " | ".join(["Page"] + cols) + " |",
               "|" + "|".join([" --- "] * (len(cols) + 1)) + "|"]
        for node in rows:
            if node.path and source:
                rel = os.path.relpath(REPO / node.path, (REPO / source).parent)
                label = f"[{node.title}]({rel})"
            else:
                label = node.title
            values = [self._prop_text(node.props.get(c, {}), source) for c in cols]
            out.append("| " + " | ".join([label] + values) + " |")
        out.append("")
        return out

    @staticmethod
    def _db_columns(rows: list[Node]) -> list[str]:
        cols: list[str] = []
        for node in rows:
            for key, value in node.props.items():
                if value.get("type") != "title" and key not in cols:
                    cols.append(key)
        return cols

    def _prop_text(self, value: dict, source: Path | None) -> str:
        if not value:
            return ""
        t = value.get("type")
        if t == "rich_text":
            return self.rich(value["rich_text"], source).replace("|", "\\|")
        if t == "title":
            return plain(value["title"])
        if t == "select":
            return (value["select"] or {}).get("name", "")
        if t == "multi_select":
            return ", ".join(o["name"] for o in value["multi_select"])
        if t == "number":
            return "" if value["number"] is None else str(value["number"])
        if t == "checkbox":
            return "x" if value["checkbox"] else ""
        if t == "date":
            d = value["date"] or {}
            return d.get("start", "")
        if t == "url":
            return value.get("url") or ""
        return ""

    # -- whole page -------------------------------------------------------

    def page(self, node: Node) -> str:
        lines = [f"# {node.title}", ""]
        lines += self.blocks(node.blocks, node.path)
        text = "\n".join(lines)
        text = re.sub(r"\n{3,}", "\n\n", text).strip() + "\n"
        return text


def attach_children(api: Notion, blocks: list[dict]) -> None:
    """Notion returns nested blocks lazily; pull them so rendering is one pass."""
    for b in blocks:
        if b.get("has_children") and b["type"] not in ("child_page", "child_database"):
            b["_children"] = api.children(b["id"])
            attach_children(api, b["_children"])


# --------------------------------------------------------------------------
# Repo side
# --------------------------------------------------------------------------


def managed_files() -> set[Path]:
    out: set[Path] = set()
    for pattern in MANAGED_GLOBS:
        out |= {p.relative_to(REPO) for p in REPO.glob(pattern) if p.is_file()}
    protected: set[Path] = set()
    for pattern in PROTECTED_GLOBS:
        protected |= {p.relative_to(REPO) for p in REPO.glob(pattern) if p.is_file()}
    return out - protected


ARXIV_RE = re.compile(r"arxiv\.org/(?:abs|pdf)/(\d{4}\.\d{4,5})")


def download_pdfs(nodes: list[Node], dry_run: bool) -> list[str]:
    done = []
    for node in nodes:
        if not node.path or node.path.parts[0] != "papers" or node.path.name != "summary.md":
            continue
        pdf = REPO / node.path.parent / "paper.pdf"
        if pdf.exists():
            continue
        m = ARXIV_RE.search(json.dumps(node.blocks))
        if not m:
            done.append(f"no arXiv link, no PDF: {node.title}")
            continue
        url = f"https://arxiv.org/pdf/{m.group(1)}"
        if dry_run:
            done.append(f"would download {url} -> {pdf.relative_to(REPO)}")
            continue
        pdf.parent.mkdir(parents=True, exist_ok=True)
        r = requests.get(url, timeout=120, headers={"User-Agent": "tech-kb-mirror/1.0"})
        if r.ok and r.content[:4] == b"%PDF":
            pdf.write_bytes(r.content)
            done.append(f"downloaded {pdf.relative_to(REPO)} ({len(r.content) // 1024} KiB)")
        else:
            done.append(f"FAILED download {url} ({r.status_code})")
        time.sleep(1.0)
    return done


MERMAID_RE = re.compile(r"```mermaid\n(.*?)```", re.S)


def render_svgs(written: dict[Path, str], dry_run: bool) -> list[str]:
    """Keep taxonomy.svg in step with the mermaid source on the page."""
    import subprocess

    out = []
    for path, text in written.items():
        if path.name != "summary.md":
            continue
        m = MERMAID_RE.search(text)
        if not m:
            continue
        src = REPO / path.parent / "taxonomy.mmd"
        svg = REPO / path.parent / "taxonomy.svg"
        source = m.group(1).strip() + "\n"
        if src.exists() and src.read_text() == source and svg.exists():
            continue
        if dry_run:
            out.append(f"would re-render {svg.relative_to(REPO)}")
            continue
        src.write_text(source)
        r = subprocess.run(
            ["npx", "-y", "@mermaid-js/mermaid-cli", "-i", str(src), "-o", str(svg), "-b", "white"],
            capture_output=True, text=True,
        )
        out.append(f"re-rendered {svg.relative_to(REPO)}" if r.returncode == 0
                   else f"FAILED render {svg.relative_to(REPO)}: {r.stderr[-200:]}")
    return out


def load_token() -> str:
    token = os.environ.get("NOTION_TOKEN", "").strip()
    if token:
        return token
    f = REPO / ".notion-token"
    if f.exists():
        return f.read_text().strip()
    sys.exit(
        "No Notion token. Create an internal integration at "
        "https://www.notion.so/profile/integrations, connect it to the "
        "'Technical knowledge base' page, then either export NOTION_TOKEN=ntn_... "
        "or write the secret to .notion-token (gitignored)."
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true", help="report, change nothing")
    ap.add_argument("--no-pdfs", action="store_true", help="skip arXiv PDF downloads")
    ap.add_argument("--render-svg", action="store_true", help="re-render changed taxonomy diagrams")
    args = ap.parse_args()

    api = Notion(load_token())
    print("walking Notion...", file=sys.stderr)
    walker = Walker(api)
    walker.walk()
    for node in walker.nodes.values():
        attach_children(api, node.blocks)
    walker.assign_paths(scan_existing_papers())

    renderer = Renderer(walker)
    written: dict[Path, str] = {}
    for page_id in walker.order:
        node = walker.nodes[page_id]
        if node.path is None:
            continue
        if node.path in written:
            print(f"  collision on {node.path}: {node.title}", file=sys.stderr)
        written[node.path] = renderer.page(node)

    before = managed_files()
    added = sorted(p for p in written if not (REPO / p).exists())
    changed = sorted(
        p for p in written
        if (REPO / p).exists() and (REPO / p).read_text(encoding="utf-8") != written[p]
    )
    orphans = sorted(before - set(written))

    if not args.dry_run:
        for path, text in written.items():
            dest = REPO / path
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(text, encoding="utf-8")
        for path in orphans:
            (REPO / path).unlink()
        for d in sorted((REPO / "topics").glob("**/"), key=lambda p: -len(p.parts)):
            if d.is_dir() and not any(d.iterdir()):
                d.rmdir()
        MANIFEST.write_text(json.dumps(
            {
                "synced": time.strftime("%Y-%m-%d"),
                "root": ROOT_PAGE_ID,
                "pages": {
                    walker.nodes[p].page_id: {
                        "title": walker.nodes[p].title,
                        "path": str(walker.nodes[p].path),
                        "last_edited": walker.nodes[p].last_edited,
                    }
                    for p in walker.order if walker.nodes[p].path
                },
            },
            indent=2, sort_keys=True) + "\n")

    notes = []
    if not args.no_pdfs:
        notes += download_pdfs([walker.nodes[p] for p in walker.order], args.dry_run)
    if args.render_svg:
        notes += render_svgs(written, args.dry_run)

    print(f"\n{'DRY RUN: ' if args.dry_run else ''}{len(written)} pages mirrored "
          f"in {api.calls} API calls")
    print(f"  added   {len(added)}")
    for p in added:
        print(f"    + {p}")
    print(f"  changed {len(changed)}")
    for p in changed:
        print(f"    ~ {p}")
    print(f"  deleted {len(orphans)}")
    for p in orphans:
        print(f"    - {p}")
    for n in notes:
        print(f"  {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
