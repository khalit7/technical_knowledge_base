"""Fetch the small config files that define each text-to-image pipeline in the stack animation
(model_index.json, scheduler, VAE, denoiser, text encoders). Public repos only. Writes inputs/cfg_<repo>.json.
Usage: python3 -I fetch_configs.py"""
import json, os, urllib.request, urllib.error
HERE = os.path.dirname(os.path.abspath(__file__))
REPOS = ['stable-diffusion-v1-5/stable-diffusion-v1-5', 'stabilityai/stable-diffusion-xl-base-1.0',
         'PixArt-alpha/PixArt-Sigma-XL-2-1024-MS', 'Efficient-Large-Model/Sana_1600M_1024px_diffusers',
         'Qwen/Qwen-Image', 'Tongyi-MAI/Z-Image-Turbo']
def get(rp, path):
    url = 'https://huggingface.co/%s/raw/main/%s' % (rp, path)
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'kb-model-map/1.0'}), timeout=30) as r:
            return json.load(r)
    except (urllib.error.HTTPError, json.JSONDecodeError) as e:
        return {'_error': str(e)}
for rp in REPOS:
    mi = get(rp, 'model_index.json'); out = {'repo': rp, 'model_index': mi}
    for comp, v in mi.items():
        if isinstance(v, list) and len(v) == 2 and v[0]:
            name = 'scheduler/scheduler_config.json' if comp == 'scheduler' else comp + '/config.json'
            out[comp] = get(rp, name)
    json.dump(out, open(os.path.join(HERE, 'inputs', 'cfg_' + rp.replace('/', '__') + '.json'), 'w'), indent=1, sort_keys=True)
    print(rp, {k: (v.get('_class_name') if isinstance(v, dict) else None) for k, v in out.items() if k not in ('repo',)})
