# Build the page's compact inputs from the training outputs (run from src/data after vae.py, vae_gap.py, diffusion.py 64 30000).
import json, base64, os
H = os.path.dirname(os.path.abspath(__file__)); IN = os.path.join(H, '..', 'inputs')
v = json.load(open(os.path.join(H, 'vae_out.json'))); g = json.load(open(os.path.join(H, 'vae_gap.json')))
z = v['z2']
def pack4(hexs):  # two 4-bit pixels per byte
    b = bytes(int(hexs[i], 16) * 16 + (int(hexs[i + 1], 16) if i + 1 < len(hexs) else 0) for i in range(0, len(hexs), 2))
    return base64.b64encode(b).decode()
def pack1(bits):
    b = bytes(int(bits[i:i + 8].ljust(8, '0'), 2) for i in range(0, len(bits), 8)); return base64.b64encode(b).decode()
out = {'note': v['note'], 'curve': z['curve'], 'epochs': z['epochs'], 'spe': z['steps_per_epoch'],
       'latent': z['latent'][:1500], 'sdmean': z['latent_sd_mean'], 'gz': z['grid_z'], 'grid': pack4(z['grid']),
       'rl': z['recon_labels'], 'rx': pack1(z['recon_x']), 'rp': pack4(z['recon_p']),
       'iwae': {k: z['iwae' + k] for k in ['1', '10', '100', '1000']}, 'elbo1000': z['elbo_same'], 'gap': g,
       'beta': [{k: b[k] for k in ['beta', 'rec', 'kl', 'active', 'iwae1000']} | {'kd': [round(x, 2) for x in b['kl_dims']]} for b in v['beta']]}
json.dump(out, open(os.path.join(IN, 'vae.json'), 'w'), separators=(',', ':'))
d = json.load(open(os.path.join(H, 'dm_w64.json')))
dm = {'W': d['W'], 'steps': d['steps'], 'torch': d['torch']}
for k in ['eps', 'flow']:
    dm[k] = {'log': d[k]['log'], 'L': [{'o': l['out'], 'i': l['in'], 's': l['scale'], 'b': l['b'], 'q': base64.b64encode(bytes.fromhex(l['q'])).decode()} for l in d[k]['layers']]}
json.dump(dm, open(os.path.join(IN, 'dm.json'), 'w'), separators=(',', ':'))
print({f: os.path.getsize(os.path.join(IN, f)) for f in ['vae.json', 'dm.json']})
