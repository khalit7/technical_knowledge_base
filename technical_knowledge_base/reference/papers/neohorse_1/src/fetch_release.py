"""Record what NeoHorse-1 released, as dated measurements: GitHub repositories (licence, stars, top-level files),
the Hugging Face collection (models, parameter counts, downloads, likes) and the Hugging Face paper page's upvotes.
  python3 fetch_release.py      (writes inputs/release.json; the page quotes it with its date)
"""
import datetime, json, urllib.request


def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'kb-page-builder'}), timeout=30) as r:
        return json.loads(r.read())


out = {'date': datetime.date.today().isoformat()}
for name, repo in (('neohorse', 'TokenRhythm/NeoHorse'), ('opensquilla', 'TokenRhythm/opensquilla')):
    d = get('https://api.github.com/repos/' + repo)
    files = [x['name'] for x in get('https://api.github.com/repos/%s/contents' % repo)]
    out[name] = {'repo': repo, 'url': 'https://github.com/' + repo, 'licence': (d.get('license') or {}).get('spdx_id'),
                 'stars': d.get('stargazers_count'), 'created': d.get('created_at'), 'pushed': d.get('pushed_at'), 'files': files}
c = get('https://huggingface.co/api/collections/TokenRhythm/neohorse-1')
out['hf'] = [{'id': i['id'], 'params': i.get('numParameters'), 'downloads': i.get('downloads'), 'likes': i.get('likes')} for i in sorted(c['items'], key=lambda i: i.get('numParameters') or 0) if i.get('repoType') == 'model']
p = get('https://huggingface.co/api/papers/2609.08183')
out['hf_paper'] = {'upvotes': p.get('upvotes'), 'published': p.get('publishedAt')}
json.dump(out, open('inputs/release.json', 'w'), indent=1)
print(json.dumps(out)[:600])
