"""Check every arXiv id the Model map cites: title and first-version date from the arXiv API (export.arxiv.org).
Usage: python3 -I fetch_arxiv.py  (writes out/arxiv.json)."""
import urllib.request, xml.etree.ElementTree as ET, json, os, datetime, time
HERE = os.path.dirname(os.path.abspath(__file__))
IDS = [l.split('#')[0].strip() for l in open(os.path.join(HERE, 'arxiv_ids.txt')) if l.split('#')[0].strip()]
ns = {'a': 'http://www.w3.org/2005/Atom'}
out = {'fetched': datetime.date.today().isoformat(), 'papers': {}}
for i in range(0, len(IDS), 40):
    chunk = IDS[i:i+40]
    url = 'http://export.arxiv.org/api/query?max_results=100&id_list=' + ','.join(chunk)
    x = ET.fromstring(urllib.request.urlopen(url, timeout=60).read())
    for e in x.findall('a:entry', ns):
        aid = e.find('a:id', ns).text.rsplit('/', 1)[-1].split('v')[0]
        out['papers'][aid] = {'title': ' '.join(e.find('a:title', ns).text.split()), 'published': e.find('a:published', ns).text[:10]}
    time.sleep(3)
for a in IDS:
    p = out['papers'].get(a)
    print(a, p['published'] if p else 'MISSING', (p or {}).get('title', '')[:90])
json.dump(out, open(os.path.join(HERE, 'out', 'arxiv.json'), 'w'), indent=1, sort_keys=True)
