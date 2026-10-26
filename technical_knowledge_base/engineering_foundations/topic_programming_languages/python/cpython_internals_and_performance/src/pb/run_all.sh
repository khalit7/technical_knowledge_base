#!/bin/bash
# Reproduce every Part-2 output this page shows (21 version snippets, the JIT runs, the lazy-import runs), then regenerate
# ../parts/22_js_ci_0pb.js, rebuild and check. Copied from the language page's src/pb/run_all.sh (2026-10-26) and trimmed.
# Needs the scratch toolchain described in env.sh (uv with CPython 3.11.17, 3.12.15, 3.13.16, 3.14.8, 3.15.0rc3;
# hyperfine 1.20.0), network (PyPI) and a few minutes. Timings depend on load.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); . $HERE/env.sh; cd $HERE
# the topic root holds the shared data generator: walk up to it (this folder's depth changed when the page was split)
ROOT=$HERE; while [ "$(basename "$ROOT")" != topic_programming_languages ] && [ "$ROOT" != / ]; do ROOT=$(dirname "$ROOT"); done
G=$ROOT/src/rosetta/data/gen_chat.py                     # the root page's data generator (read-only)
[ -f $G ] || { echo "cannot find $G"; exit 1; }
[ -f $WORK/chat40k.jsonl ] || $PY314 $G --lines 40000 --seed 7 > $WORK/chat40k.jsonl
python3 versions/run_versions.py                         # 21 snippets x 5 versions -> out/versions.json
# measurements: run one at a time
(cd jit && python3 jit_run.py $WORK/chat40k.jsonl)       # -> out/jit.json
bash lazy/run_lazy.sh                                    # -> out/lazy.json
python3 build_data.py
sh ../build.sh
python3 check_embed.py
