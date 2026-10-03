"""Copy the Notion fetch of this page, verbatim, from the agent session transcript(s) into live.md.
usage: python3 save_live.py <transcript.jsonl> [...]   (the newest matching fetch wins)"""
import json, sys
TITLE = 'Training language models to follow instructions with human feedback (InstructGPT)'
best = None
for f in sys.argv[1:]:
    for line in open(f):
        try: o = json.loads(line)
        except Exception: continue
        msg = o.get('message') or {}
        for c in (msg.get('content') or []) if isinstance(msg.get('content'), list) else []:
            if c.get('type') != 'tool_result': continue
            parts = c.get('content')
            texts = [p.get('text', '') for p in parts] if isinstance(parts, list) else [parts or '']
            for t in texts:
                if TITLE in t and '<content>' in t and t.lstrip().startswith('{'):
                    try: j = json.loads(t)
                    except Exception: continue
                    if best is None or j['text'] > '': best = j
open('live.md', 'w').write(best['text'] + '\n')
print('saved', len(best['text']), 'chars')
