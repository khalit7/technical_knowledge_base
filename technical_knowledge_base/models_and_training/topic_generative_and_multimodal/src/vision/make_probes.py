"""Draw the Vision lab's probe images (synthetic, ours; the cat base is scikit-image data.chelsea, CC0).

Writes 512x512 PNGs to GM_SCRATCH/vision/probes/ and 112-pixel WebP thumbnails to img/ here, plus probes.json
(each probe: image keys and the competing captions; index 0 of 'truth' is the correct caption per image).
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vs_env import *
from PIL import Image, ImageDraw, ImageFont

N = 512
FULL = big("probes"); os.makedirs(FULL, exist_ok=True)
TH = os.path.join(HERE, "img"); os.makedirs(TH, exist_ok=True)
cat = Image.open(scratch("test_images", "p01_cat.png")).convert("RGB")
font = lambda s: ImageFont.load_default(size=s)
keys = []


def save(key, im):
    im.save(os.path.join(FULL, key + ".png"))
    im.resize((112, 112), Image.LANCZOS).save(os.path.join(TH, key + ".webp"), quality=70)
    keys.append(key)


def sticker(word, scale=1.0):
    im = cat.copy(); d = ImageDraw.Draw(im)
    w, h = 212 * scale, 90 * scale; cx, cy = 256, 405 if scale <= 1 else 512 - h / 2 - 12
    d.rectangle((cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), fill="white", outline="black", width=3)
    d.text((cx, cy), word, font=font(int(64 * scale)), fill="black", anchor="mm")
    return im


# typographic: the same sticker as s04 (150..362 x 360..450, 64 px text) with other words, and DOG at three sizes
for wd in ("DOG", "BIRD", "CAR", "CAT"):
    save(f"ty_{wd.lower()}", sticker(wd))
save("ty_dog_small", sticker("DOG", 0.5))
save("ty_dog_large", sticker("DOG", 1.6))
save("ty_plain", cat.copy())

# counting: 1..6 red circles on white, fixed positions
POS = [(130, 140), (380, 140), (255, 270), (130, 400), (380, 400), (255, 60)]
for n in range(1, 7):
    im = Image.new("RGB", (N, N), "white"); d = ImageDraw.Draw(im)
    for cx, cy in POS[:n]:
        d.ellipse((cx - 48, cy - 48, cx + 48, cy + 48), fill=(220, 30, 30))
    save(f"ct_{n}", im)


# spatial: s02's scene and its mirror image
def lr(mirror):
    im = Image.new("RGB", (N, N), (235, 235, 235)); d = ImageDraw.Draw(im)
    d.polygon([(70, 360), (200, 360), (135, 160)], fill=(30, 160, 60))
    d.ellipse((310, 190, 460, 340), fill=(250, 150, 20))
    return im.transpose(Image.FLIP_LEFT_RIGHT) if mirror else im
save("sp_tri_left", lr(False)); save("sp_tri_right", lr(True))


# binding: red circle + blue square against blue circle + red square (same layout)
def bind(c1, c2):
    im = Image.new("RGB", (N, N), "white"); d = ImageDraw.Draw(im)
    d.ellipse((60, 180, 220, 340), fill=c1); d.rectangle((300, 180, 460, 340), fill=c2)
    return im
R, B = (220, 30, 30), (30, 70, 220)
save("bd_redcirc", bind(R, B)); save("bd_bluecirc", bind(B, R))

W = ["one", "two", "three", "four", "five", "six"]
probes = {
    "typo": {"images": ["ty_plain", "ty_cat", "ty_dog", "ty_bird", "ty_car", "ty_dog_small", "ty_dog_large"],
             "texts": ["a photo of a cat", "a photo of a dog", "a photo of a bird", "a photo of a car"], "truth": [0] * 7},
    "count": {"images": [f"ct_{n}" for n in range(1, 7)],
              "texts": [f"a photo of {w} red circle{'s' if i else ''}" for i, w in enumerate(W)], "truth": list(range(6))},
    "spatial": {"images": ["sp_tri_left", "sp_tri_right"],
                "texts": ["a green triangle on the left and an orange circle on the right",
                          "an orange circle on the left and a green triangle on the right"], "truth": [0, 1]},
    "bind": {"images": ["bd_redcirc", "bd_bluecirc"],
             "texts": ["a red circle and a blue square", "a blue circle and a red square"], "truth": [0, 1]},
}
json.dump(probes, open(os.path.join(HERE, "probes.json"), "w"), indent=1)
print(len(keys), "probe images;", sum(os.path.getsize(os.path.join(TH, k + ".webp")) for k in keys), "thumbnail bytes")
