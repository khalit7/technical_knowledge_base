#!/usr/bin/env bash
# Every check the publish step asks for, immediately before publishing, in one
# command. The skill says to re-run them all then rather than after the last
# edit, because in a batch the tools move under you; that used to be five
# commands, three of them through the GPU lease, typed from memory.
#
#     video/tools/prepublish.sh topic_rl_overview
#
# review.py covers structure, layout, timing, voice and delivery; the other two
# are the screen references (frames to read by eye) and the leads, timed from
# the real voice. It stops at nothing, so read every section.
set -u
ep="${1:?usage: prepublish.sh <episode>}"
here="$(cd "$(dirname "$0")" && pwd)"
cd "$here/../.."
status=0
echo "== review (structure, layout, timing, voice, delivery)"
"$here/gpu.sh" uv run --group tts --group video python video/tools/review.py "$ep" || status=1
echo; echo "== screen references"
"$here/gpu.sh" uv run --group tts --group video python video/tools/check_references.py --script "$ep" || status=1
echo; echo "== leads, from real word timestamps"
"$here/gpu.sh" uv run --group tts --group video python video/tools/check_leads.py --script "$ep" --words || status=1
echo; [ $status -eq 0 ] && echo "all checks ran clean" || echo "SOMETHING FAILED: read above before publishing"
exit $status
