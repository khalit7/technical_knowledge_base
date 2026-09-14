# DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models

⏱ 14 min read · +~4h 15m resources

- **Authors/lab**: Zhihong Shao, Peiyi Wang, Qihao Zhu, Runxin Xu, Junxiao Song, et al. (DeepSeek-AI, with Tsinghua and Peking University)
- **Date**: February 2024 (arXiv v1; v3 April 2024)
- **Links**: [arXiv 2402.03300](https://arxiv.org/abs/2402.03300) (~1h 30m, long paper) | [GitHub](https://github.com/deepseek-ai/DeepSeek-Math) (repo, ~20 min for the README and entry path) | [Models on HF](https://huggingface.co/deepseek-ai/deepseek-math-7b-rl) (~10 min)

This is the paper that introduced **GRPO (Group Relative Policy Optimization)**, later the default RL algorithm for reasoning models (DeepSeek-R1 and most of the open RLVR ecosystem). It also built a 120B-token math corpus from Common Crawl that let a 7B model match Minerva 540B.

## Best resources

- [A vision researcher's guide to PPO & GRPO (Yuge Shi)](https://yugeten.github.io/posts/2025/01/ppogrpo/) (~40 min): the clearest from-first-principles walkthrough of the PPO machinery and exactly what GRPO deletes from it.
- [RLHF Book, Policy Gradient chapter (Nathan Lambert)](https://rlhfbook.com/c/11-policy-gradients.html) (~30 min): GRPO in the context of REINFORCE/PPO variants, with the advantage formulas and implementation caveats side by side.
- [TRL GRPOTrainer docs](https://huggingface.co/docs/trl/grpo_trainer) (docs, ~20 min for the core pages): the reference open implementation; the loss section documents where modern practice diverges from the paper (loss aggregation, KL handling).
- [Understanding R1-Zero-Like Training (Dr. GRPO paper)](https://arxiv.org/abs/2503.20783) (~45 min): the critical follow-up identifying GRPO's length and difficulty biases; read after the original.

## Problem

Open models trailed far behind GPT-4 and Gemini Ultra on competition math (best open result on MATH was around 25-36% vs GPT-4's ~53%). Two bottlenecks: no public math pretraining corpus of sufficient scale and quality (Minerva's data was closed; OpenWebMath was only 13.6B tokens), and RLHF via PPO was memory-hungry and awkward for reasoning tasks, since it needs a critic (value model) as large as the policy while the reward arrives only at the final token.

## Method

### 1. Math corpus mining from Common Crawl (brief)

An iterative fastText loop over deduplicated Common Crawl (40B HTML pages after URL dedup):

1. Train a fastText classifier with 500K OpenWebMath pages as positives and 500K random CC pages as negatives (dim 256, word n-grams up to 3, 3 epochs).
2. Score and rank all CC pages, keep the top-ranked tokens (top 40B in round one).
3. Group CC into domains; any domain with over 10% of its pages recalled is flagged math-related (e.g. mathoverflow.net). Humans annotate math URL patterns inside those domains; still-uncollected pages under those URLs become new positives.
4. Retrain the classifier and repeat. Four iterations yield 35.5M pages, 120B tokens; by iteration 3 nearly 98% of the data was already found, so they stopped.

Decontamination: drop any page containing a 10-gram exactly matching GSM8K, MATH, CMATH or AGIEval text (exact match for 3-9 gram benchmark segments). In controlled 1.3B/150B-token runs the corpus beats MathPile, OpenWebMath and Proof-Pile-2 by wide margins and keeps improving where the smaller corpora plateau from repetition; it is also multilingual (English and Chinese).

**DeepSeekMath-Base 7B**: continue pretraining DeepSeek-Coder-Base-v1.5 7B for 500B tokens (56% math corpus, 20% GitHub code, 10% arXiv, 10% CC natural language, 4% AlgebraicStack). Two side findings that became folklore: starting from a code model beats starting from a general LLM (code training measurably helps math, both tool-free and tool-using), and arXiv papers were surprisingly ineffective as math pretraining data in their ablations.

**SFT**: 776K English and Chinese math examples in CoT, program-of-thought, and tool-integrated formats gives DeepSeekMath-Instruct 7B.

### 2. GRPO (the main event)

**From PPO to GRPO.** PPO maximizes the clipped surrogate objective with a per-token advantage A_t from GAE, which requires learning a value function. That critic is a second full-size model (memory and compute), and it is trained to predict per-token values from a reward that in the LLM setting only exists at the last token, which makes it noisy and hard to fit. GRPO deletes the critic and replaces the learned baseline with an empirical one: the mean reward of a group of samples for the same question.

**The objective.** For each question q, sample G outputs {o_1..o_G} from the old policy. Maximize:

```
J = E [ (1/G) sum_i (1/|o_i|) sum_t { min( r_{i,t}(theta) A_{i,t}, clip(r_{i,t}(theta), 1-eps, 1+eps) A_{i,t} ) - beta * D_KL[pi_theta || pi_ref] } ]
```

where r_{i,t}(theta) = pi_theta(o_{i,t} | q, o_{i,<t}) / pi_theta_old(o_{i,t} | q, o_{i,<t}) is the per-token importance ratio. Two deliberate departures from PPO:

- The **KL penalty moves out of the reward and into the loss** as an explicit regularizer against the reference policy, so it does not contaminate the advantage estimate. It uses Schulman's unbiased k3 estimator, D_KL = pi_ref/pi_theta - log(pi_ref/pi_theta) - 1, which is always nonnegative.
- The **advantage is group-relative**, not critic-based. This matches how reward models are trained (on comparisons between answers to the same question), so relative scores are exactly what the RM is calibrated to provide.

**Outcome supervision.** Score each full output with the reward model to get r_1..r_G, normalize within the group, and give every token of output i the same advantage: A_{i,t} = (r_i - mean(r)) / std(r). This is the variant everyone now means by "GRPO".

**Process supervision.** A process reward model scores each reasoning step; step rewards are normalized across all steps of all G outputs, and the advantage of token t is the sum of normalized rewards of all steps ending at or after t. In their ablations process supervision (GRPO+PS) beats outcome supervision (GRPO+OS), especially on MATH.

**Iterative GRPO.** As the policy improves, the fixed reward model becomes stale. So they alternate: after each RL round, retrain the RM on samples from the current policy (with a 10% replay of historical data), reset the reference model to the current policy, and continue. Two iterations gave clear gains, most of it in the first.

**Training recipe (DeepSeekMath-RL 7B).** Start from Instruct 7B; RL only on ~144K GSM8K/MATH CoT questions (other SFT data deliberately excluded to test generalization). RM initialized from Base 7B (LR 2e-5). Policy LR 1e-6, KL coefficient beta = 0.04, **G = 64 samples per question**, max length 1024, batch 1024, and a single policy gradient update per sampling batch (so effectively on-policy; the eps clipping barely binds).

### 3. Unified paradigm: SFT, RFT, DPO, PPO, GRPO as one gradient

Section 5.2 rewrites every post-training method's gradient as

```
grad J = E_{(q,o) ~ D} [ (1/|o|) sum_t GC(q, o, t, r) * grad log pi_theta(o_t | q, o_<t) ]
```

so methods differ only in three knobs: **data source** (offline: sampled once from the SFT model, as in RFT and DPO; online: sampled from the current policy, as in Online RFT, PPO, GRPO), **reward function** (rule-based correctness vs learned model), and **gradient coefficient GC** (SFT: constant 1; RFT: binary indicator of answer correctness; DPO: sigmoid-weighted pairwise term; PPO/GRPO: advantage-weighted). Their ablations then isolate each knob: Online RFT overtakes offline RFT late in training (the policy drifts from the SFT model, so fresh samples matter); GRPO beats Online RFT because graded, reward-proportional GC penalizes wrong answers with varying strength instead of uniformly reinforcing correct ones; PS beats OS; iterative RL beats static. It is the cleanest published mental model for why these methods behave differently.

**Why RL works (and its limit).** RL boosts Maj@K but not Pass@K: the underlying capability distribution barely moves; RL reweights probability mass toward already-reachable correct answers. This observation prefigured the whole 2025 "does RLVR add capability or just sharpen the distribution" debate.

## Results

- **DeepSeekMath-Base 7B**: 64.2% GSM8K, 36.2% MATH; beats all open base models including Llemma-34B by over 10 points absolute on MATH, and matches Minerva 540B (77x larger) despite being 7B.
- **DeepSeekMath-Instruct 7B**: 46.8% MATH, above all open models and most proprietary ones (Inflection-2, Gemini Pro) by 9+ points absolute.
- **DeepSeekMath-RL 7B**: GSM8K 82.9 -> 88.2, MATH 46.8 -> **51.7%** (first open model over 50% on MATH), plus out-of-domain gains (CMATH 84.6 -> 88.8) despite RL touching only GSM8K/MATH questions. 60.9% MATH with self-consistency over 64 samples.
- Corpus ablation: at 1.3B scale, the DeepSeekMath Corpus beats MathPile, OpenWebMath and Proof-Pile-2 on every benchmark, with a steeper, non-plateauing learning curve.

## Why it matters

- **GRPO became the default RLVR algorithm.** DeepSeek-R1 and R1-Zero run GRPO with rule-based (verifiable) rewards instead of a learned RM, which is what made large-scale reasoning RL cheap and stable enough to work; the open ecosystem (HF open-r1, TRL's GRPOTrainer, verl, most 2025 reasoning-RL papers) standardized on it. Dropping the critic roughly halves the trained-model memory of PPO and removes its hardest-to-tune component.
- **Known biases and later fixes** (worth building into any from-scratch loop): **Dr. GRPO** (arXiv 2503.20783) shows the 1/|o_i| length normalization rewards long wrong answers and the std(r) division over-weights too-easy and too-hard questions; the fix is to drop both terms (giving an unbiased REINFORCE-style estimator with a group-mean baseline). **DAPO** (arXiv 2503.14476) adds clip-higher (decoupled eps_low/eps_high to preserve exploration), dynamic sampling (discard groups where all rewards are equal, since their advantage is zero and they only dilute the batch), token-level loss aggregation, and overlong-response shaping. Much later work also drops the KL term entirely when the reward is verifiable. TRL implements most of these as flags.
- The data pipeline chapter is still one of the best public recipes for domain-targeted CC mining (fastText recall + domain discovery + human URL annotation), and the "code pretraining helps reasoning, arXiv does not" ablations shaped later data-mixing decisions.

## Connections

- [2022-03_instructgpt](../2022-03_instructgpt/): the PPO-based RLHF pipeline that GRPO simplifies; GRPO keeps its clipping and KL-to-reference ideas.
- [2023-05_dpo](../2023-05_dpo/): fellow "remove a model from the RLHF stack" method; the unified paradigm here places DPO as offline, rule-rewarded, pairwise GC.
- [2025-01_deepseek-r1](../2025-01_deepseek-r1/): GRPO at scale with verifiable rewards; the direct descendant.
- [2024-12_deepseek-v3](../2024-12_deepseek-v3/): the model family whose post-training inherits this pipeline.
- KB topics: [topics/rl](../../topics/rl/) (RL for LLMs, RLVR, GRPO), [topics/llm-training-and-post-training](../../topics/llm-training-and-post-training/) (alignment), [topics/data-curation-and-datasets](../../topics/data-curation-and-datasets/) (CC mining pipeline).
