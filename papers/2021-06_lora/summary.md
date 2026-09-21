# LoRA: Low-Rank Adaptation of Large Language Models

⏱ 9 min read · +~3h 20m resources

- **Authors**: Edward J. Hu*, Yelong Shen*, Phillip Wallis, Zeyuan Allen-Zhu, Yuanzhi Li, Shean Wang, Lu Wang, Weizhu Chen (Microsoft)
- **Date**: June 2021 (arXiv v1; v2 October 2021; ICLR 2022)
- **Links**: [arXiv:2106.09685](https://arxiv.org/abs/2106.09685) (~45 min) | [code](https://github.com/microsoft/LoRA) (`loralib`) (repo, ~15 min for the README)

### Best resources

- [Practical Tips for Finetuning LLMs Using LoRA](https://magazine.sebastianraschka.com/p/practical-tips-for-finetuning-llms) (Sebastian Raschka) (~30 min): the best empirical guide to r, alpha, which layers, and QLoRA trade-offs, from hundreds of runs
- [Code LoRA from Scratch](https://lightning.ai/lightning-ai/studios/code-lora-from-scratch) (Raschka, Lightning AI) (~45 min): implement the ~20 lines that LoRA actually is; makes the mechanics stick
- [LoRA Without Regret](https://thinkingmachines.ai/blog/lora/) (Thinking Machines, Sept 2025) (~35 min): the modern authority on when LoRA matches full fine-tuning and how to configure it; partially overturns the original paper's layer advice
- [Hugging Face PEFT docs](https://huggingface.co/docs/peft) (docs, ~30 min for the core pages): the library everyone actually uses to apply LoRA; the conceptual guides double as a good method overview

### Problem

Adapting a pretrained LM to each downstream task by full fine-tuning produces a complete copy of the model per task. At GPT-3 scale (175B parameters, ~350GB in FP16) that makes storing, deploying, and switching between task-specific models prohibitively expensive. The existing parameter-efficient alternatives each pay a real cost: adapter layers add sequential depth that inflates inference latency (up to 20-30% on GPT-2 at batch size 1, worse under model parallelism because of the extra AllReduce/Broadcast synchronization), and prefix/prompt tuning is hard to optimize (performance is non-monotonic in trainable parameters) and eats into the usable sequence length. The gap: adaptation that is parameter-efficient, trains stably, and adds exactly zero inference latency.

### Method

**Low-rank update decomposition.** Building on the observation (Aghajanyan et al. 2020) that fine-tuning has a low intrinsic dimension, LoRA hypothesizes that the weight *update* during adaptation also has low intrinsic rank. For a pretrained weight W0 in R^(d x k), freeze W0 and parametrize the update as a rank decomposition:

```javascript
h = W0 x + dW x = W0 x + B A x
```

with B in R^(d x r), A in R^(r x k), and r << min(d, k). Only A and B receive gradients. For GPT-3, d = 12,288 and r = 1 or 2 can already suffice.

**Initialization.** A gets a random Gaussian init, B is zero, so dW = BA = 0 at the start of training: the model begins exactly at the pretrained function and the low-rank path grows from zero.

**Scaling.** The update is scaled by alpha/r, i.e. h = W0 x + (alpha/r) BA x. With Adam, tuning alpha is roughly equivalent to tuning the learning rate, so the authors set alpha to the first r they try and never tune it; the point of the scaling is to avoid retuning hyperparameters when r changes.

**Which matrices.** In the Transformer they adapt only self-attention weights (from Wq, Wk, Wv, Wo) and freeze the MLPs, for simplicity and parameter efficiency. Under a fixed 18M-parameter budget on GPT-3, adapting Wq+Wv at r = 4 (or all four at r = 2) beats putting a single matrix at r = 8: spreading a small rank across more matrices wins over concentrating a larger rank in one.

**Generalization of full fine-tuning.** As r approaches the rank of the weight matrices (with LoRA on all matrices), LoRA recovers the expressiveness of full fine-tuning; adapters instead converge to an MLP bottleneck and prefix methods to a model with truncated context.

**No inference latency.** Because the update is a plain linear map, deploy by merging: W = W0 + BA, then run inference exactly as a fine-tuned model. Task switching is subtract BA, add B'A'. Alternatively keep adapters unmerged and serve many tasks off one frozen base; the stated limitation is that batching inputs for different tasks in one forward pass is awkward if you merge.

**Practical wins on GPT-3 175B.** Training VRAM drops from 1.2TB to 350GB (no optimizer states for frozen weights; up to 2/3 VRAM reduction generally when r << d_model); checkpoint size drops ~10,000x from 350GB to 35MB at r = 4; ~25% training throughput speedup over full fine-tuning; 100 task-adapted models cost ~354GB instead of ~35TB.

### Results

- **GLUE (encoders)**: RoBERTa-base LoRA 87.2 avg vs 86.4 full FT with 0.3M vs 125M trainable params; RoBERTa-large 89.0 vs 88.9; DeBERTa-XXL 91.3 vs 91.1 with 4.7M vs 1,500M trainable params. LoRA matches or beats full fine-tuning while training ~0.1-0.3% of parameters.
- **GPT-2 E2E NLG**: GPT-2 medium LoRA 70.4 BLEU vs 68.2 full FT with 0.35M vs 354.92M params; beats adapters, prefix tuning, and FT-top2 across BLEU/NIST/METEOR/ROUGE-L/CIDEr.
- **GPT-3 175B**: with 4.7M trainable parameters (37,000x fewer), LoRA gets WikiSQL 73.4% (FT 73.8), MNLI-m 91.7 (FT 89.5), SAMSum 53.8/29.8/45.9 R1/R2/RL (FT 52.0/28.0/44.5): on par or better than full fine-tuning on all three. Prefix methods degrade past ~256 special tokens; LoRA scales monotonically with trainable parameters.
- **Intrinsic rank findings (Section 7)**: r = 1 already performs competitively on WikiSQL/MNLI when adapting {Wq, Wv}, and r = 4 to 8 saturates. Grassmann subspace analysis shows the top singular directions learned at r = 8 and r = 64 overlap strongly while the rest look like noise, and two random seeds agree on the same top directions: the useful update genuinely lives in a tiny subspace. Projecting W onto dW's top singular directions shows dW does not just echo W: it amplifies directions that are present but *not emphasized* in the pretrained weights, by a large factor (~21.5 at r = 4). Adaptation is feature amplification, not feature learning from scratch.

### Why it matters

LoRA became the default way to fine-tune large models, full stop. Hugging Face PEFT made `LoraConfig` the standard interface; QLoRA (May 2023) combined LoRA with a 4-bit NF4-quantized frozen base and paged optimizers to fine-tune 65B models on a single 48GB GPU, which put LLM fine-tuning within hobbyist reach and fueled the open-model ecosystem. The zero-latency merge and the tiny-adapter property also created multi-tenant serving: vLLM and SGLang batch many LoRA adapters over one shared base (S-LoRA-style), Apple ships per-feature adapters over one on-device foundation model, and fine-tuning APIs (including RL fine-tuning services like Tinker) are LoRA underneath.

The main refinements an engineer should know:

- **rsLoRA** (2023): the paper's alpha/r scaling makes updates collapse as r grows, silently capping the benefit of high ranks; scaling by alpha/sqrt(r) is rank-stabilized and lets larger r actually help. Available as `use_rslora` in PEFT.
- **DoRA** (NVIDIA, ICML 2024): decomposes each weight into magnitude and direction and applies LoRA to the direction only; its learning dynamics look more like full fine-tuning and it closes most of the remaining gap at low ranks. `use_dora` in PEFT.
- **LoRA Without Regret** (Thinking Machines, Sept 2025): the current best practical guidance, from systematic SFT and RL experiments. LoRA matches full fine-tuning when applied to **all** layers, especially the MLPs (revising the original attention-only advice), and when dataset information content does not exceed adapter capacity; for RL post-training even very low ranks match full FT because RL absorbs so few bits per episode. Optimal LoRA learning rate is consistently ~10x the full fine-tuning learning rate, and LoRA tolerates large batch sizes less gracefully than full FT.
The paper's scientific contribution has aged as well as its engineering one: the intrinsic-rank analysis (adaptation amplifies existing but unemphasized features in a low-dimensional subspace) remains a standard lens on what fine-tuning actually does.

### Connections

- `papers/2023-05_qlora`: 4-bit quantized base + LoRA; the combination that democratized fine-tuning
- `papers/2020-05_gpt-3`: the 175B stress-test model whose deployment cost motivated LoRA
- `papers/2018-10_bert`: RoBERTa/DeBERTa, the encoder evaluation targets on GLUE
- `papers/2023-05_dpo` and `papers/2024-02_deepseekmath-grpo`: preference and RL post-training, in practice frequently run on LoRA adapters
- `papers/2023-09_vllm-pagedattention`: the serving side; multi-LoRA batching over one base model lives here
- Topics: `topics/llm-training-and-post-training` (PEFT, fine-tuning practice), `topics/inference-and-serving` (multi-adapter serving)
