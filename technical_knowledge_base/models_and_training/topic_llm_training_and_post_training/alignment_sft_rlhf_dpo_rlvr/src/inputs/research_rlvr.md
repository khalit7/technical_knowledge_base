# Research notes: RLVR lineage, open problems, infrastructure, resources, Constitutional AI

Collected 2026-10-03. Every quote below was read on the page at the URL given (arXiv HTML or abstract pages, official repos and blogs). "Unconfirmed" means I could not confirm it from a source.

## 1. RLVR lineage

### (a) AlphaCode (arXiv 2203.07814), execution feedback as a filter, not RL
- Source: https://arxiv.org/abs/2203.07814 (PDF text, intro)
- Quote: "For each unseen problem we generate a large set of program samples, filter them based on execution results on example tests from the problem description, then cluster the remaining samples to obtain a small set of candidates to be submitted for evaluation."
- Abstract quote: "large-scale model sampling to explore the search space, followed by filtering based on program behavior to a small set of submissions."
- Filtering may use only competitor-visible info: "the example tests given as part of the problem description, but not the hidden tests".
- Execution results are used at inference time to select samples; the paper's training is pre-training plus fine-tuning, not RL on execution reward.

### (b) Tulu 3 (arXiv 2411.15124), coins "RLVR"
- Source: https://arxiv.org/html/2411.15124 (Section 6)
- Definition quote: "In Tülu 3, we introduce Reinforcement Learning with Verifiable Rewards (RLVR), a novel method for training language models on tasks with verifiable outcomes such as mathematical problem-solving and instruction following. RLVR leverages the existing RLHF objective but replaces the reward model with a verification function"
- Principle: "the policy only receives a reward when its generated responses are verifiably correct."
- Reward: v(x,y) = alpha if correct, 0 otherwise. Quote: "We set \alpha=10 based on pilot experiments and did not tune it further."
- Algorithm: "We train models with RLVR following preference finetuning, and we use the PPO ( Schulman et al., 2017 ) algorithm to optimize for the RLVR objective." The objective keeps a KL penalty to the reference policy (Eq. 7).
- Domains: "We focus on two domains (mathematics, exact instruction following) and three evaluations (GSM8K, MATH, IFEval)".
- Data (Table 22): GSM8K Train 7,473; MATH Train 7,500; IF verifiable 14,973; Total 29,946 prompts. Verification: exact match against extracted answer (GSM8K, MATH); prompt-specific verifiers (IF).
- Lineage the authors draw: "RLVR can be seen as a simplified form of existing approaches for bootstrapping LM reasoning (Zelikman et al., 2022 ...) or a simpler form of RL with execution feedback (Gehring et al., 2024)".

### (c) DeepSeek-R1-Zero and DeepSeek-R1 (arXiv 2501.12948; Nature)
- arXiv: https://arxiv.org/html/2501.12948 (v2, revised 4 Jan 2026; v1 22 Jan 2025)
- Nature: https://www.nature.com/articles/s41586-025-09422-z , title "DeepSeek-R1 incentivizes reasoning in LLMs through reinforcement learning", published 17 September 2025 (Nature vol. 645).
- R1-Zero: "DeepSeek-R1-Zero, which relies exclusively on reinforcement learning without supervised fine-tuning". Also: "we build upon DeepSeek-V3-Base ... and employ Group Relative Policy Optimization (GRPO) ... as our RL framework. The reward signal is solely based on the correctness of final predictions against ground-truth answers". They "bypass the conventional supervised fine-tuning (SFT) phase before RL training".
- AIME 2024: NUMBER DEPENDS ON VERSION.
  - v2 / Nature-aligned text: "the average pass@1 score on AIME 2024 shows a significant increase, jumping from an initial 15.6% to 77.9%." With self-consistency: 86.7%.
  - v1 (https://arxiv.org/pdf/2501.12948v1): "the pass@1 score on AIME 2024 increases from 15.6% to 71.0%, and with majority voting, the score further improves to 86.7%".
  - Use 15.6% to 77.9% and cite v2/Nature; mention 71.0% was the January 2025 figure.
- R1 cold start: "In the initial stage, we collect thousands of cold-start data that exhibits a conversational, human-aligned thinking process. RL training is then applied to improve the model performance with the conversational thinking process and language consistency." Appendix B.3.2: "we construct and collect a small amount of long CoT data to fine-tune the model as the initial RL actor."
- Why R1 exists: R1-Zero "struggles with challenges like poor readability, and language mixing".

### (d) OLMo 3 RL-Zero (Ai2)
- Blog: https://allenai.org/blog/olmo3 ("Olmo 3: Charting a path through the model flow to lead open-source AI"). Quotes: "Olmo 3-RL Zero (7B), is a fully open reinforcement learning pathway built on Olmo 3-Base"; "We release four series of checkpoints from domain-focused training on math, code, instruction following, and general chat"; purpose: "enabling careful study of reinforcement learning with verifiable rewards (RLVR)." Later refresh: "Olmo 3.1 RL Zero 7B Code and Olmo 3.1 RL Zero 7B Math".
- Technical report "Olmo 3": https://arxiv.org/abs/2512.13961 (Section 6 "Olmo 3 RL-Zero"). Quotes:
  - "This has made RLVR finetuning from a base model the standard large-scale benchmark for RL algorithms"
  - Problem it fixes: open RLVR benchmarks "train on top of open-weights models that do not reveal their pretraining or midtraining data", which can make "spurious rewards as effective as true rewards".
  - "We perform RLVR from Olmo 3 Base over five benchmarking domains to create the Olmo 3 RL-Zero family: math, code, precise instruction following (IF), general chat, and a mix of all listed sub-domains."
  - Data: "Dolci RL-Zero", decontaminated "from pretraining and midtraining data".

### (e) Qwen3 technical report (arXiv 2505.09388)
- Source: https://arxiv.org/html/2505.09388 (Section 4)
- Four stages (section titles): 4.1 "Long-CoT Cold Start", 4.2 "Reasoning RL", 4.3 "Thinking Mode Fusion", 4.4 "General RL" (plus 4.5 "Strong-to-Weak Distillation" for small models). Quote: "the flagship models in the Qwen3 series follow a sophisticated four-stage" training process.
- Reasoning RL: "We ultimately collect a total of 3,995 query-verifier pairs, and employed GRPO ( Shao et al., 2024 ) to update the model parameters." Confirmed 3,995.
- Result: "the AIME'24 score of the Qwen3-235B-A22B model increases from 70.1 to 85.1 over a total of 170 RL training steps."
- Fusion: "The goal of the Thinking Mode Fusion stage is to integrate the "non-thinking" capabilities into the previously developed "thinking" model."

## 2. Open problems

### (a) Does RLVR expand reasoning beyond the base model? (Yue et al., arXiv 2504.13837)
- https://arxiv.org/abs/2504.13837 ; project https://limit-of-rlvr.github.io/
- Venue: NeurIPS 2025, Best Paper Runner-Up (confirmed on https://blog.neurips.cc/2025/11/26/announcing-the-neurips-2025-best-paper-awards/).
- Quote: "While RLVR-trained models outperform their base models at small k (e.g., k = 1), the base models achieve a higher pass@k score when k is large. Coverage and perplexity analyses show that the observed reasoning abilities originate from and are bounded by the base model."
- Also: "six popular RLVR algorithms perform similarly and remain far from optimal"; "distillation can introduce new reasoning patterns from the teacher and genuinely expand the model's reasoning capabilities."

### (b) Spurious Rewards (Shao, Rulin et al., arXiv 2506.10947)
- https://arxiv.org/abs/2506.10947
- Quote: "RLVR training with GRPO improves MATH-500 performance for Qwen2.5-Math-7B by 21.4 percentage points using randomly assigned rewards, nearly matching the 29.1-point gain from ground-truth rewards."
- Mechanism: "GRPO exhibits a clipping bias from the clip term, which can amplify high-prior behaviors learned during pretraining". Code reasoning "increases from 65 percent to over 90 percent with spurious rewards."
- Caveat: "spurious rewards that are effective for Qwen models often fail to produce gains for other model families, such as Llama3 or OLMo2."

### (c) CoT-Pass@k (Wen et al., arXiv 2506.14245)
- https://arxiv.org/abs/2506.14245 (Microsoft Research Asia, Peking University)
- ICLR 2026: YES. ICLR poster page https://iclr.cc/virtual/2026/poster/10007896 resolves with this title; OpenReview https://openreview.net/forum?id=jGbRWwIidy
- Quote: "We revisit Pass@K experiments and demonstrate that RLVR can extend the reasoning boundary for both mathematical and coding tasks. This is supported by our introduction of a novel evaluation metric, CoT-Pass@K, which captures reasoning success by accounting for both the final answer and intermediate reasoning steps."
- Also: "it incentivizes correct reasoning early in the process".

### (d) Entropy collapse (Cui et al., arXiv 2505.22617)
- https://arxiv.org/abs/2505.22617 (Shanghai AI Laboratory et al.)
- Quote: "we establish a transformation equation R=-a*e^H+b between entropy H and downstream performance R. This empirical law strongly indicates that, the policy performance is traded from policy entropy, thus bottlenecked by its exhaustion, and the ceiling is fully predictable H=0, R=-a+b."
- Mechanism: "the change in policy entropy is driven by the covariance between action probability and the change in logits". Fixes: "Clip-Cov and KL-Cov, which clip and apply KL penalty to tokens with high covariances respectively."

### (e) ProRL (NVIDIA, arXiv 2505.24864)
- https://arxiv.org/abs/2505.24864 , "ProRL: Prolonged Reinforcement Learning Expands Reasoning Boundaries in Large Language Models"
- Quote: "prolonged RL (ProRL) training can uncover novel reasoning strategies that are inaccessible to base models, even under extensive sampling." Method: "KL divergence control, reference policy resetting, and a diverse suite of tasks." Pass@k: "RL-trained models consistently outperform base models across a wide range of pass@k evaluations, including scenarios where base models fail entirely regardless of the number of attempts."
- Model: Nemotron-Research-Reasoning-Qwen-1.5B (section 3 title).

### (f) Rubrics as Rewards (Gunjal et al., Scale AI, arXiv 2507.17746)
- https://arxiv.org/abs/2507.17746 , "Rubrics as Rewards: Reinforcement Learning Beyond Verifiable Domains"
- Quote: "The best RaR variant achieves relative improvements of up to 31% on HealthBench and 7% on GPQA-Diamond over popular LLM-as-judge baselines that rely on direct Likert-based rewards."
- Also: "using rubrics as structured reward signals yields better alignment for smaller judges and reduces performance variance across judge scales."

### (g) Multi-turn agentic credit assignment: GiGPO (Feng et al., arXiv 2505.10978, NeurIPS 2025)
- https://arxiv.org/abs/2505.10978 , "Group-in-Group Policy Optimization for LLM Agent Training"
- Problem quote: "agent-environment interactions unfold over many steps and often yield sparse or delayed rewards, making credit assignment across individual steps significantly more challenging."
- Method: episode-level "macro relative advantages" plus step-level "anchor state grouping mechanism that retroactively constructs step-level groups by identifying repeated environment states across trajectories."
- Headline: "achieves performance gains of > 12% on ALFWorld and > 9% on WebShop over GRPO".

## 3. Infrastructure (descriptions from the GitHub API, 2026-10-03)

| Repo | Description (verbatim) | Stars |
|---|---|---|
| verl: https://github.com/verl-project/verl (volcengine/verl now redirects here) | "verl/HybridFlow: A Flexible and Efficient RL Post-Training Framework" ; README: "verl is a flexible, efficient and production-ready RL training library for large language models (LLMs)." | 23,737 |
| OpenRLHF: https://github.com/OpenRLHF/OpenRLHF | "An Easy-to-use, Scalable and High-performance Agentic RL Framework based on Ray (PPO & DAPO & REINFORCE++ & VLM & TIS & vLLM & Ray & Async RL)" | 10,066 |
| TRL: https://github.com/huggingface/trl | "Train transformer language models with reinforcement learning." | 19,443 |
| SkyRL: https://github.com/NovaSky-AI/SkyRL | "SkyRL: A Modular Full-stack RL Library for LLMs" | 2,373 |
| NeMo-RL: https://github.com/NVIDIA-NeMo/RL | "Scalable toolkit for efficient model reinforcement" | 2,045 |
| vLLM: https://github.com/vllm-project/vllm | "A high-throughput and memory-efficient inference and serving engine for LLMs" | 93,105 |
| SGLang: https://github.com/sgl-project/sglang | "SGLang is a high-performance serving framework for large language models and multimodal models." | 36,746 |

Weight sync in verl (trainer to rollout engine):
- verl HybridFlow programming guide, https://verl.readthedocs.io/en/latest/hybrid_flow.html : "The reason for colocating actor and rollout is for fast weight transfer using nccl."
- README: "Efficient actor model resharding with 3D-HybridEngine" which "Eliminates memory redundancy and significantly reduces communication overhead during transitions between training and generation phases."
- HybridFlow paper (arXiv 2409.19256, https://arxiv.org/abs/2409.19256): "We further design a 3D-HybridEngine for efficient actor model resharding between training and generation phases, with zero memory redundancy and significantly reduced communication overhead." Reported "1.53x~20.57x throughput improvement".

## 4. Best resources

| Resource | URL | Status / title | Length |
|---|---|---|---|
| RLHF Book, Nathan Lambert | https://rlhfbook.com/ | Resolves; title "Reinforcement Learning from Human Feedback". Changelog: "July 2026 : The print, ePub, and liveBook editions were published by Manning." "August 2026 : Finished accompanying course, Amazon sales begin." First reprint October 2026. Also arXiv 2504.12501. Companion course https://rlhfbook.com/course and code https://rlhfbook.com/code | Manning page (https://www.manning.com/books/reinforcement-learning-from-human-feedback): 312 pages, "seventeen short chapters", ISBN 9781633434301 |
| Turing Post, "Reasoning RL in 2026: GRPO, DPO, RLVR, Agentic PO & Beyond" | https://www.turingpost.com/p/reasoning-rl-in-2026 | Exists; HTML title "GRPO, DPO & RLVR Explained: Reasoning RL Methods in 2026"; by Alyona Vert, Jun 7, 2026; a method list (GRPO, DPO, RLVR, DAPO, GSPO, ARPO, VPO) | Own read time unconfirmed; page text about 1,900 words, so roughly 8 min |
| HF TRL docs | https://huggingface.co/docs/trl (redirects to /docs/trl/index) | "TRL - Transformers Reinforcement Learning" | Reference docs |
| HF blog "Illustrating Reinforcement Learning from Human Feedback (RLHF)" | https://huggingface.co/blog/rlhf | Resolves; dated 2022-12-09 | about 4,100 words, roughly 15--20 min (my estimate) |
| Lilian Weng, "Reward Hacking in Reinforcement Learning" | https://lilianweng.github.io/posts/2024-11-28-reward-hacking/ | Resolves; November 28, 2024 | Page states "Estimated Reading Time: 37 min" |
| Sebastian Raschka, "The State of Reinforcement Learning for LLM Reasoning" | https://magazine.sebastianraschka.com/p/the-state-of-llm-reasoning-model-training | Resolves; 2025-04-19 | about 8,250 words, roughly 35 min (my estimate) |
| Cameron Wolfe, "Direct Preference Optimization (DPO)" | https://cameronrwolfe.substack.com/p/direct-preference-optimization | Resolves; 2025-07-28 | about 7,450 words, roughly 30 min (my estimate) |
| Cameron Wolfe, "Group Relative Policy Optimization (GRPO)" | https://cameronrwolfe.substack.com/p/grpo | Resolves; 2025-11-24 | about 11,700 words, roughly 45 min (my estimate) |

Word counts are whole-page text (includes some navigation and references), so estimates run high.

## 5. Constitutional AI (arXiv 2212.08073)
- https://arxiv.org/abs/2212.08073 ; HTML https://arxiv.org/html/2212.08073
- Abstract: "The process involves both a supervised learning and a reinforcement learning phase. In the supervised phase we sample from an initial model, then generate self-critiques and revisions, and then finetune the original model on revised responses. In the RL phase, we sample from the finetuned model, use a model to evaluate which of the two samples is better, and then train a preference model from this dataset of AI preferences. We then train with RL using the preference model as the reward signal, i.e. we use 'RL from AI Feedback' (RLAIF)."
- Only human oversight: "a list of rules or principles, and so we refer to the method as 'Constitutional AI'."
- Principle counts: 16 in each phase.
  - SL phase (critique and revision): "the critique and revision instructions (which collectively form a constitutional 'principle') ... We have written a total of 16 different principles". Footnote: "These principles were selected in an ad hoc manner for research purposes".
  - RL phase (AI preference labels): "we wrote a set of 16 different principles, and randomly sampled a principle for each comparison label." And: "we ensemble over 16 pre-written constitution principles".
  - Appendix C.1 "Principles for SL-CAI" and C.2 "Principles for RL-CAI" are separate lists.
- Model names: the SL model is "referred to as 'SL-CAI'"; the RL model "RL-CAI" (also "RL-CAI w/ CoT").
- Anthropic's 2026 constitution: "Claude's new constitution", Jan 22, 2026, https://www.anthropic.com/news/claude-new-constitution ; full text https://www.anthropic.com/constitution ("Claude's Constitution"). Quote: "We're publishing a new constitution for our AI model, Claude. It's a detailed description of Anthropic's vision for Claude's values and behavior".

## Corrections to the brief
- DeepSeek-R1-Zero AIME 2024: 15.6% to 77.9% is right for arXiv v2 / Nature; v1 said 71.0%.
- verl's canonical repo is now verl-project/verl; volcengine/verl redirects there.
- Tulu 3 RLVR used PPO with alpha = 10 (confirmed). Qwen3 used 3,995 query-verifier pairs with GRPO (confirmed).
