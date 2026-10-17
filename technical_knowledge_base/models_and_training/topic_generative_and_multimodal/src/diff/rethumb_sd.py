"""Re-encode the SD thumbnails in out/sd/ smaller for the root page's size budget (CPU, from the full-size PNGs in GM_SCRATCH/df_sd/).
160 x 160 WebP, quality 50 (the pure-noise DDIM 1-step image at quality 20). Full-resolution images belong on the Diffusion child page."""
import glob, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
from PIL import Image
from common import scratch
for f in sorted(glob.glob(os.path.join(HERE, "out", "sd", "*.webp"))):
    k = os.path.basename(f)[:-5]
    Image.open(scratch("df_sd", k + ".png")).resize((160, 160), Image.LANCZOS).save(f, quality=20 if k == "steps_ddim_1" else 50, method=6)
print("done")
