# Verified source notes (fetched 3 October 2026)

Quotes the page relies on, with URLs. Em dashes in sources are written " -- " (repository rule). Abstracts of the method papers are in `abstracts.txt`; tables in `biderman2024_tables.txt` and `slora_tables.txt`; LoRA and QLoRA facts were taken from the paper pages' verified extracts (`reference/papers/lora/src/inputs/`, `reference/papers/qlora/src/inputs/`).

== https://thinkingmachines.ai/blog/lora/ (John Schulman and Thinking Machines Lab, 29 Sep 2025)
- "Rank-1 LoRA for Llama-3.1-8B already has 3M parameters"
- "LoRA takes slightly more than ⅔ of the FLOPs that full fine-tuning does per pass." "The total number of multiply-adds is 2N² + 6NR. With R ≪ N, this is slightly more than ⅔ of 3N²."
- "the optimal LR for LoRA is consistently 10x the one used for FullFT in the same application, for both supervised learning and reinforcement learning"
- "LoRA is less tolerant of large batch sizes than full fine-tuning -- it pays a larger penalty in loss as batch size increases beyond some point. This penalty is not mitigated by increasing the LoRA rank; it is a property of the product-of-matrices parametrization"
- "Attention-only LoRA underperforms even when we match the number of trainable parameters by using higher rank for attention-only LoRA." "LoRA performs better when applied to all weight matrices, especially MLP and MoE layers"
- "LoRA fully matches the learning performance of FullFT when running policy gradient algorithms for reinforcement learning, even with ranks as low as 1"
- "we trained on ~10,000 problems with 32 samples per problem. Assuming each completion yields a single bit of information, the whole training process only needs to absorb 320,000 bits."
- "For datasets that exceed LoRA capacity, LoRA underperforms FullFT." "LLM datasets usually have a loss of around 1 bit (0.69 nats) per token"
- "The 1/r scaling factor makes the optimal learning rate approximately independent of rank. In fact, a stronger condition holds -- the learning curve is exactly the same at the beginning of training, regardless of rank."
- "We use α = 32 for the experiments in this article"
- On Biderman et al.: LoRA underperforms "in settings that resemble pre-training"
- Models: Llama 3 series and Qwen3 including an MoE; data Tulu3, OpenThoughts3, MATH, GSM.

== https://huggingface.co/docs/trl/main/lora_without_regret
- "The blog post recommends using an effective batch size < 32"
- Ranks: SFT, post-training scale: 256; RL, any size: 1-32. LoRA LR 1.0e-5 against full 1.0e-6 in their SmolLM3 reproduction.

== https://arxiv.org/html/2405.09673v2 (Biderman et al., LoRA Learns Less and Forgets Less, TMLR)
- "full finetuning learns perturbations with a rank that is 10-100 × greater than typical LoRA configurations"
- "LoRA -- even with higher rank -- mitigates forgetting more aggressively than classic regularization techniques that aim to prevent overfitting, such as dropout ... and weight decay"
- Forgetting: "the average of HellaSwag, ARC-Challenge and Winogrande for Llama-2-7B"
- "We recommend: (a) using LoRA for instruction finetuning and not continued pretraining; (b) if GPU memory allows, targeting 'All' transformer modules with a rank of 256, since ranks 16-64 tend not to suffice for code tasks; (c) using α=2r, and (d) sweeping over learning rates between [1e-5, 5e-4]."
- Table S14: 7B, Adam 112 GB, Adam + LoRA 15.12 GB (model and optimizer state, excluding activations).

== https://arxiv.org/html/2402.09353v6 (DoRA, ICML 2024)
- W′ = m (W0 + BA) / ‖W0 + BA‖c; "‖·‖c" is "the vector-wise norm of a matrix across each column vector"
- Section 5.1: "we initially fine-tuned models with DoRA following the LoRA configuration, maintaining the same rank while adjusting only the learning rate. The marginal increase of 0.01% in the number of trainable parameters for DoRA over LoRA ... arises from the inclusion of learnable magnitude components"; "Results of all the baseline methods on LLaMA 7B/13B are taken from (Hu et al., 2023)."
- Table 1, LLaMA-7B: Prefix 0.11% 64.6; Series 0.99% 70.8; Parallel 3.54% 72.2; LoRA 0.83% 74.7; DoRA† 0.43% 77.5; DoRA 0.84% 78.4. LLaMA-13B LoRA 0.67% 80.5, DoRA 0.68% 81.5. LLaMA3-8B LoRA 80.8, DoRA 85.2.
- Figure 2: LoRA "consistent positive slope"; FT "relatively negative slope".
- "training memory reduction of approximately 24.4% in fine-tuning LLaMA and 12.4% in VL-BART ... a negligible difference of only 0.2 compared to DoRA without the modification on LLaMA."

== https://arxiv.org/html/2310.11454v2 (VeRA)
- Table 4: Llama 7B LoRA 159.9M, VeRA 1.6M; Llama 13B LoRA 250.3M, VeRA 2.4M. §4.3: "in contrast to 159.9 M and 250.3 M trainable parameters when employing LoRA with a rank of 64 as proposed by Dettmers et al. (2023). We perform finetuning using both LoRA and VeRA, by applying both methods on all linear layers except the top one"
- Table 1 (q and k layers): GPT-3 VeRA 2.4M (r 1), 2.8M (r 16), 8.7M (r 256).

== https://arxiv.org/html/2311.03285v3 (S-LoRA)
- "vLLM-packed" ... "we merge the LoRA weights into the base model and serve the multiple versions of the merged weights separately"; "HuggingFace PEFT ... batches single adapter requests and switches adapter weights between batches"
- "S-LoRA achieves a throughput up to 4x higher than vLLM-packed when serving a small number of adapters, and up to 30x higher than PEFT"

== https://rohanbansal.com/qorl (16 September 2026)
- "I began by generating 120 Astra trajectories" ... "I generated another 320 Astra trajectories; 300 for training, and 20 for validation."
- "The tiny LoRA I actually ended up training was only 42.5 MB and contained only 21.2 million trainable parameters."
- "When taking the best feedback across three rollouts, we saw a 1.81x geometric mean speedup"
- "Total cost: $1,200." "~$800 to rent a 2x H100 SXM node from Lambda for ~95 hours, and ~$400 in OpenAI API fees"; development "on the 2x RTX 3090 rig". 113 held-out join-heavy queries (CEB).

== https://huggingface.co/docs/peft/main/en/developer_guides/quantization
- AQLM: "Finetuned LoRA adapters shall be saved separately, as merging them with AQLM quantized weights is not possible."

== PEFT library 0.21.2 (source)
- IA3 default targets: llama/mistral ['k_proj', 'v_proj', 'down_proj'], qwen2/qwen3 ['q_proj', 'v_proj', 'down_proj']; feed-forward ['down_proj'].
- LoraConfig defaults r = 8, lora_alpha = 8.
