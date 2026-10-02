"""Copy the Notion fetch of this page, verbatim, from the agent session transcript into live.md.
usage: python3 save_live.py <transcript.jsonl>"""
import json, sys
best = None
for line in open(sys.argv[1]):
    try: o = json.loads(line)
    except Exception: continue
    msg = o.get('message') or {}
    for c in (msg.get('content') or []) if isinstance(msg.get('content'), list) else []:
        if c.get('type') != 'tool_result': continue
        parts = c.get('content')
        texts = [p.get('text', '') for p in parts] if isinstance(parts, list) else [parts or '']
        for t in texts:
            if 'High-Resolution Image Synthesis with Latent Diffusion Models (LDM / Stable Diffusion)' in t and '<content>' in t:
                best = t
j = json.loads(best)
open('live.md', 'w').write(j['text'] + '\n')
print('saved', len(j['text']), 'chars')
