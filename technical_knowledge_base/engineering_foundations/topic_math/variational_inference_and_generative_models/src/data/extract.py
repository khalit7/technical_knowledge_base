# Build the page's compact VAE input from the gap split (run from src/data after vae_gap.py).
# The MNIST VAE run itself (vae.py, its curves, latent map and the beta sweep) moved to Autoencoders and VAEs, src/vi_mnist/,
# on 2026-10-26; its checkpoint vae_z2.pt is what vae_gap.py reads. The two-moons networks moved to Diffusion from zero, src/moons/.
import json, os
H = os.path.dirname(os.path.abspath(__file__)); IN = os.path.join(H, '..', 'inputs')
g = json.load(open(os.path.join(H, 'vae_gap.json')))
json.dump({'gap': g}, open(os.path.join(IN, 'vae.json'), 'w'), separators=(',', ':'))
print({'vae.json': os.path.getsize(os.path.join(IN, 'vae.json'))})
