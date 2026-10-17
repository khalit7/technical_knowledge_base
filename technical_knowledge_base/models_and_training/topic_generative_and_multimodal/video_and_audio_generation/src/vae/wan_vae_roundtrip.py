# One real video VAE round trip on CPU (float32, 4 threads): Wan 2.1's causal 3-D VAE (8x8 space, 4x time, 16 channels).
# Input: two 17-frame 256x256 clips cut from the topic's public-domain test image p01_cat (chelsea, CC0) by a sliding crop:
# slow (2 px per frame) and fast (14 px per frame). Output: latent shape, per-frame PSNR, timing, small WebP frames.
# usage: OMP_NUM_THREADS=4 nice -n 15 $GM_SCRATCH/venv/bin/python -I wan_vae_roundtrip.py <test_images dir> <out json>
import sys, io, json, time, base64, resource, numpy as np, torch
from PIL import Image
from diffusers import AutoencoderKLWan
torch.set_num_threads(4)
TI, OUT = sys.argv[1], sys.argv[2]
REV = '0fad780a534b6463e45facd96134c9f345acfa5b'
img = np.asarray(Image.open(f'{TI}/p01_cat.png').convert('RGB')).astype(np.float32) / 127.5 - 1
def clip(step, n=17, size=256):
    fr = [img[96:96 + size, 16 + i * step:16 + i * step + size] for i in range(n)]
    return torch.from_numpy(np.stack(fr)).permute(3, 0, 1, 2)[None]  # (1, 3, T, H, W)
def psnr(a, b): return float(10 * np.log10(4.0 / np.mean((a - b) ** 2)))  # range [-1, 1] so peak-to-peak 2
def webp(x, px=96):
    a = ((x.clamp(-1, 1).permute(1, 2, 0).numpy() + 1) * 127.5).astype('uint8')
    im = Image.fromarray(a).resize((px, px), Image.LANCZOS); b = io.BytesIO(); im.save(b, 'WEBP', quality=72)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
vae = AutoencoderKLWan.from_pretrained('Wan-AI/Wan2.1-T2V-1.3B-Diffusers', subfolder='vae', revision=REV, dtype=torch.float32).eval()
nparam = sum(p.numel() for p in vae.parameters())
res = {'revision': REV, 'params': nparam, 'clips': {}}
for name, step in (('slow', 2), ('fast', 14)):
    x = clip(step)
    with torch.inference_mode():
        t0 = time.time(); z = vae.encode(x).latent_dist.mode(); te = time.time() - t0
        t0 = time.time(); y = vae.decode(z).sample; td = time.time() - t0
    p = [psnr(x[0, :, i].numpy(), y[0, :, i].numpy()) for i in range(x.shape[2])]
    res['clips'][name] = {'px_per_frame': step, 'in_shape': list(x.shape), 'latent_shape': list(z.shape), 'out_shape': list(y.shape),
        'enc_s': round(te, 2), 'dec_s': round(td, 2), 'psnr': [round(v, 2) for v in p],
        'orig': [webp(x[0, :, i]) for i in range(17)], 'recon': [webp(y[0, :, i]) for i in range(17)]}
    print(name, z.shape, [round(v, 1) for v in p], round(te, 1), round(td, 1), 'maxrss MB', resource.getrusage(resource.RUSAGE_SELF).ru_maxrss // 2**20, flush=True)
res['peak_rss_mb'] = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss // 2**20
json.dump(res, open(OUT, 'w')); print('done params', nparam)
