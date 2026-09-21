# QLoRA: Efficient Finetuning of Quantized LLMs

⏱ 7 min read · +~3h 20m resources

- **Authors/lab**: Tim Dettmers, Artidoro Pagnoni, Ari Holtzman, Luke Zettlemoyer (University of Washington)
- **Date**: May 2023
- **Links**: [arXiv 2305.14314](https://arxiv.org/abs/2305.14314) (~45 min) | [code (artidoro/qlora)](https://github.com/artidoro/qlora) (repo, ~20 min for the README and entry path) | [bitsandbytes](https://github.com/TimDettmers/bitsandbytes) (repo, ~20 min for the README and entry path)

### Best resources

- [HF blog: 4-bit transformers with bitsandbytes and QLoRA](https://huggingface.co/blog/4bit-transformers-bitsandbytes) (~25 min): the canonical practitioner guide, co-written with the paper authors; covers NF4, double quantization, and the `transformers`/PEFT API.
- [Maarten Grootendorst: A Visual Guide to Quantization](https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-quantization) (~30 min): the best visual intuition for absmax/blockwise quantization, NF4, and where QLoRA sits among GPTQ/AWQ-style methods.
- [Sebastian Raschka: Practical Tips for Finetuning LLMs Using LoRA](https://magazine.sebastianraschka.com/p/practical-tips-for-finetuning-llms) (~30 min): hands-on hyperparameter guidance (r, alpha, target modules, memory trade-offs) that reflects the paper's "adapters on all layers" finding.
- [Lightning AI: LoRA/QLoRA insights from hundreds of experiments](https://lightning.ai/pages/community/lora-insights/) (~30 min): empirical study of QLoRA's memory savings vs runtime cost and quality across settings.

### Problem

Full 16-bit finetuning of a 65B model needs over 780 GB of GPU memory, so adapting the largest open models was out of reach for anyone without a multi-node cluster. Existing 4-bit quantization (GPTQ, [LLM.int](http://llm.int/)8-era work) only worked for inference; training through quantized weights degraded or broke. The gap: make finetuning at the 33B/65B scale fit on one GPU without giving up 16-bit task performance.

### Method

QLoRA backpropagates through a frozen, 4-bit-quantized base model into LoRA adapters. Storage is 4-bit; compute is BF16: each weight tensor is dequantized on the fly for the matmul, and gradients flow only to the BF16 LoRA parameters (the 4-bit weights are never updated). Four components:

1. **4-bit NormalFloat (NF4)**: a quantile-quantization data type whose 16 levels are the quantiles of N(0,1) rescaled to [-1, 1]. Since pretrained weights are approximately zero-mean normal, normalising each block by its absmax makes NF4 information-theoretically optimal: every quantization bin receives an equal expected number of values. Built asymmetrically so an exact zero is representable. Blocksize 64 per quantization constant.
2. **Double quantization**: the FP32 quantization constants themselves get quantized to FP8 (blocksize 256), cutting their overhead from 0.5 to 0.127 bits per parameter, about 3 GB saved on a 65B model. No quality loss.
3. **Paged optimizers**: optimizer states allocated in NVIDIA unified memory, automatically paged to CPU RAM on memory spikes (long-sequence gradient checkpointing) and paged back for the update step. This is what lets 33B/65B training on a single 24/48 GB GPU survive OOM spikes.
4. **LoRA on all linear layers**: the standard practice of adapting only attention Q/V projections does not recover full-finetuning quality at scale; the number of adapted layers matters far more than rank r. Adapter memory is negligible next to activation gradients, so adapting everything is nearly free.

### Results

- **Fidelity**: NF4+DQ QLoRA matches 16-bit full finetuning and 16-bit LoRA on GLUE (RoBERTa), Super-NaturalInstructions (T5 80M-11B), and 5-shot MMLU for LLaMA 7B-65B (53.1 vs 53.0 mean MMLU). FP4 lags by about 1 point; NF4 beats FP4/Int4 on zero-shot accuracy and perplexity across OPT/BLOOM/Pythia/LLaMA.
- **Headline**: 65B finetuning drops from >780 GB to <48 GB, one professional GPU; 33B trains on a 24 GB consumer GPU in under 12 hours.
- **Guanaco**: LLaMA finetuned with QLoRA on 9k OASST1 samples. Guanaco 65B reaches 99.3% of ChatGPT's Vicuna-benchmark score after 24h on one GPU; 33B hits 97.8%; the 7B model (5 GB) beats a 26 GB Alpaca by 20+ points. In Elo tournaments (human and GPT-4 judged), Guanaco 65B/33B rank behind only GPT-4.
- **Side findings**: data quality beats data size (9k OASST1 > 450k FLAN v2 for chat); MMLU and chatbot performance are partially orthogonal; GPT-4-as-judge broadly agrees with humans at the system level (Spearman r = 0.55) but is a noisy, order-sensitive proxy.

### Why it matters

QLoRA democratised LLM finetuning: it moved 33B-65B adaptation from cluster-scale budgets to a single consumer or prosumer GPU, and the trained-1000-models ablation gave the field its default PEFT recipe (NF4, double quantization, adapters on all linear layers, paged optimizers). The method shipped directly into bitsandbytes and Hugging Face PEFT/transformers (`load_in_4bit` plus LoRA), which remains the standard open-source finetuning path; Axolotl, Llama-Factory, torchtune, and Unsloth all build on it. It also normalised the finding that a small high-quality dataset can produce a near-SoTA chatbot, and was an early systematic use of GPT-4-as-judge with an honest analysis of its limits. NF4 is still the default 4-bit training data type in 2026; the main advances since are fused kernels (Unsloth), quantization-aware initialisation variants (LoftQ, QA-LoRA), and better post-training quantization for inference.

### Connections

- 2021-06_lora: the adapter method QLoRA builds on; QLoRA's contribution is making the frozen base 4-bit and showing all-layer adapters are needed at scale.
- 2022-03_instructgpt: the instruction-tuning paradigm Guanaco applies with supervised finetuning only.
- 2023-05_dpo: contemporaneous preference-tuning method; the common open-source recipe became QLoRA + DPO.
- Topics: llm-training-and-post-training (PEFT, quantization), evaluation-and-llm-judges (GPT-4-as-judge tournament methodology).
