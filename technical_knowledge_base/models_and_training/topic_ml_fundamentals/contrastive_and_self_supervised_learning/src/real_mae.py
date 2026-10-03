"""MAE on one real image: the released facebook/vit-mae-base checkpoint (He et al. 2021) masks 75% of the
patches of scikit-image's "chelsea" photo and reconstructs them.

Writes inputs/mae.json: the 14 x 14 mask per ratio (1 = hidden), the per-masked-patch MSE in the model's
target space, and small JPEG data URIs of the original (224 x 224 centre crop), the visible patches and the
reconstruction (visible patches pasted back, as in the MAE paper's figures). If the checkpoint was trained on
per-patch normalised pixels (config norm_pix_loss), predictions are un-normalised with each target patch's own
mean and std, which is what the official visualisation does for such models; the page says so.

Run: OMP_NUM_THREADS=2 HF_HUB_OFFLINE=1 uv run --with torch --with transformers --with scikit-image --with pillow python real_mae.py
"""
import base64, io, json
import numpy as np, torch
from PIL import Image
from skimage import data
from transformers import ViTMAEForPreTraining

torch.set_num_threads(2)
src = data.chelsea()  # 300 x 451 RGB
doc = (data.chelsea.__doc__ or '').strip().split('\n')
h, w, _ = src.shape
s = min(h, w)
img = Image.fromarray(src[(h - s) // 2:(h - s) // 2 + s, (w - s) // 2:(w - s) // 2 + s]).resize((224, 224), Image.BICUBIC)
x = np.asarray(img).astype(np.float32) / 255.0
mean = np.array([0.485, 0.456, 0.406], np.float32); std = np.array([0.229, 0.224, 0.225], np.float32)
xt = torch.tensor(((x - mean) / std).transpose(2, 0, 1))[None]

m = ViTMAEForPreTraining.from_pretrained('facebook/vit-mae-base').eval()
cfg = m.config
print('mask_ratio', cfg.mask_ratio, 'norm_pix_loss', cfg.norm_pix_loss)


def jpg(a, q=72):
    b = io.BytesIO(); Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8)).save(b, 'JPEG', quality=q, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()


def patchify(a):  # (224,224,3) -> (196, 768)
    return a.reshape(14, 16, 14, 16, 3).transpose(0, 2, 1, 3, 4).reshape(196, 768)


def unpatchify(p):
    return p.reshape(14, 14, 16, 16, 3).transpose(0, 2, 1, 3, 4).reshape(224, 224, 3)


out = dict(image='scikit-image data.chelsea', image_doc=doc[:6], model='facebook/vit-mae-base',
           config=dict(mask_ratio=cfg.mask_ratio, norm_pix_loss=cfg.norm_pix_loss, patch_size=cfg.patch_size,
                       hidden_size=cfg.hidden_size, decoder_hidden_size=cfg.decoder_hidden_size,
                       decoder_num_hidden_layers=cfg.decoder_num_hidden_layers, num_hidden_layers=cfg.num_hidden_layers),
           original=jpg(x, 80), ratios={})
P = patchify((x - mean) / std)  # target space before optional per-patch norm
for ratio in [0.5, 0.75, 0.9]:
    m.config.mask_ratio = ratio; m.vit.embeddings.config.mask_ratio = ratio
    torch.manual_seed(3)
    noise = torch.rand(1, 196, generator=torch.Generator().manual_seed(3))
    with torch.no_grad():
        o = m(pixel_values=xt, noise=noise)
    mask = o.mask[0].numpy()  # 1 = masked
    pred = o.logits[0].numpy()
    if cfg.norm_pix_loss:
        mu = P.mean(1, keepdims=True); var = P.var(1, keepdims=True)
        tgt = (P - mu) / np.sqrt(var + 1e-6)
        mse = float(((pred - tgt) ** 2).mean(1)[mask == 1].mean())
        pred_px = pred * np.sqrt(var + 1e-6) + mu
    else:
        mse = float(((pred - P) ** 2).mean(1)[mask == 1].mean()); pred_px = pred
    rec = unpatchify(pred_px) * std + mean
    vis = x.copy(); pm = unpatchify(np.repeat(mask[:, None], 768, 1)).astype(bool)
    vis[pm] = 0.5
    paste = np.where(pm, rec, x)
    out['ratios'][str(ratio)] = dict(mask=mask.astype(int).tolist(), loss_masked=round(mse, 4), hf_loss=round(float(o.loss), 4),
                                     n_visible=int((mask == 0).sum()), visible=jpg(vis), recon=jpg(paste))
    print(ratio, 'visible', int((mask == 0).sum()), 'mse masked', round(mse, 4), 'hf loss', round(float(o.loss), 4))
json.dump(out, open('inputs/mae.json', 'w'), separators=(',', ':'))
print('bytes', len(json.dumps(out)))
