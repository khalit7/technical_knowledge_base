"""How many sites block AI crawlers in robots.txt, measured on Common Crawl's own robots.txt captures.

Every crawl publishes the robots.txt files CCBot fetched (crawl-data/<crawl>/segments/*/robotstxt/*.warc.gz).
This takes N files per crawl, evenly spaced through the crawl's file list, parses every robots.txt response and asks,
for each crawler name, whether that crawler may fetch "/" and a typical page path under the file's rules
(Python's urllib.robotparser, the standard library's reading of the robots exclusion protocol).

Usage:  DC_SCRATCH=<scratch>/dc python -I robots_optout.py download   (under the download lock)
        DC_SCRATCH=<scratch>/dc python -I robots_optout.py measure
Writes  $DC_SCRATCH/data/pc/robots/<crawl>/*.warc.gz and $DC_SCRATCH/data/pc/robots_optout.json
"""
import gzip, io, json, os, sys, urllib.request, urllib.robotparser, collections, hashlib

SCR = os.environ['DC_SCRATCH']
D = os.path.join(SCR, 'data', 'pc', 'robots')
CRAWLS = ['CC-MAIN-2023-23', 'CC-MAIN-2024-30', 'CC-MAIN-2025-30', 'CC-MAIN-2026-39']
N_FILES = 20
AGENTS = ['CCBot', 'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'anthropic-ai', 'Claude-Web',
          'Google-Extended', 'Applebot-Extended', 'PerplexityBot', 'Bytespider', 'meta-externalagent',
          'FacebookBot', 'cohere-ai', 'Amazonbot', 'Googlebot', 'Bingbot']
BASE = 'https://data.commoncrawl.org/'


def download():
    man = {}
    for c in CRAWLS:
        os.makedirs(os.path.join(D, c), exist_ok=True)
        paths = gzip.decompress(urllib.request.urlopen(BASE + f'crawl-data/{c}/robotstxt.paths.gz', timeout=60).read()).decode().split()
        step = len(paths) // N_FILES
        pick = [paths[i * step] for i in range(N_FILES)]
        man[c] = {'files_in_crawl': len(paths), 'picked': pick}
        for p in pick:
            dst = os.path.join(D, c, os.path.basename(p))
            if not os.path.exists(dst):
                data = urllib.request.urlopen(BASE + p, timeout=120).read()
                open(dst, 'wb').write(data)
            print(c, os.path.basename(p), os.path.getsize(dst), flush=True)
        man[c]['sha256'] = {os.path.basename(p): hashlib.sha256(open(os.path.join(D, c, os.path.basename(p)), 'rb').read()).hexdigest() for p in pick}
    json.dump(man, open(os.path.join(D, 'manifest.json'), 'w'), indent=1)


def records(path):
    from warcio.archiveiterator import ArchiveIterator
    with open(path, 'rb') as f:
        for rec in ArchiveIterator(f):
            if rec.rec_type != 'response':
                continue
            url = rec.rec_headers.get_header('WARC-Target-URI')
            status = rec.http_headers.get_statuscode() if rec.http_headers else None
            body = rec.content_stream().read()
            yield url, status, body


def measure():
    from urllib.parse import urlsplit
    out = {}
    for c in CRAWLS:
        seen_hosts = set()
        n_total = 0
        n200 = 0
        status = collections.Counter()
        full = collections.Counter()
        mention = collections.Counter()
        for fn in sorted(os.listdir(os.path.join(D, c))):
            for url, st, body in records(os.path.join(D, c, fn)):
                host = urlsplit(url).hostname
                if not host or host in seen_hosts:
                    continue
                seen_hosts.add(host)
                n_total += 1
                status[str(st)[:1] + 'xx' if st else 'none'] += 1
                if st != '200':
                    continue
                txt = body.decode('utf-8', 'replace')
                if '<html' in txt[:2000].lower():
                    status['200_html_not_robots'] += 1
                    continue
                n200 += 1
                rp = urllib.robotparser.RobotFileParser()
                rp.parse(txt.splitlines())
                low = txt.lower()
                for a in AGENTS:
                    if a.lower() in low:
                        mention[a] += 1
                    if not rp.can_fetch(a, f'https://{host}/') and not rp.can_fetch(a, f'https://{host}/about/index.html'):
                        full[a] += 1
                if not rp.can_fetch('*', f'https://{host}/') and not rp.can_fetch('*', f'https://{host}/about/index.html'):
                    full['* (all crawlers)'] += 1
        out[c] = {'hosts': n_total, 'robots_200_parsed': n200, 'status': dict(status),
                  'full_block_share_of_parsed': {a: round(full[a] / n200, 5) for a in AGENTS + ['* (all crawlers)']},
                  'full_block_count': dict(full),
                  'mention_share_of_parsed': {a: round(mention[a] / n200, 5) for a in AGENTS}}
        print(c, n_total, n200, {a: out[c]['full_block_share_of_parsed'][a] for a in ['CCBot', 'GPTBot', 'ClaudeBot', 'Google-Extended', '* (all crawlers)']}, flush=True)
    res = {'files_per_crawl': N_FILES, 'agents': AGENTS, 'measured': '2026-10-14, Apple M1 Pro (CPU)',
           'method': 'distinct hosts; robots.txt with HTTP 200 and not HTML; blocked = robotparser.can_fetch false for / and /about/index.html',
           'crawls': out}
    json.dump(res, open(os.path.join(SCR, 'data', 'pc', 'robots_optout.json'), 'w'), indent=1)


if __name__ == '__main__':
    {'download': download, 'measure': measure}[sys.argv[1]]()
