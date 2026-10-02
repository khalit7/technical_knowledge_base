"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # header and links
 ('Reading time line "9 min read, +~3h 50m resources"', 'dropped: replaced by the build-computed reading time and resources total', ['min to read', 'of resources']),
 ('Authors: Rombach, Blattmann, Lorenz, Esser, Ommer (CompVis, LMU Munich and IWR Heidelberg; Runway ML)', R + ', headline card', ['Robin Rombach, Andreas Blattmann, Dominik Lorenz, Patrick Esser, Björn Ommer', 'Ludwig Maximilian University of Munich', 'Runway ML']),
 ('Date: December 2021 (CVPR 2022)', R + ', headline card', ['CVPR 2022', 'December 2021']),
 ('Link arXiv 2112.10752 (~45 min)', 'card and Further reading', ['https://arxiv.org/abs/2112.10752', '(45 min)']),
 ('Link code CompVis/latent-diffusion (~20 min for the README and entry path)', 'card and Further reading (licence noted)', ['https://github.com/CompVis/latent-diffusion', 'about 20 minutes for the README and entry path']),
 ('Link Stable Diffusion repo (~15 min for the README)', 'Further reading (code note); Why it matters', ['CompVis/stable-diffusion (about 15 minutes for the README)', 'https://github.com/CompVis/stable-diffusion']),
 # resources
 ('Jay Alammar, The Illustrated Stable Diffusion (~25 min): best visual walkthrough; first read', 'Further reading', ['https://jalammar.github.io/illustrated-stable-diffusion/', 'a good first read before the paper', '(25 min)']),
 ('labml.ai annotated SD implementation (~1h): autoencoder, cross-attention UNet, samplers', 'Further reading', ['https://nn.labml.ai/diffusion/stable_diffusion/index.html', 'including the autoencoder, the cross-attention UNet and the samplers']),
 ('Hugging Face, Stable Diffusion with Diffusers (~30 min): VAE, UNet, scheduler, CLIP text encoder', 'Further reading', ['https://huggingface.co/blog/stable_diffusion', '(VAE, UNet, scheduler, CLIP text encoder)']),
 ('Sander Dieleman, Generative modelling in latent space (~35 min)', 'Further reading', ['https://sander.ai/2025/04/15/latents.html', 'how autoencoder design trades reconstruction against modelability']),
 # problem
 ('Pixel-space diffusion SOTA but expensive: 150-1000 V100 days', R + ', Problem', ['150 - 1000 V100 days']),
 ('Hundreds of sequential UNet evaluations; 50k samples in about 5 days on an A100', R + ', Problem (recomputed from Table 18)', ['25 - 1000 steps', 'producing 50k samples takes approximately 5 days on a single A100']),
 ('Root cause: likelihood training spends capacity on imperceptible high-frequency detail', R + ', Problem', ['modeling imperceptible details']),
 ('Rate-distortion analysis: most bits encode perceptual minutiae; semantics cost few bits', R + ', Problem (Figure 2; DDPM page link)', ['most bits of an image encode details you cannot see', 'perceptual compression', 'semantic compression']),
 ('Prior two-stage work (VQ-VAE-2, VQGAN + AR transformer, DALL-E) compressed hard into 1D tokens, losing detail and 2D structure', R + ', Problem and Stage 1', ['VQ-VAE-2, VQGAN with a transformer, DALL-E', 'an arbitrary 1D ordering']),
 ('The gap: skip imperceptible bits, keep fidelity, affordable compute', R + ', Problem', ['can a diffusion model skip the imperceptible bits, keep the fidelity']),
 # method
 ('Two independently trained stages: perceptual compression, then semantic generation', R + ', Idea', ['Separate the two kinds of compression']),
 ('Encoder E: x (H x W x 3) to z (h x w x c), f = H/h = 2^m; decoder D', R + ', Stage 1', ['The autoencoder follows VQGAN', 'downsampling factor is']),
 ('Perceptual (LPIPS) loss plus patch adversarial loss (VQGAN recipe), not plain L1/L2: stays on the image manifold', R + ', Stage 1, Eq. 25', ['perceptual loss (LPIPS) plus a patch-based adversarial loss', 'confined to the image manifold']),
 ('KL-reg: very small KL penalty toward N(0, I), barely regularised VAE', R + ', Stage 1', ['barely regularised VAE', 'kl_weight: 0.000001']),
 ('VQ-reg: vector-quantisation layer absorbed into the decoder', R + ', Stage 1', ['absorbed by the decoder']),
 ('Mild compression f = 4-8 (e.g. 512x512x3 to 64x64x4 for f = 8), latent keeps 2D layout', R + ', Idea and Stage 1', ['Stable Diffusion\'s 512 × 512 × 3 image is a 64 × 64 × 4 latent', 'The latent keeps its 2-D layout']),
 ('Autoencoder trained once and reused for every downstream model', R + ', Stage 1', ['trained only once']),
 ('Stage 2: standard DDPM machinery on z; time-conditional UNet; L_LDM noise-prediction MSE', R + ', Stage 2, Eq. 1 and 2', ['Equation 2', 'is a time-conditional UNet']),
 ('z_t from E cheaply during training; chain in latent space; single decoder pass', R + ', Stage 2', ['can be efficiently obtained from ℰ during training', 'single pass through 𝒟']),
 ('Why cheap: f^2 fewer spatial positions (16-64x) per step, 2D inductive bias kept', R + ', Stage 2; Idea animation; predict 1', ['fewer spatial positions (16 times for f = 4, 64 for f = 8)']),
 ('Ablation over f in {1,2,4,8,16,32}: f=1-2 slow, f=32 caps quality, f=4-8 sweet spot', R + ', How much compression', ['f ∈ {1, 2, 4, 8, 16, 32}', 'result in slow training progress', 'stagnating fidelity']),
 ('FID gap of 38 versus pixel diffusion after 2M steps of class-conditional ImageNet at equal compute (corrected: between LDM-1 and LDM-8)', R + ', How much compression', ['a significant FID gap of 38 between pixel-based diffusion (LDM-1) and LDM-8 after 2M training steps']),
 ('All main models train on a single A100 (corrected: except inpainting, eight V100; text model compute unreported)', R + ', How much compression; Tables tab checks', ['a single NVIDIA A100 for all experiments in this section', 'eight V100']),
 ('Cross-attention conditioning: tau_theta maps y to R^{M x d}; Q from UNet features, K/V from tau(y)', R + ', Conditioning', ['cross-attention layers inside the UNet', 'queries come from the image, keys and values from the condition']),
 ('epsilon_theta and tau_theta trained jointly', R + ', Conditioning, Eq. 3', ['are trained jointly']),
 ('For text, tau_theta is a transformer over BERT tokens', R + ', Conditioning', ['BERT-tokenised prompts']),
 ('Dense conditions (SR, inpainting, semantic synthesis) concatenated channel-wise', R + ', Conditioning', ['concatenated to the UNet input channel-wise']),
 ('Convolutional: trained at 256^2, generalises to about 1024^2', R + ', Conditioning', ['about 1,024²']),
 # results
 ('Unconditional: SOTA FID 5.11 CelebA-HQ 256, beating GANs and likelihood models', R + ', Results', ['new state-of-the-art FID of 5.11 on CelebA-HQ']),
 ('Competitive on FFHQ, LSUN-Churches, LSUN-Bedrooms; better precision/recall than GANs', R + ', Results (with the leaders named)', ['competitive but not first on FFHQ', 'Precision and recall']),
 ('Text-to-image: 1.45B KL-reg LDM on LAION-400M, FID 12.63 with classifier-free guidance, on par with GLIDE (5B, corrected: Table 2 says 6B) and Make-A-Scene (4B)', R + ', Results; predict 2', ['1.45B-parameter KL-reg. LDM-8 trained on LAION-400M', '12.63', 'Table 2 lists GLIDE at 6B', 'Make-A-Scene']),
 ('This model is the direct ancestor of Stable Diffusion', R + ', Results', ['This model is the direct ancestor of Stable Diffusion']),
 ('Class-conditional ImageNet: FID 3.60 with guidance, beating ADM with fewer parameters and less compute', R + ', Results; predict 3', ['FID 3.60 with guidance', '271 V100-days against 962']),
 ('Efficiency: at least 2.7x throughput, at least 1.6x better FID vs matched pixel model (corrected: inpainting only; 1.55x for one row)', R + ', Results; Tables tab', ['a speed-up of at least 2.7×', 'but is 1.55× for the attention-free one']),
 ('Super-resolution competitive with SR3 (better FID; user study, corrected: against the pixel baseline)', R + ', Results', ['FID 2.8 against SR3\'s 5.2', 'The user study is against the paper\'s own pixel-space baseline, not SR3']),
 ('Inpainting SOTA on Places, FID 1.50 on 512 test crops, beating LaMa', R + ', Results', ['FID 1.50 on 512² test crops', 'LaMa\'s 2.21']),
 ('Semantic-map-to-image generalises to megapixel landscapes', R + ', Results', ['semantic synthesis generalises convolutionally to megapixel landscapes']),
 ('Caveats: sampling sequential and slower than GANs; autoencoder bottlenecks pixel-exact tasks', R + ', Limitations', ['slower than that of GANs', 'can become a bottleneck for tasks that require fine-grained accuracy in pixel space']),
 # why it matters
 ('Became Stable Diffusion (Aug 2022): f=8 KL AE, cross-attention UNet, 512 on LAION, frozen CLIP text encoder; open weights', R + ', Why it matters (SD README and config)', ['a frozen CLIP ViT-L/14 text encoder', 'August 22, 2022', 'downsampling-factor 8 autoencoder']),
 ('Paradigm: generate in a compressed latent, decoder handles the last octave of detail', R + ', Why it matters', ['let a cheap decoder handle the last octave of detail']),
 ('SD 1.x/2.x and SDXL kept the latent UNet', R + ', Why it matters; Then and now', ['SD 2 and SDXL kept the latent UNet']),
 ('SD3 and FLUX: rectified flow and MM-DiT but still a VAE latent', R + ', Why it matters; Then and now', ['https://arxiv.org/abs/2403.03206', '12 billion parameter rectified flow transformer']),
 ('DiT (behind Sora) developed on ImageNet LDM latents', R + ', Why it matters; Then and now', ['an off-the-shelf pre-trained variational autoencoder (VAE) model from Stable Diffusion']),
 ('Video (Sora, Veo, SVD), audio (AudioLDM, Stable Audio), 3D and molecules run latent diffusion (Veo, 3D and molecules marked unconfirmed)', R + ', Why it matters', ['trained on and subsequently generates videos within this compressed latent space', 'https://arxiv.org/abs/2311.15127', 'https://arxiv.org/abs/2301.12503', 'https://arxiv.org/abs/2402.04825', 'not checked against a source here (unconfirmed)']),
 ('Cross-attention became the standard plug: ControlNet, IP-Adapter', R + ', Why it matters', ['https://arxiv.org/abs/2302.05543', 'decoupled cross-attention mechanism']),
 ('Democratised: hundreds of V100 days to a single A100, finetunable by hobbyists', R + ', Why it matters', ['hobbyists fine-tune Stable Diffusion']),
 # connections
 ('DDPM (2020-06): objective and eps-UNet; LDM changes where the chain runs', 'Connections; Further reading', ['3c65c17b0d0d811481e4e36333454f7a', 'LDM changes only where the chain runs']),
 ('CLIP (2021-02): SD swapped in CLIP text encoder as tau', 'Connections; Further reading', ['3c65c17b0d0d8194a85dfc5f3bf3f799', "Stable Diffusion swapped in CLIP's frozen text encoder"]),
 ('ViT (2020-10): DiT successors replace the UNet with a transformer', 'Connections; Further reading', ['3c65c17b0d0d811fa231cfcde6c1954d', "replace LDM's UNet with a Transformer while keeping its latent space"]),
 ('Attention Is All You Need (2017-06): cross-attention is encoder-decoder attention in a UNet', 'Connections; Further reading', ['3c65c17b0d0d81999af7f16f8ed8ee9e', "encoder-decoder attention grafted into a UNet"]),
 ('Topics: generative-and-multimodal (diffusion, VAE, text-to-image)', 'Connections; Further reading', ['3c65c17b0d0d817ab6ade318917bff55']),
 ('Database property Takeaway', 'stays in the database; also on the headline card', ['Runs DDPM in a mildly compressed autoencoder latent space']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
