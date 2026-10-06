#!/bin/sh
# prep.sh NAME : fresh copy of the task repo in runs/NAME/work, git-initialised, proxy log set to runs/NAME/proxy.jsonl
H=$(cd "$(dirname "$0")" && pwd); N=$1
rm -rf $H/runs/$N; mkdir -p $H/runs/$N; cp -R $H/../task_repo $H/runs/$N/work
cd $H/runs/$N/work && find . -name __pycache__ -prune -exec rm -rf {} + ; git init -q && git add -A && git -c user.name=t -c user.email=t@t commit -qm init
[ "$2" = nolog ] || curl -s -X POST -d "{\"file\": \"$H/runs/$N/proxy.jsonl\"}" 127.0.0.1:8190/__log >/dev/null; echo prepared $N
