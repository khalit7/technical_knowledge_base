"""Copy the Notion fetch of this page, verbatim, from the agent session transcript into live.md.
usage: python3 save_live.py <transcript.jsonl> [...]"""
import json, sys
TITLE = "Learn What's Left, Not What's Mastered: Saturation Aware Advantage Reweighting for Multi-Reward Policy Optimization"
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
                try: j = json.loads(t)
                except Exception: continue
                if isinstance(j, dict) and j.get('title') == TITLE and '<content>' in j.get('text', ''):
                    best = j
open('live.md', 'w').write(best['text'] + '\n')
print('saved', len(best['text']), 'chars')
