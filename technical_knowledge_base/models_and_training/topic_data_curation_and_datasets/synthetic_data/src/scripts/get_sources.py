"""Fetch the original Common Crawl page behind a Nemotron-CC synthetic row, so the page can show real before/after pairs.
Nemotron-CC rows carry the source page's URL and WARC-Record-ID. For each: ask the CC-MAIN-2024-30 URL index where the
capture lives, fetch only that record's bytes, check that its WARC-Record-ID equals the row's, and extract the text with
jusText (the extractor Nemotron-CC used) and trafilatura.
usage: DC_SCRATCH=<scratch>/dc python -I get_sources.py <out.json> <kind>=<url-substring> ...
"""
import os, sys, json, io, time, urllib.request, urllib.parse
from warcio.archiveiterator import ArchiveIterator
import justext, trafilatura
NM = os.path.join(os.environ['DC_SCRATCH'], 'data', 'syn', 'nemo')
out = json.load(open(sys.argv[1])) if os.path.exists(sys.argv[1]) else {}

def get(url, rng=None):
    for i in range(6):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'kb-research/0.1'} | ({'Range': rng} if rng else {}))
            return urllib.request.urlopen(req, timeout=60).read()
        except Exception as e:
            print('retry', i, e); time.sleep(5 + 5 * i)
    raise RuntimeError(url)

for spec in sys.argv[2:]:
    kind, sub = spec.split('=', 1)
    q = 'high' if kind != 'low_wrap' else 'low'; k2 = 'wrap_medium' if kind.endswith('wrap') else kind
    row = next(json.loads(l) for l in open(f'{NM}/{q}__{k2}__part00000.jsonl') if sub in json.loads(l)['url'])
    key = f"{kind}:{row['warc_record_id']}"
    if key in out: print('have', key); continue
    idx = get('https://index.commoncrawl.org/CC-MAIN-2024-30-index?' + urllib.parse.urlencode({'url': row['url'], 'output': 'json'})).decode()
    found = None
    for line in idx.strip().splitlines():
        c = json.loads(line)
        if c.get('status') != '200': continue
        off, ln = int(c['offset']), int(c['length'])
        raw = get('https://data.commoncrawl.org/' + c['filename'], f'bytes={off}-{off + ln - 1}')
        for rec in ArchiveIterator(io.BytesIO(raw)):
            rid = rec.rec_headers.get_header('WARC-Record-ID').strip('<>').replace('urn:uuid:', '')
            html = rec.content_stream().read()
            if rid == row['warc_record_id']: found = (c, html); break
        if found: break
    if not found: print('no matching record for', row['url']); continue
    c, html = found
    paras = [p.text for p in justext.justext(html, justext.get_stoplist('English')) if not p.is_boilerplate]
    out[key] = dict(kind=kind, url=row['url'], warc_record_id=row['warc_record_id'], warc_file=c['filename'], offset=c['offset'],
                    justext='\n'.join(paras), trafilatura=trafilatura.extract(html) or '', synthetic=row['text'])
    print(key, len(out[key]['justext']), len(row['text']), flush=True)
    json.dump(out, open(sys.argv[1], 'w'), indent=1)
