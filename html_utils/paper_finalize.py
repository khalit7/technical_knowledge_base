"""Publish built paper pages: the paper form of page_finalize.py (also sets has_video False).
usage: python3 html_utils/paper_finalize.py <folder slug> [<folder slug> ...]   (then git push)"""
import json, subprocess, sys
B = 'technical_knowledge_base/whats_new/papers/'
p = 'technical_knowledge_base/pages.json'; d = json.load(open(p))
for x in d['pages']:
    if x['path'] in [B + s for s in sys.argv[1:]]: x['has_video'] = False
open(p, 'w', encoding='utf-8').write(json.dumps(d, indent=2, ensure_ascii=False) + '\n')
subprocess.run(['python3', 'html_utils/page_finalize.py'] + [B + s for s in sys.argv[1:]], check=True)
