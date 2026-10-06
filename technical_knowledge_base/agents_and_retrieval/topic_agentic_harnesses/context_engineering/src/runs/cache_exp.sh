#!/bin/sh
cd "$(dirname "$0")/w_cache"
R=../raw
one() { # name append prompt tools
  claude -p "$3" --output-format stream-json --verbose --no-session-persistence --setting-sources project --strict-mcp-config --model haiku --max-turns 1 --tools "$4" --append-system-prompt "$2" > $R/$1.jsonl 2>$R/$1.err
  sleep 3
}
T6="Read,Edit,Write,Bash,Grep,Glob"
ST="Never use the em-dash character. Project tag: alpha."
for i in 1 2 3; do one cache_static_$i "$ST" "Reply with the single word OK." "$T6"; done
for i in 1 2 3; do one cache_tssys_$i "Never use the em-dash character. Current time: $(python3 -c 'import time;print(time.time())')." "Reply with the single word OK." "$T6"; done
for i in 1 2 3; do one cache_tsuser_$i "$ST" "Current time: $(python3 -c 'import time;print(time.time())'). Reply with the single word OK." "$T6"; done
for i in 1 2; do one cache_tools5_$i "$ST" "Reply with the single word OK." "Read,Edit,Write,Bash,Grep"; done
echo done > $R/cache_exp.done
