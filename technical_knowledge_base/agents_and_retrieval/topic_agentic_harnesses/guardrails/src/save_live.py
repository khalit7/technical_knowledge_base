"""Save the Notion fetch of the old root page verbatim to src/live.md.
Reads the fetch tool result from this agent's session transcript (jsonl) and writes its "text" field unchanged."""
import json, sys
src, out, marker = sys.argv[1], sys.argv[2], sys.argv[3]
found = None
for line in open(src, encoding='utf-8'):
    if marker not in line: continue
    rec = json.loads(line)
    def walk(o):
        global found
        if isinstance(o, dict):
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
        elif isinstance(o, str) and marker in o and o.lstrip().startswith('{"metadata"'):
            found = json.loads(o)['text']
    walk(rec)
open(out, 'w', encoding='utf-8').write(found)
print(len(found))
