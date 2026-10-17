"""After a paper page is published to Notion: mark it html_only in pages.json, record its hash, and commit.
usage: python3 html_utils/paper_finalize.py <folder slug> [<folder slug> ...]   (then git push)"""
import json, subprocess, sys
B = 'technical_knowledge_base/reference/papers/'
slugs = sys.argv[1:]
p = 'technical_knowledge_base/pages.json'; d = json.load(open(p))
for x in d['pages']:
    if x['path'] in [B + s for s in slugs]: x.update(status='html_only', html='index.html', has_video=False)
json.dump(d, open(p, 'w'), indent=2, ensure_ascii=False); open(p, 'a').write('\n')
for sl in slugs: subprocess.run(['python3', 'html_utils/sync_status.py', '--record', B + sl], check=True)
titles = [x['title'].split(':')[0] for x in d['pages'] if x['path'] in [B + s for s in slugs]]
subprocess.run(['git', 'add', p] + [B + s for s in slugs], check=True)
subprocess.run(['git', 'commit', '-qm', 'sync to notion: paper pages ' + ', '.join(titles) + '\n\nCo-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'], check=True)
print('finalized', slugs)
