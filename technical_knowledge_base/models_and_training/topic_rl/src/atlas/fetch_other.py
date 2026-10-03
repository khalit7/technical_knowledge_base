#!/usr/bin/env python3
"""Fetch metadata for the atlas's non-arXiv sources (Crossref for DOIs; page titles for the rest).
Writes inputs/other_sources.json. usage: python3 src/atlas/fetch_other.py"""
import json, os, re, urllib.request, html
HERE = os.path.dirname(os.path.abspath(__file__))
DOIS = ['10.1007/BF00115009', '10.1007/BF00992698', '10.1007/BF00992696', '10.1109/TSMC.1983.6313077',
        '10.1016/B978-1-55860-141-3.50030-4', '10.1038/nature14236', '10.1038/nature16961', '10.1038/nature24270',
        '10.1126/science.aar6404', '10.1038/s41586-020-03051-4', '10.1145/203330.203343', '10.1038/s41586-025-08744-2']
PAGES = ['https://www.jstor.org/stable/24900506', 'https://papers.nips.cc/paper/1988/hash/812b4ba287f5ee0bc9d43bbf5bbe87fb-Abstract.html',
         'https://proceedings.mlr.press/v32/silver14.html', 'https://api2.openreview.net/notes?forum=r1lgTGL5DE',
         'https://web.archive.org/web/2023/https://openai.com/research/openai-baselines-acktr-a2c']
UA = {'User-Agent': 'Mozilla/5.0 (research; kb atlas)'}
out = {}
for d in DOIS:
    try:
        j = json.load(urllib.request.urlopen(urllib.request.Request('https://api.crossref.org/works/' + d, headers=UA), timeout=40))['message']
        dp = (j.get('published-print') or j.get('published-online') or j.get('issued'))['date-parts'][0]
        out['doi:' + d] = {'title': ' '.join(j['title'][0].split()), 'container': (j.get('container-title') or [''])[0],
                           'date': '-'.join('%02d' % x for x in dp), 'authors': [a.get('family', '') for a in j.get('author', [])]}
    except Exception as e:
        out['doi:' + d] = {'error': str(e)}
for u in PAGES:
    try:
        s = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40).read().decode('utf-8', 'replace')
        if 'openreview' in u:
            n = json.loads(s)['notes'][0]['content']
            out[u] = {'title': n['title'].get('value', n['title']) if isinstance(n['title'], dict) else n['title'],
                      'abstract': (n.get('abstract') or {}).get('value', '') if isinstance(n.get('abstract'), dict) else n.get('abstract', '')}
        else:
            t = re.search(r'<title[^>]*>(.*?)</title>', s, re.S)
            body = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', re.sub(r'<script.*?</script>|<style.*?</style>', '', s, flags=re.S))))
            out[u] = {'title': ' '.join(html.unescape(t.group(1)).split()) if t else '', 'text': body[:6000]}
    except Exception as e:
        out[u] = {'error': str(e)}
json.dump(out, open(os.path.join(HERE, 'inputs', 'other_sources.json'), 'w'), indent=1, ensure_ascii=False)
for k, v in out.items():
    print(k, '|', v.get('title', v.get('error')), '|', v.get('date', ''), v.get('container', ''), v.get('authors', '')[:3] if v.get('authors') else '')
