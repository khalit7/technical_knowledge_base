# VAEs and GANs: Review and Where They Survive

⏱ 6 min read · +6h 40m resources

Last updated: 2026-08-24

## Best resources

- Kingma and Welling, [An Introduction to Variational Autoencoders](https://arxiv.org/abs/1906.02691) (~4h): the authors' own monograph, the definitive VAE reference.
- Lilian Weng, [From Autoencoder to Beta-VAE](https://lilianweng.github.io/posts/2018-08-12-vae/) (~35 min): compact tour of AE, VAE, VQ-VAE and variants.
- Goodfellow et al., [Generative Adversarial Networks](https://arxiv.org/abs/1406.2661) (45 min) and Lilian Weng, [From GAN to WGAN](https://lilianweng.github.io/posts/2017-08-20-gan/) (~35 min): minimax objective, why training is unstable, Wasserstein fix.
- Esser et al., [Taming Transformers (VQGAN)](https://arxiv.org/abs/2012.09841) (45 min): the paper that shows how VAE + GAN loss became the standard image tokenizer/compressor.

## Autoencoders vs VAEs (skimmable review)

**Autoencoder**: encoder compresses input to a low-dimensional latent, decoder
reconstructs it; trained on reconstruction loss alone. Useful for dimensionality
reduction, features, anomaly detection, denoising. **The problem**: the latent space has
no imposed structure, so sampling a random latent and decoding it gives garbage; an AE is
a compressor, not a generator.

**VAE**: the encoder outputs parameters of a distribution (mu, sigma) instead of a point;
the decoder reconstructs from a sample z ~ N(mu, sigma^2). The loss is the negative ELBO:

```
loss = reconstruction_loss + KL( N(mu, sigma) || N(0, I) )
```

The KL term packs the aggregate posterior around a standard normal, so sampling
z ~ N(0, I) and decoding produces coherent outputs. Tension to remember: the KL term
fights reconstruction fidelity, which is why plain VAEs generate blurry images (and why
the field moved on for generation quality).

**Reparameterisation trick**: sampling is not differentiable, so instead of sampling z
directly, sample eps ~ N(0, I) and compute z = mu + sigma * eps. Randomness moves outside
the learnable parameters, gradients flow through mu and sigma, end-to-end backprop works.
This one-line trick is what made VAEs trainable and it shows up anywhere a stochastic
node needs gradients.

**VQ-VAE** (know this one, it aged best): replace the Gaussian latent with a learned
codebook; the encoder output is snapped to the nearest codebook vector, giving discrete
tokens. Trained with straight-through gradients plus codebook/commitment losses. Modern
variants (FSQ, LFQ) simplify the quantiser and avoid codebook collapse.

## GANs (skimmable review)

Goal: learn the data distribution well enough to sample from it. Mechanics:

1. Sample z from a normal distribution.
2. Generator maps z to an image.
3. Discriminator classifies real vs generated (BCE loss).
4. Generator is trained to fool the discriminator: a minimax game,
   min_G max_D [ E log D(x) + E log(1 - D(G(z))) ].

**Failure modes**: **mode collapse** (generator wins by emitting the same few outputs
regardless of z, covering only a sliver of the distribution), vanishing gradients when
the discriminator gets too good, and general training instability from solving a saddle
point problem rather than minimising a loss. Classic mitigations: non-saturating
generator loss, Wasserstein loss with gradient penalty (WGAN-GP), spectral norm, R1
regularisation (StyleGAN). Also remember: no likelihood, so evaluation fell to FID.

**Why GANs lost the generation crown**: diffusion matches their sharpness with stable
training, full mode coverage, and easy conditioning/scaling. StyleGAN2/3 remain
reference points for faces, and GigaGAN showed GANs can scale, but nobody starts a new
frontier image model as a pure GAN.

## Where each survives in 2026

**VAE: the invisible workhorse.**

- The **latent compressor under every latent diffusion model**: SD/FLUX use a
  KL-regularised conv VAE (~8x downsample); video models use causal 3D VAEs compressing
  space and time. VAE quality caps the whole system's fidelity, which is why model
  releases quietly ship retrained VAEs with more channels.
- **Tokenizers for autoregressive generation**: VQ-VAE-style quantisers turn images and
  audio into discrete tokens for AR models (image gen in unified multimodal LLMs, and
  every neural audio codec: EnCodec/Mimi are residual-VQ autoencoders; see
  [speech-and-audio.md](speech-and-audio.md)).
- The ELBO/reparameterisation machinery is also the ancestor of diffusion's own
  variational derivation (DDPM is trained on a bound of the same form).

**GAN: the invisible loss term.**

- **Decoder training**: the SD-family VAE decoder and every VQGAN-style tokenizer are
  trained with reconstruction + perceptual (LPIPS) + **adversarial loss**; the GAN term
  is what makes decoded outputs crisp instead of blurry.
- **Vocoders**: HiFi-GAN, BigVGAN and descendants dominate mel-to-waveform synthesis in
  TTS pipelines; adversarial losses on waveforms are also inside codec training
  (EnCodec's discriminators).
- **Few-step distillation**: adversarial diffusion distillation (SDXL-Turbo, FLUX
  schnell class) uses a discriminator to keep 1-4 step samples sharp.

## Interview-ready summary

VAE = probabilistic autoencoder trained on ELBO, made differentiable by the
reparameterisation trick; blurry as a generator, indispensable as the compressor and
tokenizer under diffusion and AR models. GAN = minimax game between generator and
discriminator; unstable and mode-collapse-prone as a standalone generator, but its
adversarial loss is what sharpens modern decoders, vocoders, and few-step distilled
models.
