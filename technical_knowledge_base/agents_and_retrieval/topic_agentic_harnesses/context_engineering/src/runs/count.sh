#!/bin/sh
# count Claude Haiku 4.5 input tokens of each policy text (one call each, tools off)
cd "$(dirname "$0")/wd"
for f in empty raw cc_valid cc_failure head_tail_lines page_2000 filter mask; do
  if [ $f = empty ]; then printf 'x' > ../empty.txt; fi
  claude -p --tools "" --system-prompt "Reply with the single word OK." --model haiku --output-format json --no-session-persistence --setting-sources project --strict-mcp-config --max-turns 1 < ../$f.txt > ../tok_$f.json 2>/dev/null
done
# summarise policy: one model call reads the whole log and writes a summary
claude -p --tools "" --system-prompt "You summarise tool output for a coding agent that will not see the original. Keep every error and test result verbatim. Never use the em-dash character." --model haiku --output-format json --no-session-persistence --setting-sources project --strict-mcp-config --max-turns 1 < ../raw.txt > ../summary_call.json 2>/dev/null
python3 -c "import json;print(json.load(open('../summary_call.json'))['result'])" > ../summary.txt
claude -p --tools "" --system-prompt "Reply with the single word OK." --model haiku --output-format json --no-session-persistence --setting-sources project --strict-mcp-config --max-turns 1 < ../summary.txt > ../tok_summary.json 2>/dev/null
echo done > ../count.done
