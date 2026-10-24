# Disclosed domain-adaptation (CPT) recipes: verified research notes

Compiled 2026-10-03. Every number below was read from the primary source (arXiv HTML full text fetched with curl and searched as text, or the official blog / article). Quotes are verbatim except that LaTeX duplicates produced by the HTML (for example "3 ​ e − 4 3e^{-4}") are collapsed to one rendering. "Derived" marks a number computed by me, with the formula. "not disclosed" means the source does not state it.

Convention for "general share": the fraction of the CPT mix that is general-domain / natural-language "replay" data (not the domain corpus). Where a source mixes in other non-domain data (for example code for a math model) it is listed separately.

---

## 1. Code Llama (Meta AI)

- Paper: Rozière et al., "Code Llama: Open Foundation Models for Code", arXiv 2308.12950, submitted 24 Aug 2023. https://arxiv.org/html/2308.12950 (Section 2.2 Dataset, Table 1, Section 2.4 Long context fine-tuning, Section 2.6 Training details)
- Domain: code.
- Base: Llama 2 7B, 13B, 34B, 70B.
- CPT tokens: 500B for 7B/13B/34B; 1T for 70B. Python specialisation: a further 100B. Long-context fine-tuning (LCFT): 10,000 steps at 2M tokens per batch for 7B/13B; derived 10,000 x 2M = 20B tokens (34B: 11,000 steps x 1M = 11B, derived).
  - Quote: "We train Code Llama 7B, 13B and 34B on 500B tokens, and Code Llama 70B on 1T tokens during the initial phase, starting from the 7B, 13B, 34B, and 70B versions of Llama 2 ."
  - Quote: "Initialized from Llama 2 models and trained on 500B tokens from the Code Llama dataset, Code Llama - Python models are further specialized on 100B tokens using a Python-heavy dataset"
  - Quote (LCFT): "The batch size is set to 2M tokens for model sizes 7B and 13B and to 1M tokens for model size 34B, respectively. Training lasts for 10,000 gradient steps by default. We observed instabilities in downstream performance for certain configurations, and hence set the number of gradient steps to 11,000 for the 34B models and to 3,000 for Code Llama 7B."
  - Note: the last sentence says 3,000 steps for Code Llama 7B, so 7B LCFT is 3,000 x 2M = 6B tokens (derived); 13B is 10,000 x 2M = 20B (derived).
- Mix (Table 1, sampling proportions):
  - Code Llama (500B): Code 85%, Natural language related to code 8%, Natural language 7%.
  - Code Llama - Python (additional 100B): Python 75%, Code 10%, Natural language related to code 10%, Natural language 5%.
  - Quote: "To help the model retain natural language understanding skills, we also sample a small proportion of our batches from a natural language dataset." and "Preliminary experiments suggested that adding batches sampled from our natural language dataset improves the performance of our models on MBPP."
- General share: 7% pure natural language (15% if "NL related to code" counted). Python stage: 5%.
- LR: Peak LR equal to Llama 2's own pretraining peak (no reduction): 3e-4 (7B and 13B), 1.5e-4 (34B and 70B). Cosine, 1000 warm-up steps, final LR = 1/30 of peak. Batch 4M tokens, seq 4,096. Python stage: initial LR 1e-4. LCFT: LR 2e-5, seq 16,384, RoPE base 10,000 -> 1,000,000.
  - Quote: "Despite the standard practice of using lower learning rates in fine-tuning stages than in pre-training stages, we obtained best results when retaining the original learning rate of the Llama 2 base model. We carry these findings to the 13B, 34B and 70B models, and set their learning rates to 3e-4, 1.5e-4, and 1.5e-4 respectively."
  - Quote: "For python fine-tuning, we set the initial learning rate to 1e-4 instead."
- Tokenizer: same Llama 2 tokenizer; only four special infilling tokens added ("We extend Llama 2 's tokenizer with four special tokens that mark the beginning of the prefix, the middle part or the suffix, and the end of the infilling span.").
- After CPT: LCFT; Code Llama - Instruct (approx. 5B tokens, with 6% code and 2% NL replay to avoid regression); Python specialisation.
- Result (Table 2, HumanEval pass@1): Llama 2 7B 12.2% -> Code Llama 7B 33.5%; Llama 2 34B 22.6% -> Code Llama 34B 48.8%. MBPP 7B: 20.8% -> 41.4%.
- Forgetting: not systematically measured on general NL benchmarks. Table 12 (GSM8k, math) shows a drop: Llama 2 7B 14.7% -> Code Llama 7B 13.0%; 13B 24.2% -> 20.8%; 34B 42.2% -> 32.7%. LCFT costs up to 2 BLEU on short (<4k) code-completion prompts.

## 2. DeepSeek-Coder-V2 (DeepSeek-AI)

- Paper: arXiv 2406.11931, submitted 17 Jun 2024. https://arxiv.org/html/2406.11931 (Section 1, Section 2 Data Collection, Section 3.3 Training Hyper-Parameters, Table 10)
- Domain: code + math.
- Base: intermediate checkpoint of DeepSeek-V2 (MoE, 236B total / 21B active; Lite: 16B / 2.4B) trained on 4.2T tokens.
- CPT tokens: 6T. Total 10.2T.
  - Quote: "DeepSeek-Coder-V2 is further pre-trained from an intermediate checkpoint of DeepSeek-V2 with additional 6 trillion tokens."
  - Quote: "To maintain robust natural language understanding capabilities in DeepSeek-Coder-V2, we continue the pre-training process from an intermediate checkpoint of DeepSeek-V2. The intermediate checkpoint was initially trained on 4.2T tokens. Consequently, DeepSeek-Coder-V2 has been exposed to a total of 10.2T high-quality tokens during the pre-training phase."
- Mix: 60% source code, 10% math, 30% natural language (sampled directly from the DeepSeek-V2 corpus).
  - Quote: "The pre-training data for DeepSeek-Coder-V2 primarily consists of 60% source code, 10% math corpus, and 30% natural language corpus. Since the natural language corpus is directly sampled from the training dataset of DeepSeek-V2..."
- General share: 30% (true replay: same corpus as base).
- LR: "Batch sizes and learning rates are adjusted according to DeepSeek-V2 specifications. For learning rate scheduling, we employ a cosine decay strategy, starting with 2000 warm-up steps and gradually reducing the learning rate to 10% of its initial value." Numeric peak not disclosed in this paper.
- Tokenizer: unchanged (DeepSeek-V2 BPE). Context extended 16K -> 128K with YaRN (two stages of 1000 steps at 32K and 128K).
- After CPT: SFT on 300M-token instruction set (code, math, general from DeepSeek-V2), LR 5e-6; then RL with GRPO using compiler feedback / test cases and a reward model.
- Result: HumanEval 90.2%, MBPP+ 76.2%, LiveCodeBench 43.4% (Instruct).
- Forgetting: measured (Table 10, Instruct vs DeepSeek-V2 Chat, 236B): MMLU 78.1 -> 79.2, BBH 79.7 -> 83.9, but TriviaQA 86.7 -> 82.3 and NaturalQuestions 53.4 -> 47.5. Lite (16B): TriviaQA 65.2 -> 59.5, NQ 35.5 -> 30.8. Authors attribute knowledge drops to "the relatively smaller amount of web data used during pre-training".

## 3. DeepSeekMath (DeepSeek-AI)

- Paper: Shao et al., arXiv 2402.03300, submitted 5 Feb 2024. https://arxiv.org/html/2402.03300 (Section 2.3 Training and Evaluating DeepSeekMath-Base 7B, Tables 2 and 4)
- Domain: mathematics.
- Base: DeepSeek-Coder-Base-v1.5 7B (the checkpoint right before LR decay, per Table 4 caption).
- CPT tokens: 500B.
- Mix (exact): 56% DeepSeekMath Corpus, 4% AlgebraicStack, 10% arXiv, 20% GitHub code, 10% natural language from Common Crawl (English and Chinese).
  - Quote: "Our model is initialized with DeepSeek-Coder-Base-v1.5 7B ( Guo et al., 2024 ) and trained for 500B tokens. The distribution of the data is as follows: 56% is from the DeepSeekMath Corpus, 4% from AlgebraicStack, 10% from arXiv, 20% is Github code, and the remaining 10% is natural language data from Common Crawl in both English and Chinese."
- General share: 10% natural language (plus 20% code, which is replay of the base model's own domain).
- LR: peak 4.2e-4, batch 10M tokens; multi-step schedule: peak after 2,000 warm-up steps, to 31.6% at 80% of training, to 10.0% at 90%.
  - Quote: "We mainly adopt the training setting specified in Section 2.2.1 , except that we set the maximum value of the learning rate to 4.2e-4 and use a batch size of 10M tokens."
  - Base model's pretraining peak LR: not disclosed in this paper.
- Tokenizer: unchanged.
- After CPT: SFT on 776K math instruction examples (DeepSeekMath-Instruct), then GRPO (DeepSeekMath-RL).
- Result: base MATH 36.2%, GSM8K 64.2% (Table 2); RL model MATH 51.7%.
- Forgetting: measured (Table 4). Versus the start checkpoint (Coder-Base-v1.5 before decay): MMLU 42.9 -> 54.9, BBH 42.9 -> 59.5, HumanEval 40.2 -> 40.9, MBPP 52.6 -> 52.6. Versus fully trained Coder-Base-v1.5: HumanEval 43.2 -> 40.9, MBPP 60.4 -> 52.6. Quote: "by including code tokens for continual training, DeepSeekMath-Base 7B effectively maintains the performance of DeepSeek-Coder-Base-v1.5 on the two coding benchmarks."

## 4. Llemma (EleutherAI and collaborators)

- Paper: Azerbayev et al., arXiv 2310.10631, submitted 16 Oct 2023. https://arxiv.org/html/2310.10631 (Section 2.1 Data, Section 2.2 Training, Section 3.4 Impact of data mixture, Table 1)
- Domain: mathematics.
- Base: Code Llama 7B and 34B.
- CPT tokens: 200B (7B), 50B (34B), on Proof-Pile-2 (55B tokens).
  - Quote: "We train the 7B model for 200B tokens, and the 34B model for 50B tokens."
  - Caveat: 7B ran 42,000 steps x 4M tokens = 168B tokens (derived), because "we planned to train for 48,000 steps, but encountered NaN losses after step 42,000". 48,000 x 4M = 192B (derived). 34B: 12,000 x 4M = 48B (derived).
- Mix: Proof-Pile-2 internal ratio arXiv:web:code = 2:4:1. Overall: 95% Proof-Pile-2, 2% Pile (minus ArXiv), 3% RedPajama GitHub.
  - Quote: "Following Lewkowycz et al. (2022) , our training mixture consists of a small amount of general domain data, which functions as a form of regularization. ... We set 95% of our training mixture to be the Proof-Pile-2 , 2% to be from the Pile (with ArXiv removed, as it is separately in Proof-Pile-2 ), and 3% to be the GitHub subset of RedPajama"
  - Quote: "Based on these results, we trained Llemma with a ratio of 2 : 4 : 1 ."
- General share: 2% natural language (Pile); 5% total non-Proof-Pile-2 (2% Pile + 3% GitHub).
- LR: 7B peak 1e-4 (500 warm-up steps, cosine to 1/30 of peak over 48,000 steps); 34B peak 5e-5. Base (Code Llama) peak was 3e-4 (7B) and 1.5e-4 (34B) per the Code Llama paper, so Llemma used 1/3 of the base peak (derived: 1e-4 / 3e-4; 5e-5 / 1.5e-4).
- Tokenizer: unchanged.
- After CPT: none released (base model); evaluated few-shot.
- Result (Table 1, MATH greedy): Code Llama 7B 4.5% -> Llemma 7B 18.0%; Code Llama 34B 12.2% -> Llemma 34B 25.0%. GSM8k 7B: 10.5% -> 36.4%.
- Forgetting: not measured on general benchmarks.

## 5. Meditron (EPFL and collaborators)

- Paper: Chen et al., "MEDITRON-70B: Scaling Medical Pretraining for Large Language Models", arXiv 2311.16079, submitted 27 Nov 2023. https://arxiv.org/html/2311.16079 (Section 2 / Table 1 GAP-Replay, Section 2.3 Experience Replay, Section 4 Training, Table 8 mixture ablation, Appendix D.1)
- Domain: medicine.
- Base: Llama-2 7B and 70B.
- CPT tokens: GAP-Replay 48.1B total (46.7B train + 1.4B validation).
  - Quote: "MediTron 's domain-adaptive pre-training corpus GAP-replay combines 48.1B tokens from four datasets"
  - Table 1 (train tokens): Clinical Guidelines 107M, PubMed Abstracts 5.48B, PubMed Papers 40.7B, Experience Replay 420M, Total 46.7B.
- Mix / replay: 420M RedPajama tokens = "1%". Derived 420M / 46.7B = 0.90%.
  - Quote: "To promote the retention of knowledge acquired by the pre-trained Llama-2 model, we included general domain data into GAP-Replay that consists of the 1% of the mixture. We used a randomly selected subset of 420 million tokens from the RedPajama dataset"
- General share: 1% (0.90% derived).
- LR: same as Llama 2 pretraining: 3e-4 (7B and 13B), 1.5e-4 (70B); cosine, 2000 warm-up steps, decays to 10% of max. Schedule length set to 2 epochs while training 1 epoch, so the final LR stays high (Appendix D.1, chose end LR 1.6e-4 for 7B ablation).
  - Quote: "The cosine learning rate schedule uses 2000 steps for warmup and decays the final learning rate to 10% of the maximum learning rate. We use 1.5 x 10^-4 as the learning rate for the 70B model and 3 x 10^-4 for the 7B and 13B models."
- Tokenizer: Llama tokenizer (32k) plus a few special tokens for preprocessing markers.
- After CPT: task-specific supervised fine-tuning per benchmark (LR 2e-5, 3 epochs); no general instruction tuning.
- Result: Table 8 (7B ablation, fine-tuned): Llama-2-7B avg 53.5 -> GAP + Replay 58.9; PMC + Replay beats PMC alone by 1.6 points average ("Replay tokens are beneficial for downstream performance"). Meditron-70B fine-tuned: +1.8% average over identically fine-tuned Llama-2-70B; SC-CoT average 72.0%.
- Forgetting: not measured on general-domain benchmarks (only medical evals).

## 6. SaulLM-7B (Equall and collaborators)

- Paper: Colombo et al., arXiv 2403.03883, submitted 6 Mar 2024. https://arxiv.org/html/2403.03883 (Section 3.1 Legal Pretraining Corpora, "Replay Sources")
- Domain: law (English).
- Base: Mistral 7B.
- CPT tokens: approx. 30B-token legal corpus ("we end up with a corpus of 30 billion tokens"). Number of tokens actually trained (epochs): not disclosed.
- Mix: legal corpus + approx. 2% general replay (Wikipedia, StackExchange, GitHub from SlimPajama) + instruction data (Super Natural Instructions, FLAN) mixed into pretraining.
  - Quote: "To reduce the risk of catastrophic forgetting ( McCloskey and Cohen, 1989 ) during continued pretraining, we incorporate data from the prior training distribution ... we introduce commonly available "general" data from Wikipedia, StackExchange, and GitHub, comprising roughly 2% of the final training mix."
  - Quote: "we include the Super Natural Instruction Wang et al. (2022) and FLAN collection Longpre et al. (2023) during pretraining."
- General share: approx. 2% (instruction data share not disclosed).
- LR: not disclosed (256 MI250 GPUs for CPT).
- Tokenizer: unchanged (not stated as changed).
- After CPT: instruction fine-tuning on general (SlimOrca etc.) plus synthetic legal instructions -> SaulLM-7B-Instruct.
- Result: SaulLM-7B-Instruct LegalBench-Instruct average 0.61, "an 11% relative improvement compared to the best open-source instruct model"; lower perplexity than Mistral-7B on all four legal document types.
- Forgetting: not measured on general benchmarks.

## 7. ChipNeMo (NVIDIA)

- Paper: Liu et al., arXiv 2311.00176, submitted 31 Oct 2023 (later versions 2024). https://arxiv.org/html/2311.00176 (Section 2.1, 2.2, 3.1, 3.2; Appendix A.3 Table 3; A.6 Tables 6, 7, 10, 12)
- Domain: chip design (internal RTL, verification, docs, bug reports).
- Base: LLaMA2 7B, 13B, 70B.
- CPT tokens: training blend 24.1B tokens (Table 3, "Training Tokens (B)" total), internal corpus 23.1B. 23,200 steps x 1M tokens = approx. 23.2B (derived), "roughly 1 epoch of the data blend".
  - Quote: "After collection, cleaning, and filtering, the internal data training corpus has 23.1 billion tokens."
  - Quote: "The total number of training steps is set to 23,200, equating to roughly 1 epoch of the data blend."
- Mix (Table 3, training %): Bug Summary 10.0%, Design Source 24.5%, Documentation 34.0%, Verification 10.4%, Other 12.0%, Wikipedia 6.2%, GitHub 3.0%.
  - Quote: "we perform a sub-sampling operation that results in approximately 9.2% of the total training tokens being sampled from these public datasets, with a balanced representation of natural language and code."
- General share: 9.2% public (6.2% Wikipedia natural language + 3.0% public GitHub code).
- LR: constant 5e-6, no scheduler, Adam, batch 256 x 4096 = 1M tokens. Ablation with Code-Llama-style peak 3e-4 (cosine, 200 warm-up, to 1/30) was much worse.
  - Quote: "A small learning rate of 5 x 10^-6 is employed, and training is facilitated using the Adam optimizer, without the use of learning rate schedulers."
  - Table 12 (ChipNeMo-7B): LR 5e-6: Chip 49.8, MMLU 44.6, Reason 65.8, Code 16.4; LR 3e-4: Chip 25.5, MMLU 26.6, Reason 49.8, Code 18.1.
  - Base pretraining peak (Llama 2 7B) = 3e-4 (per Code Llama paper), so 5e-6 is 1/60 of it (derived).
- Tokenizer: augmented; approx. 9K domain tokens added to the 32K LLaMA2 vocab; new embeddings initialised as the mean of their sub-token embeddings, output-layer rows zero. Efficiency gain 1.6% to 3.3%.
- After CPT: SFT (128k general chat + approx. 1.4k domain samples) and SteerLM; domain-adapted retrieval (RAG). DAPT on a chat model "significantly degraded the model's alignment".
- Result (Table 7): Design benchmark 7B 41.1 -> 57.5, 13B 43.6 -> 67.9, 70B 52.3 -> 76.6.
- Forgetting: measured (Table 7, MMLU): 7B 45.7 -> 44.6, 13B 55.4 -> 53.4, 70B 68.6 -> 69.4. Quote: "DAPT models exhibit a slight degradation in performance on open-domain academic benchmarks." Removing the public data "only slightly regressed on most tasks" (Table 10).

## 8. BloombergGPT (Bloomberg): contrast, trained from scratch, NOT CPT

- Paper: Wu et al., arXiv 2303.17564, submitted 30 Mar 2023. https://arxiv.org/html/2303.17564 (Section 2, Table 1; Section 3 Model; Section 4 Training; Table 8)
- Domain: finance.
- Base: none (from scratch). 50.6B parameters (Table "Model" row: 50.6B), BLOOM-style, 70 layers.
- Data: 363B financial (FinPile) + 345B public tokens; 708B corpus; trained on 569B tokens (approx. 80% of one epoch).
  - Section titles: "2.1 Financial Datasets (363B tokens, 51.27% of training)" and "2.2 Public Datasets (345B tokens, 48.73% of training)" (original uses a dash between token count and percentage).
  - Quote: "We trained for a total of 139,200 steps ... and ended model training after completing ~80% of one epoch through our training data (569B tokens out of the 709B tokens available)."
- General share: 48.73% public (C4, The Pile, Wikipedia).
- LR: max 6e-5, cosine with linear warmup 1800 steps, final 6e-6; mid-run LR reductions at steps 115,500, 129,900, 137,100.
- Tokenizer: new Unigram tokenizer trained on The Pile, vocabulary 2^17 = 131,072.
- After: none in paper (base model).
- Result (Table 8, external financial tasks, average): BloombergGPT 62.51 vs GPT-NeoX 51.90, OPT-66B 53.01, BLOOM-176B 54.35; ConvFinQA 43.41 vs 30.06 / 27.88 / 36.31.
- General ability: "on par or better on general NLP benchmarks" vs similar-size models (no "forgetting" applicable).

## 9. Zamba (Zyphra): annealing phase with replay

- Paper: Glorioso et al., arXiv 2405.16712, submitted 26 May 2024. https://arxiv.org/html/2405.16712 (Section II-C Annealing, Table III)
- Domain: general quality annealing (math, code, instruct, synthetic); not a vertical domain, but the clearest stated replay fraction for an anneal.
- Base: Zamba 7B phase-1 checkpoint (950B tokens of open web data).
- Anneal tokens: approx. 50B, derived: 1T total minus 950B phase 1 (Table III lists 0.95T phase 1 and 1T annealed). An explicit "50B" number is not stated in the paper text.
  - Quote: "Our total dataset consisted of just over 1 trillion tokens, of which the pretraining phase utilized 950 billion tokens."
- Mix: "We used a replay fraction of 60% original pretraining data and 40% new annealing datasets."
- General share: 60%.
- LR: phase 1 cosine 1.5e-4 -> 7.5e-5; anneal re-warmed to 1.1e-4 then exponential decay to 1e-7 (gamma 0.25). Quote: "we found that rewarming the learning rate from 0 back to the maximum learning rate and then decaying again performed better than beginning the annealing phase at the final learning rate of the original pretraining run".
- Tokenizer: unchanged.
- After: none in paper.
- Result (Table III): MMLU 50.82 -> 57.72; ARC-Challenge 43.9 -> 46.48; WinoGrande 70.8 -> 76.4.
- Forgetting: loss on original pretraining data decreased ("while we did see a decrease in loss on the original pretraining dataset, it was not as pronounced as described by miniCPM").

## 10. Chinese-LLaMA / Chinese-Alpaca (iFLYTEK / HIT)

- Paper: Cui, Yang, Yao, arXiv 2304.08177, submitted 17 Apr 2023. https://arxiv.org/html/2304.08177 (Section 2.2 vocabulary, Section 3.1 Table 2, Table 8)
- Domain: Chinese language.
- Base: LLaMA 7B, 13B, 33B.
- CPT data: 20 GB general Chinese corpus (basic); 120 GB for "Plus" versions. Token counts: not disclosed (sizes given in GB). One epoch.
- Mix: Chinese only; no English replay share stated. General share: not disclosed (no replay described).
- LR: peak 2e-4 (7B stage 1 embeddings-only 2e-4, stage 2 1e-4), 5% warm-up cosine; LoRA rank 8 on attention (and MLP for others) with embeddings and LM head trainable. Base LLaMA pretraining LR: not stated in this paper.
- Tokenizer: Chinese SentencePiece with 20,000 tokens merged into LLaMA's 32,000, giving 49,953.
  - Quote: "we obtain a merged tokenizer, which we term the Chinese LLaMA tokenizer, with a vocabulary size of 49,953."
  - Quote: "In stage 1, we fix the parameters of the transformer encoders within the model and only train the embeddings, adapting the newly added Chinese word vectors while minimizing the disturbance to the original model. In stage 2, we add LoRA weights (adapters) to the attention mechanisms and train the embeddings, LM heads, and newly added LoRA parameters." Two-stage only for basic 7B: "two-stage training is not applied to other model training as it is less efficient in our preliminary study."
  - Tokens per Chinese text approximately halved.
- After CPT: instruction tuning with LoRA on approx. 2M to 3M instructions -> Chinese-Alpaca.
- Result (Table 8, C-Eval valid zero-shot): LLaMA-13B 27.8 -> Chinese-LLaMA-13B 29.4; Chinese-Alpaca-13B 37.1. Authors: CPT gives "moderate improvements", "not always".
- Forgetting: not measured on English benchmarks.

## 11. Thomson-1.0 (Thomson Reuters, with Imperial College London, DatologyAI, Lambda)

- Technical report: "Thomson: Continual Learning of Frontier Models for SovereignAI", arXiv 2608.27147, submitted 27 Aug 2026. https://arxiv.org/html/2608.27147 (Section 3.3 Continual Pre-training, 3.3.1 "Synthetic & Replay Data", 3.3.2 Training & Capability Recovery, Figure 13; Section 3.4 DPO; Section 3.5.1 GSPO; Table 1)
- LawNext (Bob Ambrogi), 24 Aug 2026: https://www.lawnext.com/2026/08/thomson-reuters-launches-thomson-its-own-proprietary-llm-trained-on-westlaw-and-practical-law-content.html
- The Batch, published 4 Sep 2026: https://www.deeplearning.ai/the-batch/custom-models-for-law-news-and-finance
- Domain: law, tax, news, finance (professional knowledge work).
- Base: Qwen3.5-397B-A17B (instruction-tuned MoE, 397B total / 17B active) for Thomson-1.0-Large; Qwen3.6-35B for Thomson-1.0-Small. CPT is done on an instruction-tuned, then value-realigned, checkpoint.
- CPT tokens: 200B, curated from a pool of over 19T tokens (prunes "over 98%").
  - Quote: "we partnered with DatologyAI to curate a high-quality mid-training dataset of 200B tokens from a corpus of permissively public and high-quality proprietary data of over 19T tokens."
  - Quote: "we restricted our CPT budget to a modest 200B tokens, pruning over 98% of the original data."
- Mix: three roughly equal parts: curated proprietary documents, synthetic rephrasings of them (BeyondWeb-style), curated general-capability replay (DatologyAI's mid-training mix: web, math, code, multilingual, small instruction-style share).
  - Quote: "Our mid-training data mix thus comprises three roughly equal parts: curated proprietary documents, synthetic data generated from those documents, and curated general-capability replay data."
  - Quote: "Our replay data is DatologyAI's general-capability mid-training mixture. This constitutes curated web text, mathematics, code, multilingual data, and a small amount of instruction-style data."
  - Replay curation ablation: replacing Dolmino-derived replay with curated replay: code +5.4pp (HumanEval++, MBPP, MBPP++ average), PubMedQA +7.2pp, BoolQ +4.5pp.
- General share: approx. 33% (derived: one of "three roughly equal parts"). Note: LawNext quotes Schwarz saying CPT was "exclusively on TR's proprietary content", which conflicts with the report's replay third; the report is the primary technical source.
- LR: final peak LR value not disclosed; chosen per scale by short pilot sweeps (lowest stable training loss). Seq 8,192, global batch 512 (approx. 4.2M tokens/step), warmup then inverse-square-root decay, linear anneal to minimum over last 20%. Sweep grid in Figure 13 experiments: LR {2e-6, 5e-6, 1e-5, 2e-5} x tokens {20, 40, 100, 200}B, merge ratios 1:9 to 10:0. Base model's pretraining LR: not disclosed.
  - Quote: "aggressive continual pre-training followed by a conservative merge ratio ... consistently outperforms the regularised alternatives on both axes at once"
- Forgetting control: model merging of the CPT checkpoint with the pre-CPT checkpoint (final merge coefficient not disclosed). Quote: "We found that an appropriate merge coefficient can recover most of the general capability lost during continual pre-training." LoRA, lower LR and shorter schedules each "reduced the loss of general capability but weakened domain adaptation to a similar extent."
- Tokenizer: unchanged (not described as changed).
- After CPT: value re-alignment came first (Fisher-routed directional ablation + Constitutional DPO against the Public AI Constitution); after CPT: merge, two-stage DPO (no standalone SFT, "naive SFT in our setting can rapidly degrade generic capability"), then RL with GSPO (asymmetric clipping, no KL penalty).
- Cost: LawNext: "TR says it has invested some $40 million into developing Thomson over the past two years, covering both talent and compute. And during a media briefing last week, Hron revealed that the final training run for the version launching today cost just $450,000." (Joel Hron, CTO.) The Batch instead writes "invested $40 million in total training costs over three months"; LawNext's wording is from the briefing and is more specific.
- Result (Table 1, Large vs base Qwen3.5-397B): Overall avg 78.5 vs 73.0; Legal domain avg 78.4 vs 73.3; Harvey Legal Agent Benchmark 85.7 vs 70.6; Stanford LegalBench 82.3 vs 78.8; Tax domain avg 85.1 vs 81.9.
- Forgetting: measured. General domain avg 76.7 vs 73.5 (gain); Long Context 75.3 vs 53.0; but Coding 39.9 vs 43.9 and Factuality 73.7 vs 76.2 (drops). Quote: "coding, the only domain showing mild forgetting relative to the base model" (original uses a dash).

## 12. Periodic Labs Neon

- Source: Periodic Labs blog, "Nature Is Our Learning Environment", 15 Sep 2026. https://periodic.com/news/nature-is-our-learning-environment
- Domain: materials science, X-ray diffraction (XRD) analysis.
- Base: Kimi K2.6 (open-weight, "an open-weight model with 1 trillion parameters").
- CPT ("midtraining") tokens: not disclosed. Quote: "We midtrain Periodic Neon on a multimodal blend of academic literature, code, and experimental data to build broad scientific understanding. Our proprietary midtraining corpus is rapidly expanding, currently doubling every month."
- Mix / replay: not disclosed ("only a small fraction of the midtraining data focusing on XRD").
- LR: not disclosed. Tokenizer: not disclosed.
- After CPT: RL on lab data with an LLM-judge ensemble reward (judge-human agreement 74.6% vs human-human 77.2%); final run used 1,300 H200 GPUs.
- Result: FrontierXRD (134 hard samples) "55.3% success rate ... a 20x improvement over the initial 2.7% success rate of Kimi K2.6". Midtraining finding: "early ablations on midtrained Neon show higher rewards during subsequent RL training and higher success on FrontierXRD."
- Forgetting: not reported.

## 13. Optional comparisons and extras

### 13a. Llama 3 405B long-context pretraining stage (Meta)
- arXiv 2407.21783 (Jul 2024), https://arxiv.org/html/2407.21783 Section 3.4.2 and 3.4.3.
- Quote: "In Llama 3 405B pre-training, we increased context length gradually in six stages, starting from the original 8K context window and ending in the final 128K context window. This long-context pre-training stage was performed using approximately 800B training tokens."
- Adaptation criterion: "whether (1) model performance on short-context evaluations has recovered completely and (2) the model perfectly solves "needle in a haystack" tasks up to that length."
- Then annealing on the final 40M tokens, LR linearly to 0, upsampled high-quality data, checkpoint averaging. Mix share: not disclosed. Part of pretraining, not a separate domain CPT.

### 13b. OLMo 2 mid-training (Ai2)
- arXiv 2501.00656 (Dec 2024 / Jan 2025), https://arxiv.org/html/2501.00656 Section 2.3 "Stage 2: Mid-training", Appendix (Table 13).
- Quote: "For OLMo 2 7B, we anneal three separate times for 50B tokens each, with different randomized data orders; we average the resulting models to produce the final model." 13B/32B: three runs of 100B plus one of 300B, then average.
- LR: "we linearly decay the learning rate to zero over the remaining length of the run" (mid-training is 5 to 10% of training FLOPs).
- General share: "Across all mixes, filtered web data from the DCLM baseline represents roughly 50% of the total tokens budget." (approx. 50% high-quality web; the rest math, Wikipedia, FLAN, StackExchange, etc.)

### 13c. Swallow (Tokyo Tech / AIST), Llama 2 -> Japanese
- Fujii et al., "Continual Pre-Training for Cross-Lingual LLM Adaptation: Enhancing Japanese Language Capabilities", arXiv 2404.17790, submitted 27 Apr 2024. https://arxiv.org/html/2404.17790 (Section 3.1 Table 1, 3.2 Training corpora, 3.3 Vocabulary expansion, Table 4, Appendix B)
- Base: Llama 2 7B, 13B, 70B. CPT tokens: approx. 100B each.
- Mix: 90% Japanese (Swallow Corpus + approx. 1.6B tokens Japanese Wikipedia), 5% English RefinedWeb, 5% English arXiv from The Pile.
  - Quote: "The sampling was configured so that 5% of the English text comes from RefinedWeb, another 5% from English arXiv paper texts within The Pile, and the remaining 90% from Japanese texts."
  - JA:EN 9:1 chosen over 5:5 in 20B-token pilots (Appendix B).
- General share: 10% English (5% web + 5% arXiv).
- LR: 1e-4 (7B, 13B), 5e-5 (70B); cosine, 1,000 warm-up steps, decay to 1/30; batch 1024 x 4096 = 4M tokens. Relative to Llama 2's 3e-4 / 1.5e-4 (per Code Llama paper): 1/3 (derived).
- Tokenizer: 11,176 Japanese subwords added, vocab 32,000 -> 43,176; new embeddings = mean of sub-token vectors. 56.2% fewer tokens on Japanese text, up to 78% faster generation.
- After CPT: base models (instruct variants released separately, not in this paper).
- Result (Table 4, Japanese avg): 7B 32.0 -> 39.4; 13B 39.6 -> 46.3; 70B 48.3 -> 55.3.
- Forgetting (Table 4, English avg): 7B 49.0 -> 44.0 (-5.0); 13B 54.0 -> 49.2 (-4.8); 70B 62.7 -> 60.4 (-2.3). Quote: "the English scores are 2--5 points lower, but the performance drop tends to be smaller as the model size increases."

### 13d. e-Llama (eBay), Llama 3.1 -> e-commerce
- Herold et al., "Domain Adaptation of Foundation LLMs for e-Commerce", arXiv 2501.09706, submitted 16 Jan 2025. https://arxiv.org/html/2501.09706 (Section 4 learning rate and data mix, Table 2, Table 3, Table 4, Section 5)
- Base: Llama 3.1 8B and 70B. CPT tokens: 1T. Batch approx. 11.8M tokens, 85k steps, context 8k.
- Mix: 50% e-commerce, 50% general (of which 10% non-English). Quote: "In the end, we decide to continue pretraining with an e-commerce percentage of 50% in our data mix."
- General share: 50%.
- LR: 10% of Llama 3.1's pretraining peak: 3.0e-5 (8B), 1.5e-5 (70B); cosine with warmup. Quote: "In the end, we decide to use an LR_max that is 10% of the maximum learning rate used in pretraining, i.e. 3.0e-5 for the 8B model and 1.5e-5 for the 70B model."
- Result (Table 4): e-commerce benchmarks approx. +25% English, +30% non-English on average.
- Forgetting (Table 4, English general): NLU 8B 71.8 -> 71.6, 70B 76.6 -> 76.3; LLM Leaderboard 8B 17.2 -> 12.6, 70B 29.7 -> 28.7. Model merging with the base model trades off linearly.

---

## Side finding A: "re-warm CPT to about one tenth of the pretraining peak LR"

No single originator found; it is described as a common practice and adopted in several papers:
1. Herold et al. (eBay), arXiv 2501.09706, Section 4: "There are mainly 2 paradigms in existing work: (i) use the same LR_max as for the original pretraining Rozière et al. (2023) ; Chen et al. (2023) ; Shao et al. (2024) , or (ii) use a smaller value, typically around 10% of the original LR_max Azerbayev et al. (2024) ; Lewkowycz et al. (2022) ; Colombo et al. (2024a) ; Yuan et al. (2024) ; Thulke et al. (2024) ; Xie et al. (2024) ; Parmar et al. (2024) ." They adopted 10% after an ablation (higher LR gave slightly better domain perplexity but more general degradation, no domain-benchmark gain). https://arxiv.org/html/2501.09706
2. Wang et al., "Learning Dynamics in Continual Pre-Training for Large Language Models", arXiv 2505.07796 (May 2025): "A common practice for CPT is to linearly re-warmup the LR from zero to a certain value, such as 10% of the peak LR in PT, before annealing it to zero". https://arxiv.org/html/2505.07796
3. Counter-evidence / nuance: Gupta et al. 2023 (arXiv 2308.04014, Section 4.2) show that a larger max LR improves downstream (new-data) loss but increases forgetting on upstream data; Code Llama kept the full base LR; Llemma and Swallow used 1/3; ChipNeMo used 1/60 (constant 5e-6) and found 3e-4 catastrophic.
   Caveat from my check: in the Herold list, Azerbayev et al. 2024 (Llemma) actually used 1/3 of Code Llama's LR, not 10%, so the "typically around 10%" grouping is approximate.

## Side finding B: larger models forget less during CPT (measured)

1. Swallow (arXiv 2404.17790, Table 4): English average drop 7B -5.0, 13B -4.8, 70B -2.3 points after 100B tokens of 90% Japanese CPT; "the performance drop tends to be smaller as the model size increases."
2. ChipNeMo (arXiv 2311.00176, Table 7): MMLU change after DAPT: 7B -1.1 (45.7 -> 44.6), 13B -2.0 (55.4 -> 53.4), 70B +0.8 (68.6 -> 69.4). Also: "Improvements attributed to DAPT with in-domain tasks exhibit a positive correlation with model size".
3. e-Llama (arXiv 2501.09706, Table 4 and Section 5.1): English LLM Leaderboard change 8B -4.6 (17.2 -> 12.6), 70B -1.0 (29.7 -> 28.7); "The 70B model on the other hand recovers much better on the general domain tasks ... We think this might be due to the much larger model size, that allows the model to better incorporate new information without catastrophic forgetting. Also, the smaller learning rate for the 70B model might have played a role here." (confounded: the 70B also used a smaller LR).
4. DeepSeek-Coder-V2 (Table 10): knowledge drop on TriviaQA was -5.7 (16B Lite) vs -4.4 (236B); NQ -4.7 vs -5.9 (mixed; not clean evidence).

## Could not verify / caveats
- Zamba annealing token count: approx. 50B is derived (1T - 950B); not stated as "50B" in the text.
- Code Llama LCFT tokens: derived from steps x batch (and 7B used 3,000 steps, so 6B not 20B).
- Llemma 7B: stated 200B but 42,000 steps x 4M = 168B (derived).
- SaulLM-7B: CPT learning rate, number of epochs/tokens trained, and instruction-data share in the CPT mix not disclosed.
- DeepSeek-Coder-V2: numeric peak LR not disclosed (only "according to DeepSeek-V2 specifications").
- DeepSeekMath: base (Coder v1.5) pretraining peak LR not stated in that paper.
- Chinese-LLaMA: token counts not disclosed (20 GB / 120 GB only); no replay.
- Thomson-1.0: final peak LR and final merge coefficient not disclosed; general share "roughly" one third (derived 33%); cost $40M programme period differs between LawNext (two years, talent + compute) and The Batch (three months, training costs).
- Periodic Neon: midtraining tokens, mix, replay, LR all not disclosed.
- No original source found for the "one tenth" heuristic beyond the two papers that describe it as common practice.
