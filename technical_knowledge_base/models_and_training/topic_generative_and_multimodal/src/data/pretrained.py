"""Pinned pretrained models for the topic (inference only; weights in ~/.cache/huggingface; fp16/bf16 on MPS).

Load one model at a time, in its own process, under the bench lock (README.md). Every loader pins the
exact Hub revision so a lab quotes the same weights the README describes.
"""
import json, os

import torch

SD = ("stable-diffusion-v1-5/stable-diffusion-v1-5", "451f4fe16113bff5a5d2269ed5ad43b0592e9a14")
CLIP = ("openai/clip-vit-base-patch32", "3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268")
SIGLIP = ("google/siglip2-base-patch16-224", "75de2d55ec2d0b4efc50b3e9ad70dba96a7b2fa2")
VLM = ("HuggingFaceTB/SmolVLM-500M-Instruct", "a7da5b986cb59b408707209984f360a5f4ad7e47")

# The shared prompts. g01..g06 generate the six generated test images (seed = index - 1); all eight are
# the prompts the Diffusion and Latent labs use for step / guidance / scheduler comparisons.
PROMPTS = {
    "g01": "a photograph of a red bicycle leaning against a brick wall",
    "g02": "a photograph of a bowl of oranges on a wooden table",
    "g03": "a photograph of a lighthouse on a cliff at sunset",
    "g04": "a photograph of a golden retriever puppy sitting on grass",
    "g05": "a photograph of a stop sign on a snowy street",
    "g06": "an astronaut riding a horse on the moon, digital art",
    "x07": "a white mug on a desk with the word HELLO printed on it",
    "x08": "two cats and three dogs sitting on a sofa",
}
GEN = {"steps": 25, "guidance_scale": 7.5, "scheduler": "DPMSolverMultistepScheduler (diffusers default config from the repo's scheduler_config)",
       "size": 512, "generator": "torch.Generator('cpu').manual_seed(seed), so the initial noise is identical on any device",
       "negative_prompt": None}


def load_sd(dev="mps", dtype=torch.float16, scheduler="dpm", attention_slicing=True):
    """attention_slicing=True: measured here 4.45 GB peak and 16.9 s per 512x512 image (25 steps) vs 8.0 GB
    and about 21 s without it (smoke/sd_slicing.json, smoke/sd.json), so it is on by default."""
    from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler, DDIMScheduler, EulerDiscreteScheduler
    pipe = StableDiffusionPipeline.from_pretrained(SD[0], revision=SD[1], variant="fp16", dtype=dtype,
                                                   safety_checker=None, requires_safety_checker=False)
    cls = {"dpm": DPMSolverMultistepScheduler, "ddim": DDIMScheduler, "euler": EulerDiscreteScheduler}.get(scheduler)
    if cls:
        pipe.scheduler = cls.from_config(pipe.scheduler.config)
    pipe.set_progress_bar_config(disable=True)
    if attention_slicing:
        pipe.enable_attention_slicing()
    return pipe.to(dev)


def load_sd_vae(dev="mps", dtype=torch.float32):
    """The SD 1.5 VAE alone (fp32 weights by default: the reference for reconstruction error)."""
    from diffusers import AutoencoderKL
    kw = {} if dtype == torch.float32 else {"variant": "fp16"}
    return AutoencoderKL.from_pretrained(SD[0], revision=SD[1], subfolder="vae", dtype=dtype, **kw).to(dev).eval()


def load_clip(dev="mps", dtype=torch.float16):
    from transformers import CLIPModel, CLIPProcessor
    m = CLIPModel.from_pretrained(CLIP[0], revision=CLIP[1], dtype=dtype).to(dev).eval()
    return m, CLIPProcessor.from_pretrained(CLIP[0], revision=CLIP[1])


def load_siglip(dev="mps", dtype=torch.float16):
    from transformers import AutoModel, AutoProcessor
    m = AutoModel.from_pretrained(SIGLIP[0], revision=SIGLIP[1], dtype=dtype).to(dev).eval()
    return m, AutoProcessor.from_pretrained(SIGLIP[0], revision=SIGLIP[1])


def load_vlm(dev="mps", dtype=torch.bfloat16):
    from transformers import AutoModelForImageTextToText, AutoProcessor
    m = AutoModelForImageTextToText.from_pretrained(VLM[0], revision=VLM[1], dtype=dtype).to(dev).eval()
    return m, AutoProcessor.from_pretrained(VLM[0], revision=VLM[1])


def test_images(size=None):
    """[(key, PIL image, item dict)] for the 16 colour test images (full size from GM_SCRATCH/test_images)."""
    from PIL import Image
    from common import HERE, scratch
    meta = json.load(open(os.path.join(HERE, "test_images.json")))
    out = []
    for it in meta["items"]:
        im = Image.open(scratch("test_images", it["key"] + ".png")).convert("RGB")
        out.append((it["key"], im.resize((size, size), Image.LANCZOS) if size else im, it))
    return out
