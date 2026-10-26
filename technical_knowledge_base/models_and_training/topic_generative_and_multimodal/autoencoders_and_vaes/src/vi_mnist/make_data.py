# The MNIST VAE run and the beta sweep (moved here from the Variational inference maths page, 2026-10-26).
# Builds parts/22_js_av_2mnist.js (window.AVM) from vae_out.json (written by vae.py) and vae_gap.json (written by the
# maths page's src/data/vae_gap.py from the same checkpoint, copied here for the measurements table).
# Run from anywhere: python3 vi_mnist/make_data.py
import base64, json, os
H = os.path.dirname(os.path.abspath(__file__))
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
P = os.path.join(H, '..', 'parts', '22_js_av_2mnist.js')
open(P, 'w').write('// The MNIST VAE run and beta sweep (src/vi_mnist/make_data.py; do not edit)\nwindow.AVM=' + json.dumps(out, separators=(',', ':')) + ';\n')
print(P, os.path.getsize(P))
