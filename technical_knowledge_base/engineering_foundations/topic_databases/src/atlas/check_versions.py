"""Re-read the latest stable GitHub release for every atlas row whose version source is a GitHub repo, and compare with the row.
Unauthenticated GitHub API (60 requests/hour): one call per repo. Prints MATCH / DIFF / SKIP per row; writes inputs/version_check.json.
Run: python3 check_versions.py"""
import json, os, re, urllib.request, datetime
H = os.path.dirname(os.path.abspath(__file__))
A = json.load(open(os.path.join(H, 'atlas.json')))
res = []
for r in A['rows']:
    urls = [A['sources'][i]['u'] for i in r['s'].get('version', [])] + [r.get('version_url', '')]
    m = next((re.match(r'https://(?:api\.)?github\.com/(?:repos/)?([^/]+)/([^/#?]+)', u) for u in urls if re.match(r'https://(?:api\.)?github\.com/', u or '')), None)
    if not m: res.append({'id': r['id'], 'status': 'skip'}); continue
    repo = m.group(1) + '/' + m.group(2)
    try:
        rel = json.load(urllib.request.urlopen(urllib.request.Request(f'https://api.github.com/repos/{repo}/releases?per_page=15', headers={'User-Agent': 'kb-atlas-check'}), timeout=20))
    except Exception as e:
        res.append({'id': r['id'], 'repo': repo, 'status': 'error ' + str(e)[:60]}); continue
    st = [x for x in rel if not x['prerelease'] and not x['draft']]
    tags = [x['tag_name'] for x in st]
    norm = lambda s: re.sub(r'^[^0-9]*', '', s).split('-')[0]
    hit = any(norm(t) == norm(r['version']) or r['version'] in t for t in tags)
    newest = max(st, key=lambda x: x['published_at'] or '', default=None)
    res.append({'id': r['id'], 'repo': repo, 'row': r['version'], 'row_date': r['version_date'], 'newest_tag': newest and newest['tag_name'],
                'newest_date': newest and (newest['published_at'] or '')[:10], 'status': 'match' if hit else 'diff'})
for x in res: print(x['status'].upper()[:5], x['id'], x.get('row', ''), x.get('row_date', ''), '| newest', x.get('newest_tag', ''), x.get('newest_date', ''))
json.dump({'date': datetime.date.today().isoformat(), 'rows': res}, open(os.path.join(H, 'inputs', 'version_check.json'), 'w'), indent=1)
