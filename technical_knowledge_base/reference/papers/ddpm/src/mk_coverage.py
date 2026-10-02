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
 # header
 ('Reading time line "9 min read, +~5h 30m resources"', 'dropped: replaced by the build-computed reading time and resources total of the new page', ['min to read', 'of resources']),
 ('Authors: Jonathan Ho, Ajay Jain, Pieter Abbeel (UC Berkeley)', R + ', headline card', ['Jonathan Ho, Ajay Jain, Pieter Abbeel', 'UC Berkeley']),
 ('Date: June 2020 (NeurIPS 2020)', R + ', headline card', ['NeurIPS 2020', 'June 2020']),
 ('Link arXiv 2006.11239 (~1h, math-heavy)', 'card and Further reading', ['https://arxiv.org/abs/2006.11239', '(1h)']),
 ('Link code (TF) hojonathanho/diffusion (repo, ~15 min for the README and entry path)', 'card and Further reading (licence noted)', ['https://github.com/hojonathanho/diffusion', 'about 15 minutes for the README and entry path', 'TensorFlow']),
 # resources
 ('Lilian Weng, What are Diffusion Models? (~1h): derivation from ELBO to L_simple, DDIM and guidance', 'Further reading, Best resources', ['https://lilianweng.github.io/posts/2021-07-11-diffusion-models/', 'from ELBO to L_simple, plus DDIM and guidance follow-ups']),
 ('Calvin Luo, Understanding Diffusion Models (~1h 30m): VAE to HVAE to DDPM to score; three parameterisations', 'Further reading, Best resources', ['https://arxiv.org/abs/2208.11970', 'three equivalent parameterisations (x_0, epsilon, score)', '(1h 30m)']),
 ('Hugging Face, The Annotated Diffusion Model (~1h): line-by-line PyTorch incl. U-Net', 'Further reading, Best resources', ['https://huggingface.co/blog/annotated-diffusion', 'line-by-line PyTorch implementation of this exact paper, including the U-Net']),
 ('Yang Song, Generative Modeling by Estimating Gradients (~45 min): DDPM objective is DSM in disguise', 'Further reading, Best resources', ['https://yang-song.net/blog/2021/score/', 'denoising score matching in disguise', '(45 min)']),
 # problem
 ('Diffusion models (Sohl-Dickstein 2015) elegant but had never produced competitive samples', R + ', Problem', ['https://arxiv.org/abs/1503.03585', 'there has been no demonstration that they are capable of generating high quality samples']),
 ('GANs dominated sample quality but trained unstably and lacked likelihoods', R + ', Problem (sourced to Table 1 and the ADA abstract)', ['GANs had the best samples but no likelihood', 'causing training to diverge']),
 ('Autoregressive models and flows had likelihoods but weaker samples', R + ', Problem (Table 1 numbers)', ['Autoregressive models and flows had likelihoods but weaker samples']),
 ('The open question: can a diffusion model trained with plain VI generate high quality images, and what parameterisation makes it work?', R + ', Problem', ['can a diffusion model, trained with plain variational inference, actually generate high-quality images, and what parameterisation makes that work?']),
 # forward
 ('Forward process: fixed, parameter-free Markov chain, T = 1000, linear beta 1e-4 to 0.02', R + ', Forward process', ['The forward or diffusion process is a fixed Markov chain', 'T = 1,000', 'linear from 10']),
 ('q(x_t | x_{t-1}) = N(sqrt(1 - beta_t) x_{t-1}, beta_t I)', R + ', Forward process, Eq. 2', ['Equation 2']),
 ('alpha_t, alpha-bar_t; q(x_t | x_0) closed form; x_t = sqrt(abar) x_0 + sqrt(1 - abar) eps', R + ', Forward process, Eq. 4; the animation and the t slider', ['the chain collapses to a closed form, so any timestep can be reached in one jump', 'Equation 4']),
 ('Makes training cheap: random t, noise x_0 in one shot, no chain simulation', R + ', Forward process', ['Training is therefore cheap: pick a random t and noise x 0 in one shot']),
 ('Schedule chosen so alpha-bar_T ~ 0, x_T ~ N(0, I)', R + ', Forward process; recomputed L_T', ['so x T ≈ 𝒩(0, I )', 'Recomputed: L T ≈ 10']),
 # reverse
 ('Reverse process: learned chain from p(x_T) = N(0, I); p_theta(x_{t-1}|x_t) = N(mu_theta, sigma_t^2 I)', R + ', Reverse process, Eq. 1', ['The reverse process is a Markov chain with learned Gaussian transitions', 'Equation 1']),
 ('Gaussian transitions right because for small beta the true reversal is approximately Gaussian', R + ', Idea', ['When each forward step is small, its true reversal is close to Gaussian']),
 ('Reverse variances fixed (beta_t or beta-tilde_t, both work); only the mean learned', R + ', Reverse process', ['The variances are fixed.', 'both … had similar results']),
 # elbo
 ('ELBO decomposes into L_T + sum L_{t-1} + L_0 with L_{t-1} = KL(q(x_{t-1}|x_t,x_0) || p_theta)', R + ', Reverse process, Eq. 5', ['Equation 5']),
 ('Forward posterior Gaussian with known mean mu-tilde; KLs closed form, low variance, no Monte Carlo', R + ', Reverse process, Eq. 6 and 7', ['Equations 6 and 7', 'Rao-Blackwellized']),
 ('L_T constant (forward fixed); L_0 discretised Gaussian decoder gives exact discrete likelihoods', R + ', Forward process (L_T), Training (decoder, Eq. 13)', ['L T a constant', 'so the bound is a lossless codelength']),
 # eps
 ('Key move: reparameterise; network predicts eps; mu_theta = (1/sqrt(alpha_t))(x_t - beta_t/sqrt(1-abar_t) eps_theta)', R + ', Predict the noise, Eq. 11', ['Equation 11', 'a network ε θ predicts it']),
 ('Each L_{t-1} becomes a weighted MSE between eps and eps_theta', R + ', Predict the noise, Eq. 12', ['Then each term of the bound is a weighted MSE on the noise']),
 ('L_simple = E ||eps - eps_theta(...)||^2, t ~ Uniform(1..T)', R + ', L_simple, Eq. 14', ['Equation 14', 'Uniform{1, …, T }']),
 ('Reweighting down-weights small-t terms, focuses on large-t (hard denoising); the ablation shows this is what sample quality needs', R + ', L_simple predict question and its weight chart', ['down-weight[s] loss terms corresponding to small t', 'focus on more difficult denoising tasks at larger t', 'The ablation below shows this reweighting is exactly what sample quality needs']),
 ('Training: sample x_0, t, eps; one forward pass; MSE; SGD step', R + ', Training and sampling (Algorithm 1)', ['Algorithm 1: training', 'Training is one forward pass and one MSE per example']),
 # score
 ('eps_theta is up to scale the score: grad log q(x_t|x_0) = -eps/sqrt(1-abar_t)', R + ', Predict the noise (marked as a derivation); Sample tab score field', ['so ε θ is a scaled score estimate', 'The learned score, drawn']),
 ('L_simple is denoising score matching over multiple noise scales (NCSN)', R + ', Predict the noise', ['resembles denoising score matching over multiple noise scales', 'https://arxiv.org/abs/1907.05600']),
 ('Ancestral sampler x_{t-1} = ... + sigma_t z resembles annealed Langevin dynamics, eps_theta a learned gradient of the data density', R + ', Predict the noise; Algorithm 2', ['resembles Langevin dynamics with ε θ as a learned gradient of the data density', 'Algorithm 2: sampling']),
 ('Equivalence (VI on a diffusion chain = DSM + Langevin) is the stated core contribution with the samples', R + ', Idea and Predict the noise', ['one of our primary contributions', 'denoising score matching here is variational inference on a sampling chain']),
 # architecture
 ('Architecture: U-Net (PixelCNN++ style), group norm, self-attention at 16x16, t via Transformer sinusoidal embeddings, weights shared across time', R + ', Training (details block); Then and now card', ['a U-Net like an unmasked PixelCNN++', 'group normalisation', 'self-attention at 16 × 16', 'Parameters are shared across time', 'sinusoidal position embedding']),
 # results
 ('CIFAR-10 unconditional FID 3.17 (SOTA at publication, beating most class-conditional models), IS 9.46', R + ', headline card and Results; Tables tab', ['FID 3.17 and Inception Score 9.46', 'including class conditional models']),
 ('NLL <= 3.70 bits/dim (corrected: 3.70 is the true-bound model; the FID 3.17 model has 3.75)', R + ', Results (both values, with which model each belongs to)', ['≤ 3.75 bits per dimension (train 3.72) for the L simple model', 'the model trained on the true bound gets the better ≤ 3.70 (3.69) but an FID of only 13.51']),
 ('LSUN 256: Church FID 7.89, Bedroom FID 4.90, comparable to ProgressiveGAN; CelebA-HQ 256 samples', R + ', Results; Tables tab (Bedroom 4.90 is the larger model, 6.36 the standard one)', ['Church FID 7.89', '4.90 with the larger one', 'comparable to ProgressiveGAN', 'CelebA-HQ 256 × 256 has samples']),
 ('Ablation Table 2: eps + fixed variances + L_simple wins; mu-tilde works only on the true ELBO; learned diagonal variances destabilise', R + ', Ablation (table, predict question, toy reproduction); Tables tab', ['μ̃ works only on the true bound', 'learned variances are unstable', 'the recipe behind the headline']),
 ('Rate-distortion: over half the codelength describes imperceptible detail; sampling as progressive decoding, coarse first', R + ', Progressive coding; Figure 5 rebuilt from Table 4', ['more than half … describes imperceptible distortions', 'large-scale features appear first and details last']),
 ('Generalised bit-ordering view of autoregressive decoding', R + ', Progressive coding (details block)', ['a kind of autoregressive model with a generalized bit ordering that cannot be expressed by reordering data coordinates']),
 ('Caveats: likelihoods not competitive with strong AR models; sampling needs T = 1000 sequential evaluations', R + ', Results: Honest caveats; How much to believe', ['log likelihoods are not competitive with strong autoregressive models', 'sampling needs T = 1,000 sequential network evaluations']),
 # why it matters
 ('Founded the modern diffusion era; turned a dormant 2015 idea into the dominant paradigm: fixed forward, eps-prediction, unweighted MSE', R + ', Why it matters', ['turned a dormant 2015 idea into the dominant generative paradigm by finding the parameterisation that works']),
 ('Descendants: improved DDPM, classifier guidance (beating GANs), DDIM', R + ', Why it matters; Then and now', ['https://arxiv.org/abs/2102.09672', 'https://arxiv.org/abs/2105.05233', 'https://arxiv.org/abs/2010.02502']),
 ('Latent diffusion / Stable Diffusion; Imagen and DALL-E 2', R + ', Why it matters; Then and now', ['3c65c17b0d0d81bb98adc0daf8462cb6', 'https://arxiv.org/abs/2205.11487', 'https://arxiv.org/abs/2204.06125']),
 ('DiT swaps the U-Net for a Transformer (backbone behind Sora)', R + ', Why it matters (Sora sourced to its archived report); Then and now', ['https://arxiv.org/abs/2212.09748', 'scale effectively as video models as well']),
 ('Consistency models, flow matching, rectified flow for few-step generation', R + ', Why it matters; Then and now', ['https://arxiv.org/abs/2303.01469', 'https://arxiv.org/abs/2210.02747', 'https://arxiv.org/abs/2209.03003']),
 ('Score-matching connection generalised by Song et al. 2021 into the SDE framework unifying DDPM and NCSN', R + ', Why it matters; Then and now', ['https://arxiv.org/abs/2011.13456', 'the SDE framework that unifies DDPM and NCSN']),
 ('Recipe spread beyond images: audio, video, molecules, robotics policies, text diffusion', R + ', Why it matters (each with a source)', ['https://arxiv.org/abs/2009.00713', 'https://arxiv.org/abs/2204.03458', 'https://arxiv.org/abs/2203.17003', 'https://arxiv.org/abs/2303.04137', 'https://arxiv.org/abs/2205.14217']),
 # connections
 ('Latent Diffusion (2021-12): DDPM machinery in a VAE latent space, making high-resolution text-to-image tractable', 'Connections; Further reading', ['Latent Diffusion (2021-12)', 'runs this exact DDPM machinery in a compressed VAE latent space']),
 ('CLIP (2021-02): text conditioning bolted onto the DDPM backbone', 'Connections; Further reading', ['3c65c17b0d0d8194a85dfc5f3bf3f799', 'supplies the text conditioning that later diffusion systems bolt onto the DDPM backbone']),
 ('ViT (2020-10): DiT replaces the U-Net with this Transformer', 'Connections; Further reading; Then and now', ['3c65c17b0d0d811fa231cfcde6c1954d', "the DiT line replaces DDPM's U-Net with this Transformer architecture"]),
 ('Topics: generative-and-multimodal (diffusion-and-flow); ELBO and score-matching math in math', 'Connections; Further reading, Topics', ['3c65c17b0d0d817ab6ade318917bff55', '3c65c17b0d0d81cdb851c0835b25a538']),
 ('Database property Takeaway', 'stays in the database; also shown in the headline card', ['Reparameterising the diffusion ELBO as noise prediction']),
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
