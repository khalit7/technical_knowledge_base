"""Image-grid helpers that write small PNG or WebP thumbnails (and data URIs for the page).

save_grid(x, path, nrow=8)   x: tensor [N,C,H,W] in [-1,1] (C = 1 or 3) or uint8 numpy [N,H,W(,3)]
data_uri(path)               'data:image/png;base64,...' for embedding in the sandboxed page
"""
import base64, io, os

import numpy as np
from PIL import Image


def _to_uint8(x):
    if isinstance(x, np.ndarray) and x.dtype == np.uint8:
        a = x
    else:
        import torch
        t = x.detach().float().cpu().clamp(-1, 1)
        a = ((t + 1) * 127.5).round().to(torch.uint8).numpy()
        a = a.transpose(0, 2, 3, 1)                     # NHWC
        if a.shape[-1] == 1:
            a = a[..., 0]
    return a


def grid_array(x, nrow=8, pad=2, bg=0, crop_pad=False):
    """Tile N images into one uint8 array. crop_pad=True removes the 2-pixel padding of 32x32 inputs."""
    a = _to_uint8(x)
    if crop_pad and a.shape[1] == 32:
        a = a[:, 2:30, 2:30]
    n, h, w = a.shape[:3]
    rows = (n + nrow - 1) // nrow
    shape = (rows * (h + pad) + pad, nrow * (w + pad) + pad) + a.shape[3:]
    g = np.full(shape, bg, np.uint8)
    for i in range(n):
        r, c = divmod(i, nrow)
        g[pad + r * (h + pad):pad + r * (h + pad) + h, pad + c * (w + pad):pad + c * (w + pad) + w] = a[i]
    return g


def save_grid(x, path, nrow=8, pad=2, bg=0, crop_pad=True, scale=1, quality=80):
    """Write a grid as PNG (lossless, best for 28x28 grey) or WebP (by extension). Returns bytes written."""
    g = Image.fromarray(grid_array(x, nrow, pad, bg, crop_pad))
    if scale != 1:
        g = g.resize((g.width * scale, g.height * scale), Image.NEAREST)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    if path.endswith(".webp"):
        g.save(path, quality=quality, method=6)
    elif path.endswith(".jpg"):
        g.save(path, quality=quality, optimize=True)
    else:
        g.save(path, optimize=True)
    return os.path.getsize(path)


def thumb(img, path, size=256, quality=80):
    """Save a PIL image as a small square thumbnail (WebP or JPEG by extension)."""
    im = img.convert("RGB").resize((size, size), Image.LANCZOS)
    im.save(path, quality=quality, **({"method": 6} if path.endswith(".webp") else {"optimize": True}))
    return os.path.getsize(path)


def data_uri(path):
    ext = os.path.splitext(path)[1].lstrip(".").replace("jpg", "jpeg")
    return f"data:image/{ext};base64," + base64.b64encode(open(path, "rb").read()).decode()


def array_uri(a, fmt="PNG"):
    """uint8 array -> PNG data URI without touching disk."""
    b = io.BytesIO(); Image.fromarray(a).save(b, fmt, optimize=True)
    return f"data:image/{fmt.lower()};base64," + base64.b64encode(b.getvalue()).decode()
