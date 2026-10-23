"""What is left to publish. The repository is the source of truth; the reading site (GitHub Pages) is built from
main by CI on every push; Notion holds one link page per page (see .claude/skills/sync-kb-github/SKILL.md).

usage (from the repo root):
  python3 html_utils/sync_status.py              # rebuild every page, then report
  python3 html_utils/sync_status.py --no-build   # report without rebuilding (safe while agents edit pages)

Reports:
  PROBLEM     a failed build, a folder missing from pages.json, a manifest entry without a folder
  UNCOMMITTED a page folder with changes not committed (a rebuild that changed index.html shows up here too)
  UNPUSHED    commits on main that are not on origin/main (the site has not got them)
  NOTION      a page whose Notion page is not yet a link page (pages.json "notion" is not "link")
and ends "Published: ..." when there is nothing to do. Stdlib only.
"""
import argparse, json, os, subprocess, sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
MANIFEST = REPO / "technical_knowledge_base" / "pages.json"
# Builds run python3 from the repo's uv environment (Python 3.12, `uv sync`): float output differs in the last digit
# between Python versions, which would change pages.
_VENV = REPO / ".venv" / "bin"
BUILD_ENV = dict(os.environ, PATH=str(_VENV) + os.pathsep + os.environ.get("PATH", ""))


def git(*args):
    return subprocess.run(["git", *args], cwd=REPO, capture_output=True, text=True).stdout


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-build", action="store_true")
    a = ap.parse_args()
    if not a.no_build and not (_VENV / "python3").exists():
        sys.exit("run `uv sync` at the repo root first: builds use .venv/bin/python3")
    m = json.loads(MANIFEST.read_text())
    problems, uncommitted, notion = [], [], []
    for e in m["pages"]:
        d = REPO / e["path"]
        if not d.is_dir():
            problems.append(f"missing folder: {e['path']}")
            continue
        if e.get("status") == "html_only" and not a.no_build:
            r = subprocess.run(["sh", "src/build.sh"], cwd=d, capture_output=True, text=True, env=BUILD_ENV)
            if r.returncode:
                problems.append(f"build failed: {e['path']}: {r.stderr.strip()[-300:]}")
        if e.get("notion") != "link":
            notion.append(e)
    listed = {REPO / e["path"] for e in m["pages"]}
    for f in (REPO / "technical_knowledge_base").rglob("index.html"):
        if f.parent not in listed and "video" not in f.parts:
            problems.append(f"not in pages.json: {f.parent.relative_to(REPO)}")
    dirty = git("status", "--porcelain", "--", "technical_knowledge_base").splitlines()
    for e in m["pages"]:
        if any(line[3:].startswith(e["path"] + "/") and not any(line[3:].startswith(o["path"] + "/") and len(o["path"]) > len(e["path"]) for o in m["pages"]) for line in dirty):
            uncommitted.append(e)
    git("fetch", "-q", "origin", "main")
    unpushed = git("rev-list", "--count", "origin/main..HEAD").strip()

    for p in problems:
        print("PROBLEM", p)
    for e in uncommitted:
        print(f"UNCOMMITTED {e['path']}  ({e['title']})")
    if unpushed not in ("", "0"):
        print(f"UNPUSHED {unpushed} commit(s) on main: git push")
    for e in notion:
        print(f"NOTION {e['path']}  ({e['title']}, https://app.notion.com/p/{e['id']})")
    if not (problems or uncommitted or notion) and unpushed in ("", "0"):
        print("Published: every page is committed and pushed (the site deploys from main), and every Notion page is a link page.")


if __name__ == "__main__":
    main()
