"""Fetch Hugging Face model metadata (licence tag, gated, repo creation date, parameter count from safetensors
metadata, downloads) for every open-weights row of the Model map. Stdlib only; small JSON calls, no downloads.
Usage: python3 -I fetch_hf.py  (writes out/hf_meta.json, dated)."""
import json, sys, time, urllib.request, urllib.error, os, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
REPOS = [l.split('#')[0].strip() for l in open(os.path.join(HERE, 'hf_repos.txt')) if l.split('#')[0].strip()]
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'kb-model-map/1.0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)
out = {'fetched': datetime.date.today().isoformat(), 'api': 'https://huggingface.co/api/models/<repo>', 'repos': {}}
for rp in REPOS:
    try:
        d = get('https://huggingface.co/api/models/' + rp)
        cd = d.get('cardData') or {}
        st = d.get('safetensors') or {}
        out['repos'][rp] = {
            'id': d.get('id'), 'createdAt': (d.get('createdAt') or '')[:10], 'lastModified': (d.get('lastModified') or '')[:10],
            'license': cd.get('license'), 'license_name': cd.get('license_name'), 'license_link': cd.get('license_link'),
            'gated': d.get('gated'), 'downloads': d.get('downloads'), 'likes': d.get('likes'),
            'library': d.get('library_name'), 'pipeline': d.get('pipeline_tag'),
            'st_total': st.get('total'), 'st_params': st.get('parameters'),
            'n_files': len(d.get('siblings') or []),
        }
        print('ok ', rp, out['repos'][rp]['createdAt'], out['repos'][rp]['license'], out['repos'][rp]['gated'], st.get('total'), flush=True)
    except urllib.error.HTTPError as e:
        out['repos'][rp] = {'error': e.code}
        print('ERR', rp, e.code, flush=True)
    time.sleep(0.3)
json.dump(out, open(os.path.join(HERE, 'out', 'hf_meta.json'), 'w'), indent=1, sort_keys=True)
