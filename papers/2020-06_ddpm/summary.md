# Denoising Diffusion Probabilistic Models (DDPM)

⏱ 9 min read · +~5h 30m resources

- **Authors**: Jonathan Ho, Ajay Jain, Pieter Abbeel (UC Berkeley)
- **Date**: June 2020 (NeurIPS 2020)
- **Links**: [arXiv 2006.11239](https://arxiv.org/abs/2006.11239) (~1h, math-heavy) | [code (TF)](https://github.com/hojonathanho/diffusion) (repo, ~15 min for the README and entry path)

### Best resources

- [Lilian Weng, "What are Diffusion Models?"](https://lilianweng.github.io/posts/2021-07-11-diffusion-models/) (~1h): the canonical walkthrough of the full derivation, from ELBO to L_simple, plus DDIM and guidance follow-ups.
- [Calvin Luo, "Understanding Diffusion Models: A Unified Perspective"](https://arxiv.org/abs/2208.11970) (~1h 30m, tutorial paper): tutorial paper deriving VAE -> hierarchical VAE -> DDPM -> score-based views as one framework; best for making the three equivalent parameterisations (x_0, epsilon, score) click.
- [Hugging Face, "The Annotated Diffusion Model"](https://huggingface.co/blog/annotated-diffusion) (~1h): line-by-line PyTorch implementation of this exact paper, including the U-Net.
- [Yang Song, "Generative Modeling by Estimating Gradients of the Data Distribution"](https://yang-song.net/blog/2021/score/) (~45 min): the score-matching side of the story from the NCSN author; explains why DDPM's objective is denoising score matching in disguise.

### Problem

Diffusion probabilistic models (Sohl-Dickstein et al., 2015) were theoretically elegant latent-variable models but had never produced competitive samples. GANs dominated image synthesis quality but trained unstably and lacked likelihoods; autoregressive models and flows had likelihoods but weaker samples. The open question: can a diffusion model, trained with plain variational inference, actually generate high quality images, and what parameterisation makes that work?

### Method

**Forward (noising) process.** A fixed, parameter-free Markov chain gradually corrupts data x_0 with Gaussian noise over T steps (T = 1000 here) under a variance schedule beta_1..beta_T (linear, 1e-4 to 0.02):

q(x_t | x_{t-1}) = N(x_t; sqrt(1 - beta_t) x_{t-1}, beta_t I)

With alpha_t = 1 - beta_t and alpha-bar_t = prod_{s<=t} alpha_s, the chain collapses to a closed form that lets you jump straight to any timestep:

q(x_t | x_0) = N(x_t; sqrt(alpha-bar_t) x_0, (1 - alpha-bar_t) I), i.e. x_t = sqrt(alpha-bar_t) x_0 + sqrt(1 - alpha-bar_t) epsilon, epsilon ~ N(0, I)

This is what makes training cheap: sample a random t, noise x_0 in one shot, no chain simulation. The schedule is chosen so alpha-bar_T is approximately 0, hence x_T is approximately N(0, I).

**Reverse (generative) process.** A learned Markov chain runs the other way, starting from p(x_T) = N(0, I):

p_theta(x_{t-1} | x_t) = N(x_{t-1}; mu_theta(x_t, t), sigma_t^2 I)

Gaussian transitions are the right functional form because for small beta_t the true reversal of a Gaussian diffusion step is itself approximately Gaussian. DDPM fixes the reverse variances to constants (sigma_t^2 = beta_t or beta-tilde_t; both work) and learns only the mean.

**ELBO and its simplification.** The variational bound on -log p_theta(x_0) decomposes into L_T + sum_t L_{t-1} + L_0, where each L_{t-1} = KL(q(x_{t-1} | x_t, x_0) || p_theta(x_{t-1} | x_t)). The forward posterior q(x_{t-1} | x_t, x_0) is Gaussian with a known mean mu-tilde_t(x_t, x_0), so every KL is a closed-form comparison between Gaussians (low variance, no Monte Carlo over the KLs). L_T is constant (forward process is fixed) and L_0 uses a discretised Gaussian decoder to give exact discrete-pixel likelihoods.

The key move: instead of predicting mu-tilde directly, reparameterise via x_t = sqrt(alpha-bar_t) x_0 + sqrt(1 - alpha-bar_t) epsilon. Algebra on the KL terms shows the network's real job is predicting the noise epsilon that was added, with the mean recovered as

mu_theta(x_t, t) = (1 / sqrt(alpha_t)) (x_t - (beta_t / sqrt(1 - alpha-bar_t)) epsilon_theta(x_t, t))

Each L_{t-1} becomes a weighted MSE between epsilon and epsilon_theta. Dropping the timestep-dependent weights gives the training objective everyone now uses:

L_simple = E_{t, x_0, epsilon} [ || epsilon - epsilon_theta(sqrt(alpha-bar_t) x_0 + sqrt(1 - alpha-bar_t) epsilon, t) ||^2 ], t ~ Uniform(1..T)

This reweighting down-weights small-t terms (nearly clean images, easy denoising) and focuses capacity on large-t terms (hard denoising), which the ablation shows is exactly what sample quality needs. Training is: sample x_0, t, epsilon; one forward pass; MSE; SGD step.

**Connection to score matching and Langevin dynamics.** epsilon_theta(x_t, t) is, up to scale, an estimate of the score: nabla_{x_t} log q(x_t | x_0) = -epsilon / sqrt(1 - alpha-bar_t). So L_simple is denoising score matching over multiple noise scales (Song and Ermon's NCSN objective), and the ancestral sampler

x_{t-1} = (1 / sqrt(alpha_t)) (x_t - ((1 - alpha_t) / sqrt(1 - alpha-bar_t)) epsilon_theta(x_t, t)) + sigma_t z, z ~ N(0, I)

resembles annealed Langevin dynamics with epsilon_theta acting as a learned gradient of the data density. This equivalence (variational inference on a diffusion chain = denoising score matching + Langevin sampling) is the paper's stated core contribution alongside the samples themselves.

**Architecture.** U-Net backbone (PixelCNN++ style) with group normalisation, self-attention at the 16x16 resolution, and the timestep t injected via Transformer sinusoidal embeddings; weights shared across time.

### Results

- **CIFAR-10 unconditional**: FID 3.17 (state of the art at publication, beating most class-conditional models too), Inception Score 9.46, NLL <= 3.70 bits/dim.
- **LSUN 256x256**: Church FID 7.89, Bedroom FID 4.90, comparable to ProgressiveGAN; strong CelebA-HQ 256x256 samples.
- **Ablation (Table 2)**: predicting epsilon with fixed variances trained on L_simple is the winning combination; predicting mu-tilde works only on the true ELBO, and learned diagonal variances destabilise training. The epsilon + L_simple recipe is where FID 3.17 comes from.
- **Rate-distortion analysis**: over half the model's lossless codelength describes imperceptible image detail; sampling acts as progressive decoding (coarse structure first, fine detail last), a generalised bit-ordering view of autoregressive decoding.
- Honest caveats: log likelihoods are not competitive with strong autoregressive models, and sampling needs T = 1000 sequential network evaluations.

### Why it matters

This is the paper that founded the modern diffusion era. It turned a dormant 2015 idea into the dominant generative paradigm by finding the parameterisation that works: fixed forward process, epsilon-prediction, unweighted MSE. Nearly everything since is a direct descendant: improved DDPM and classifier guidance (Dhariwal and Nichol, "beating GANs"), DDIM's deterministic fast sampler, latent diffusion / Stable Diffusion moving the chain into a VAE latent space, Imagen and DALL-E 2 for text-to-image, DiT swapping the U-Net for a Transformer (the backbone behind Sora), and consistency models / flow matching / rectified flow reframing the noise-to-data path for few-step generation. The score-matching connection it made explicit was generalised by Song et al. (2021) into the SDE framework unifying DDPM and NCSN. The training recipe (sample t, add noise, predict it, MSE) has spread far beyond images: audio, video, molecules, robotics policies, and text diffusion.

### Connections

- Latent Diffusion (2021-12): runs this exact DDPM machinery in a compressed VAE latent space, making high-resolution text-to-image (Stable Diffusion) tractable.
- CLIP (2021-02): supplies the text conditioning that later diffusion systems bolt onto the DDPM backbone.
- ViT (2020-10): the DiT line replaces DDPM's U-Net with this Transformer architecture.
- Topics: generative-and-multimodal (diffusion-and-flow), with the ELBO and score-matching math grounded in math.
