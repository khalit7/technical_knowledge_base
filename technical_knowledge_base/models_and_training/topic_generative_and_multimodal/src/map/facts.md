# Model map: verified facts (checked 2026-10-17)

Copied to the shared FACTS.md under "## map". Every row of the tab has its own sources in models_a.py to models_c.py; these are the facts other tabs are most likely to quote.

## Releases and status
- Stable Diffusion 1.5: original page huggingface.co/runwayml/stable-diffusion-v1-5 first captured by the Wayback Machine 2022-10-20 (https://web.archive.org/web/20221020153112/https://huggingface.co/runwayml/stable-diffusion-v1-5). The runwayml repo is gone; the HF API redirects to stable-diffusion-v1-5/stable-diffusion-v1-5 (repo created 2024-08-30). Licence CreativeML OpenRAIL-M.
- Stable Diffusion 2.1: first Wayback capture 2022-12-07; stabilityai/stable-diffusion-2-1 (and -2, -2-1-base) return HTTP 401 from the HF API on 2026-10-17 (removed or private); community re-upload sd2-community/stable-diffusion-2-1 (2025-11-15).
- SDXL base 1.0: HF repo created 2023-07-25, openrail++, U-Net 2.567B parameters, text encoders 0.123B + 0.695B (safetensors headers).
- SD 3.5 Large: HF repo 2024-10-22, Stability AI Community License (free under US$1M annual revenue: https://stability.ai/community-license-agreement), 8.15B in HF safetensors metadata.
- FLUX.1 [dev] and [schnell]: HF repos 2024-07-31; dev: flux-1-dev-non-commercial-license; schnell: Apache 2.0.
- FLUX.2 [dev]: HF repo 2025-11-22, flux-non-commercial-license, 32.2B (HF metadata). Text encoder: Mistral Small 3 (file names in Comfy-Org/flux2-dev).
- FLUX.2 [klein] 4B: Apache 2.0 (repo 2026-01-14); 9B: flux-non-commercial-license (repo 2026-03-09).
- FLUX 3: announced 2026-07-23 by BFL as one multimodal flow-matching model (images, video, audio); early access via API and private weights; open "FLUX 3 Dev" planned, no date (https://bfl.ai/blog/flux-3). FLUX 3 Video public 2026-08-04 (BFL blog index).
- FLUX 3 Image Klein: 2026-10-15, 5.6B excluding text encoders, open weights under the FLUX Kommunity License (free commercial use under US$5M annual revenue), 50-step base and 16-step distilled; "ranks first" claims are BFL internal evaluations (https://bfl.ai/blog/flux-3-image-klein). Vendor claim.
- Qwen-Image: Apache 2.0, HF repo 2025-08-02, MMDiT 20.43B + Qwen2.5-VL text encoder 8.29B (safetensors headers), FlowMatchEulerDiscreteScheduler.
- Qwen-Image-2.1: Qwen Research License (non-commercial), licence release date 2026-09-20; 7B visual generation component, 32 single-stream DiT layers (card); Qwen3-VL conditioning encoder (model_index.json).
- Z-Image-Turbo: Apache 2.0, HF repo 2025-11-25; transformer 6.155B, Qwen3 text encoder 4.022B, VAE 16 channels (scaling 0.3611, shift 0.1159). Z-Image base repo 2026-01-23.
- Ideogram 4: open weights under ideogram-4-non-commercial (HF licence name); release 2026-06-03 per secondary reports.
- GPT Image: GPT-4o image generation 2025-03-25, gpt-image-1 API 2025-04-23, 1.5 on 2025-12-16, 2 in April 2026, 2.5 dated 2026-09-08 by Wikipedia while it cites an OpenAI post dated 2026-10-05 (secondary, unreconciled).
- Gemini image: Gemini 2.5 Flash Image ("Nano Banana") 2025-08-26; Nano Banana 2 = Gemini 3.1 Flash Image, 2026-02-26 (secondary).
- Sora: OpenAI announced discontinuation 2026-03-24; app and web ended 2026-04-26; API scheduled to end 2026-09-24 (secondary reports; OpenAI help page returned 403 here).
- Veo: DeepMind's Veo page lists Veo 3.1 as the leading model ("last updated October 2025"); no Veo 4 announcement found.
- Wan 2.1 (2025-02-25) and Wan 2.2 (2025-07-24): Apache 2.0, flow_prediction in the diffusers scheduler configs.
- HunyuanVideo and all Tencent Hunyuan licences: "does not apply in the European Union, United Kingdom and South Korea".
- LTX-2.x Community License (2026-08-11): entities with annual revenue of at least US$10,000,000 need a paid licence.
- CogVideoX-5b licence: free commercial use after registration up to 1 million visits per month; CogVideoX-2b Apache 2.0.
- Stable Audio 3: announced 2026-05-20; Small, Small SFX, Medium open under the Stable Audio Community License; 2.7B Large API-only (secondary for the Large).
- Llama 4: announced 2025-04-05, "native multimodality, incorporating early fusion"; Scout 17B active / 109B total, Maverick 17B active / 400B total (Meta blog); licence requires a separate licence above 700 million monthly active users; use policy withholds multimodal rights from EU-domiciled individuals and companies (same clause in Llama 3.2).
- Gemma 4: Apache 2.0; sizes E2B, E4B, 12B (Unified, encoder-free), 26B A4B, 31B; audio on E2B, E4B and 12B; 280 default image soft tokens (configs); technical report arXiv 2607.02770 (2026-07-02).
- Qwen3.8-27B (repo 2026-08-05): Apache 2.0, "a native vision-language model"; built on Qwen3.5; no separate VL line.
- DINOv3: own licence (royalty-free; bans military and weapons uses; gated). DINOv2: Apache 2.0.
- GPT-4o system card abstract: "an autoregressive omni model"; "trained end-to-end across text, vision, and audio, meaning all inputs and outputs are processed by the same neural network" (arXiv 2410.21276).

## Pipeline configs (text-to-image stack, read 2026-10-17)
| Pipeline | Text encoder (params) | VAE | Denoiser (params) | Objective / scheduler | Tokens at 1024 px | All weights bf16 |
|---|---|---|---|---|---|---|
| SD 1.5 | CLIPTextModel 0.123B | 4 ch, 8x, scale 0.18215 (diffusers default, not in config) | UNet 0.860B | eps, PNDM | n/a (U-Net) | 2.1 GB |
| SDXL | CLIP + CLIP-bigG 0.818B | 4 ch, 8x, 0.13025 | UNet 2.567B | eps, EulerDiscrete | n/a | 6.9 GB |
| PixArt-Sigma | T5-XXL encoder 4.762B | 4 ch, 8x, 0.13025 | DiT 0.611B | eps, DPMSolver | 4,096 | 10.9 GB |
| Sana 1.6B | Gemma 2 2.614B | DC-AE 32 ch, 32x, 0.41407 | 1.604B | flow_prediction, DPMSolver | 1,024 | 9.1 GB |
| Qwen-Image | Qwen2.5-VL 8.292B | 16 ch, 8x, per-channel mean/std | MMDiT 20.43B | FlowMatchEuler | 4,096 | 57.7 GB |
| Z-Image-Turbo | Qwen3 4.022B | 16 ch, 8x, 0.3611 / shift 0.1159 | 6.155B | FlowMatchEuler shift 3 | 4,096 | 20.5 GB |

## Libraries
- diffusers v0.41.0 (2026-10-06), Apache 2.0; AutoencoderKL scaling_factor default 0.18215 (src/diffusers/models/autoencoders/autoencoder_kl.py line 90 at v0.41.0).
- transformers v5.20.1 (2026-10-16), Apache 2.0.
- ComfyUI v0.41.0 (2026-10-15), GPL-3.0, repo now Comfy-Org/ComfyUI.
- open_clip v3.3.0 (2026-02-27), MIT text (GitHub reports "Other").
- timm v1.0.30 (2026-09-22), Apache 2.0.
