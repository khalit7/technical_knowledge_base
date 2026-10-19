"""After any page is published to Notion: mark it html_only in pages.json, record its hash, and commit
the page folder with pages.json. Each page keeps its own visual-idea record in src/viz_ideas.md.
(Paper pages may use paper_finalize.py, which also sets has_video=False.)
usage: python3 html_utils/page_finalize.py <page folder> [<page folder> ...]   (then git push)"""
import json, subprocess, sys
paths = [a.rstrip('/') for a in sys.argv[1:]]
p = 'technical_knowledge_base/pages.json'; d = json.load(open(p))
byp = {x['path']: x for x in d['pages']}
for a in paths:
    if a not in byp: sys.exit('not in pages.json: ' + a)
    byp[a].update(status='html_only', html='index.html')
open(p, 'w', encoding='utf-8').write(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
for a in paths: subprocess.run(['python3', 'html_utils/sync_status.py', '--record', a], check=True)
subprocess.run(['git', 'add', p] + paths, check=True)
titles = [byp[a]['title'] for a in paths]
subprocess.run(['git', 'commit', '-qm', 'sync to notion: ' + ', '.join(titles) + '\n\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'], check=True)
print('finalized', len(paths), 'pages')
