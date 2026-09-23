#!/usr/bin/env python3
"""Attach every rendered episode to the page it derives from.

Caption and blurb come from the script's own TITLE and SUBTITLE, so there is
one source for what an episode claims to be, and thirty-eight uploads are one
command rather than thirty-eight hand-written ones.

    uv run python upload_all.py            # dry run, says what it would do
    uv run python upload_all.py --go
    uv run python upload_all.py --go --only topic_rl_overview
"""
import argparse, importlib, json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
sys.path.insert(0, str(REPO / "video"))
sys.path.insert(0, str(REPO / "tools"))
sys.path.insert(0, str(HERE))
import notion_mirror as nm                                   # noqa: E402
from upload import upload, place_at_top, remove_existing_video   # noqa: E402
from stale import check as stale_check                       # noqa: E402

CAP = 4.7


def episodes_file() -> Path:
    """Where the episode-to-page mapping lives.

    Beside this file if somebody has checked one in, otherwise the run
    directory that produced it. It is a mapping from an episode to the Notion
    page it derives from, which is generated from the mirror manifest.
    """
    local = HERE / "episodes.json"
    if local.exists():
        return local
    for p in Path("/tmp").glob("claude-*/*/*/scratchpad/run/episodes.json"):
        return p
    raise SystemExit("no episodes.json: generate it from the mirror manifest")

BLURB = ("A narrated {mins}-minute explainer derived from this page. The page "
         "stays canonical: the video is a derived representation, and every "
         "figure it states comes from here.")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--go", action="store_true")
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--page", metavar="PAGE_ID",
                    help="publish one episode that episodes.json does not map, "
                         "a news issue above all: pass it with a single --only. "
                         "Without this a news episode was silently skipped and "
                         "the run printed '0 uploaded, 0 skipped'")
    ap.add_argument("--index", metavar="EPISODE",
                    help="print N for the 'Overview N of 22' commit title and exit")
    args = ap.parse_args()

    episodes = {e["episode"]: e for e in json.loads(episodes_file().read_text())}
    if args.index:
        topics = [e for e in episodes if e.startswith("topic_")]
        if args.index not in topics:
            raise SystemExit(f"{args.index} is not a topic_ entry of episodes.json")
        print(f"Overview {topics.index(args.index) + 1} of {len(topics)}")
        return 0
    if args.page:
        if not args.only or len(args.only) != 1:
            raise SystemExit("--page needs exactly one --only episode")
        episodes[args.only[0]] = {"episode": args.only[0], "page_id": args.page,
                                  "title": args.only[0]}
    if args.only:
        unknown = [o for o in args.only if o not in episodes]
        if unknown:
            raise SystemExit(f"not in episodes.json: {', '.join(unknown)}. "
                             f"A news issue is not mapped: pass --page <id>.")
    if "llms__comparisons_llm_architecture_gallery" in episodes:
        e = episodes.pop("llms__comparisons_llm_architecture_gallery")
        e["episode"] = "llms_architecture_gallery"
        episodes["llms_architecture_gallery"] = e

    api = nm.Notion(nm.load_token()) if args.go else None
    done, skipped = 0, []
    for name, meta in sorted(episodes.items()):
        if args.only and name not in args.only:
            continue
        mp4 = REPO / "video" / "out" / f"{name}.mp4"
        if not mp4.exists():
            skipped.append(f"{name}: not rendered")
            continue
        mib = mp4.stat().st_size / (1024 * 1024)
        if mib > CAP + 0.3:
            skipped.append(f"{name}: {mib:.2f} MiB, over the cap")
            continue
        # Never publish a video whose script has moved since it was rendered.
        # An episode re-authored after its last render still has a perfectly
        # good mp4 on disk, and uploading it puts the old words on the new
        # page with nothing to indicate it.
        changed, missing, _ = stale_check(name)
        if changed or missing:
            skipped.append(f"{name}: STALE, re-render first "
                           f"({len(changed)} rewritten, {len(missing)} unrendered)")
            continue
        module = importlib.import_module(f"scripts.{name}")
        title = getattr(module, "TITLE", meta["title"])
        sub = getattr(module, "SUBTITLE", "")
        caption = f"{title}: {sub}" if sub else title
        timing = REPO / "video" / "out" / f"timing_{name}.json"
        mins = 0
        if timing.exists():
            mins = round(sum(b["dur"] for b in json.loads(timing.read_text())) / 60)
        blurb = BLURB.format(mins=mins or "short")

        if not args.go:
            print(f"would upload {name} ({mib:.2f} MiB) -> {meta['title']}")
            continue
        remove_existing_video(api, meta["page_id"])
        fid = upload(api, mp4)
        place_at_top(api, meta["page_id"], [
            {"object": "block", "type": "heading_1",
             "heading_1": {"rich_text": [{"type": "text", "text": {"content": "Video"}}]}},
            {"object": "block", "type": "paragraph",
             "paragraph": {"rich_text": [{"type": "text", "text": {"content": blurb}}]}},
            {"object": "block", "type": "video",
             "video": {"type": "file_upload", "file_upload": {"id": fid},
                       "caption": [{"type": "text", "text": {"content": caption}}]}},
        ])
        print(f"uploaded {name} ({mib:.2f} MiB) -> {meta['title']}")
        done += 1

    print(f"\n{done} uploaded, {len(skipped)} skipped")
    for s in skipped:
        print(f"    {s}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
