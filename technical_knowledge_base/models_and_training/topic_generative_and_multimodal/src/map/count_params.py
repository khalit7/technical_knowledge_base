"""Count parameters of each pipeline component by reading only safetensors headers (HTTP range requests of a few
hundred KB; no weights are downloaded). Writes out/component_params.json. Usage: python3 -I count_params.py"""
import re, json, os, struct, urllib.request, urllib.error, glob, math
HERE = os.path.dirname(os.path.abspath(__file__))
def rng(url, a, b):
    req = urllib.request.Request(url, headers={'Range': 'bytes=%d-%d' % (a, b), 'User-Agent': 'kb-model-map/1.0'})
    with urllib.request.urlopen(req, timeout=60) as r: return r.read()
def header_params(url):
    n = struct.unpack('<Q', rng(url, 0, 7))[0]
    h = json.loads(rng(url, 8, 8 + n - 1)); tot = 0; dt = {}
    for k, v in h.items():
        if k == '__metadata__': continue
        c = math.prod(v['shape']); tot += c; dt[v['dtype']] = dt.get(v['dtype'], 0) + c
    return tot, dt
def files_for(repo, sub):
    api = 'https://huggingface.co/api/models/%s/tree/main/%s' % (repo, sub)
    try:
        with urllib.request.urlopen(api, timeout=30) as r: lst = json.load(r)
    except urllib.error.HTTPError: return []
    st = [f['path'].split('/')[-1] for f in lst if f['path'].endswith('.safetensors')]
    # keep the main weights only: base name 'diffusion_pytorch_model' or 'model' (drops non_ema and fp16 variants);
    # when both a single file and a sharded set exist they hold the same tensors, so take the single file
    main = [p for p in st if re.sub(r'-\d{5}-of-\d{5}', '', p)[:-12] in ('diffusion_pytorch_model', 'model')]
    single = [p for p in main if not re.search(r'-\d{5}-of-\d{5}', p)]
    return [sub + '/' + p for p in (single or main)]
out = {}
for f in sorted(glob.glob(os.path.join(HERE, 'inputs', 'cfg_*.json'))):
    cfg = json.load(open(f)); rp = cfg['repo']; out[rp] = {}
    for comp in ('unet', 'transformer', 'vae', 'text_encoder', 'text_encoder_2'):
        if comp not in cfg: continue
        fs = files_for(rp, comp); tot = 0; dts = {}
        for p in fs:
            t, dt = header_params('https://huggingface.co/%s/resolve/main/%s' % (rp, p)); tot += t
            for k, v in dt.items(): dts[k] = dts.get(k, 0) + v
        out[rp][comp] = {'params': tot, 'dtypes': dts, 'files': fs}
        print(rp, comp, round(tot / 1e9, 3), 'B', fs[:3], flush=True)
json.dump(out, open(os.path.join(HERE, 'out', 'component_params.json'), 'w'), indent=1, sort_keys=True)
