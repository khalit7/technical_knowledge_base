# Research notes: RLHF reward model, DPO family, online vs offline, RLAIF

Verified 2026-10-03 against the sources linked. Formulas are copied from the arXiv HTML (LaTeX alttext) or PDF text; "verbatim" means copied, with dashes normalised to hyphens. "unconfirmed" means I could not check it in a primary source. arXiv HTML pages serve the latest version; v1 dates come from each abstract page's submission history.

---

## 1. Bradley-Terry reward model loss (InstructGPT)

- **Paper:** "Training language models to follow instructions with human feedback" (Ouyang et al.), OpenAI. arXiv 2203.02155, v1 Fri 4 Mar 2022.
- **Source:** https://arxiv.org/abs/2203.02155 (PDF text, Section 3.5 and Appendix C.2)
- **Eq. 1 as printed:**
  `loss(θ) = -(1 / C(K,2)) · E_{(x, y_w, y_l) ~ D} [ log( σ( r_θ(x, y_w) - r_θ(x, y_l) ) ) ]`
  Symbols, verbatim: "where r_θ(x, y) is the scalar output of the reward model for prompt x and completion y with parameters θ, y_w is the preferred completion out of the pair of y_w and y_l, and D is the dataset of human comparisons." σ is the sigmoid. The 1/C(K,2) factor averages over every pair from one prompt.
- **K choose 2, verbatim:** "we present labelers with anywhere between K = 4 and K = 9 responses to rank. This produces C(K,2) comparisons for each prompt shown to a labeler." Also: "we train on all C(K,2) comparisons from each prompt as a single batch element. This is much more computationally efficient because it only requires a single forward pass of the RM for each completion (rather than C(K,2) forward passes for K completions) and, because it no longer overfits, it achieves much improved validation accuracy and log loss."
- **Why one batch element per prompt:** "if we simply shuffle the comparisons into one dataset, a single pass over the dataset caused the reward model to overfit."
- **RM size:** "In this paper we only use 6B RMs, as this saves a lot of compute, and we found that 175B RM training could be unstable and thus was less suitable to be used as the value function during RL." Appendix C.2: "We trained a single 6B reward model which we used for all PPO models of all sizes." Hyperparameters: one epoch, lr 9e-6, cosine schedule down to 10%, batch size 64 (distinct prompts per batch).
- **Inter-annotator agreement, verbatim:** "training labelers agree with each-other 72.6 ± 1.5% of the time, while for held-out labelers this number is 77.3 ± 1.3%. For comparison, in the summarization work of Stiennon et al. (2020) researcher-researcher agreement was 73 ± 4%." The Discussion rounds this to "we found the inter-labeler agreement to be about 73%." So "about 73%" is the paper's own rounded figure.
- **RM accuracy, verbatim (Section 4.1):** "These RMs have an accuracy of 69.6 ± 0.9% on predicting the preferences of labelers in the held-out group, a small decrease from their 72.4 ± 0.4% accuracy on predicting the preferences of labelers in their training set." (5-fold cross-validation over labeler groups, 6B RMs.)
- Reference model: n/a (RM stage). Paired data: yes (ranked K-way, used as pairs).

---

## 2. DPO

- **Paper:** "Direct Preference Optimization: Your Language Model is Secretly a Reward Model". Rafailov, Sharma, Mitchell, Ermon, Manning, Finn. Stanford. arXiv 2305.18290, v1 29 May 2023.
- **Source:** https://arxiv.org/html/2305.18290
- **Eq. 4 (optimal policy of the KL-constrained objective):** `π_r(y|x) = (1/Z(x)) π_ref(y|x) exp( (1/β) r(x,y) )`, with `Z(x) = Σ_y π_ref(y|x) exp( (1/β) r(x,y) )` "the partition function".
- **Eq. 5 (reward in terms of policy):** `r(x,y) = β log( π_r(y|x) / π_ref(y|x) ) + β log Z(x)`. Under Bradley-Terry only reward differences matter, so Z(x) cancels.
- **Eq. 7 (loss):**
  `L_DPO(π_θ; π_ref) = -E_{(x, y_w, y_l) ~ D} [ log σ( β log( π_θ(y_w|x) / π_ref(y_w|x) ) - β log( π_θ(y_l|x) / π_ref(y_l|x) ) ) ]`
- **Gradient (Section 4, "What does the DPO update do?"):**
  `∇_θ L_DPO(π_θ; π_ref) = -β E_{(x, y_w, y_l) ~ D} [ σ( r̂_θ(x, y_l) - r̂_θ(x, y_w) ) [ ∇_θ log π(y_w|x) - ∇_θ log π(y_l|x) ] ]`
  Underbraces as printed: σ(...) "higher weight when reward estimate is wrong"; first gradient "increase likelihood of y_w"; second "decrease likelihood of y_l".
  Verbatim: "where r̂_θ(x,y) = β log( π_θ(y|x) / π_ref(y|x) ) is the reward implicitly defined by the language model π_θ and reference model π_ref (more in Section 5)." And: "a naïve version of this method without the weighting coefficient can cause the language model to degenerate (Appendix Table 3)."
- **Theorem 1 (Section 5.1):** "Under mild assumptions, all reward classes consistent with the Plackett-Luce (and Bradley-Terry in particular) models can be represented with the reparameterization r(x,y) = β log π(y|x)/π_ref(y|x) for some model π(y|x) and a given reference model π_ref(y|x)."
- **Hyperparameters (Appendix B), verbatim:** "Unless noted otherwise, we use a β=0.1, batch size of 64 and the RMSprop optimizer with a learning rate of 1e-6 by default. We linearly warmup the learning rate from 0 to 1e-6 over 150 steps. For TL;DR summarization, we use β=0.5, while rest of the parameters remain the same."
- **Problem it fixes:** RLHF is "complex and often unstable": fitting a reward model, then RL with sampling in the loop. DPO solves the same KL-constrained objective with a classification loss, with no reward model and no sampling during training.
- **Reference model:** yes. **Paired data:** yes.
- **Headline, verbatim:** "DPO has a win rate of approximately 61% at a temperature of 0.0, exceeding the performance of PPO at 57% at its optimal sampling temperature of 0.0" (TL;DR, GPT-4 judged vs reference summaries). Human eval: "DPO samples at temperature 0.25 were preferred 58% times over PPO samples at temperature 0."

---

## 3. IPO (Identity Preference Optimisation, ΨPO)

- **Paper:** "A General Theoretical Paradigm to Understand Learning from Human Preferences". Azar, Rowland, Piot, Guo, Calandriello, Valko, Munos. Google DeepMind. arXiv 2310.12036, v1 18 Oct 2023.
- **Source:** https://arxiv.org/html/2310.12036
- **h definition (as printed):** `h_π(y, y') = log( π(y) π_ref(y') / ( π(y') π_ref(y) ) )` (context x omitted in the paper's notation).
- **Empirical IPO loss, Eq. 17 (as printed):**
  `E_{(y_w, y_l) ~ D} [ ( h_π(y_w, y_l) - τ^{-1}/2 )^2 ]`
  τ is the KL-regularisation strength (TRL's `beta` maps to τ for `loss_type="ipo"`). Eq. 17 is derived from the symmetric sampled loss (Eq. 16), using both (y_w, y_l, 1) and (y_l, y_w, 0).
- **Interpretation, verbatim:** "IPO learns from preferences dataset simply by regressing the gap between log-likelihood ratios log(π(y_w)/π(y_l)) and log(π_ref(y_w)/π_ref(y_l)) to τ^{-1}/2 ... In other words IPO, unlike DPO, always regularizes its solution towards π_ref by controlling the gap between the log-likelihood ratios ... thus avoiding the over-fitting to the preference dataset."
- **The argument that DPO overfits deterministic preferences (Section 4.2), verbatim:** "Consider the simple example where we have two actions y and y' such that p*(y ≻ y') = 1, i.e., y is always preferred to y'. Then the Bradley-Terry model would require that (r(y) - r(y')) → +∞ to satisfy (1). If we plug this into the optimal policy (7) then we would get that π*(y')/π*(y) = 0 (i.e., π*(y') = 0) irrespective of what constant τ is used for the KL-regularisation. Thus the strength of the KL-regularisation becomes weaker and weaker the more deterministic the preferences."
  Finite data: "Even if the true preference is, e.g., p*(y ≻ y') = 0.8, empirically it can be very possible when we only have a few data points to estimate p̂(y ≻ y') = 1, in which case the empirical optimal policy would make π(y') = 0 for any τ."
  Why RLHF suffers less: with {0,1} preferences "the reward function ends up being underfit ... DPO, in avoiding the training of the reward function, loses the regularisation of the policy that the underfitted reward function affords."
- **Worked example (Section 5.3):** two actions, p*(y1 ≻ y2) = 1, uniform π_ref. DPO converges to π(y1) = 1 for every τ; IPO gives `π*(y1) = σ(0.5 τ^{-1})`, so large τ keeps it near uniform.
- **Hyperparameters:** none for LLMs. Experiments are illustrative bandits only; the conclusion says "Future works should scale those experiments to more complex settings such as training language models".
- **Reference model:** yes. **Paired data:** yes.
- **Headline:** qualitative only: "DPO always converges to the deterministic policy for all values of τ ... IPO prevent the policy from becoming greedy when the regularisation is strong." No LLM benchmark numbers.

---

## 4. cDPO (conservative DPO, label smoothing)

- **Note:** "A note on DPO with noisy preferences & relationship to IPO", Eric Mitchell, "November 25, 2023 (v1.1)". Stanford (author's affiliation at the time; the note itself lists no affiliation). Not on arXiv.
- **Source:** https://ericmitchell.ai/cdpo.pdf (PDF text read directly)
- **Setup, verbatim:** "What if preference labels are noisy? Say the labels have been flipped with some small probability ϵ ∈ (0, 0.5). We can use a conservative target distribution instead, p(y_w ≻ y_l) = 1 - ϵ, giving BCE loss:"
- **Eq. 3 and 4 (as printed):**
  `L^ϵ_DPO(θ, y_w, y_l) = -(1 - ϵ) log p̂_θ(y_w ≻ y_l) - ϵ log(1 - p̂_θ(y_w ≻ y_l))`
  `= (1 - ϵ) L_DPO(θ, y_w, y_l) + ϵ L_DPO(θ, y_l, y_w)`
  where `p̂_θ(y_w ≻ y_l) = σ( β log π_θ(y_w)/π_ref(y_w) - β log π_θ(y_l)/π_ref(y_l) )` (inputs x omitted in the note).
- **Gradient, Eq. 8:** `∇_θ L^ϵ_DPO = ( σ(β h) - (1 - ϵ) ) [ ∇_θ log π_θ(y_w) - ∇_θ log π_θ(y_l) ]`, with `h = log π_θ(y_w)/π_ref(y_w) - log π_θ(y_l)/π_ref(y_l)`. IPO gradient, Eq. 7: `( h - 1/(2β) ) [ same ]`.
- **Key claim, verbatim:** "The gradient is zero when p̂_θ(y_w ≻ y_l) = (1 - ϵ), i.e., our (implicit) reward assigns the desired confidence level in this training example under the Bradley-Terry model. For normal DPO, the gradient is never zero!" TL;DR: "conservative DPO trains the model until a desired improvement in the implicit probability assigned by the model to the observed preferences is met; IPO trains the model until a desired improvement in implicit reward is met."
- **Reference implementation:** https://github.com/eric-mitchell/direct-preference-optimization/blob/main/trainers.py, `preference_loss()`, verbatim:
  ```python
  logits = pi_logratios - ref_logratios  # also known as h_{\pi_\theta}^{y_w,y_l}
  if ipo:
      losses = (logits - 1/(2 * beta)) ** 2  # Eq. 17 of https://arxiv.org/pdf/2310.12036v2.pdf
  else:
      # Eq. 3 https://ericmitchell.ai/cdpo.pdf; label_smoothing=0 gives original DPO (Eq. 7 of https://arxiv.org/pdf/2305.18290.pdf)
      losses = -F.logsigmoid(beta * logits) * (1 - label_smoothing) - F.logsigmoid(-beta * logits) * label_smoothing
  ```
  Docstring: "label_smoothing: conservativeness for DPO loss, which assumes that preferences are noisy (flipped with probability label_smoothing)"; "beta: ... typically something in the range of 0.1 to 0.5."
- **Reference model:** yes. **Paired data:** yes. **Recommended ϵ:** none given in the note (unconfirmed). **Headline numbers:** none; it is a 1-page note.

---

## 5. SimPO

- **Paper:** "SimPO: Simple Preference Optimization with a Reference-Free Reward". Yu Meng (University of Virginia), Mengzhou Xia, Danqi Chen (Princeton Language and Intelligence). arXiv 2405.14734, v1 23 May 2024.
- **Source:** https://arxiv.org/html/2405.14734 ; code https://github.com/princeton-nlp/SimPO
- **Eq. 4 (reward):** `r_SimPO(x,y) = (β/|y|) log π_θ(y|x) = (β/|y|) Σ_{i=1}^{|y|} log π_θ(y_i | x, y_<i)`
- **Eq. 5 (margin):** `p(y_w ≻ y_l | x) = σ( r(x,y_w) - r(x,y_l) - γ )`, "a target reward margin term, γ > 0".
- **Eq. 6 (loss):**
  `L_SimPO(π_θ) = -E_{(x, y_w, y_l) ~ D} [ log σ( (β/|y_w|) log π_θ(y_w|x) - (β/|y_l|) log π_θ(y_l|x) - γ ) ]`
  |y| is the response length in tokens; β "a constant that controls the scaling of the reward difference".
- **Problem it fixes:** DPO's reward (a log-ratio against a reference) differs from the average log-likelihood that guides generation, and DPO needs a reference model. "removing the length normalization term from the reward formulation results in a bias toward generating longer but lower-quality sequences".
- **Hyperparameters, verbatim:** "Generally, for SimPO, setting β between 2.0 and 2.5 and γ between 0.5 and 1.5 leads to good performance across all setups." Table 8 (β, γ, lr): Mistral-Base 2.0, 1.6, 3e-7; Mistral-Instruct 2.5, 0.3, 5e-7; Llama-3-Base 2.0, 1.0, 6e-7; Llama-3-Instruct 2.5, 1.4, 1e-6. Llama-3-Instruct v0.2: "β=10 and γ=3". Learning rates searched in [3e-7, 5e-7, 6e-7, 1e-6], batch size 128.
- **γ/β ratio (GitHub README, not the paper):** "We recommend using `0.5` as a starting point for `gamma_beta_ratio` and grid searching between `0` and `1`." README table (β, γ/β): Mistral-Base 2.0/0.8, Mistral-Instruct 2.5/0.1, Llama3-Base 2.0/0.5, Llama3-Instruct 2.5/0.55, Llama3-Instruct v0.2 10/0.3, Gemma 10/0.5. README also: "SimPO requires a much larger `beta` than DPO."
- **Reference model:** no. **Paired data:** yes.
- **Headline, verbatim:** "SimPO outperforms DPO by up to 6.4 points on AlpacaEval 2 and by up to 7.5 points on Arena-Hard." Best model: "Gemma-2-9B-it, achieves a 72.4% length-controlled win rate on AlpacaEval 2, a 59.1% win rate on Arena-Hard". (The v1 abstract quoted in TRL's docs reports the earlier best: Llama3-8B-Instruct "44.7 length-controlled win rate on AlpacaEval 2 ... 33.8 win rate on Arena-Hard".)
- **Caveat the paper reports (Appendix):** preference optimisation can hurt GSM8K and MMLU; "using a higher learning rate results in a stronger model in chat-oriented benchmarks, at the cost of catastrophic forgetting on GSM8K and MMLU."

---

## 6. ORPO

- **Paper:** "ORPO: Monolithic Preference Optimization without Reference Model". Jiwoo Hong, Noah Lee, James Thorne. KAIST AI. arXiv 2403.07691, v1 12 Mar 2024.
- **Source:** https://arxiv.org/html/2403.07691 ; code https://github.com/xfactlab/orpo
- **Eq. 3 (length-normalised likelihood), verbatim:** "the average log-likelihood of generating the output sequence y, of length m tokens": `log P_θ(y|x) = (1/m) Σ_{t=1}^{m} log P_θ(y_t | x, y_<t)`. **So yes, the odds use the length-normalised (per-token geometric mean) probability.**
- **Eq. 4:** `odds_θ(y|x) = P_θ(y|x) / (1 - P_θ(y|x))`. Eq. 5: `OR_θ(y_w, y_l) = odds_θ(y_w|x) / odds_θ(y_l|x)`.
- **Eq. 6:** `L_ORPO = E_{(x, y_w, y_l)} [ L_SFT + λ · L_OR ]`
- **Eq. 7:** `L_OR = -log σ( log( odds_θ(y_w|x) / odds_θ(y_l|x) ) )`. L_SFT is the NLL on the chosen response.
- **λ values used, verbatim:** "λ of 0.25 was applied for Phi-2"; "ORPO with λ of 0.2 on Llama-2 (7B)"; "Mistral (7B) ... ORPO with λ of 0.1". (TRL: ORPOConfig `beta` defaults to 0.1 and "In the paper, it is denoted by λ".)
- **Problem it fixes:** removes the separate SFT stage and the reference model; "a minor penalty for the disfavored generation style is sufficient for preference-aligned SFT". The authors argue the odds ratio is gentler than the probability ratio: "the probability ratio leads to more extreme discrimination of the disfavored responses than the odds ratio."
- **Reference model:** no. **Paired data:** yes. **Separate SFT stage:** no (single stage).
- **Headline, verbatim (abstract):** "fine-tuning Phi-2 (2.7B), Llama-2 (7B), and Mistral (7B) with ORPO on the UltraFeedback alone surpasses the performance of state-of-the-art language models with more than 7B and 13B parameters: achieving up to 12.20% on AlpacaEval 2.0 (Figure 1), 66.19% on IFEval (instruction-level loose, Table 6), and 7.32 in MT-Bench". Table 1: Mistral-ORPO-β 7B 91.41% (AlpacaEval 1.0) and 12.20% (AlpacaEval 2.0), vs Zephyr-β 90.60% and 10.99%.

---

## 7. KTO

- **Paper:** "KTO: Model Alignment as Prospect Theoretic Optimization". Kawin Ethayarajh, Winnie Xu, Niklas Muennighoff, Dan Jurafsky, Douwe Kiela. Stanford and Contextual AI. arXiv 2402.01306, v1 2 Feb 2024.
- **Source:** https://arxiv.org/html/2402.01306 ; code https://github.com/ContextualAI/HALOs
- **Eq. 8 (loss, as printed in the current version):**
  `L_KTO(π_θ, π_ref) = E_{x,y ~ D} [ λ_y - v(x,y) ]`
  where
  `r_θ(x,y) = log( π_θ(y|x) / π_ref(y|x) )`
  `z_0 = KL( π_θ(y'|x) || π_ref(y'|x) )`
  `v(x,y) = λ_D σ( β ( r_θ(x,y) - z_0 ) )` if y is desirable given x; `λ_U σ( β ( z_0 - r_θ(x,y) ) )` if y is undesirable given x.
  "Where λ_y denotes λ_D (λ_U) when y is desirable (undesirable) respectively". "For more stable training, we do not backpropagate through z_0; it exists purely to control the loss saturation."
  (TRL writes the same loss as `E[ w(y) (1 - v(x,y)) ]` with w(y) = desirable_weight or undesirable_weight and calls it "Eq. 7 of the paper"; the equation number differs between paper versions.)
- **z_0 estimate, verbatim:** "we take a biased but convenient estimate by shifting outputs in the same microbatch to induce mismatched pairs {(x_1,y_2), (x_2,y_3), ..., (x_m,y_1)}, then estimating a shared reference point z_0 for all examples in the same microbatch":
  `ẑ_0 = max( 0, (1/m) Σ_{1≤i≤m} log( π_θ(y_j|x_i) / π_ref(y_j|x_i) ) )`, with `j = (i mod m) + 1`.
  "Clamping introduces an additional upward bias while reducing variance." "KTO needs a microbatch size ≥ 2 to estimate the reference point in a single step."
- **Defaults, verbatim:** "A default choice of β=0.1 works well in most cases." Smaller β ∈ [0.01, 0.10) if the model was already fine-tuned on the same data; larger β ∈ (0.10, 0.50] if the reference is already aligned. "λ_D, λ_U control the degree of loss aversion, which are both set to 1 by default." Learning rate: "we recommend starting at 5e-6 with AdamW" (experiments used DPO's lr with RMSProp for parity). Effective batch size 32 in experiments; recommended 8 to 128.
- **Desirable:undesirable guidance, verbatim:** "it is generally best to set λ_D, λ_U such that λ_D n_D / (λ_U n_U) ∈ [1, 3/2]" ... "if there were a 1:10 ratio of desirable to undesirable examples, we would set λ_U = 1, λ_D ∈ [10, 15]." When 90% of desirable data was dropped: "we set λ_U = 1, λ_D = 13.33".
  **Discrepancy:** TRL's KTO docs say the ratio should be "in the range 1:1 to 4:3", not the paper's [1, 3/2]. Cite the paper.
- **Problem it fixes:** needs only a binary desirable/undesirable signal per output, not pairs: "KTO does not need preferences -- only a binary signal of whether an output is desirable or undesirable for a given input."
- **Reference model:** yes. **Paired data:** no (unpaired binary labels).
- **Headline, verbatim:** "KTO matches or exceeds DPO performance at scales from 1B to 30B parameters" (Pythia 1.4B to 12B, Llama 7B to 30B). "KTO can handle extreme data imbalances, matching DPO performance while using up to 90% fewer desirable examples". "on GSM8K ... just swapping DPO for KTO when aligning Zephyr-β-SFT on UltraFeedback improves performance by 13.5 points." "When the pretrained model is sufficiently good, one can skip supervised finetuning (SFT) and go straight to KTO without a loss in generation quality, whereas SFT is always needed for best results with DPO."

---

## 8. PLC-DPO

- **Paper:** "PLC-DPO: Posterior Label Correction in Noisy and Ambiguous Preference Optimization". Boryeong Cho (KAIST AI), Sumyeong Ahn (KENTECH, corresponding), Se-Young Yun (KAIST AI, corresponding). arXiv **2608.30597**, v1 Mon 31 Aug 2026. Confirms the arXiv id the knowledge base's tech news cites. Code: https://github.com/VennTum99/PLC-DPO
- **Source:** https://arxiv.org/abs/2608.30597 and https://arxiv.org/html/2608.30597
- **What it does, verbatim (abstract):** "we propose Posterior Label Correction DPO (PLC-DPO) to robustly optimize preferences by routing each pair's training signal as a clean, flip, or tie case. The key idea is to use the calibrated policy-reference margin as online evidence to take appropriate correction actions. This reframes noisy preference learning as actively correcting supervision direction and strength rather than merely filtering suspicious examples."
- **Mechanism (Algorithm 1, Eq. 11 to 17):**
  - Margin: `m_seq = β [ log π_θ(y_w|x)/π_ref(y_w|x) - log π_θ(y_l|x)/π_ref(y_l|x) ]` (the DPO logit).
  - State losses: `L_clean = -log σ(m)`, `L_flip = -log σ(-m)`, `L_tie = softplus(|m|)`.
  - Routing weights q_clean, q_flip, q_tie from the EMA-standardised, stop-gradient margin; `q̄_s = stopgrad(q_s)`.
  - `L_PLC = q̄_clean L_clean + q̄_flip L_flip + q̄_tie L_tie` (Eq. 15).
  - Confidence gate: `C(q̄) = ( (max_s q̄_s - 1/3) / (2/3) )^κ` (Eq. 16).
  - Final: `L(θ) = (1 - γ_t C(q̄)) L_DPO + γ_t C(q̄) L_PLC` (Eq. 17). γ_t ramps to γ_max after a pure-DPO warm-up fraction ρ_warm.
  - Hyperparameters named: τ_dir, τ_tie, γ_max, κ (tuned); β, EMA decay α, σ_min, warm-up schedule, initial prior π^0 (fixed). Main runs use the "aggressive" preset. Exact numeric values: unconfirmed (in Appendix D.2, not extracted).
- **Cost:** "requiring no additional forward or backward passes and no additional model copies"; "PLC-DPO is not slower than DPO in our measurements" (8x B200).
- **Reference model:** yes. **Paired data:** yes.
- **Setup:** SFT models on UltraChat-200k: Qwen2.5-1.5B, Qwen2.5-7B, Phi-2-2.7B (plus Llama-3-8B and Mistral-7B for generalisation). Judge: Skywork-Reward-V2-Llama-3.1-8B; win rates are against a same-data one-epoch DPO baseline. Baselines: DPO, cDPO, rDPO, KTO-Pair, RSO, Dr.DPO, ROPO, γ-PO, RE-PO.
- **Headline numbers, verbatim:** "Across 57 dataset-model-benchmark cells, PLC-DPO obtains the best mean win rate against DPO (60.5 vs. 55.5 for the next-best method)" (next best is rDPO). Worst cell 41.2 vs γ-PO's 42.5. Clean UltraFeedback: "mean win rate of 60.7 across the 21 model-benchmark cells, followed by ROPO at 59.6". Injected label flips (Vicuna, Qwen2.5-1.5B, Table 4) at η = 0.05 / 0.10 / 0.20 / 0.30: PLC-DPO 66.88 / 65.62 / 71.25 / 61.88, ROPO 55.62 / 55.00 / 65.00 / 56.88, rDPO 49.38 / 46.88 / 35.00 / 26.88. Ties: "As the injected tie rate increases from 0% to 30%, the margin of PLC-DPO over same-data DPO increases from +8.3 to +18.5 points."

---

## 9. Hugging Face TRL (docs at v1.14.1, fetched 2026-10-03)

Sources: https://huggingface.co/docs/trl/dpo_trainer , https://huggingface.co/docs/trl/cpo_trainer , https://huggingface.co/docs/trl/kto_trainer , https://huggingface.co/docs/trl/orpo_trainer

**DPOTrainer** (`from trl import DPOTrainer`). DPOConfig defaults: `loss_type=["sigmoid"]`, `beta=0.1`, `label_smoothing=0.0`, `learning_rate=1e-6`. `loss_type` takes a list; several losses can be combined with `loss_weights` (e.g. MPO: `["sigmoid","bco_pair","sft"]` with `[0.8, 0.2, 1.0]`).

| loss_type | Paper it implements (per the docs) |
|---|---|
| `sigmoid` (default) | DPO, 2305.18290 |
| `hinge` | RSO (2309.06657) hinge loss from SLiC (2305.10425); beta is the reciprocal of the margin |
| `ipo` | IPO, 2310.12036; beta is τ |
| `exo_pair` | EXO, 2402.00856; needs label_smoothing > 0, recommended 1e-3 |
| `nca_pair` | NCA, 2402.05369 |
| `robust` | Robust DPO (rDPO), 2403.00409; label_smoothing is the flip probability in [0.0, 0.5), "a typical value recommended by the Robust DPO paper is 0.1" |
| `bco_pair` | BCO, 2404.04656 |
| `sppo_hard` | SPPO, 2405.00675 |
| `aot`, `aot_unpaired` | AOT, 2406.05882 |
| `apo_zero`, `apo_down` | APO, 2408.06266 |
| `discopop` | DiscoPOP, 2406.08414 (`discopop_tau` default 0.05) |
| `sft` | plain NLL on chosen |
| `sigmoid_norm` | "The SimPO authors address the length-bias in the original sigmoid loss by normalizing by the number of non-mask tokens" (length-normalised DPO; still uses the reference) |

Other DPOConfig knobs: `ld_alpha` (LD-DPO), `f_divergence_type` (f-DPO), `use_weighting` (WPO), `sync_ref_model` with `ref_model_mixup_alpha=0.6` and `ref_model_sync_steps=512` (TR-DPO).

**cDPO in TRL now:** the docs describe `label_smoothing` as "used in Robust DPO and EXO" only. The v1.14.1 docs do not mention label smoothing for `sigmoid`, i.e. cDPO, and I did not check the code. So whether `sigmoid` + `label_smoothing` still gives cDPO in TRL is **unconfirmed**. Eric Mitchell's reference code (Section 4) does implement it.

**CPOTrainer is experimental:** `from trl.experimental.cpo import CPOConfig, CPOTrainer`. SimPO, verbatim: "To use this loss, just turn on `loss_type="simpo"` and `cpo_alpha=0.0` in the experimental.cpo.CPOConfig and set the `simpo_gamma` to a recommended value." CPOConfig defaults: `loss_type="sigmoid"`, `beta=0.1`, `cpo_alpha=1.0`, `simpo_gamma=0.5`, `alpha=0.0`. A non-zero `cpo_alpha` with `simpo` gives "CPO-SimPO". `loss_type="alphapo"` (AlphaPO, 2501.03884) sets simpo plus cpo_alpha=0.0.

**ORPOTrainer is experimental:** `from trl.experimental.orpo import ORPOConfig, ORPOTrainer`. ORPOConfig `beta` defaults to 0.1: "In the paper, it is denoted by λ. In the code, it is denoted by `alpha`."

**KTOTrainer is in the main package:** `from trl import KTOConfig, KTOTrainer`. Defaults: `loss_type="kto"` (alternative `"apo_zero_unpaired"`), `beta=0.1`, `desirable_weight=1.0`, `undesirable_weight=1.0`, `train_sampling_strategy="sequential"`; per-device batch must be > 1 for the KL estimate. A paired dataset is split automatically into unpaired rows (chosen gets label True, rejected False). Docs advise lr between 5e-7 and 5e-6, and for beta = 0.1 lr "should typically not exceed 1e-6".

---

## 10. Online vs offline evidence

**Xu et al. 2024, "Is DPO Superior to PPO for LLM Alignment? A Comprehensive Study".** Tsinghua University, OpenPsi Inc., Shanghai Qi Zhi Institute. arXiv 2404.10719, v1 16 Apr 2024. https://arxiv.org/html/2404.10719
- Verbatim: "our theoretical examination reveals that DPO might find biased solutions that exploit out-of-distribution responses. Empirically, we demonstrate that the performance of DPO is significantly affected by the distribution shift between the model outputs and the preference dataset." Key PPO factors: "advantage normalization, large batch size, and exponential moving average update for the reference model."
- Headline, verbatim: "The results indicate that PPO consistently outperforms DPO across all experiments. ... on the CodeContest dataset, our PPO model with 34B parameters outperforms AlphaCode-41B, exhibiting a 10@1k improvement from 16.4% to 22.4%."

**Tang et al. 2024, "Understanding the performance gap between online and offline alignment algorithms".** Google DeepMind (Tang, Guo, Zheng, Calandriello, Cao, Tarassov, Munos, Ávila Pires, Valko, Cheng, Dabney). arXiv 2405.08448, v1 14 May 2024. https://arxiv.org/html/2405.08448
- Headline (qualitative, no single number in the abstract), verbatim: "we start with an opening set of experiments that demonstrate the clear advantage of online methods over offline methods" ... "hypotheses such as offline data coverage and data quality by itself cannot convincingly explain the performance difference. We also find that while offline algorithms train policy to become good at pairwise classification, it is worse at generations; in the meantime the policies trained by online algorithms are good at generations while worse at pairwise classification." Also: "the performance discrepancy persists for both contrastive and non-contrastive loss functions, and appears not to be addressed by simply scaling up policy networks." Section 1: "online algorithms generally outperform offline algorithms at the same optimization budget of KL divergence".

**Tajwar et al. 2024, "Preference Fine-Tuning of LLMs Should Leverage Suboptimal, On-Policy Data".** CMU, Stanford, UW-Madison, Google DeepMind (Tajwar, Singh, Sharma, Rafailov, et al.). arXiv 2404.14367, v1 22 Apr 2024. https://arxiv.org/html/2404.14367
- Headline (qualitative), verbatim: "Our main finding is that, in general, approaches that use on-policy sampling or attempt to push down the likelihood on certain responses (i.e., employ a "negative gradient") outperform offline and maximum likelihood objectives. We conceptualize our insights and unify methods that use on-policy sampling or negative gradient under a notion of mode-seeking objectives".

**Guo et al. 2024, "Direct Language Model Alignment from Online AI Feedback" (OAIF).** Google DeepMind. arXiv 2402.04792, v1 7 Feb 2024. https://arxiv.org/html/2402.04792
- Method, verbatim: "on each training iteration, we sample two responses from the current model and prompt the LLM annotator to choose which one is preferred, thus providing online feedback." Settings: β=0.1 (DPO), β=1.0 (IPO), β=0.002 (SLiC), Adafactor, batch 128, lr 5e-7.
- Headline (human side-by-side, Table 2), online DPO vs offline DPO, win/tie/loss: TL;DR 63.74% / 28.57% / 7.69%; Helpfulness 58.60% / 21.20% / 20.20%; Harmlessness 60.26% / 35.90% / 3.84%. Table 3 (TL;DR): online IPO wins 64.81%, online SLiC 71.43% vs their offline versions. Offline DPO "rapidly overfits" around step 3,500, while online DPO keeps improving.

**Xiong et al. 2023, "Iterative Preference Learning from Human Feedback: Bridging Theory and Practice for RLHF under KL-Constraint".** UIUC, Salesforce AI Research, HKUST. arXiv 2312.11456, v1 18 Dec 2023. https://arxiv.org/html/2312.11456
- Online iterative DPO (Online-GSHF-DPO) from Zephyr-SFT-beta, 3 iterations, UltraRM-13B labels: beats offline DPO (Zephyr-beta) and RAFT on AlpacaEval 2 LC from iteration 2. After 3 iterations: "win rate of 30.49%, while its length-control win rate is only 24.17%". With a stronger RM and filtered prompts: "length-control win rate of 34.79%". The offline-DPO baseline's exact number is only in Figure 6 (not extracted; unconfirmed).

**Tulu 3 (Lambert et al.), "Tulu 3: Pushing Frontiers in Open Language Model Post-Training".** Allen Institute for AI and University of Washington. arXiv 2411.15124, v1 22 Nov 2024. https://arxiv.org/html/2411.15124
- PPO vs DPO, verbatim: "PPO could reach a comparable level of performance to DPO (albeit slightly lower) in this controlled setup." "**PPO is More Computationally Expensive** The PPO runtime is roughly 28 hours using two nodes, whereas the DPO runtime is about 4 hours using a single node." Decision: "using DPO for preference tuning seems more economical. We decide to use PPO primarily for RLVR".
- DPO variant used: length-normalised DPO (Eq. 6), `log σ( (β/|y_c|) log π_θ(y_c|x)/π_ref(y_c|x) - (β/|y_r|) log π_θ(y_r|x)/π_ref(y_r|x) )`. "We found that only length-normalized DPO outperformed our base checkpoint overall" (vs DPO and SimPO on UltraFeedback). Table 20: β = 5, lr 5e-7 (8B) and 2e-7 (70B), effective batch 128, max length 2048, 1 epoch, linear schedule, warmup 0.1.

**Supporting data point, Llama 3 (arXiv 2407.21783, https://arxiv.org/html/2407.21783):** "We also explored on-policy algorithms such as PPO, but found that DPO required less compute for large-scale models and performed better, especially on instruction following benchmarks like IFEval." DPO lr 1e-5 (printed as 10^-5), β 0.1; formatting tokens masked from the DPO loss. DPO data is iterative: "we primarily use the most recent batches of preference data collected using the best performing models from the previous alignment rounds".

---

## 11. RLAIF

**Lee et al., "RLAIF vs. RLHF: Scaling Reinforcement Learning from Human Feedback with AI Feedback".** Google DeepMind and Google. arXiv 2309.00267, v1 1 Sep 2023. https://arxiv.org/html/2309.00267
- AI labeler: PaLM 2 Large (instruction-tuned, no RL).
- Headline, verbatim: "RLAIF and RLHF are preferred by humans over a SFT baseline 71% and 73% of the time for summarization and 63% and 64% of the time for helpful dialogue generation, respectively, where the win rates for RLAIF and RLHF are not statistically significantly different. Furthermore, in a head-to-head comparison of RLAIF against RLHF, both policies are equally preferred." Harmless dialogue: "RLAIF scored a higher harmless rate than RLHF, and both outperformed the SFT baseline (88%, 76%, and 64%, respectively)."
- Also: RLAIF beats SFT "even when the AI labeler is the same size as the policy, or even the exact same checkpoint as the initial policy"; "direct-RLAIF (d-RLAIF)" skips RM training by scoring with the LLM during RL and "achieves superior performance to canonical RLAIF."

**Are AI labels "now the norm"? I found no authoritative source that says so, and the evidence is mixed. Write it as a trend, not a fact.**
- Open recipes use AI labels. Tulu 3, verbatim: "we use an LLM-as-a-judge, specifically GPT-4o-2024-0806, to rate each response from 1 to 5 across four different aspects: helpfulness, instruction-following, honesty, and truthfulness", "adapting and advancing the UltraFeedback pipeline", and it mixes in on-policy pairs from the Tulu SFT model (96,911 off-policy plus 19,444 on-policy instances in the 8B base mix).
- Frontier open-weights Llama 3 used human labels: "We first train a reward model on top of the pre-trained checkpoint using human-annotated preference data"; "Our preference data annotation process is similar to Llama 2" (annotators rate preference strength). Its SFT and DPO examples are "collected either via human annotations or generated synthetically."
- Safe wording: "Open post-training recipes (UltraFeedback, Tulu 3) build preference pairs with an LLM judge; some frontier labs (Llama 3) still collect human preference annotations."

---

## 12. Likelihood displacement

**Razin, Malladi, Bhaskar, Chen, Arora, Hanin, "Unintentional Unalignment: Likelihood Displacement in Direct Preference Optimization".** Princeton (PLI, ORFE). arXiv 2410.08847, v1 11 Oct 2024. https://arxiv.org/html/2410.08847
- Definition, verbatim: "prior work has observed that the likelihood of preferred responses often decreases during training ... which we term likelihood displacement."
- Headline number, verbatim: "when aligning the model to refuse unsafe prompts, we show that such displacement can unintentionally lead to unalignment, by shifting probability mass from preferred refusal responses to harmful responses (e.g., reducing the refusal rate of Llama-3-8B-Instruct from 74.4% to 33.4%)." Also: "DPO makes the refusal rates of Gemma-2B-IT and Llama-3-8B-Instruct drop from 80.5% to 54.8% and 74.4% to 33.4%, respectively" (SORRY-Bench, training sets). Their fix: filter by the CHES similarity score; keeping only "the 5% samples with lowest length-normalized CHES scores" is one variant.

---

## Summary table (verified)

| Method | arXiv / v1 | Lab | Needs reference model | Needs pairs | Typical β / key knob |
|---|---|---|---|---|---|
| RM (InstructGPT) | 2203.02155 / 2022-03-04 | OpenAI | n/a | yes (K=4 to 9 ranked) | 6B RM, 1 epoch |
| DPO | 2305.18290 / 2023-05-29 | Stanford | yes | yes | β=0.1 (0.5 TL;DR) |
| IPO | 2310.12036 / 2023-10-18 | Google DeepMind | yes | yes | τ (target gap τ^-1/2) |
| cDPO | note, 2023-11-25 v1.1 | Stanford (E. Mitchell) | yes | yes | ϵ flip rate in (0, 0.5) |
| SimPO | 2405.14734 / 2024-05-23 | Princeton, UVA | no | yes | β 2.0 to 2.5, γ 0.5 to 1.5 |
| ORPO | 2403.07691 / 2024-03-12 | KAIST AI | no (and no separate SFT) | yes | λ 0.1 to 0.25 |
| KTO | 2402.01306 / 2024-02-02 | Stanford, Contextual AI | yes | no (binary labels) | β=0.1, λ_D=λ_U=1 |
| PLC-DPO | 2608.30597 / 2026-08-31 | KAIST AI, KENTECH | yes | yes | DPO plus clean/flip/tie routing |
