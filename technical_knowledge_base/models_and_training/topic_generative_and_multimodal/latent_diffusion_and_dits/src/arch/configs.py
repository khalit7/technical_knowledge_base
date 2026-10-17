"""The denoisers compared on this page: where each config comes from.

Read from the Hub (pinned files in the root's src/map/inputs/ or this page's src/inputs/), except where the repo is
gated (FLUX.1, SD3): those are rebuilt from public sources and checked against the Hub API's public parameter count.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
MAP = os.path.join(HERE, "..", "..", "..", "src", "map", "inputs")
INP = os.path.join(HERE, "..", "inputs")


def _map(name, key):
    return json.load(open(os.path.join(MAP, name)))[key]


def _inp(name):
    return json.load(open(os.path.join(INP, name)))


# FLUX.1: black-forest-labs/flux src/flux/util.py @802fb4713906 (2025-07-31), configs "flux-dev" and "flux-schnell":
# in_channels 64, vec_in_dim 768, context_in_dim 4096, hidden_size 3072, mlp_ratio 4, num_heads 24, depth 19,
# depth_single_blocks 38, axes_dim [16, 56, 56], theta 10000, qkv_bias True, guidance_embed True (dev) / False (schnell).
# Mapped onto diffusers' FluxTransformer2DModel (head dim 3072 / 24 = 128).
FLUX1 = dict(patch_size=1, in_channels=64, out_channels=None, num_layers=19, num_single_layers=38, attention_head_dim=128,
             num_attention_heads=24, joint_attention_dim=4096, pooled_projection_dim=768, axes_dims_rope=(16, 56, 56))

# SD3 (Esser et al. 2024, arXiv 2403.03206 sec. 4): depth d sets hidden size 64 d, MLP 4 x 64 d, d heads.
# SD3.5 Large is d = 38 with QK RMSNorm; SD3 Medium d = 24. pos_embed_max_size 192 and the 2,048-d pooled vector
# (CLIP-L 768 + CLIP-G 1280) are diffusers' SD3 conversion values; checked against the Hub's public totals below.
def sd3(d, qk_norm):
    return dict(sample_size=128, patch_size=2, in_channels=16, num_layers=d, attention_head_dim=64, num_attention_heads=d,
                joint_attention_dim=4096, caption_projection_dim=64 * d, pooled_projection_dim=2048, out_channels=16,
                pos_embed_max_size=192, qk_norm=qk_norm)


MODELS = [
    # key, label, diffusers class, config, kind, latent channels, VAE factor, patch, text encoder(s), text tokens used
    # Text tokens: the pipeline defaults in diffusers v0.41.0 (SD 1.5 / SDXL 77; PixArt-Sigma and Sana max_sequence_length
    # 300; SD3 77 CLIP + 256 T5 = 333; FLUX.1 and FLUX.2 klein 512, padded to max_length). Qwen-Image pads only to the
    # longest prompt in the batch and Z-Image drops padded positions, so their count is the prompt's own length: 128 assumed.
    ("sd15", "SD 1.5 U-Net", "UNet2DConditionModel", lambda: _map("cfg_stable-diffusion-v1-5__stable-diffusion-v1-5.json", "unet"),
     "unet", 4, 8, None, "CLIP ViT-L/14 text (last layer)", 77),
    ("sdxl", "SDXL U-Net", "UNet2DConditionModel", lambda: _map("cfg_stabilityai__stable-diffusion-xl-base-1.0.json", "unet"),
     "unet", 4, 8, None, "CLIP ViT-L + OpenCLIP bigG (penultimate layers, concatenated) + pooled bigG", 77),
    ("dit", "DiT-XL/2 (class-conditional, ImageNet 256)", "DiTTransformer2DModel", lambda: _inp("cfg_dit_xl2_256_transformer.json"),
     "dit", 4, 8, 2, "none (1,000 ImageNet classes)", 0),
    ("pixart", "PixArt-Sigma XL/2", "PixArtTransformer2DModel", lambda: _map("cfg_PixArt-alpha__PixArt-Sigma-XL-2-1024-MS.json", "transformer"),
     "dit_cross", 4, 8, 2, "T5-XXL encoder", 300),
    ("sana", "Sana 1.6B", "SanaTransformer2DModel", lambda: _map("cfg_Efficient-Large-Model__Sana_1600M_1024px_diffusers.json", "transformer"),
     "dit_cross", 32, 32, 1, "Gemma 2 2B (decoder LLM)", 300),
    ("sd3m", "SD3 Medium MMDiT", "SD3Transformer2DModel", lambda: sd3(24, None),
     "mmdit", 16, 8, 2, "CLIP-L + CLIP-G + T5-XXL", 333),
    ("sd35l", "SD3.5 Large MMDiT", "SD3Transformer2DModel", lambda: sd3(38, "rms_norm"),
     "mmdit", 16, 8, 2, "CLIP-L + CLIP-G + T5-XXL", 333),
    ("flux1", "FLUX.1 [dev]", "FluxTransformer2DModel", lambda: dict(FLUX1, guidance_embeds=True),
     "flux", 16, 8, 2, "T5-XXL (sequence) + CLIP-L (pooled)", 512),
    ("flux2k", "FLUX.2 [klein] 4B", "Flux2Transformer2DModel", lambda: _inp("cfg_flux2_klein_4b_transformer.json"),
     "flux", 32, 8, 2, "Qwen3 4B (decoder LLM)", 512),
    ("qwen", "Qwen-Image MMDiT", "QwenImageTransformer2DModel", lambda: _map("cfg_Qwen__Qwen-Image.json", "transformer"),
     "mmdit", 16, 8, 2, "Qwen2.5-VL 7B (VLM)", 128),
    ("zimg", "Z-Image-Turbo single-stream", "ZImageTransformer2DModel", lambda: _map("cfg_Tongyi-MAI__Z-Image-Turbo.json", "transformer"),
     "single", 16, 8, 2, "Qwen3 4B (decoder LLM)", 128),
]

# Public parameter totals from the Hub API (https://huggingface.co/api/models/<repo>, field safetensors.total, 2026-10-17)
HUB_TOTAL = {
    "flux1": ("black-forest-labs/FLUX.1-dev", 11901408320),
    "flux1_schnell": ("black-forest-labs/FLUX.1-schnell", 11891178560),
    "sd35l": ("stabilityai/stable-diffusion-3.5-large", 8146280768),
    "sd3m": ("stabilityai/stable-diffusion-3-medium-diffusers", 2084951104),
    "flux2k": ("black-forest-labs/FLUX.2-klein-4B", 3875544576),
}
