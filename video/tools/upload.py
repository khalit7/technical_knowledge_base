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


def remove_existing_video(api, page_id: str) -> int:
    """Take down a video section this page already has.

    An episode gets remade: a page must not end up with two of them, and the
    stale one is the one somebody watches. Removes a `Video` heading, the
    paragraph under it and the video block itself, wherever they sit.
    """
    gone = 0
    children = api.children(page_id)
    for i, block in enumerate(children):
        if block["type"] == "video":
            api._request("DELETE", f"/blocks/{block['id']}")
            gone += 1
            # The heading and its blurb sit immediately above it.
            for back in (i - 1, i - 2):
                if back < 0:
                    break
                near = children[back]
                if near["type"] == "heading_1":
                    text = "".join(r.get("plain_text", "")
                                   for r in near["heading_1"].get("rich_text", []))
                    if text.strip().lower() == "video":
                        api._request("DELETE", f"/blocks/{near['id']}")
                        gone += 1
                    break
                if near["type"] == "paragraph":
                    api._request("DELETE", f"/blocks/{near['id']}")
                    gone += 1
    return gone


def place_at_top(api, page_id: str, blocks: list) -> None:
    """Put the video first on the page, above everything else.

    Notion's API can append children and can insert after a named block, but
    it has no "insert before". So: put the blocks after the page's current
    first block, recreate that first block below them, and delete the
    original. The recreation is lossless because it reuses the block's own
    rich_text, annotations and links verbatim.

    A video belongs at the top because it is the fastest way into the page.
    Buried under eighteen minutes of prose it is something you find after you
    no longer need it.
    """
    children = api.children(page_id)
    if not children:
        api._request("PATCH", f"/blocks/{page_id}/children", json={"children": blocks})
        return

    first = children[0]
    kind = first["type"]
    if kind not in ("paragraph", "heading_1", "heading_2", "heading_3"):
        # Something structural sits first (a table, a callout, a child page).
        # Do not try to move it; go in directly after it instead.
        api._request("PATCH", f"/blocks/{page_id}/children",
                     json={"children": blocks, "after": first["id"]})
        return

    # One call, not two. Inserting the video and then recreating the old
    # first block after it looked correct and was not: Notion silently
    # ignored an `after` that pointed at the freshly created video block,
    # which is still processing its upload, and appended the recreated block
    # to the END of the page instead. The page lost its reading-time line
    # from the top and gained it as the last thing on an eighteen minute
    # article, and nothing errored.
    #
    # Sending the video blocks and the copy together as one batch means the
    # only `after` reference is to a block that already existed.
    copy = {"object": "block", "type": kind,
            kind: {"rich_text": first[kind].get("rich_text", [])}}
    api._request("PATCH", f"/blocks/{page_id}/children",
                 json={"children": blocks + [copy], "after": first["id"]})
    api._request("DELETE", f"/blocks/{first['id']}")


def main() -> int:
    page_id, episode, caption, blurb = sys.argv[1:5]
    path = VIDEO / f"{episode}.mp4"
    mib = path.stat().st_size / (1024 * 1024)
    if mib > CAP_MIB:
        raise SystemExit(f"{path.name} is {mib:.2f} MiB, over the {CAP_MIB} cap")

    api = nm.Notion(nm.load_token())
    removed = remove_existing_video(api, page_id)
    if removed:
        print(f"removed {removed} block(s) of an earlier video")
    fid = upload(api, path)
    place_at_top(api, page_id, [
        {"object": "block", "type": "heading_1",
         "heading_1": {"rich_text": [{"type": "text", "text": {"content": "Video"}}]}},
        {"object": "block", "type": "paragraph",
         "paragraph": {"rich_text": [{"type": "text", "text": {"content": blurb}}]}},
        {"object": "block", "type": "video",
         "video": {"type": "file_upload", "file_upload": {"id": fid},
                   "caption": [{"type": "text", "text": {"content": caption}}]}},
    ])
    print(f"{episode}: {mib:.2f} MiB attached to {page_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
