# Fetch Hugging Face model metadata (safetensors parameter counts by dtype, commit sha) for each config's official repo.
import json, sys, urllib.request, time
lst, out = sys.argv[1], sys.argv[2]
res = {}
for line in open(lst):
    p = line.rstrip('\n').split('\t')
    if len(p) < 2: continue
    key, repo = p[0], p[1]
    try:
        with urllib.request.urlopen('https://huggingface.co/api/models/' + repo, timeout=30) as r:
            d = json.load(r)
        res[key] = {'repo': repo, 'sha': d.get('sha'), 'safetensors': d.get('safetensors'), 'lastModified': d.get('lastModified')}
    except Exception as e:
        res[key] = {'repo': repo, 'error': str(e)}
    time.sleep(0.3)
json.dump(res, open(out, 'w'), indent=1)
print(len(res))
