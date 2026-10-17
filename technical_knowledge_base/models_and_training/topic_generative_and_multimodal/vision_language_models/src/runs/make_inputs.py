"""Synthetic inputs for this page (CPU, seconds). Full-size images go to GM_SCRATCH/vm/inputs/; ground truth and
small WebP thumbnails go to src/inputs/ (committed).

  ocr/     21 pages 1024x1024: one 6-character code (no 0/O, 1/I) centred, at 7 font sizes (Pillow's bundled Aileron)
  ground/  12 scenes (4 aspect ratios x 3), two shapes each, exact boxes in original pixels
  video/   8 clips, 16 frames of 320x240 (4 s at 4 fps): a dot moving in one of four directions, two colours
  see/     images for the "what the model saw" viewer: scikit-image chelsea and rocket at their native sizes
           (CC0 / public domain, as in the root's running example), a tall synthetic receipt, the root's 512x512 cat
  blank    one 512x512 mid-grey image (the "no evidence" baseline for the hallucination probe)
"""
import base64, io, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vm_env import *  # noqa
import numpy as np
from PIL import Image, ImageDraw, ImageFont

rng = np.random.default_rng(0)
ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
font = lambda s: ImageFont.load_default(size=s)
os.makedirs(os.path.join(INP, "thumbs"), exist_ok=True)


def save_full(img, *p):
    path = big("inputs", *p); img.save(path); return path


def thumb_uri(img, side=160, q=70):
    im = img.copy(); im.thumbnail((side, side), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "WEBP", quality=q)
    return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()


truth = {"note": "made by runs/make_inputs.py (seed 0); full-size images in GM_SCRATCH/vm/inputs/"}

# ---------------------------------------------------------------- OCR pages
SIZES = [8, 10, 12, 16, 20, 28, 40]
ocr = []
for s in SIZES:
    for k in range(3):
        code = "".join(rng.choice(list(ALPH), 6))
        im = Image.new("RGB", (1024, 1024), "white"); d = ImageDraw.Draw(im)
        f = font(s); x0, y0, x1, y1 = d.textbbox((0, 0), code, font=f)
        d.text(((1024 - (x1 - x0)) / 2 - x0, (1024 - (y1 - y0)) / 2 - y0), code, fill="black", font=f)
        key = f"ocr_{s:02d}_{k}"; save_full(im, "ocr", key + ".png")
        ocr.append({"key": key, "font_px": s, "code": code, "text_w": x1 - x0, "text_h": y1 - y0})
truth["ocr"] = ocr
# one thumbnail strip: a 256-px crop around the code at each size (what the eye sees at 1:1)
crops = []
for it in ocr[::3]:
    im = Image.open(big("inputs", "ocr", it["key"] + ".png")).crop((384, 448, 640, 576))
    crops.append({"font_px": it["font_px"], "uri": thumb_uri(im, 256, 80)})
truth["ocr_crops"] = crops

# ---------------------------------------------------------------- grounding scenes
SHAPES = [("red", "circle", (220, 40, 40)), ("blue", "square", (40, 80, 220)), ("green", "triangle", (30, 160, 60))]
CANVAS = [(640, 480), (480, 640), (800, 400), (512, 512)]
ground = []
for i in range(12):
    W, H = CANVAS[i % 4]
    im = Image.new("RGB", (W, H), (245, 245, 240)); d = ImageDraw.Draw(im)
    picks = rng.choice(3, 2, replace=False); boxes = []
    for j in picks:
        name, kind, col = SHAPES[j]
        for _ in range(200):
            s = int(rng.integers(50, 151)); x = int(rng.integers(10, W - s - 10)); y = int(rng.integers(10, H - s - 10))
            b = [x, y, x + s, y + s]
            if all(b[0] > o[2] + 10 or b[2] < o[0] - 10 or b[1] > o[3] + 10 or b[3] < o[1] - 10 for o in [bb["box"] for bb in boxes]):
                break
        if kind == "circle": d.ellipse(b, fill=col)
        elif kind == "square": d.rectangle(b, fill=col)
        else: d.polygon([(x + s / 2, y), (x + s, y + s), (x, y + s)], fill=col)
        boxes.append({"obj": f"{name} {kind}", "box": b})
    key = f"gr_{i:02d}"; save_full(im, "ground", key + ".png")
    ground.append({"key": key, "w": W, "h": H, "objects": boxes, "thumb": thumb_uri(im, 200, 75)})
truth["ground"] = ground

# ---------------------------------------------------------------- video clips
DIRS = {"left to right": (1, 0), "right to left": (-1, 0), "top to bottom": (0, 1), "bottom to top": (0, -1)}
video = []
for ci, colour in enumerate([("red", (220, 40, 40)), ("blue", (40, 80, 220))]):
    for dname, (dx, dy) in DIRS.items():
        frames = []
        for t in range(16):
            im = Image.new("RGB", (320, 240), (245, 245, 240)); d = ImageDraw.Draw(im)
            f = t / 15
            cx = 160 + dx * (f - 0.5) * 240; cy = 120 + dy * (f - 0.5) * 160
            d.ellipse([cx - 18, cy - 18, cx + 18, cy + 18], fill=colour[1]); frames.append(np.asarray(im))
        key = f"vid_{colour[0]}_{dname.replace(' ', '_')}"
        np.save(big("inputs", "video", key + ".npy"), np.stack(frames))
        strip = Image.new("RGB", (320 * 4, 240), "white")
        for k, t in enumerate([0, 5, 10, 15]): strip.paste(Image.fromarray(frames[t]), (320 * k, 0))
        video.append({"key": key, "colour": colour[0], "direction": dname, "frames": 16, "fps": 4, "w": 320, "h": 240,
                      "strip": thumb_uri(strip, 320, 70)})
truth["video"] = video

# ---------------------------------------------------------------- "what the model saw" images
from skimage import data
see = []
for key, arr, lic in [("chelsea_native", data.chelsea(), "CC0 (Stefan van der Walt), scikit-image data.chelsea"),
                      ("rocket_native", data.rocket(), "public domain (SpaceX), scikit-image data.rocket")]:
    im = Image.fromarray(arr).convert("RGB"); save_full(im, "see", key + ".png")
    see.append({"key": key, "w": im.width, "h": im.height, "licence": lic})
# a tall receipt, 400 x 1000, ten lines of text
im = Image.new("RGB", (400, 1000), "white"); d = ImageDraw.Draw(im)
lines = ["CORNER CAFE", "", "espresso      2.40", "croissant     3.10", "orange juice  3.80", "water         1.00", "",
         "TOTAL        10.30", "", "thank you"]
for i, ln in enumerate(lines):
    d.text((40, 60 + i * 85), ln, fill="black", font=font(26))
save_full(im, "see", "receipt_tall.png"); see.append({"key": "receipt_tall", "w": 400, "h": 1000, "licence": "synthetic (this page)",
                                                       "text": [l for l in lines if l]})
see.append({"key": "p01_cat", "w": 512, "h": 512, "licence": "CC0, the root's test image p01_cat"})
truth["see"] = see

grey = Image.new("RGB", (512, 512), (128, 128, 128)); save_full(grey, "blank_grey.png")
json.dump(truth, open(os.path.join(INP, "synthetic.json"), "w"), indent=1)
print("wrote inputs/synthetic.json", os.path.getsize(os.path.join(INP, "synthetic.json")), "bytes")
