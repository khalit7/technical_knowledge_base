"""What each curated corpus kept from the same raw WARC file (the running example: CC-MAIN-2024-30, segment
1720763514387.30, file 00000).

1. Scan the WARC: every response record, its record id, URL, HTTP status, MIME type and payload size.
2. Join by WARC record id (FineWeb's `id` is the WARC-Record-ID; Nemotron-CC carries `warc_record_id`) and by URL.
3. Write one row per HTML 200 response: which corpora kept it. Order of rows is the WARC order.

Usage: DC_SCRATCH=<scratch>/dc python -I what_each_kept.py [nemotron jsonl files ...]
Writes $DC_SCRATCH/data/pc/kept.json (full) and prints a summary.
"""
import json, os, sys, collections
from warcio.archiveiterator import ArchiveIterator

SCR = os.environ['DC_SCRATCH']
WARC = os.path.join(SCR, 'data', 'cc', 'warc', 'CC-MAIN-20240712094214-20240712124214-00000.warc.gz')
SAMP = os.path.join(SCR, 'data', 'pc', 'samples')


def load_ids(name, key):
    out = {}
    p = os.path.join(SAMP, name + '.jsonl')
    if not os.path.exists(p):
        return out
    for line in open(p):
        d = json.loads(line)
        out[(d.get('meta') or {}).get(key) or d.get(key)] = d
    return out


def main():
    rows = []
    status = collections.Counter()
    with open(WARC, 'rb') as f:
        for rec in ArchiveIterator(f):
            if rec.rec_type != 'response':
                continue
            rid = rec.rec_headers.get_header('WARC-Record-ID')
            url = rec.rec_headers.get_header('WARC-Target-URI')
            st = int(rec.http_headers.get_statuscode()) if rec.http_headers and rec.http_headers.get_statuscode().isdigit() else None
            ct = (rec.http_headers.get_header('Content-Type') or '') if rec.http_headers else ''
            status[(st, 'html' if 'html' in ct.lower() else 'other')] += 1
            if st == 200 and 'html' in ct.lower():
                rows.append({'id': rid, 'url': url, 'bytes': int(rec.rec_headers.get_header('Content-Length') or 0)})
    print('responses by (status, type):', status.most_common(8))
    # FineWeb's document id is the WARC record id
    fw = {}
    for name in ('fineweb', 'fineweb_edu'):
        p = os.path.join(SAMP, name + '.jsonl')
        fw[name] = {}
        for line in open(p):
            d = json.loads(line)
            fw[name][d['url']] = d
    nem = collections.defaultdict(dict)
    for p in sys.argv[1:]:
        bucket = os.path.basename(p).replace('.jsonl', '')
        for line in open(p):
            d = json.loads(line)
            nem[bucket][(d.get('meta') or {}).get('warc_record_id')] = 1
    urls = {r['url'] for r in rows}
    for r in rows:
        r['fineweb'] = r['url'] in fw['fineweb']
        r['fineweb_edu'] = r['url'] in fw['fineweb_edu']
        if r['fineweb_edu']:
            r['edu_score'] = fw['fineweb_edu'][r['url']]['meta'].get('score')
        for b, ids in nem.items():
            if r['id'] in ids:
                r['nemotron'] = b
    summ = {'html_200': len(rows), 'responses': sum(status.values()),
            'fineweb': sum(r['fineweb'] for r in rows), 'fineweb_edu': sum(r['fineweb_edu'] for r in rows),
            'fineweb_not_in_warc_html200': len(set(fw['fineweb']) - urls),
            'nemotron': collections.Counter(r.get('nemotron') for r in rows if r.get('nemotron'))}
    print(json.dumps(summ, indent=1, default=str))
    json.dump({'summary': summ, 'rows': rows}, open(os.path.join(SCR, 'data', 'pc', 'kept.json'), 'w'), default=str)


if __name__ == '__main__':
    main()
