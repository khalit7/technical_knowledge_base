# Text Diffusion and World Models

⏱ 7 min read · +3h 2m resources

Last updated: 2026-09-21 (added the September 2026 world-model releases: Solaris, Atlas, GWM Worlds 2)

Two "watch this space" areas from the notes ("research about text diffusion"), treated

honestly: real progress, real limitations.

### Best resources

- Nie et al., [Large Language Diffusion Models (LLaDA)](https://arxiv.org/abs/2502.09992) (45 min): the paper that showed masked diffusion matches AR at 8B scale.
- Inception Labs, [Mercury: Ultra-Fast Language Models Based on Diffusion](https://arxiv.org/abs/2506.17298) (45 min): the commercial diffusion-LM tech report.
- Sander Dieleman, [Diffusion language models](https://sander.ai/2023/01/09/diffusion-language.html) (~35 min): why discrete data makes diffusion hard; still the best conceptual grounding.
- Google DeepMind, [Genie 3: a new frontier for world models](https://deepmind.google/blog/genie-3-a-new-frontier-for-world-models/) (~12 min): the flagship interactive world model.

### Diffusion language models

**Mechanism.** Continuous Gaussian diffusion does not port to discrete tokens, so text

diffusion is mostly **masked discrete diffusion**: the forward process randomly masks

tokens at increasing ratios; the model is trained to predict all masked tokens at once

(a generalised, any-ratio BERT objective). Sampling starts from a fully masked sequence

and iteratively unmasks the most confident positions over K steps, re-editing as it goes.

Key properties: **parallel decoding** (many tokens per forward pass), bidirectional

context**, and natural **infilling.

**State of play (Aug 2026).**

- **Mercury / Mercury 2** (Inception Labs): production coding-oriented models; Mercury 2
  reports ~1,000 tok/s on a single Blackwell GPU, several times faster than

  speed-tier AR models at comparable quality.

- **Gemini Diffusion** (DeepMind, experimental since May 2025): ~1,479 tok/s demos,
  quality near Flash-Lite tier; still not a flagship product.

- **LLaDA line**: LLaDA 8B matched LLaMA-class AR baselines; LLaDA 2.x added block
  diffusion and token editing and sees real open-source adoption.

- Google released the **DiffusionGemma** Technical Report, an experimental open-weight discrete diffusion LM that refines 256-token blocks in parallel and reaches roughly 1,500 output tokens/s on a single H100, well above autoregressive decoding with speculation; trended on HN Aug 20. [arXiv 2608.00146](https://arxiv.org/abs/2608.00146) (45 min)
- **Converged recipe**: initialise from a pretrained AR model and continue-train with
  the diffusion objective (much cheaper than from scratch), and use **block diffusion**

  (semi-autoregressive: generate blocks of ~32 tokens left to right, diffuse within a

  block). Block diffusion matters because it restores KV-cache-style reuse and variable

  length generation.

**Limitations (be honest in interviews).**

- Pure any-order diffusion is incompatible with KV caching, so naive implementations
  waste the parallelism they promise; block diffusion is the workaround, which concedes

  that some left-to-right structure is needed.

- Quality-speed tradeoff: fewer denoising steps means visible quality loss; matching AR
  quality can erode the speed advantage.

- No exact likelihood (trained on a bound), which complicates evaluation, distillation
  pipelines, and some RL recipes; post-training/RL tooling is years behind AR.

- Frontier reasoning still belongs to AR models; diffusion LMs win in the
  latency-sensitive, speed-tier segment (code completion, agent inner loops), not the

  quality frontier.

- Serving stacks (vLLM/SGLang-class maturity) for diffusion LMs are still young.
**Verdict**: a credible speed-tier alternative and a genuinely different sampling

paradigm, not a replacement for AR frontier models as of 2026.

### World models

**Idea.** A model that predicts how an environment evolves given actions: learn the

dynamics, then use the model to act (planning, RL in imagination) or as a simulator

(training data, evaluation, games). Video generation and world modelling have merged:

a video model conditioned on actions with enough consistency *is* a world model.

**Genie lineage (DeepMind).**

- Genie 1 (2024): 11B foundation world model learning latent actions from unlabelled
  gameplay video; playable at 1 fps.

- Genie 2 (Dec 2024): 3D worlds from a single image, up to a minute of consistency,
  not real-time.

- **Genie 3** (Aug 2025, public via Project Genie Jan 2026): text prompt to a navigable
  720p world at 24 fps in real time, consistency for a few minutes, promptable world

  events. Autoregressive frame generation with per-frame reference to its own history

  (memory), no explicit 3D representation (contrast NeRF/Gaussian splatting).

  Waymo built a specialised Waymo World Model on it for driving simulation (Feb 2026).

**The 2026 coordinated push.** Three releases in four days in early September 2026 turned world models into a coordinated industry push, and one of them is pointed at software rather than at physics.

- **Runway Solaris** (Sep 1, 2026) is the first world model aimed at software rather than at physics. It renders a working software interface **frame by frame in real time**, with no code generated underneath: what you interact with is a rolling prediction of what the next frame of that interface should look like given your input, not a program that was written and then executed. That inverts the assumption behind every code-generating tool, which is that the artifact is source. It raises the same question video world models raise, namely what "state" means when there is no state object, only a model conditioned on its own history, except that here the answer has to survive a user clicking things. A pointer rather than a synthesis: no technical report had been published as of September 2026. [Runway](https://runway.com/news/research/introducing-solaris) (5 min), [The Decoder](https://the-decoder.com/runways-solaris-is-an-ai-system-that-generates-software-interfaces-in-real-time/) (6 min)
- **World Labs Atlas** (Sep 1, 2026) pretrains natively on text, image, video and 3D in a shared spatial context. The claim worth testing is that it scales with compute the way language models do rather than plateauing the way earlier video models did; if that holds it is the most consequential of the three. [World Labs](https://www.worldlabs.ai/blog/atlas) (8 min)
- **Runway GWM Worlds 2** (Sep 4, 2026) generates real-time interactive environments at 720p and 24 fps with audio. The reason to track it here rather than as a graphics story is that a real-time interactive environment is a candidate training environment for agents, which is the same shortage [Terminal-Universe: Turning Agent Trajectories into Scalable Terminal Environments](../../papers/2026-09_terminal-universe/summary.md) addresses from the trajectory side. [Runway](https://runway.com/research/introducing-gwm-worlds-2) (5 min)
**Other threads.**

- **Video prediction as world model**: the claim behind Sora-class models ("video
  generation as world simulation"); NVIDIA **Cosmos** ships open world foundation models

  for robotics/AV simulation; interactive game worlds (Genie, Odyssey, Mirage,

  DeepMind/World Labs efforts) are becoming a product category.

- **Latent world models for control**: the Dreamer line (RL in imagination) and
  **V-JEPA 2** (Meta): predict in representation space rather than pixels; LeCun's

  argument that pixel-level generation wastes capacity on irrelevant detail.

- **Why it matters**: world models are the leading answer to the data wall for robotics
  and agents (unlimited interactive training environments), and the sharpest test of

  whether generative models learn physics rather than texture. Known gaps: physical

  consistency errors, minutes-scale memory, narrow action spaces.

### Interview-ready summary

Text diffusion = masked discrete diffusion, sampled by iterative parallel unmasking;

2026 recipe is AR-initialised block diffusion (Mercury, LLaDA 2, Gemini Diffusion),

winning on speed (1000+ tok/s), losing on frontier reasoning and ecosystem maturity.

World models = action-conditioned video generation (Genie 3: real-time 720p interactive

worlds) or latent prediction (Dreamer, V-JEPA 2); merging with video gen and central to

robotics/agent training data.
