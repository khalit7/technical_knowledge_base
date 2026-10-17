"""Token counts from the real image processors (CPU, no model weights) for the budget tab's rules -> out/token_rules.json

  qwen      Qwen3.5-0.8B's processor (Qwen2VLImageProcessor, patch 16, merge 2): image tokens = grid_h * grid_w / 4,
            at the default limits and at a 1,024-token cap, on 24 sizes; also the video processor on 4 clip shapes
  internvl  OpenGVLab/InternVL3-1B-hf's image processor (GotOcr2, 448-pixel tiles, 1 to 12, thumbnail): tiles with
            crop_to_patches as the repo ships it (false) and true; 256 tokens per tile (processor_config image_seq_length)
The page's JavaScript ports of both rules are checked against this file by runs/check_rules.mjs.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vm_env import *  # noqa
import numpy as np
from PIL import Image

cap_threads(4)
sd = lambda x: {k: getattr(x, k) for k in ("height", "width", "shortest_edge", "longest_edge") if getattr(x, k, None) is not None} if not isinstance(x, dict) else x
SIZES = [(64, 64), (224, 224), (256, 256), (300, 451), (336, 336), (400, 1000), (427, 640), (448, 448), (480, 640),
         (512, 512), (600, 800), (720, 1280), (768, 1024), (1000, 400), (1024, 1024), (1080, 1920), (1170, 540),
         (1536, 1536), (2048, 2048), (2160, 3840), (3000, 3000), (100, 2000), (1754, 1240), (4000, 6000)]   # (h, w)
R = {"sizes_hw": SIZES, "date": time.strftime("%Y-%m-%d")}

qp = qwen_processor().image_processor
R["qwen"] = {"repo": QWEN[0], "revision": QWEN[1], "size_default": sd(qp.size), "rows": []}
for h, w in SIZES:
    im = Image.new("RGB", (w, h), (120, 130, 140))
    a = qp([im], return_tensors="pt")["image_grid_thw"][0].tolist()
    b = qp([im], return_tensors="pt", size={"shortest_edge": 65536, "longest_edge": 1024 * 1024})["image_grid_thw"][0].tolist()
    R["qwen"]["rows"].append({"h": h, "w": w, "default_thw": a, "default_tokens": a[1] * a[2] // 4, "cap1024_thw": b, "cap1024_tokens": b[1] * b[2] // 4})
    log("qwen", h, w, a, b)

from transformers import AutoImageProcessor
IVL = ("OpenGVLab/InternVL3-1B-hf", "014c0583a0d4bedf29fbe2dbff4f865eb998e171")
ip = AutoImageProcessor.from_pretrained(IVL[0], revision=IVL[1])
R["internvl"] = {"repo": IVL[0], "revision": IVL[1], "crop_to_patches_default": ip.crop_to_patches, "min_patches": ip.min_patches,
                 "max_patches": ip.max_patches, "tile": sd(ip.size), "tokens_per_tile": 256, "rows": []}
for h, w in SIZES:
    im = Image.new("RGB", (w, h), (120, 130, 140))
    n0 = int(ip([im], return_tensors="pt")["pixel_values"].shape[0])
    n1 = int(ip([im], return_tensors="pt", crop_to_patches=True)["pixel_values"].shape[0])
    R["internvl"]["rows"].append({"h": h, "w": w, "tiles_shipped_default": n0, "tiles_crop": n1})
    log("internvl", h, w, n0, n1)
from transformers.video_utils import VideoMetadata
vp = qwen_processor().video_processor
R["qwen_video"] = []
for (h, w, nfr, src_fps, fps) in [(240, 320, 16, 4.0, 2), (360, 640, 120, 2.0, 2), (720, 1280, 20, 2.0, 2), (1080, 1920, 20, 2.0, 2), (360, 640, 40, 4.0, 4), (240, 320, 600, 2.0, 1), (240, 320, 1200, 2.0, 2)]:
    v = np.zeros((nfr, h, w, 3), dtype=np.uint8)
    o = vp(videos=[v], video_metadata=[VideoMetadata(total_num_frames=nfr, fps=src_fps, duration=nfr / src_fps)], fps=fps, cap_pixels_per_frame=True, return_tensors="pt")
    thw = o["video_grid_thw"][0].tolist()
    R["qwen_video"].append({"h": h, "w": w, "seconds": nfr / src_fps, "fps": fps, "thw": thw, "tokens": thw[0] * thw[1] * thw[2] // 4})
    log("video", h, w, nfr / src_fps, fps, thw)
dump("token_rules.json", R, indent=None)
