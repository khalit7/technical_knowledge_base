#!/usr/bin/env python3
"""Attach a rendered episode to its Notion page, under a Video heading.

Three steps against the Notion API with the mirror's own token: create a file
upload, send the bytes, then append the blocks. Scripted because there are
thirty-nine of these and the alternative is thirty-nine manual round trips.

    uv run python upload.py <page_id> <episode> "<caption>" "<blurb>"
"""
import sys, json, mimetypes
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "tools"))
import notion_mirror as nm
import requests

VIDEO = Path(__file__).resolve().parent.parent / "out"
CAP_MIB = 5.0   # the hard Notion limit; build.py targets 4.7


def upload(api, path: Path) -> str:
    created = api._request("POST", "/file_uploads", json={
        "filename": path.name, "content_type": "application/mp4"})
    fid = created["id"]
    # The upload endpoint wants multipart, not the JSON content type the
    # session sets for everything else.
    headers = {k: v for k, v in api.s.headers.items()
               if k.lower() != "content-type"}
    r = requests.post(f"https://api.notion.com/v1/file_uploads/{fid}/send",
                      headers=headers, timeout=300,
                      files={"file": (path.name, path.open("rb"), "application/mp4")})
    if not r.ok:
        raise SystemExit(f"send failed {r.status_code}: {r.text[:300]}")
    return fid


def main() -> int:
    page_id, episode, caption, blurb = sys.argv[1:5]
    path = VIDEO / f"{episode}.mp4"
    mib = path.stat().st_size / (1024 * 1024)
    if mib > CAP_MIB:
        raise SystemExit(f"{path.name} is {mib:.2f} MiB, over the {CAP_MIB} cap")

    api = nm.Notion(nm.load_token())
    fid = upload(api, path)
    api._request("PATCH", f"/blocks/{page_id}/children", json={"children": [
        {"object": "block", "type": "heading_1",
         "heading_1": {"rich_text": [{"type": "text", "text": {"content": "Video"}}]}},
        {"object": "block", "type": "paragraph",
         "paragraph": {"rich_text": [{"type": "text", "text": {"content": blurb}}]}},
        {"object": "block", "type": "video",
         "video": {"type": "file_upload", "file_upload": {"id": fid},
                   "caption": [{"type": "text", "text": {"content": caption}}]}},
    ]})
    print(f"{episode}: {mib:.2f} MiB attached to {page_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
