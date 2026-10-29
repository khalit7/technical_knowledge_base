"""Publish built pages: mark them html_only in pages.json and commit each folder with pages.json.
Publishing is commit plus push: CI deploys the reading site from main. Run checkpage.sh on each page first.
usage: python3 html_utils/page_finalize.py <page folder> [<page folder> ...]   (then git push)
A root's folder holds its children: this commits only the root's own files (index.html, README.md, src/)."""
import json, subprocess, sys
paths = [a.rstrip('/') for a in sys.argv[1:]]
p = 'technical_knowledge_base/pages.json'; d = json.load(open(p))
byp = {x['path']: x for x in d['pages']}
for a in paths:
    if a not in byp: sys.exit('not in pages.json: ' + a)
    byp[a].update(status='html_only', html='index.html')
open(p, 'w', encoding='utf-8').write(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
files = [p]
for a in paths:
    files += [f for f in (a + '/index.html', a + '/README.md', a + '/src') if subprocess.run(['git', 'ls-files', '--error-unmatch', f], capture_output=True).returncode == 0 or __import__('os').path.exists(f)]
subprocess.run(['git', 'add', '-A', '--'] + files, check=True)
titles = [byp[a]['title'] for a in paths]
subprocess.run(['git', 'commit', '-qm', 'publish: ' + ', '.join(titles) + '\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>'], check=True)
print('committed', len(paths), 'pages; now git push (the site deploys from main)')
