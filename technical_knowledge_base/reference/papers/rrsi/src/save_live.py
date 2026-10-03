"""Copy the Notion fetch of this page, verbatim, from an agent session transcript into live.md.
usage: python3 save_live.py <transcript.jsonl> [...]"""
import json, sys
best = None
for path in sys.argv[1:]:
    for line in open(path):
        try: o = json.loads(line)
        except Exception: continue
        msg = o.get('message') or {}
        content = msg.get('content')
        for c in content if isinstance(content, list) else []:
            if not isinstance(c, dict) or c.get('type') != 'tool_result': continue
            parts = c.get('content')
            texts = [p.get('text', '') for p in parts] if isinstance(parts, list) else [parts or '']
            for t in texts:
                if '"title":"RRSI: Regularized Recursive' in t and '<content>' in t and t.lstrip().startswith('{'):
                    best = t
j = json.loads(best)
open('live.md', 'w').write(j['text'] + '\n')
print('saved', len(j['text']), 'chars')
