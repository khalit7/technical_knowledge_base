"""Find the running example's pages in Nemotron-CC v1 by WARC record id, streaming its CC-MAIN-2024-30 files.

Nemotron-CC v1 is hosted by Common Crawl as jsonl.zstd, partitioned by quality bucket and kind (real or synthetic), not by
source WARC file, so the only way to find one WARC file's pages is to read every file of the crawl. Each file is streamed
(nothing is stored), decompressed line by line, and a line is kept only if its warc_record_id is one of the 20,617 HTML
pages of our WARC file. Real (kind=actual) files come first, round-robin across quality buckets, so a partial scan covers each bucket in proportion; synthetic files after.
Resumable: finished files are listed in done.txt; matches are appended to matches.jsonl.

Usage: DC_SCRATCH=<scratch>/dc python -I nemo_scan.py <time budget in seconds> [lock script]
Each file is fetched under the shared download lock (taken and released per file, so other agents can interleave).
"""
import json, os, re, subprocess, sys, time, urllib.request, gzip, collections, io
import zstandard

SCR = os.environ['DC_SCRATCH']
OUT = os.path.join(SCR, 'data', 'pc', 'nemo_scan')
os.makedirs(OUT, exist_ok=True)
BUDGET = float(sys.argv[1])
LOCK = sys.argv[2] if len(sys.argv) > 2 else None
ids = {r['id'].replace('<urn:uuid:', '').rstrip('>') for r in json.load(open(os.path.join(SCR, 'data', 'pc', 'kept.json')))['rows']}
paths = [p for p in gzip.decompress(open(os.path.join(SCR, 'data', 'nemotron_cc', 'data-jsonl.paths.gz'), 'rb').read()).decode().split() if 'CC-MAIN-2024-30-part' in p]
by = collections.defaultdict(list)
for p in sorted(paths):
    by[p.split('/data-jsonl/')[1].rsplit('/', 1)[0]].append(p)
order = []
# real (kind=actual) buckets first, round-robin so a partial scan covers each bucket in proportion; synthetic files after
for group in ([k for k in sorted(by) if '/kind=actual/' in k], [k for k in sorted(by) if '/kind=actual/' not in k]):
    for i in range(max(len(by[k]) for k in group)):
        for k in group:
            if i < len(by[k]):
                order.append(by[k][i])
done_p = os.path.join(OUT, 'done.txt')
done = set(open(done_p).read().split()) if os.path.exists(done_p) else set()
RID = re.compile(r'"warc_record_id":\s*"([^"]+)"')
t0 = time.time()
print(f'{len(order)} files in all, {len(done)} done before this run, {len(ids)} ids', flush=True)
for p in order:
    if p in done:
        continue
    if time.time() - t0 > BUDGET:
        break
    if LOCK:
        subprocess.run(['sh', LOCK, 'acquire', 'download', 'pc', '3600'], check=True, capture_output=True)
    t1, n, hits, nbytes = time.time(), 0, 0, 0
    try:
        req = urllib.request.urlopen('https://data.commoncrawl.org/' + p, timeout=300)
        nbytes = int(req.headers.get('Content-Length') or 0)
        with open(os.path.join(OUT, 'matches.jsonl'), 'a') as out:
            for line in io.TextIOWrapper(zstandard.ZstdDecompressor().stream_reader(req), encoding='utf-8'):
                n += 1
                m = RID.search(line[-400:]) or RID.search(line)
                if m and m.group(1) in ids:
                    d = json.loads(line)
                    d['_file'] = p
                    out.write(json.dumps(d, ensure_ascii=False) + '\n')
                    hits += 1
    except Exception as e:
        print('ERROR', p, repr(e)[:200], flush=True)
        if LOCK:
            subprocess.run(['sh', LOCK, 'release', 'download', 'pc'], capture_output=True)
        time.sleep(10)
        continue
    if LOCK:
        subprocess.run(['sh', LOCK, 'release', 'download', 'pc'], capture_output=True)
    with open(done_p, 'a') as f:
        f.write(p + '\n')
    with open(os.path.join(OUT, 'log.tsv'), 'a') as f:
        f.write(f'{p}\t{nbytes}\t{n}\t{hits}\t{time.time() - t1:.1f}\n')
    done.add(p)
    print(p.split('data-jsonl/')[1], nbytes, n, hits, round(time.time() - t1, 1), flush=True)
print('scanned', len(done), 'of', len(order), 'files', flush=True)
