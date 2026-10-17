"""Latent lab: turn the recorded outputs into the page's data part, parts/31_js_lt_0data.js (CPU, seconds).

  GM_SCRATCH=... $GM_SCRATCH/venv/bin/python -I make_data.py
Inputs: src/latent/out/{tiny,sd_vae,sd_scale,perc}.json, GM_SCRATCH/lt/tiny.npz (28x28 uint8 images from eval_lt.py)
and GM_SCRATCH/lt/sdvae, sdscale (full-size PNGs from sd_vae.py, sd_scale.py, perc_demo.py). Every image the page embeds is
also written to src/latent/assets/ (small), and the data part is committed, so the page rebuilds without the scratch folder.
Budget (lead, 2026-10-17): the tab's embedded data under about 120 KB, so grey sprites are stored with 8 grey levels and
colour images as small WebP thumbnails.
"""
import base64, json, os, sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
from common import test16, scratch, load_split

ASSETS = os.path.join(HERE, "assets"); os.makedirs(ASSETS, exist_ok=True)
for f in os.listdir(ASSETS):
    os.remove(os.path.join(ASSETS, f))
OUTJS = os.path.join(HERE, "..", "parts", "31_js_lt_0data.js")
J = lambda n: json.load(open(os.path.join(HERE, "out", n)))
img = {}
LEVELS = 8
GRID_N = int(os.environ.get("LT_GRID", "9"))     # tiles per side embedded for each 2-D explorer (eval_lt.py decodes 20)


def uri(path):
    ext = os.path.splitext(path)[1].lstrip(".")
    return f"data:image/{ext};base64," + base64.b64encode(open(path, "rb").read()).decode()


def add_sprite(name, tiles, cols, w=28):
    """tiles: uint8 [N,w,w] -> one 16-level grey PNG (palette, 4 bits per pixel), cols tiles per row."""
    n = len(tiles); rows = (n + cols - 1) // cols
    g = np.zeros((rows * w, cols * w), np.uint8)
    for i, t in enumerate(tiles):
        r, c = divmod(i, cols); g[r * w:(r + 1) * w, c * w:(c + 1) * w] = t
    q = (np.round(g / 255 * (LEVELS - 1))).astype(np.uint8)
    im = Image.fromarray(q, "P")
    im.putpalette(sum([[round(v * 255 / (LEVELS - 1))] * 3 for v in range(LEVELS)], []))
    p = os.path.join(ASSETS, name + ".png")
    im.save(p, optimize=True, bits=4)
    img[name] = {"uri": uri(p), "w": w, "cols": cols}


def add_photo(name, src, size, crop=None, q=50):
    p = os.path.join(ASSETS, name + ".webp")
    im = Image.open(src).convert("RGB")
    if crop:
        im = im.crop(crop)
    im.resize((size, size), Image.LANCZOS).save(p, quality=q, method=6)
    img[name] = {"uri": uri(p), "w": size, "cols": 1}


def add_grey(name, src):
    p = os.path.join(ASSETS, name + ".webp")
    Image.open(src).convert("L").resize((48, 48), Image.LANCZOS).save(p, quality=55, method=6)
    img[name] = {"uri": uri(p), "w": 48, "cols": 1}


tiny = J("tiny.json")
A = np.load(scratch("lt", "tiny.npz"))
x16 = test16()[0]
def add_rows(name, rows, cols):
    """rows: list of (key, uint8 [cols,28,28]); the sprite records which row holds which key."""
    add_sprite(name, np.concatenate([r[:cols] for _, r in rows]), cols)
    img[name]["rows"] = {k: i for i, (k, _) in enumerate(rows)}


add_rows("rec", [("orig", x16)] + [(k, A[k + "_rec16"]) for k in ("ae2", "ae16", "vae16_b1p0", "vq_plain", "vq_restart")], 16)
B = ["vae16_b0p1", "vae16_b0p3", "vae16_b1p0", "vae16_b3p0", "vae16_b10p0"]
add_rows("beta", [("orig", x16)] + [(k, A[k + "_rec16"]) for k in B] + [(k + "_prior", A[k + "_prior"]) for k in B], 8)
add_rows("prior", [(k, A[k]) for k in ("ae2_prior", "ae2_fit", "vae2_prior", "ae16_prior", "ae16_fit", "vae16_b1p0_prior")], 8)
# 2-D explorer grids: eval_lt.py decoded a 20 x 20 grid; embed an evenly spaced GRID_N x GRID_N subset of it
grid = {}
for n in ("ae2", "vae2"):
    g = tiny["runs"][n]["grid"]; G = g["n"]
    sel = np.round(np.linspace(0, G - 1, GRID_N)).astype(int)
    tiles = A[n + "_grid"].reshape(G, G, 28, 28)[np.ix_(sel, sel)].reshape(-1, 28, 28)
    add_sprite("grid_" + n, tiles, GRID_N)
    lo, hi = np.array(g["lo"]), np.array(g["hi"])
    grid[n] = {"n": GRID_N, "lo": g["lo"], "hi": g["hi"], "decoded_n": G}
rows = []
for a, b in tiny["interp_pairs"][:3]:
    rows += [A[f"interp_pix_{a}_{b}"], A[f"interp_ae16_{a}_{b}"], A[f"interp_vae16_b1p0_{a}_{b}"]]
add_sprite("interp", np.concatenate(rows), 9)

# scatter of 2-D codes: the first 60 test images of each class, quantised to 0..255 inside each explorer's box
yte = load_split("test")[1]
pick = np.concatenate([np.where(yte == c)[0][:60] for c in range(10)])
zte = {"ae2": A["ae2_z_test"], "vae2": A["vae2_mu_test"]}
sc = {}
for name in ("ae2", "vae2"):
    lo, hi = np.array(grid[name]["lo"]), np.array(grid[name]["hi"])
    u = (zte[name][pick] - lo) / (hi - lo)
    u[:, 1] = 1 - u[:, 1]          # store (x right, y down), as the canvas draws them
    q = np.clip(np.round(u * 255), 0, 255).astype(np.uint8)
    sc[name] = base64.b64encode(q.tobytes()).decode()
sc["labels"] = base64.b64encode(yte[pick].astype(np.uint8).tobytes()).decode()
sig = A["vae2_sigma_test"][pick]
sc["vae2_sigma"] = base64.b64encode(np.clip(np.round(sig / 2 * 255), 0, 255).astype(np.uint8).tobytes()).decode()

# numbers: every scalar from tiny.json, plus only the per-image arrays the page draws
KEEP_ARR = {"ae2": ["code16", "code_std"], "ae16": ["code16", "code_std"], "vae16_b1p0": ["mu16", "sigma16"],
            "vq_plain": ["usage_counts", "alive_log", "tokens16"], "vq_restart": ["usage_counts", "alive_log", "tokens16"]}
runs = {}
for k, r in tiny["runs"].items():
    keep = KEEP_ARR.get(k, []) + ["test16_psnr_db"] + (["kl_per_dim"] if k.startswith("vae16") else [])
    runs[k] = {kk: v for kk, v in r.items() if (not isinstance(v, list) or kk in keep) and kk not in ("last_train_log", "grid")}
    for kk in ("prior", "prior_std_normal", "prior_fitted_gaussian"):
        if kk in runs[k]:
            runs[k][kk] = {a: b for a, b in runs[k][kk].items()}
    for kk in ("code16", "mu16", "sigma16"):
        if kk in runs[k]:
            runs[k][kk] = [[round(v, 2) for v in row] for row in runs[k][kk]]
    if "tokens16" in runs[k]:
        runs[k]["tokens16"] = base64.b64encode(np.array(runs[k]["tokens16"], np.uint8).tobytes()).decode()
    if k in grid:
        runs[k]["grid"] = grid[k]
T = {"floor": tiny["floor_real_val_1000"], "runs": runs, "pairs": tiny["interp_pairs"][:3]}
page = {"tiny": T, "scatter": sc, "sd_vae": J("sd_vae.json"), "sd_scale": J("sd_scale.json"), "perc": J("perc.json")}
page["sd_scale"]["runs"] = {k.replace(".", "p"): v for k, v in page["sd_scale"]["runs"].items()}   # dots would break data-lt paths
for k in ("machine", "torch", "date", "model", "scheduler"):
    for n in ("sd_vae", "sd_scale"):
        page[n].pop(k, None)

# SD images
D = scratch("lt", "sdvae"); E = scratch("lt", "sdscale"); TI = scratch("test_images")
CROPS = {"p01_cat": (176, 96, 336, 256), "s03_text": (96, 176, 256, 336), "p04_hubble": (192, 192, 352, 352)}
for k, box in CROPS.items():
    add_photo(f"sd_{k}_orig", os.path.join(TI, k + ".png"), 112, box, q=45)
    add_photo(f"sd_{k}_rec", os.path.join(D, k + "_rec.png"), 112, box, q=45)
    add_photo(f"sd_{k}_blur", os.path.join(D, k + "_blur.png"), 112, box, q=45)
add_photo("sd_p01_cat_full", os.path.join(TI, "p01_cat.png"), 96)
add_photo("sd_p01_cat_recfull", os.path.join(D, "p01_cat_rec.png"), 96)
for c in range(4):
    add_grey(f"sd_cat_z{c}", os.path.join(D, f"cat_latent_c{c}.png"))
for n in ("right", "forgot_divide", "divided_raw"):
    add_photo("sd_dec_" + n, os.path.join(D, f"dec_{n}.png"), 80, q=45)
for t in (0, 300, 600, 999):
    for u in ("scaled", "raw"):
        add_photo(f"sd_noise_{u}_{t}", os.path.join(D, f"noise_{u}_{t:03d}.png"), 64, q=30)
for n in ("i2i_0.18215", "i2i_0.13025", "i2i_1.0", "t2i_div_0.18215", "t2i_div_1.0", "t2i_div_0.13025"):
    add_photo("sd_" + n.replace(".", "p"), os.path.join(E, n + ".png"), 80, q=45)

page["img"] = img
js = "// ---- Latent lab data (generated by src/latent/make_data.py from the recorded runs; do not edit) ----\nwindow.LTD=" + json.dumps(page, separators=(",", ":")) + ";\n"
open(OUTJS, "w").write(js)
tot = sum(len(v["uri"]) for v in img.values())
print("wrote", len(js), "bytes; images", tot, "; numbers", len(js) - tot)
groups = {}
for k, v in img.items():
    g = "_".join(k.split("_")[:2]) if k.startswith("sd_") else k
    groups[g] = groups.get(g, 0) + len(v["uri"])
print(sorted(groups.items(), key=lambda x: -x[1]))
