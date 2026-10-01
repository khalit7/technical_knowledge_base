"""What the sync has to publish: rebuild every migrated page and compare it with what Notion last received.

usage (from the repo root):
  python3 html_utils/sync_status.py                 # rebuild all, list pages whose index.html differs from Notion
  python3 html_utils/sync_status.py --no-build      # compare without rebuilding
  python3 html_utils/sync_status.py --record PATH   # after publishing PATH: store its index.html hash as published

technical_knowledge_base/pages.json is the manifest: one entry per Notion page (path, title, id, status).
For a page with status "html_only", `published_sha256` is the SHA-256 of the index.html Notion holds now.
The script also reports folders with an index.html that the manifest does not list, and manifest entries
whose folder is missing. Stdlib only.
"""
import argparse, hashlib, json, subprocess, sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
MANIFEST = REPO / "technical_knowledge_base" / "pages.json"


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-build", action="store_true")
    ap.add_argument("--record", metavar="PATH", help="page path as in pages.json")
    a = ap.parse_args()
    m = json.loads(MANIFEST.read_text())
    pages = {e["path"]: e for e in m["pages"]}

    if a.record:
        e = pages.get(a.record.rstrip("/"))
        if not e:
            sys.exit(f"not in pages.json: {a.record}")
        e["published_sha256"] = sha(REPO / e["path"] / "index.html")
        MANIFEST.write_text(json.dumps(m, indent=2) + "\n")
        print("recorded", e["path"])
        return

    todo, problems = [], []
    for e in m["pages"]:
        d = REPO / e["path"]
        if not d.is_dir():
            problems.append(f"missing folder: {e['path']}")
            continue
        if e.get("status") != "html_only":
            continue
        if not a.no_build:
            r = subprocess.run(["sh", "src/build.sh"], cwd=d, capture_output=True, text=True)
            if r.returncode:
                problems.append(f"build failed: {e['path']}: {r.stderr.strip()[-300:]}")
                continue
        h = sha(d / "index.html")
        if h != e.get("published_sha256"):
            todo.append(e)
    listed = {REPO / e["path"] for e in m["pages"]}
    for f in (REPO / "technical_knowledge_base").rglob("index.html"):
        if f.parent not in listed and "video" not in f.parts:
            problems.append(f"not in pages.json: {f.parent.relative_to(REPO)}")

    for p in problems:
        print("PROBLEM", p)
    if not todo:
        print("Notion is up to date: nothing to publish.")
    for e in todo:
        print(f"PUBLISH {e['path']}  ({e['title']}, https://app.notion.com/p/{e['id']})")


if __name__ == "__main__":
    main()
