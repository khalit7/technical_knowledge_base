"""After any page is published to Notion: mark it html_only in pages.json, record its hash, copy the
tables of its src/viz_ideas.md into the ideas log under a heading for the page, and commit.
(Paper pages use paper_finalize.py, which merges their "| P-" rows into one table.)
usage: python3 html_utils/page_finalize.py <page folder> [<page folder> ...]   (then git push)"""
import datetime, json, subprocess, sys
paths = [a.rstrip('/') for a in sys.argv[1:]]
p = 'technical_knowledge_base/pages.json'; d = json.load(open(p))
byp = {x['path']: x for x in d['pages']}
for a in paths:
    if a not in byp: sys.exit('not in pages.json: ' + a)
    byp[a].update(status='html_only', html='index.html')
open(p, 'w').write(json.dumps(d, indent=2) + '\n')
log = 'html_utils/interactive-html-ideas.md'; s = open(log).read(); add = []
for a in paths:
    head = '### ' + byp[a]['title'] + ' (' + datetime.date.today().isoformat() + ')'
    if head in s: continue
    try: rows = [l for l in open(a + '/src/viz_ideas.md').read().split('\n') if l.startswith('|')]
    except FileNotFoundError: rows = []
    add += ['', head, '', 'Ranked ideas with scores, data and rejections: `' + a + '/src/viz_ideas.md`.', ''] + rows
if add: open(log, 'w').write(s.rstrip('\n') + '\n' + '\n'.join(add) + '\n')
for a in paths: subprocess.run(['python3', 'html_utils/sync_status.py', '--record', a], check=True)
subprocess.run(['git', 'add', p, log] + paths, check=True)
titles = [byp[a]['title'] for a in paths]
subprocess.run(['git', 'commit', '-qm', 'sync to notion: ' + ', '.join(titles) + '\n\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'], check=True)
print('finalized', len(paths), 'pages')
