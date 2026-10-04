"""Verify every arXiv id the atlas cites against the arXiv export API; writes inputs/arxiv_verified.json (title, first-version date)."""
import json, re, sys, time, urllib.request, pathlib, xml.etree.ElementTree as ET
here = pathlib.Path(__file__).parent
ids = sys.argv[1:] if len(sys.argv) > 1 else json.load(open(here / 'inputs' / 'arxiv_ids.json'))
out_p = here / 'inputs' / 'arxiv_verified.json'
out = json.loads(out_p.read_text()) if out_p.exists() else {}
todo = [i for i in ids if i not in out]
ns = {'a': 'http://www.w3.org/2005/Atom'}
for k in range(0, len(todo), 40):
    chunk = todo[k:k+40]
    url = 'https://export.arxiv.org/api/query?max_results=100&id_list=' + ','.join(chunk)
    x = urllib.request.urlopen(url, timeout=60).read()
    root = ET.fromstring(x)
    for e in root.findall('a:entry', ns):
        aid = re.sub(r'v\d+$', '', e.find('a:id', ns).text.rsplit('/abs/', 1)[1])
        t = e.find('a:title', ns)
        if t is None: continue
        out[aid] = {'title': re.sub(r'\s+', ' ', t.text).strip(), 'published': e.find('a:published', ns).text[:10],
                    'authors': [a.find('a:name', ns).text for a in e.findall('a:author', ns)][:3], 'checked': time.strftime('%Y-%m-%d'),
                    'abstract': re.sub(r'\s+', ' ', e.find('a:summary', ns).text).strip()}
    time.sleep(3)
out_p.write_text(json.dumps(out, indent=1, ensure_ascii=False))
for i in ids: print(i, '|', out.get(i, {}).get('published'), '|', out.get(i, {}).get('title', 'NOT FOUND'))
