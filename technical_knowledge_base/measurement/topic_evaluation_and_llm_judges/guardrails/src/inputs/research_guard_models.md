# Research notes: open guard models, published numbers (fetched 2026-10-04)

Rule for reading these notes: every table says WHO RAN IT. "Own" = the model's authors measured their own model. "Rival-run" = a competitor's card/paper re-ran it. "Independent" = no vendor. Metrics are never mixed: F1, AUPRC, AUC, recall at x% FPR, accuracy, FPR are kept in separate columns as published. "unconfirmed" = could not verify from a primary source in this session; "(memory)" = from prior knowledge, not re-fetched today.

---

## 1. Llama Guard 3 (1B, 8B, 11B-Vision) and Llama Guard 4 12B (Meta)

Sources (HF repos are gated, so the identical cards were read from GitHub PurpleLlama, fetched 2026-10-04):
- LG4: https://github.com/meta-llama/PurpleLlama/blob/main/Llama-Guard4/12B/MODEL_CARD.md
- LG3-8B: https://github.com/meta-llama/PurpleLlama/blob/main/Llama-Guard3/8B/MODEL_CARD.md
- LG3-1B: https://github.com/meta-llama/PurpleLlama/blob/main/Llama-Guard3/1B/MODEL_CARD.md
- LG3-11B-Vision: https://github.com/meta-llama/PurpleLlama/blob/main/Llama-Guard3/11B-vision/MODEL_CARD.md

| Model | Size | Release (memory) | Base | Licence (memory) | Taxonomy | Classifies | Languages |
|---|---|---|---|---|---|---|---|
| Llama Guard 3-8B | 8B | 2024-07-23 (with Llama 3.1) | Llama 3.1-8B | Llama 3.1 Community License | 14 cats: MLCommons 13 hazards (S1 Violent Crimes, S2 Non-Violent Crimes, S3 Sex-Related Crimes, S4 Child Sexual Exploitation, S5 Defamation, S6 Specialized Advice, S7 Privacy, S8 IP, S9 Indiscriminate Weapons, S10 Hate, S11 Suicide and Self-Harm, S12 Sexual Content, S13 Elections) + S14 Code Interpreter Abuse | prompt and response; generates "safe"/"unsafe" + violated category codes | 8: en, fr, de, hi, it, pt, es, th |
| Llama Guard 3-1B (and 1B-INT4) | 1B (pruned to 1,123M params, 12 layers, 6400 MLP dim; output layer pruned 262.6M to 40.96k params, saving 131.3MB at 4-bit) | 2024-09-25 (with Llama 3.2) | Llama-3.2-1B, distilled from LG3-8B logits | Llama 3.2 Community License | 13 MLCommons cats (no S14) | prompt and response | same 8 |
| Llama Guard 3-11B-Vision | 11B | 2024-09-25 | Llama 3.2-11B-Vision | Llama 3.2 Community License | 13 MLCommons cats | text + one image; prompt and response | English for image tasks (card) |
| Llama Guard 4 12B | 12B dense, pruned from Llama 4 Scout (routed experts and router removed, only shared expert kept), no extra pretraining | 2025-04-29 (memory) | Llama 4 Scout | Llama 4 Community License | 14 cats (S1--S13 MLCommons + S14 Code Interpreter Abuse, text only) | prompt and response; text + multiple images | LG3 languages; integrated into Llama Moderations API |

No latency figures published on these cards. Cards state "We omit evals against competitor models" (LG4).

### LG3-8B Table 1 (own; internal English test set, MLCommons taxonomy, RESPONSE classification)
| | F1 | AUPRC | FPR |
|---|---|---|---|
| Llama Guard 2 | 0.877 | 0.927 | 0.081 |
| Llama Guard 3 | 0.939 | 0.985 | 0.040 |
| GPT4 (zero-shot) | 0.805 | N/A | 0.152 |
URL: LG3-8B card above.

### LG3-8B Table 2 (own; internal multilingual set, prompt+response, F1 / FPR)
| | French | German | Hindi | Italian | Portuguese | Spanish | Thai |
|---|---|---|---|---|---|---|---|
| Llama Guard 2 | 0.911/0.012 | 0.795/0.062 | 0.832/0.062 | 0.681/0.039 | 0.845/0.032 | 0.876/0.001 | 0.822/0.078 |
| Llama Guard 3 | 0.943/0.036 | 0.877/0.032 | 0.871/0.050 | 0.873/0.038 | 0.860/0.060 | 0.875/0.023 | 0.834/0.030 |
| GPT4 | 0.795/0.157 | 0.691/0.123 | 0.709/0.206 | 0.753/0.204 | 0.738/0.207 | 0.711/0.169 | 0.688/0.168 |

### LG3-8B Table 3 (own; internal set, tool use, prompt+response)
| | Search tool F1 | AUPRC | FPR | Code interp. abuse F1 | AUPRC | FPR |
|---|---|---|---|---|---|---|
| Llama Guard 2 | 0.749 | 0.794 | 0.284 | 0.683 | 0.677 | 0.670 |
| Llama Guard 3 | 0.856 | 0.938 | 0.174 | 0.885 | 0.967 | 0.125 |
| GPT4 | 0.732 | N/A | 0.525 | 0.636 | N/A | 0.90 |
Text: on XSTest LG3 "achieves the same F1 score but a lower false positive rate compared to Llama Guard 2" (no number in 8B card; see 1B table for XSTest 0.884/0.044).

### LG3-8B Table 5 (own; int8 quantization, Precision / Recall / F1 / FPR)
| Task | Capability | P | R | F1 | FPR | P (int8) | R (int8) | F1 (int8) | FPR (int8) |
|---|---|---|---|---|---|---|---|---|---|
| Prompt | English | 0.952 | 0.943 | 0.947 | 0.057 | 0.961 | 0.939 | 0.950 | 0.045 |
| Prompt | Multilingual | 0.901 | 0.899 | 0.900 | 0.054 | 0.906 | 0.892 | 0.899 | 0.051 |
| Prompt | Tool Use | 0.884 | 0.958 | 0.920 | 0.126 | 0.876 | 0.946 | 0.909 | 0.134 |
| Response | English | 0.947 | 0.931 | 0.939 | 0.040 | 0.947 | 0.925 | 0.936 | 0.040 |
| Response | Multilingual | 0.929 | 0.805 | 0.862 | 0.033 | 0.931 | 0.785 | 0.851 | 0.031 |
| Response | Tool Use | 0.774 | 0.884 | 0.825 | 0.176 | 0.793 | 0.865 | 0.827 | 0.155 |
int8 cuts checkpoint size about 40%.

### LG3-1B table (own; internal test + XSTest, F1/FPR)
| Model | English | French | German | Italian | Spanish | Portuguese | Hindi | Vietnamese | Indonesian | Thai | XSTest |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Llama Guard 3-8B | 0.939/0.040 | 0.943/0.036 | 0.877/0.032 | 0.873/0.038 | 0.875/0.023 | 0.860/0.060 | 0.871/0.050 | 0.890/0.034 | 0.915/0.048 | 0.834/0.030 | 0.884/0.044 |
| Llama Guard 3-1B | 0.899/0.090 | 0.939/0.012 | 0.845/0.036 | 0.897/0.111 | 0.837/0.083 | 0.763/0.114 | 0.680/0.057 | 0.723/0.130 | 0.875/0.083 | 0.749/0.078 | 0.821/0.068 |
| Llama Guard 3-1B-INT4 | 0.904/0.084 | 0.873/0.072 | 0.835/0.145 | 0.897/0.111 | 0.852/0.104 | 0.830/0.109 | 0.564/0.114 | 0.792/0.171 | 0.833/0.121 | 0.831/0.114 | 0.737/0.152 |
| GPT4 | 0.805/0.152 | 0.795/0.157 | 0.691/0.123 | 0.753/0.20 | 0.711/0.169 | 0.738/0.207 | 0.709/0.206 | 0.741/0.148 | 0.787/0.169 | 0.688/0.168 | 0.895/0.128 |
Note: XSTest FPR here is LG3-8B 4.4%, 1B 6.8%, 1B-INT4 15.2% (over-refusal signal). URL: LG3-1B card.

### LG3-11B-Vision Table 1 (own; internal test, MLCommons)
| Model | Task | Precision | Recall | F1 | FPR |
|---|---|---|---|---|---|
| Llama Guard 3 Vision | Prompt | 0.891 | 0.623 | 0.733 | 0.052 |
| GPT-4o | Prompt | 0.544 | 0.843 | 0.661 | 0.485 |
| GPT-4o mini | Prompt | 0.488 | 0.943 | 0.643 | 0.681 |
| Llama Guard 3 Vision | Response | 0.961 | 0.916 | 0.938 | 0.016 |
| GPT-4o | Response | 0.579 | 0.788 | 0.667 | 0.243 |
| GPT-4o mini | Response | 0.526 | 0.820 | 0.641 | 0.313 |
Table 2 per-category response F1: Violent Crimes 0.839, Non-Violent 0.917, Sex Crimes 0.797, Child Exploitation 0.698, Defamation 0.967, Specialized Advice 0.764, Privacy 0.847, IP 0.849, Indiscriminate Weapons 0.995, Hate 0.894, Self-Harm 0.911, Sexual Content 0.947, Elections 0.957.

### LG4 classifier table (own; in-house test set, OUTPUT filtering; R = recall)
| | R | FPR | F1 | Δ R vs LG3 | Δ FPR | Δ F1 |
|---|---|---|---|---|---|---|
| English | 69% | 11% | 61% | 4% | -3% | 8% |
| Multilingual | 43% | 3% | 51% | -2% | -1% | 0% |
| Single-image | 41% | 9% | 38% | 10% | 0% | 8% |
| Multi-image | 61% | 9% | 52% | 20% | -1% | 17% |
Notes from card: averages over S1--S13 weighting each category equally; multilingual = average over 7 non-English LG3 languages; English/multilingual compared to LG3-8B, images to LG3-11B-vision (only final image given to LG3v for multi-image). 
CONTRADICTION/CAVEAT: LG4's English F1 61% vs LG3-8B's own card English F1 0.939: different in-house test sets, so the absolute numbers are not comparable across cards (implied LG3-8B English F1 on the LG4 set = 53%).

---

## 2. Llama Prompt Guard 2 (86M, 22M) and Prompt Guard 1 (Meta)

Sources (fetched 2026-10-04): PG2 card https://github.com/meta-llama/PurpleLlama/blob/main/Llama-Prompt-Guard-2/86M/MODEL_CARD.md ; PG1 card https://github.com/meta-llama/PurpleLlama/blob/main/Prompt-Guard/MODEL_CARD.md (HF repos meta-llama/Llama-Prompt-Guard-2-86M, -22M, meta-llama/Prompt-Guard-86M are gated).

- Release (memory): Prompt Guard 1 (86M) 2024-07-23 with Llama 3.1; Prompt Guard 2 86M and 22M 2025-04-29 with Llama Guard 4 (LlamaCon). Licence: Llama 4 Community License for PG2 (memory), Llama 3.1 licence for PG1 (memory). Base models: PG2 86M = mDeBERTa-v3-base (multilingual); PG2 22M = DeBERTa-v3-xsmall (English pretraining only). PG1 = mDeBERTa-v3-base.
- Task: classifier (not generative). PG2 is binary: benign vs malicious (explicit attempt to override prior instructions: jailbreaks and prompt injections). PG1 had 3 labels: benign, injection, jailbreak; PG2 dropped the "injection" label ("we found this objective too broad to be useful").
- Context 512 tokens; split longer inputs and scan segments in parallel. Evaluated in en, fr, de, hi, it, pt, es, th.
- Training: energy-based loss term penalising large negative energy on benign prompts (reduces OOD false positives); tokenizer hardened against whitespace / fragmented-token attacks. 22M "reduces latency and compute costs by 75%".

### PG2 table: Direct jailbreak detection (own; private benchmark of unseen attack types and benign distributions)
| Model | AUC (English) | Recall @ 1% FPR (English) | AUC (Multilingual) | Latency per classification (A100 GPU, 512 tokens) | Backbone params | Base model |
|---|---|---|---|---|---|---|
| Llama Prompt Guard 1 | .987 | 21.2% | .983 | 92.4 ms | 86M | mdeberta-v3 |
| Llama Prompt Guard 2 86M | .998 | 97.5% | .995 | 92.4 ms | 86M | mdeberta-v3 |
| Llama Prompt Guard 2 22M | .995 | 88.7% | .942 | 19.3 ms | 22M | deberta-v3-xsmall |
URL: PG2 card. Card: the jump in Recall @ 1% FPR "is due to the custom loss function".

### PG2 table: AgentDojo (own run, includes RIVALS re-run by Meta)
Metric is APR = attack prevention rate at 3% utility reduction (NOT an attack-success-rate reduction; the card gives no ASR numbers).
| Model | APR @ 3% utility reduction |
|---|---|
| Llama Prompt Guard 1 | 67.6% |
| Llama Prompt Guard 2 86M | 81.2% |
| Llama Prompt Guard 2 22M | 78.4% |
| ProtectAI | 22.2% |
| Deepset | 13.5% |
| LLM Warden | 12.9% |
URL: PG2 card. Rival rows (ProtectAI, Deepset, LLM Warden) are vendor-run by Meta.

### PG1 table (own; TPR / FPR / AUC, thresholds not stated)
| Metric | Eval set (Jailbreaks) | Eval set (Injections) | OOD Jailbreak set | Multilingual Jailbreak set | CyberSecEval Indirect Injections set |
|---|---|---|---|---|---|
| TPR | 99.9% | 99.5% | 97.5% | 91.5% | 71.4% |
| FPR | 0.4% | 0.8% | 3.9% | 5.3% | 1.0% |
| AUC | 0.997 | 1.000 | 0.975 | 0.959 | 0.966 |
URL: PG1 card. Card: "In cases where 3-5% false-positive rate is too high, either a higher threshold ... or the model can be fine-tuned".
CAVEAT: PG1's own card reports OOD AUC 0.975, while the PG2 card reports PG1 AUC .987 on a different private benchmark; not a contradiction, different sets. PG1 was widely reported (2024) to flag benign text as injection at high rates in third-party tests (unconfirmed numbers, not transcribed).

---

## 3. Granite Guardian (IBM): 3.0, 3.1, 3.2, 3.3, 4.1

Sources (fetched 2026-10-04): HF cards https://huggingface.co/ibm-granite/granite-guardian-3.0-8b , .../granite-guardian-3.3-8b , .../granite-guardian-3.2-5b , .../granite-guardian-4.1-8b ; paper https://arxiv.org/html/2412.07724 ; GitHub https://github.com/ibm-granite/granite-guardian ; HF API list of ibm-granite guardian repos.

| Version | Sizes | Release | Base | Licence | Notes |
|---|---|---|---|---|---|
| 3.0 | 2B, 8B | 2024-10-21 (card) | Granite 3.0 2B/8B instruct (memory) | Apache 2.0 | Paper 2412.07724 |
| 3.1 | 2B, 8B | 2024-12-18 (card) | Granite 3.1 | Apache 2.0 | |
| 3.2 | 5B (3.1-8B pruned ~30% and healed), 3B-A800M (MoE) | Feb 2025 (GitHub news); 3.2-5B card says "February 26, 2024", an evident typo | Granite 3.1/3.2 | Apache 2.0 | adds verbalized confidence and two new risks |
| 3.3 | 8B (+GGUF) | 2025-08-01 (card) | Granite 3.3 8B | Apache 2.0 | hybrid think / no_think |
| 3.2-5B LoRA adapters | harm-categories, harm-correction (Sept 2025); factuality-detection 8B and factuality-correction LoRA (Nov 2025, HF repo dates) | | | | |
| 4.0-3B toxicity-ja | 3B, Japanese toxicity | HF repo created 2026-04-06 | | | not investigated further |
| 4.1 | 8B (+GGUF) | "April, 2026" (card); HF repo 2026-04-16 | ibm-granite/granite-4.1-8b | Apache 2.0 | BYOC criteria, hybrid thinking, reward model use |
| granitelib-guardian-r1.0 | ? | HF repo 2026-02-02 | | | unconfirmed what it is |
| HAP 38M / 125M | encoder classifiers for hate, abuse, profanity | 2024-09 | | | for strict latency budgets (card) |

Taxonomy: binary yes/no judgement per chosen risk criterion. Pre-baked: harm (umbrella), social bias, jailbreaking, violence, profanity, sexual content, unethical behavior; RAG: context relevance, groundedness, answer relevance; agentic: function-calling hallucination; plus bring-your-own-criteria. Prompt and response (paper Table 1: jailbreaking and context relevance prompt-side; groundedness and answer relevance response-side). Language: English (card metadata `language: en`). Latency: no numbers published; card says main models are for "moderate cost, latency, and throughput" uses and points to HAP-38M for strict budgets.

### Paper Table 6 (IBM-run; RIVALS re-run by IBM; aggregated harm datasets; "Baselines are suitably adapted for direct comparison")
| model | AUC | AUPRC | F1 | Recall | Precision |
|---|---|---|---|---|---|
| Llama-Guard-7B | 0.824 | 0.803 | 0.659 | 0.533 | 0.861 |
| Llama-Guard-2-8B | 0.841 | 0.822 | 0.723 | 0.627 | 0.852 |
| Llama-Guard-3-1B | 0.796 | 0.775 | 0.656 | 0.575 | 0.765 |
| Llama-Guard-3-8B | 0.826 | 0.819 | 0.710 | 0.607 | 0.857 |
| ShieldGemma-2B | 0.748 | 0.704 | 0.421 | 0.277 | 0.883 |
| ShieldGemma-9B | 0.753 | 0.707 | 0.404 | 0.262 | 0.886 |
| ShieldGemma-27B | 0.772 | 0.718 | 0.438 | 0.295 | 0.849 |
| Granite-Guardian-3.0-2B | 0.782 | 0.746 | 0.674 | 0.747 | 0.614 |
| Granite-Guardian-3.0-8B | 0.871 | 0.846 | 0.758 | 0.735 | 0.781 |
URL: https://arxiv.org/html/2412.07724 (Table 6).

### Paper Table 7 (IBM-run; F1/AUC per dataset)
| model | AegisSafetyTest | ToxicChat | OpenAI Mod. | BeaverTails | SafeRLHF | XSTEST_RH | XSTEST_RR | XSTEST_RR(h) | Aggregate F1/AUC |
|---|---|---|---|---|---|---|---|---|---|
| Llama-Guard-7B | 0.743/0.852 | 0.596/0.955 | 0.755/0.917 | 0.663/0.787 | 0.607/0.716 | 0.803/0.925 | 0.358/0.589 | 0.704/0.816 | 0.659/0.824 |
| Llama-Guard-2-8B | 0.718/0.782 | 0.472/0.876 | 0.758/0.903 | 0.718/0.819 | 0.743/0.822 | 0.908/0.994 | 0.428/0.824 | 0.805/0.941 | 0.723/0.841 |
| Llama-Guard-3-1B | 0.681/0.780 | 0.453/0.810 | 0.686/0.858 | 0.632/0.820 | 0.662/0.790 | 0.846/0.976 | 0.420/0.866 | 0.802/0.959 | 0.656/0.796 |
| Llama-Guard-3-8B | 0.717/0.816 | 0.542/0.865 | 0.792/0.922 | 0.677/0.831 | 0.705/0.803 | 0.904/0.975 | 0.405/0.558 | 0.798/0.891 | 0.710/0.826 |
| ShieldGemma-2B | 0.471/0.803 | 0.181/0.811 | 0.245/0.709 | 0.484/0.747 | 0.348/0.657 | 0.792/0.867 | 0.371/0.570 | 0.708/0.735 | 0.421/0.748 |
| ShieldGemma-9B | 0.458/0.826 | 0.181/0.851 | 0.234/0.721 | 0.459/0.741 | 0.329/0.646 | 0.809/0.880 | 0.356/0.584 | 0.708/0.753 | 0.404/0.753 |
| ShieldGemma-27B | 0.437/0.860 | 0.177/0.880 | 0.227/0.724 | 0.513/0.757 | 0.386/0.649 | 0.792/0.893 | 0.395/0.546 | 0.744/0.748 | 0.438/0.772 |
| Granite-Guardian-3.0-2B | 0.842/0.844 | 0.368/0.865 | 0.603/0.836 | 0.757/0.873 | 0.771/0.834 | 0.817/0.974 | 0.382/0.832 | 0.744/0.903 | 0.674/0.782 |
| Granite-Guardian-3.0-8B | 0.874/0.924 | 0.649/0.940 | 0.745/0.918 | 0.776/0.895 | 0.780/0.846 | 0.849/0.979 | 0.401/0.786 | 0.781/0.919 | 0.758/0.871 |
Dataset notes (Table 4): XSTEST-RR = refusal responses labelled benign, compliance labelled harmful (449 samples); BeaverTails and SafeRLHF sub-sampled (3,021 and 2,000).
NOTE: ShieldGemma's low F1 here with high-ish AUC shows threshold dependence: IBM ran ShieldGemma at a default threshold; its F1 swings with the threshold while AUC does not.

### Paper Table 11 (IBM-run; AUC and TPR at fixed FPR, aggregated harm data)
| model | AUC | TPR | AUC@0.1 | TPR@0.1 | AUC@0.01 | TPR@0.01 | AUC@0.001 | TPR@0.001 |
|---|---|---|---|---|---|---|---|---|
| Llama-Guard-7B | 0.824 | 0.533 | 0.454 | 0.617 | 0.148 | 0.224 | 0.037 | 0.068 |
| Llama-Guard-2-8B | 0.841 | 0.627 | 0.506 | 0.660 | 0.137 | 0.239 | 0.014 | 0.032 |
| Llama-Guard-3-1B | 0.796 | 0.575 | 0.414 | 0.546 | 0.152 | 0.247 | 0.030 | 0.054 |
| Llama-Guard-3-8B | 0.826 | 0.607 | 0.521 | 0.648 | 0.174 | 0.320 | 0.016 | 0.033 |
| ShieldGemma-2B | 0.748 | 0.277 | 0.308 | 0.400 | 0.112 | 0.179 | 0.021 | 0.035 |
| ShieldGemma-9B | 0.753 | 0.262 | 0.307 | 0.403 | 0.129 | 0.193 | 0.020 | 0.052 |
| ShieldGemma-27B | 0.772 | 0.295 | 0.305 | 0.399 | 0.133 | 0.191 | 0.016 | 0.049 |
| Granite-Guardian-3.0-2B | 0.782 | 0.747 | 0.355 | 0.504 | 0.102 | 0.185 | 0.012 | 0.021 |
| Granite-Guardian-3.0-8B | 0.871 | 0.735 | 0.515 | 0.676 | 0.170 | 0.290 | 0.041 | 0.072 |
(TPR@0.01 = recall at 1% FPR: best is Llama-Guard-3-8B 0.320, not Granite; useful counterpoint.)

### Paper Table 8 (IBM-run; TRUE groundedness, AUC)
| Model | MNBN | BEGIN | QX | QC | SumE | DialF | PAWS | Q2 | Frank | AVG |
|---|---|---|---|---|---|---|---|---|---|---|
| ANLI-T5-11B | 0.779 | 0.826 | 0.838 | 0.821 | 0.805 | 0.777 | 0.864 | 0.727 | 0.894 | 0.815 |
| WeCheck-0.4B | 0.830 | 0.864 | 0.814 | 0.826 | 0.798 | 0.900 | 0.896 | 0.840 | 0.881 | 0.850 |
| Llama-3.1-Bespoke-MiniCheck-7B | 0.817 | 0.806 | 0.907 | 0.882 | 0.851 | 0.931 | 0.870 | 0.870 | 0.924 | 0.873 |
| Granite-Guardian-3.0-2B | 0.712 | 0.710 | 0.768 | 0.753 | 0.779 | 0.892 | 0.825 | 0.874 | 0.885 | 0.800 |
| Granite-Guardian-3.0-8B | 0.719 | 0.781 | 0.836 | 0.890 | 0.822 | 0.946 | 0.880 | 0.913 | 0.898 | 0.854 |

### 3.0-8B card (own): harm F1 and TRUE AUC
F1: AegisSafetyTest 0.87, BeaverTails 0.78, OAI moderation 0.74, SafeRLHF(test) 0.78, SimpleSafetyTest 1.00, HarmBench 0.80, ToxicChat 0.65, xstest_RH 0.85, xstest_RR 0.40, xstest_RR(h) 0.78, Aggregate F1 0.76. TRUE AUC average 0.85. Jailbreak risk: recall 1.0 on ToxicChat jailbreak prompts. URL: https://huggingface.co/ibm-granite/granite-guardian-3.0-8b

### 4.1-8B card (own; also contains the 3.1/3.2/3.3 rows): OOD safety F1
| Model | Aggregate F1 | Aegis Safety Test | BeaverTails | HarmBench Prompt | OAI hf | SafeRLHF test | Simple Safety Test | ToxicChat | xstest RH | xstest RR | xstest RR(h) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| granite-guardian-3.1-8b | 0.79 | 0.88 | 0.81 | 0.80 | 0.78 | 0.81 | 0.99 | 0.73 | 0.87 | 0.45 | 0.83 |
| granite-guardian-3.2-5b | 0.78 | 0.88 | 0.81 | 0.80 | 0.73 | 0.80 | 0.99 | 0.73 | 0.90 | 0.43 | 0.82 |
| granite-guardian-3.3-8b (non-think) | 0.81 | 0.87 | 0.84 | 0.80 | 0.77 | 0.80 | 0.99 | 0.76 | 0.90 | 0.49 | 0.87 |
| granite-guardian-3.3-8b (think) | 0.79 | 0.86 | 0.82 | 0.80 | 0.78 | 0.78 | 0.99 | 0.69 | 0.86 | 0.50 | 0.86 |
| granite-guardian-4.1-8b (non-think) | 0.79 | 0.83 | 0.79 | 0.78 | 0.83 | 0.79 | 1.00 | 0.78 | 0.90 | 0.44 | 0.82 |
| granite-guardian-4.1-8b (think) | 0.78 | 0.85 | 0.77 | 0.76 | 0.82 | 0.77 | 1.00 | 0.74 | 0.86 | 0.45 | 0.81 |
URL: https://huggingface.co/ibm-granite/granite-guardian-4.1-8b (same 3.x rows on the 3.3 card). Thinking mode does not help harm F1.

### 4.1-8B card (own): LLM-AggreFact balanced accuracy (groundedness)
| Model | AVG | AggreFact-CNN | AggreFact-XSum | ClaimVerify | ExpertQA | FactCheck-GPT | LFQA | RAGTruth | Reveal | TofuEval-MediaS | TofuEval-MeetB | Wice |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| granite-guardian-3.1-8b | 0.709 | 0.532 | 0.570 | 0.724 | 0.597 | 0.759 | 0.855 | 0.768 | 0.877 | 0.725 | 0.761 | 0.635 |
| granite-guardian-3.2-5b | 0.665 | 0.508 | 0.530 | 0.650 | 0.596 | 0.743 | 0.808 | 0.630 | 0.872 | 0.691 | 0.685 | 0.604 |
| granite-guardian-3.3-8b (non-think) | 0.761 | 0.669 | 0.738 | 0.767 | 0.596 | 0.729 | 0.878 | 0.831 | 0.894 | 0.736 | 0.815 | 0.720 |
| granite-guardian-3.3-8b (think) | 0.765 | 0.661 | 0.749 | 0.759 | 0.597 | 0.766 | 0.870 | 0.821 | 0.896 | 0.739 | 0.789 | 0.773 |
| granite-guardian-4.1-8b (non-think) | 0.760 | 0.598 | 0.763 | 0.757 | 0.603 | 0.749 | 0.883 | 0.834 | 0.889 | 0.737 | 0.767 | 0.783 |
| granite-guardian-4.1-8b (think) | 0.764 | 0.606 | 0.765 | 0.773 | 0.605 | 0.752 | 0.885 | 0.841 | 0.888 | 0.730 | 0.795 | 0.767 |
GitHub news (Sept 2025): GG 3.3 8B "secured the 3rd position on the LLM-AggreFact benchmark" and #1 on its REVEAL subset; outperforms gpt-4o and Mistral Large 2 there. URL: https://github.com/ibm-granite/granite-guardian (README). Leaderboard rank today: unconfirmed.

### 4.1-8B card (own): other
- FC Reward Bench balanced accuracy (function-calling hallucination): 3.1-8b 0.64, 3.2-5b 0.61, 3.3 non-think 0.74, 3.3 think 0.71, 4.1 non-think 0.79, 4.1 think 0.78.
- BYOC requirement checking, balanced accuracy: IFEval multi-constraint 3.3 non-think 0.458, granite-4.1-8b prompting-only 0.569, GG 4.1 non-think 0.844 (think 0.827); InfoBench (GPT-4 annotated) 0.585 / 0.656 / 0.726; InfoBench (human) 0.535 / 0.602 / 0.706.
- JETTS best-of-N (no-think): GG 4.1 8B overall 70.29 vs OffsetBias-8B 67.99, Skywork-Reward-8B 68.62, Skywork-Reward-27B 68.67, SFR-Judge-70B 68.22, Oracle 81.54 (baselines copied from the JETTS paper Table 4, not re-run).
- GuardBench: IBM has publicly claimed top GuardBench positions for Granite Guardian 3.x (memory); rank not found on the cards fetched today: see section 11.

---

## 4. Qwen3Guard (Alibaba Qwen): Gen 0.6B/4B/8B and Stream 0.6B/4B/8B

Sources (fetched 2026-10-04): tech report https://arxiv.org/html/2510.14276 (v1, 16 Oct 2025); HF API (repos Qwen/Qwen3Guard-Gen-{0.6B,4B,8B}, Qwen/Qwen3Guard-Stream-{0.6B,4B,8B}, all created 2025-09-23); GitHub https://github.com/QwenLM/Qwen3Guard ; test set https://huggingface.co/datasets/Qwen/Qwen3GuardTest

- Release: weights 2025-09-23 (HF), report 2025-10-16. Licence: Apache 2.0 (report). Base: Qwen3 0.6B/4B/8B. Languages: "up to 119 languages and dialects" (report abstract); training data share: Zh 26.6%, En 21.9%, Ko 9.9%, then Id, Ru, Ja, Ar, De, Fr, Es, Pt, It, Th (Table 1).
- Labels: three severity levels Safe / Controversial / Unsafe. Strict mode = Controversial counted as unsafe; Loose mode = Controversial counted as safe.
- Categories (9): Violent; Non-violent Illegal Acts; Sexual Content or Sexual Acts; Personally Identifiable Information; Suicide and Self-Harm; Unethical Acts; Politically Sensitive Topics; Copyright Violation; Jailbreak (input only). Also detects refusal in responses.
- Gen = generative (prompt and response classification, outputs label + category + refusal). Stream = token-level classification heads that score the response token by token during generation (and the prompt).
- Stream latency (own, Qwen3GuardTest with sentence-level annotations): response-only "exact hit rate of nearly 86.0%" (first flagged token falls inside the human-annotated first unsafe sentence); with thinking traces, unsafe content detected "within the first 128 tokens in approximately 66.8% of cases" (569 samples). Efficiency: Gen re-run on each 32-token chunk vs Stream per token; Stream time "scales nearly linearly", no ms figures (Figure 9 only).
- CARE real-time intervention (Table 16): Qwen3-4B non-think safety rate 47.5 (Qwen3-235B judge) to 85.7 with CARE + Qwen3Guard-4B-Stream; Wait Tokens overhead 70.1 (non-think), 101.0 (think).
- Successor: no Qwen3.5 Guard or other Qwen guard repo found on HF (API search 2026-10-04): unconfirmed / none found.

Who ran the rivals: ALL rival rows below (Llama Guard 3/4, WildGuard, ShieldGemma, NemoGuard, PolyGuard) were re-run by the Qwen team (rival-run). Metric: F1 (x100). Avg for Qwen3Guard rows (marked *) picks the better of strict/loose PER BENCHMARK, an optimistic choice that rivals do not get.

### Table 2: English PROMPT classification F1 (Qwen-run)
| Model | ToxiC | OpenAIMod | Aegis | Aegis2.0 | SimpST | HarmB | WildG | Avg |
|---|---|---|---|---|---|---|---|---|
| LlamaGuard3-8B | 53.8 | 79.5 | 71.5 | 76.4 | 99.5 | 99.0 | 76.4 | 79.4 |
| LlamaGuard4-12B | 51.3 | 73.5 | 67.8 | 70.6 | 98.0 | 97.2 | 73.0 | 75.9 |
| WildGuard-7B | 70.8 | 72.1 | 89.4 | 80.7 | 99.5 | 98.9 | 88.9 | 85.8 |
| ShieldGemma-9B | 69.4 | 82.1 | 70.3 | 72.5 | 83.7 | 60.6 | 54.2 | 70.4 |
| ShieldGemma-27B | 72.9 | 80.5 | 69.0 | 71.6 | 84.4 | 57.3 | 54.3 | 70.0 |
| NemoGuard-8B | 75.6 | 81.0 | 81.4 | 86.8 | 98.5 | 75.2 | 81.6 | 82.9 |
| PolyGuard-Qwen-7B | 71.5 | 74.1 | 90.3 | 86.3 | 100.0 | 98.7 | 88.1 | 87.0 |
| Qwen3Guard-0.6B-Gen strict | 65.1 | 66.5 | 90.8 | 85.0 | 99.0 | 98.7 | 87.7 | 88.1* |
| Qwen3Guard-0.6B-Gen loose | 77.7 | 77.6 | 76.9 | 83.3 | 95.8 | 96.1 | 85.1 | |
| Qwen3Guard-4B-Gen strict | 69.5 | 68.3 | 90.8 | 85.8 | 99.5 | 100.0 | 85.6 | 89.3* |
| Qwen3Guard-4B-Gen loose | 82.8 | 80.7 | 76.3 | 82.1 | 97.4 | 99.2 | 85.1 | |
| Qwen3Guard-8B-Gen strict | 68.9 | 68.8 | 91.4 | 86.1 | 99.5 | 100.0 | 88.9 | 90.0* |
| Qwen3Guard-8B-Gen loose | 82.8 | 81.3 | 76.0 | 82.5 | 97.4 | 98.5 | 85.6 | |

### Table 3: English RESPONSE classification F1 (Qwen-run)
| Model | HarmB | SafeRLHF | BeaverTails | XSTest | Aegis2.0 | WildG | Think | Avg |
|---|---|---|---|---|---|---|---|---|
| LlamaGuard3-8B | 84.5 | 45.2 | 67.9 | 89.8 | 66.1 | 69.5 | 72.0 | 70.7 |
| LlamaGuard4-12B | 83.3 | 42.5 | 68.6 | 88.9 | 63.7 | 66.4 | 59.3 | 67.5 |
| WildGuard-7B | 86.3 | 64.2 | 84.4 | 94.7 | 83.2 | 75.4 | 71.4 | 79.9 |
| ShieldGemma-9B | 60.4 | 44.2 | 62.4 | 86.3 | 70.8 | 49.9 | 61.1 | 62.2 |
| ShieldGemma-27B | 62.9 | 52.6 | 67.6 | 83.0 | 74.9 | 52.4 | 68.0 | 65.9 |
| NemoGuard-8B | 81.4 | 57.6 | 78.5 | 86.2 | 87.6 | 77.5 | 77.9 | 78.1 |
| PolyGuard-Qwen-7B | 71.1 | 63.3 | 79.5 | 63.4 | 81.9 | 77.9 | 81.1 | 74.0 |
| Qwen3Guard-0.6B-Gen strict | 85.0 | 66.6 | 86.1 | 89.7 | 84.2 | 76.3 | 83.6 | 82.0* |
| Qwen3Guard-0.6B-Gen loose | 82.6 | 64.2 | 85.4 | 91.3 | 84.1 | 77.3 | 83.1 | |
| Qwen3Guard-4B-Gen strict | 86.7 | 69.8 | 86.6 | 92.7 | 86.1 | 79.5 | 84.0 | 83.7* |
| Qwen3Guard-4B-Gen loose | 86.7 | 64.5 | 85.2 | 92.4 | 86.5 | 77.3 | 80.2 | |
| Qwen3Guard-8B-Gen strict | 87.2 | 70.5 | 86.6 | 92.1 | 86.1 | 78.9 | 84.0 | 83.9* |
| Qwen3Guard-8B-Gen loose | 86.5 | 64.2 | 85.5 | 93.7 | 86.4 | 77.3 | 83.3 | |
"Think" = Qwen's own thinking-trace response set. URL for Tables 2--3: https://arxiv.org/html/2510.14276

### Multilingual and Chinese (Qwen-run, F1 averages only; full per-language rows in Tables 4--6 of the report)
| Model | Chinese prompt avg | Chinese response avg | RTP-LX prompt avg (40 langs) | PolyGuard-Response avg (17 langs) |
|---|---|---|---|---|
| LlamaGuard3-8B | 45.6 | 62.2 | 46.6 | 65.8 |
| LlamaGuard4-12B | 44.1 | 56.5 | 41.7 | 53.4 |
| WildGuard-7B | 55.1 | 61.5 | 43.9 | 63.5 |
| ShieldGemma-9B | 41.7 | 49.7 | 55.4 | 46.8 |
| ShieldGemma-27B | 44.4 | 53.7 | 61.4 | 50.4 |
| NemoGuard-8B | 39.1 | 63.0 | 42.7 | 69.5 |
| PolyGuard-Qwen-7B | 68.4 | 62.5 | 80.9 | 74.0 |
| Qwen3Guard-0.6B-Gen | 80.8* | 84.9* | 74.8* | 74.2* |
| Qwen3Guard-4B-Gen | 84.6* | 87.3* | 81.6* | 78.1* |
| Qwen3Guard-8B-Gen | 85.1* | 87.1* | 85.0* | 77.6* |
Caveat: Chinese sets include "PolST" (Qwen's political-sensitivity set): rivals score 5.7--48.3 there vs Qwen 84--89, because politically sensitive topics are a Qwen-only category; this inflates Qwen's Chinese average. RTP-LX loose-mode scores collapse (e.g. 8B loose Others 43.9 vs strict 83.9): the mode choice matters more than model size.

### Table 7: refusal detection (Qwen-run; WildGuard number as reported)
| Model | XSTest P | XSTest R | XSTest F1 | WildGuardTest P | R | F1 |
|---|---|---|---|---|---|---|
| WildGuard-7B | -- | -- | 93.3 | -- | -- | 88.6 |
| Qwen3Guard-0.6B-Gen | 89.2 | 97.6 | 93.3 | 83.1 | 96.8 | 89.4 |
| Qwen3Guard-4B-Gen | 90.7 | 98.9 | 94.6 | 83.3 | 98.4 | 90.2 |
| Qwen3Guard-8B-Gen | 87.5 | 98.3 | 92.6 | 82.7 | 98.6 | 90.0 |

### Stream vs Gen averages (own; Tables 11--15)
| Model | En prompt avg | En response avg | Zh prompt avg | Zh response avg | RTP-LX avg | PolyGuard-Resp avg |
|---|---|---|---|---|---|---|
| Qwen3Guard-0.6B-Stream | 86.3* | 79.2* | 80.5* | 81.9* | 64.4* | 70.6* |
| Qwen3Guard-4B-Stream | 89.1* | 81.8* | 84.1* | 84.9* | 80.2* | 75.5* |
| Qwen3Guard-8B-Stream | 88.3* | 81.1* | 84.4* | 85.0* | 82.7* | 75.8* |
Stream loses about 2 F1 on English response vs Gen (83.9 vs 81.1 at 8B).

### Table 8 (own): effect of the Controversial label, Qwen3Guard-4B-Gen F1
Prompt (ToxiC, OpenAIMod, Aegis, Aegis2.0, SimpST, HarmB, WildG): without Controversial 71.1, 70.2, 86.1, 86.6, 99.0, 100.0, 87.7; strict 66.2, 67.9, 90.9, 86.0, 99.5, 100.0, 88.5; loose 80.9, 80.2, 75.3, 81.3, 96.9, 96.8, 84.5. Point: datasets disagree on borderline cases (ToxicChat/OpenAI Mod reward loose, Aegis rewards strict), so a single binary threshold cannot win all of them.

---

## 5. ShieldGemma (2B/9B/27B) and ShieldGemma 2 (4B, images) (Google)

Sources (fetched 2026-10-04): https://arxiv.org/html/2407.21772 (ShieldGemma); https://arxiv.org/html/2504.01081 (ShieldGemma 2); https://ai.google.dev/gemma/docs/shieldgemma/model_card_2 (HF repos google/shieldgemma-* are gated).

- ShieldGemma: 2B, 9B, 27B on Gemma 2; released 2024-07-31 (memory, with Gemma 2 2B); Gemma Terms of Use licence (memory). Taxonomy: 6 harm types defined in the paper (Sexually Explicit Information, Hate Speech, Dangerous Content, Harassment, Violence, Obscenity and Profanity); "While the model is trained on all six harms, we report performance only on the four targeted harms" (sexual, dangerous, hate, harassment). Prompt and response classification, ONE policy per call; output is P("Yes") so any threshold can be set. English. No latency numbers.
- ShieldGemma 2: 4B, from Gemma 3 4B IT; released 2025-03-12 with Gemma 3 (memory; card page last updated 2025-04-03). Image-only safety classifier: input image + policy text, output P(Yes)/P(No). 3 policies: Sexually Explicit, Dangerous content, Violence/Gore. Recommended as an input filter for VLMs or output filter for image generators.

### ShieldGemma Table 1 (Google-run; Optimal F1 / AU-PRC; alpha = 0, T = 1)
| Model | SG Prompt | OpenAI Mod | ToxicChat | SG Response |
|---|---|---|---|---|
| ShieldGemma (2B) | 0.825/0.887 | 0.812/0.887 | 0.704/0.778 | 0.743/0.802 |
| ShieldGemma (9B) | 0.828/0.894 | 0.821/0.907 | 0.694/0.782 | 0.753/0.817 |
| ShieldGemma (27B) | 0.830/0.883 | 0.805/0.886 | 0.729/0.811 | 0.758/0.806 |
| OpenAI Mod API | 0.782/0.840 | 0.790/0.856 | 0.254/0.588 | - |
| LlamaGuard1 (7B) | - | 0.758/0.847 | 0.616/0.626 | - |
| LlamaGuard2 (8B) | - | 0.761/- | 0.471/- | - |
| WildGuard (7B) | 0.779/- | 0.721/- | 0.708/- | 0.656/- |
| GPT-4 | 0.810/0.847 | 0.705/- | 0.683/- | 0.713/0.749 |
URL: https://arxiv.org/html/2407.21772 . Caption: "The performance of baseline models on external datasets is sourced from Inan et al. (2023); Ghosh et al. (2024)", i.e. rival numbers on OpenAI Mod / ToxicChat are COPIED from other papers, not re-run; rows on SG Prompt / SG Response are on Google's own test sets.
KEY CONTRADICTION: "Optimal F1" means the threshold was tuned per dataset on the test labels. ShieldGemma's own optimal F1 on ToxicChat is 0.694--0.729; IBM (Granite Guardian Table 7) measured 0.177--0.181 F1 on ToxicChat at a default threshold, and Qwen measured 69.4--72.9 (prompt). Same model, same dataset, F1 from 0.18 to 0.73 depending on threshold and harm-policy mapping. AUC/AUPRC (threshold-free) agree better: IBM measured ToxicChat AUC 0.811--0.880.

### ShieldGemma 2 Table 1 (Google-run; internal image benchmark; Precision/Recall/F1 %)
| Policy | SG2 | LlavaGuard (Our Policy) | LlavaGuard (Original Policy) | GPT-4o mini | Gemma 3 | SG2 (w/o BADG) |
|---|---|---|---|---|---|---|
| Sexual | 87.6/89.7/88.6 | 67.2/98.9/80.0 | 47.6/93.1/63.0 | 68.3/97.7/80.3 | 77.7/87.9/82.5 | 85.9/91.4/88.6 |
| Danger | 95.6/91.9/93.7 | 82.3/89.6/85.8 | 67.0/100.0/80.3 | 84.4/99.0/91.0 | 75.9/94.5/84.2 | 91.8/90.9/91.3 |
| Violence | 80.3/90.4/85.0 | 39.8/100.0/57.0 | 36.8/100.0/53.8 | 40.2/100.0/57.3 | 78.2/82.2/80.1 | 76.1/89.6/82.3 |

### ShieldGemma 2 Table 2 (Google-run; UnsafeBench relabelled with Google's policies)
| Policy | Metric | SG2 | LlavaGuard (Our Policy) | LlavaGuard (Original) | GPT-4o mini | Gemma 3 |
|---|---|---|---|---|---|---|
| Sexual | F1 | 64.2 | 42.1 | 37.8 | 57.1 | 50.4 |
| Danger | 1 - FPR | 88.7 | 68.6 | 27.3 | 92.3 | 93.8 |
| Violence | 1 - FPR | 95.9 | 40.1 | 13.0 | 62.5 | 57.3 |
URL: https://arxiv.org/html/2504.01081 . Note 1 - FPR is a pure over-flagging measure (GPT-4o mini and Gemma 3 beat SG2 on Danger by it).

---

## 6. WildGuard 7B (AI2 / UW)

Sources (fetched 2026-10-04): https://arxiv.org/html/2406.18495 (NeurIPS 2024 D&B); HF allenai/wildguard (gated).
- Release 2024-06-26 (memory); base Mistral-7B-v0.3 (memory); licence Apache 2.0 (memory; data WildGuardMix under ODC-By, memory). Three tasks in one model: prompt harmfulness, response harmfulness, response refusal (refusal vs compliance). Output: three yes/no lines. Taxonomy: 4 high-level categories, 13 subcategories (Privacy, Misinformation, Harmful Language, Malicious Uses; Table 10). English. WildGuardMix = 92K labelled examples; WildGuardTest = about 5K human-annotated items (adversarial and vanilla). No latency numbers.

### Table 3: F1 (%) on public benchmarks (AI2-run; RIVALS re-run by AI2)
| Model | ToxiC | OAI | Aegis | SimpST | HarmB (prompt) | Prompt Avg | HarmB (resp) | S-RLHF | BeaverT | XST | Resp Avg |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Llama-Guard | 61.6 | 75.8 | 74.1 | 93.0 | 67.2 | 74.4 | 52.0 | 48.4 | 67.1 | 82.0 | 62.4 |
| Llama-Guard2 | 47.1 | 76.1 | 71.8 | 95.8 | 94.0 | 77.0 | 77.8 | 51.6 | 71.8 | 90.8 | 73.0 |
| Aegis-Guard-D | 70.0 | 67.5 | 84.8 | 100 | 77.7 | 80.0 | 62.2 | 59.3 | 74.7 | 52.8 | 62.3 |
| Aegis-Guard-P | 73.0 | 74.7 | 82.9 | 99.0 | 70.5 | 80.0 | 60.8 | 55.9 | 73.8 | 60.4 | 62.7 |
| HarmB-Llama | - | - | - | - | - | - | 84.3 | 60.0 | 77.1 | 64.5 | 71.5 |
| HarmB-Mistral | - | - | - | - | - | - | 87.0 | 52.4 | 75.2 | 72.0 | 71.7 |
| MD-Judge | - | - | - | - | - | - | 81.6 | 64.7 | 86.7 | 90.4 | 80.9 |
| LibrAI-LongFormer | - | - | - | - | - | - | 62.1 | 50.6 | 67.1 | 70.9 | 62.7 |
| BeaverDam | - | - | - | - | - | - | 58.4 | 72.1 | 89.9 | 83.6 | 76.0 |
| OAI Mod. API | 25.4 | 79.0 | 31.9 | 63.0 | 9.6 | 41.8 | 20.6 | 10.1 | 15.7 | 46.6 | 23.2 |
| GPT-4 | 68.3 | 70.5 | 84.4 | 100 | 100 | 84.6 | 86.1 | 67.9 | 86.1 | 91.3 | 82.0 |
| WildGuard | 70.8 | 72.1 | 89.4 | 99.5 | 98.9 | 86.1 | 86.3 | 64.2 | 84.4 | 94.7 | 82.4 |

### Table 4: F1 (%) on WildGuardTest (AI2-run)
| Model | Prompt Adv | Prompt Vani | Prompt Total | Resp Adv | Resp Vani | Resp Total | Refusal Harm. | Refusal Adv | Refusal Vani | Refusal Total |
|---|---|---|---|---|---|---|---|---|---|---|
| Llama-Guard | 32.6 | 70.5 | 56.0 | 25.8 | 66.7 | 50.5 | 76.5 | 45.1 | 56.9 | 51.4 |
| Llama-Guard2 | 46.1 | 85.6 | 70.9 | 47.9 | 78.2 | 66.5 | 82.2 | 47.9 | 58.8 | 53.8 |
| Aegis-Guard-D | 74.5 | 82.0 | 78.5 | 40.4 | 57.6 | 49.1 | 56.1 | 38.9 | 44.0 | 41.8 |
| Aegis-Guard-P | 62.9 | 77.9 | 71.5 | 49.0 | 62.4 | 56.4 | 67.1 | 45.4 | 48.2 | 46.9 |
| MD-Judge | - | - | - | 67.7 | 85.0 | 76.8 | 85.7 | 50.6 | 59.4 | 55.5 |
| Keyword-based | - | - | - | - | - | - | 67.8 | 67.0 | 65.9 | 66.3 |
| OAI Mod. API | 6.8 | 16.3 | 12.1 | 14.7 | 18.8 | 16.9 | 71.4 | 44.5 | 54.3 | 49.8 |
| GPT-4 | 81.6 | 93.4 | 87.9 | 73.6 | 81.3 | 77.3 | 93.9 | 91.4 | 93.5 | 92.4 |
| WildGuard | 85.5 | 91.7 | 88.9 | 68.4 | 81.5 | 75.4 | 94.0 | 88.5 | 88.6 | 88.6 |
(HarmB-Llama/Mistral, BeaverDam, LibrAI rows omitted here for space; see Table 4.) Refusal detection on XSTest-Resp: WildGuard F1 92.8 (Table 5 ablation row "WildGuardTrain"); Qwen report quotes 93.3 for WildGuard on XSTest refusal: small discrepancy, different source row.
Adversarial prompts are the gap: Llama-Guard2 prompt F1 drops from 85.6 (vanilla) to 46.1 (adversarial).

### Table 6: as a live filter (AI2-run; WildJailbreak validation: 2000 harmful + 250 benign adversarial prompts; ASR = attack success, RTA = refusal to answer benign, both lower is better)
| Filter | Tulu2 + WJ (ASR/RTA) | Tulu2-dpo (ASR/RTA) |
|---|---|---|
| none | 2.3/1.2 | 79.8/0.0 |
| WildGuard | 0.7/1.7 | 2.4/0.4 |
| Llama-Guard2 | 1.9/1.6 | 53.1/0.8 |
| Aegis-Guard-D | 0.9/16.8 | 12.4/16.0 |
| Aegis-Guard-P | 1.7/4.0 | 32.7/3.6 |
| MD-Judge | 1.9/10.1 | 25.7/4.4 |
Table 21 (Llama3-8B-Inst): none 17.4/7.6; WildGuard 1.1/8.0; Llama-Guard2 14.2/8.4; Aegis-Guard-D 6.0/20.8; Aegis-Guard-P 12.2/10.0; MD-Judge 10.1/10.8. RTA = an over-refusal number for the guarded system (Aegis-Guard-D adds about 16 points of benign refusals).
URL for all: https://arxiv.org/html/2406.18495

---

## 7. NVIDIA: Aegis 1.0/2.0, NemoGuard 8B content safety, Nemotron Safety Guard v3, Nemotron Content Safety Reasoning 4B, Nemotron 3 / 3.5 Content Safety

Sources (fetched 2026-10-04): HF cards (raw README) of nvidia/Aegis-AI-Content-Safety-LlamaGuard-Defensive-1.0, nvidia/llama-3.1-nemoguard-8b-content-safety, nvidia/Llama-3.1-Nemotron-Safety-Guard-8B-v3, nvidia/Nemotron-Content-Safety-Reasoning-4B, nvidia/Nemotron-3-Content-Safety, nvidia/Nemotron-3.5-Content-Safety (URL pattern https://huggingface.co/<repo>); Aegis 2.0 paper https://arxiv.org/html/2501.09004 (NAACL 2025).

| Model | Size / base | Release | Licence | Taxonomy | Languages | Modality |
|---|---|---|---|---|---|---|
| Aegis-AI-Content-Safety-LlamaGuard Defensive / Permissive 1.0 | 7B, LoRA on Llama Guard 1 (Llama 2 7B) | HF repos 2024-04-17 | Llama 2 community licence (memory) | Aegis 1.0: 13 categories + Needs Caution (memory) | English | text |
| Llama-3.1-NemoGuard-8B-ContentSafety (renamed "Llama Nemotron Safety Guard V2") | 8B, LoRA (PEFT) on Llama-3.1-8B-Instruct | HF repo 2025-01-15 | NVIDIA licence (card says "other") | Aegis 2.0: 23 unsafe categories + safe + "needs caution"; novel categories can be given in the prompt | English (card) | text; prompt and response, outputs JSON User Safety / Response Safety / Safety Categories |
| Llama-3.1-Nemotron-Safety-Guard-8B-v3 | 8B, LoRA on Llama-3.1-8B-Instruct; CultureGuard synthetic data | 2025-10-28 (card) | NVIDIA Open Model License | Aegis 2.0 taxonomy | 9 trained (en, es, zh, de, fr, hi, ja, ar, th); "over 20" zero-shot | text, 8K context |
| Nemotron-Content-Safety-Reasoning-4B | 4B, Gemma-3-4B-it; reasoning traces distilled from Qwen3-32B, DeepSeek-R1-0528, gpt-oss-120b | Nov 2025 (card) | NVIDIA Open Model License + Gemma terms | Aegis 2.0 + custom policies; also refusal | English traces | text; reasoning on/off |
| Nemotron-3-Content-Safety | 4B, Gemma-3-4B-it | 2026-03-16 (card); trained Oct 2025 -- Mar 2026 | NVIDIA Nemotron Open Model License + Gemma terms | Aegis 2.0 | 12 (en, ar, de, es, fr, hi, ja, th, nl, it, ko, zh) | text + one image |
| Nemotron-3.5-Content-Safety | 4B, Gemma-3-4B-it | 2026-06-02 (card; HF repo created 2026-05-22) | OpenMDW-1.1 + Gemma terms | Aegis 2.0 standard mode + custom-policy reasoning mode | same 12; 128K context | text + one image |
NemoGuard-JailbreakDetect (2025-01-14) and llama-3.1-nemoguard-8b-topic-control also exist; not covered. No latency figures in any of these cards (Reasoning-4B says "low-latency" qualitatively; one-sentence reasoning traces used "to improve latency").

### Aegis 2.0 paper Table 3 (NVIDIA-run; mean harmful F1 over 3 seeds; RIVALS re-run except † rows)
| Model | OAI Mod (prompt) | WGTest (prompt) | WGTest (response) | XSTest (response) | Unweighted avg |
|---|---|---|---|---|---|
| OpenAI Mod API | 0.789 | 0.121 | 0.214 | 0.558 | 0.385 |
| LlamaGuard2-8B | 0.759 | 0.704 | 0.658 | 0.908 | 0.723 |
| LlamaGuard3-1B | 0.374 | 0.472 | 0.261 | 0.245 | 0.359 |
| LlamaGuard3-8B | 0.788 | 0.768 | 0.700 | 0.904 | 0.764 |
| BeaverDam † | -- | -- | 0.634 | 0.836 | -- |
| WildGuard † | 0.721 | 0.889 | 0.754 | 0.947 | 0.828 |
| Llama3.1-AegisGuard + TF | 0.810 | 0.816 | 0.775 | 0.862 | 0.816 |
| Llama3.1-AegisGuard | 0.770 | 0.821 | 0.757 | 0.883 | 0.808 |
Note: "WGTest and XSTest are in-domain for WildGuard and OpenAI Mod is in-domain for OpenAI Mod API". Table 4 (Aegis2.0 test, prompt/response F1): OpenAI Mod API 0.378/0.474; LlamaGuard2-8B 0.768/0.674; LlamaGuard3-1B 0.496/0.529; LlamaGuard3-8B 0.773/0.657; WildGuard 0.819/0.835; Llama3.1-AegisGuard 0.868/0.866. URL: https://arxiv.org/html/2501.09004
CONTRADICTION: Llama Guard 3-1B on OpenAI Mod prompt F1 = 0.374 (NVIDIA) vs 0.686 (IBM, GG Table 7) vs Meta's own internal F1 0.899 English. On XSTest response: 0.245 (NVIDIA) vs Meta's 0.821. Likely prompt-format / category-mapping differences in the re-runs; the spread itself is the lesson.

### NemoGuard-8B content safety card
No benchmark numbers on the card (lists AUPRC, F1, jailbreak resiliency as metrics; points to the Aegis 2.0 paper). Rival-run numbers for it: Qwen3Guard report (section 4: prompt avg 82.9, response avg 78.1).

### Nemotron-Safety-Guard-8B-v3 card (own; metric not labelled on the card, presumably harmful F1 x100: unconfirmed)
| Nemotron-Safety-Guard-Dataset-v3 | PolyGuardPrompts | RTP-LX | MultiJail | XSafety | Aya Red-teaming |
|---|---|---|---|---|---|
| 85.32 | 76.07 | 91.49 | 95.36 | 66.97 | 96.79 |

### Nemotron-Content-Safety-Reasoning-4B card (own; F1)
| Reasoning | Vanilla avg prompt F1 | Vanilla avg response F1 | Vanilla combined | Custom safety avg F1 (Dynaguardrail 0.870/0.876, CoSA 0.846/0.862) |
|---|---|---|---|---|
| Off | 0.847 | 0.850 | 0.848 | 0.857 |
| On | 0.848 | 0.836 | 0.842 | 0.868 |
Per dataset (Off / On): XSTest Resp 0.922/0.908, JBB Resp 0.845/0.842, WG Prompt 0.839/0.850, WG Resp 0.768/0.732, Aegis 2.0 Prompt 0.869/0.865, Aegis 2.0 Resp 0.863/0.863, OpenAI Mod Prompt 0.769/0.764, SimpleSafety 1.000/1.000, ToxicChat 0.760/0.759. Reasoning helps custom policies, not vanilla safety.

### Nemotron-3-Content-Safety card (own; Accuracy and harmful F1 kept separate)
| Benchmark | Prompt Acc | Prompt harmful F1 | Response Acc | Response harmful F1 |
|---|---|---|---|---|
| RTVLM | 0.74 | 0.38 | | |
| VLGUARD | 0.85 | 0.87 | | |
| MM-SAFETYBENCH | 0.56 | 0.73 | | |
| FigStep | 0.76 | 0.86 | | |
| Multijail | 0.92 | 0.96 | | |
| XSafety | 0.59 | 0.73 | | |
| Aya Redteaming | 0.94 | 0.97 | | |
| XSTEST | 0.82 | 0.83 | 0.94 | 0.85 |
| Aegis 2 | 0.85 | 0.87 | 0.84 | 0.83 |
| Wildguard | 0.82 | 0.82 | 0.90 | 0.74 |
| Polyguard | 0.82 | 0.80 | 0.90 | 0.73 |
| RTP-LX | 0.85 | 0.90 | 0.96 | 0.98 |
False-positive rate on assumed-100%-safe sets (over-flagging): MMMU (10,500) 0.023, DocVQA (5,188) 0.058, AI2D (3,088) 0.001.

### Nemotron-3.5-Content-Safety card (own)
| Benchmark | Prompt Acc | Prompt harmful F1 | Response Acc | Response harmful F1 |
|---|---|---|---|---|
| VLGUARD | 0.89 | 0.90 | | |
| MM-SAFETYBENCH | 0.55 | 0.71 | | |
| XSTEST | 0.85 | 0.85 | 0.95 | 0.87 |
| Aegis 2.0 | 0.85 | 0.86 | 0.85 | 0.85 |
| Wildguard | 0.86 | 0.85 | 0.92 | 0.77 |
Multilingual harmful F1 (prompt / response): PolyGuard 0.80/0.75; RTP-LX 0.89; MultiJail 0.95; XSafety 0.72; Aya Redteaming 0.97; Multilingual Aegis Cultural+Generic 0.82/0.84; Multilingual Aegis Cultural+Adapted 0.97/0.95; LinguaSafe average F1 0.71. Custom policy (No Think / Think): Dynaguardrail Safety 0.91/0.86, Finance 0.84/0.85, Tax 0.86/0.89, Prompt Injection 0.90/0.88; COSA five configs 0.72--1.00. FP rate on safe sets: MMMU 0.03, DocVQA 0.060, AI2D 0.001. No rival comparisons on the 3 / 3.5 cards.

---

## 8. gpt-oss-safeguard 20B / 120B (OpenAI)

Sources (fetched 2026-10-04): HF card https://huggingface.co/openai/gpt-oss-safeguard-20b ; technical report PDF https://cdn.openai.com/pdf/08b7dee4-8bc6-4955-a219-7793fb69090c/Technical_report__Research_Preview_of_gpt_oss_safeguard.pdf (dated October 29, 2025). The blog https://openai.com/index/introducing-gpt-oss-safeguard/ returned 403 to the fetcher.
- Release 2025-10-29 (research preview; with ROOST). Licence Apache 2.0. Base: fine-tunes of gpt-oss-20b (21B total, 3.6B active, fits 16GB VRAM) and gpt-oss-120b (117B, 5.1B active). Harmony format only. Bring-your-own-policy reasoning classifier: policy text in the system message, output a label plus visible chain of thought; reasoning effort low/medium/high. No fixed taxonomy. Languages: report evaluates multilingual chat (MMMLU, 14 languages), not multilingual classification.

### Report Table 1 (OpenAI-run; internal, multi-policy accuracy: correct only if ALL included policies match gold)
| Model | Multi-policy accuracy |
|---|---|
| gpt-oss-safeguard-120b | 46.3% |
| gpt-oss-safeguard-20b | 43.6% |
| internal-safety-reasoner | 52.2% |
| gpt-5-thinking | 43.2% |
| gpt-oss-120b | 32.5% |
| gpt-oss-20b | 32.1% |

### Report Table 2 (OpenAI-run; F1)
| Model | OpenAI Mod (2022) F1 | ToxicChat F1 |
|---|---|---|
| gpt-oss-safeguard-120b | 82.9% | 79.3% |
| gpt-oss-safeguard-20b | 82.9% | 79.9% |
| internal-safety-reasoner | 82.8% | 81.3% |
| gpt-5-thinking | 79.8% | 81.0% |
| gpt-oss-120b | 80.4% | 76.7% |
| gpt-oss-20b | 78.7% | 75.9% |
Notes: OpenAI Mod evaluated "using our internal safety policies (adapting one policy ...)" (in-domain for OpenAI); ToxicChat "using a short hand-written prompt adapted from some of our internal policies". The 20B ties or beats the 120B.

### Limitations (verbatim, report section 2.1)
- "classifiers trained on tens of thousands of high-quality labeled samples can still perform better at classifying content than gpt-oss-safeguard does when reasoning directly from the policy."
- "gpt-oss-safeguard can be time and compute-intensive, which makes it challenging to scale across all platform content. Internally, we handle this in several ways with Safety Reasoner: (1) we use smaller and faster classifiers to determine which content to assess and (2) in some circumstances, we use Safety Reasoner asynchronously to provide a low-latency user experience while maintaining the ability to intervene if we detect unsafe content."
No latency figures in ms published (unconfirmed elsewhere).

---

## 9. Mistral Shieldstral 1.0 3B (2026)

- Date: August 4, 2026 (Mistral docs model page, saved locally at technical_knowledge_base/models_and_training/topic_llms/mistral_ai/src/inputs/shield.txt and fc_shieldstral.txt). Public Preview, Apache 2.0, 3.8B params per docs (card says 3B), base Ministral-3-3B-Base-2512 + Pixtral encoder, 12 languages, 32k trained context. Policy-adaptive, single forward pass, one yes/no token gives a continuous score (threshold 0.5 in its tables). Tech report arXiv 2607.25857. Card saved at .../mistral_ai/src/inputs/hf_Shieldstral-1.0-3B.README.md (not transcribed here, per brief).
- WHO RAN IT: the card's comparison tables (prompt F1, response F1, multilingual, refusal F1, multimodal) are vendor-run by Mistral and re-run rivals: GPT-OSS-Safeguard-20B (reasoning_effort=high), Qwen3Guard-8B (score AVERAGED over strict and loose mappings), Nemotron-3.5-Content-Safety-4B (reasoning none), LlamaGuard-4-12B, ShieldGemma-9B (threshold 0.5), WildGuard-7B, PolyGuard-Qwen-7B, OmniGuard-7B, LlavaGuard-7B, ShieldGemma-2-4B.
- Cross-source checks against the rivals' own numbers (useful for the "who ran it" point):
  - gpt-oss-safeguard-20B ToxicChat: Mistral-run 79.8 vs OpenAI-run 79.9 (agree); OpenAI Mod: 84.0 vs 82.9.
  - Qwen3Guard-8B ToxicChat prompt: Mistral-run 75.6 (avg of modes) vs Qwen-run strict 68.9 / loose 82.8 (Qwen's headline avg picks the better one per benchmark).
  - LlamaGuard-4-12B ToxicChat: Mistral 51.0 vs Qwen 51.3 (agree); WildGuardTest prompt 74.3 vs 73.0.
  - ShieldGemma-9B WildGuardTest prompt: Mistral 46.0 (threshold 0.5) vs Qwen 54.2; ToxicChat 62.4 vs 69.4 vs Google's optimal-F1 0.694 vs IBM's 0.181.

---

## 10. Other guard models, late 2025 -- 2026 (from Hugging Face API listings, fetched 2026-10-04; WebSearch budget was exhausted, so this list comes from HF only)

Checked orgs: meta-llama, google, microsoft, deepseek-ai, zai-org, THUDM, Qwen, openai, mistralai, allenai, ibm-granite, nvidia. Findings:
- NOT FOUND on HF: Llama Guard 5 (latest Meta guard repos are Llama-Guard-4-12B, 2025-04-23, and Prompt Guard 2, 2025-04-28); any new Google ShieldGemma (latest google/shieldgemma-2-4b-it, 2025-03-04); any Qwen3.5 Guard; any guard model from Microsoft, DeepSeek, Zhipu/Z.ai. Treat as "none released on HF as of 2026-10-04", unconfirmed for releases outside HF.
- 2026 vendor releases found: IBM Granite Guardian 4.1 8B (2026-04, section 3), granite-guardian-4.0-3b-toxicity-ja (2026-04-06), granitelib-guardian-r1.0 (2026-02-02); NVIDIA Nemotron-3-Content-Safety (2026-03-16) and Nemotron-3.5-Content-Safety (2026-06-02) (section 7); Mistral Shieldstral 1.0 3B (2026-08-04, section 9).
- Late 2025 non-big-lab releases worth a line:
  - ServiceNow AprielGuard 8B (HF 2025-11-21; MIT; downscaled Apriel-1.5-15B base; safety categories + binary adversarial-attack detection; report arXiv 2512.20293). Own card, P/R/F1/FPR (prompt-level safety): SimpleSafetyTests F1 0.98; BeaverTails F1 0.84 FPR 0.14; SafeRLHF F1 0.92 FPR 0.17; xstest-response F1 0.95 FPR 0.01; ToxicChat F1 0.73 FPR 0.03; OpenAI moderation F1 0.77 FPR 0.22; Aegis 1.0 F1 0.84 FPR 0.03; Aegis 2.0 F1 0.84 FPR 0.16; HarmBench F1 1.00; XSTest F1 0.94 FPR 0.09. Adversarial: wildguardmix F1 0.76 FPR 0.12; wildjailbreak F1 0.96 FPR 0.31; deepset prompt-injections F1 0.68 (recall 0.52). URL: https://huggingface.co/ServiceNow-AI/AprielGuard . (Notable: card reports FPR beside F1, unusual and useful.)
  - AI Singapore SEA-Guard (Qwen-SEA-Guard 4B/8B, Llama-SEA-Guard 8B, Gemma-SEA-Guard 12B; "2602" versions; HF repos Nov--Dec 2025; Apache 2.0 for the Qwen variant; Southeast Asian languages; paper arXiv 2602.01618, benchmark SEA-SafeguardBench arXiv 2512.05501). Numbers not transcribed.
  - Community / startup guards with many downloads in 2026 (no verification of claims): guardion/ModernGuard-1 (2026-01), GeneralAnalysis/GA_Guard_1B (2026-05, Llama 3.2 1B, 7 policies), hivetrace gliner-guard (2026-03/04), prismor/prompt-guard-1.5b (2026-05), sheltron-ai/prompt-guard-68m (2026-07), NeuralTrust/prompt-guard-oss-small (2026-08), vllm-sr/Vela-1.0-Encoder-307M-Guard (2026-09), zgpu-ai/zlm-v1-moderation-edge (2026-09), speakleash Bielik-Guard 0.1B/0.5B (Polish, 2026-02), ZJU-Safety/DARWIN-Guard (2026-07). Not investigated.

---

## 11. Independent (non-vendor) comparisons

### GuardBench (Elias Bassani and Ignacio Sanchez, EMNLP 2024; European Commission JRC, memory)
- Paper https://aclanthology.org/2024.emnlp-main.1022 ; library https://github.com/AmenRa/guardbench (40 datasets; Oct 2025 update added JBB Behaviors, NicheHazardQA, HarmEval, TechHazardQA and selectable metrics incl. MCC, AUPRC, FPR, FNR); leaderboard https://huggingface.co/spaces/AmenRa/guardbench-leaderboard ; raw results https://huggingface.co/datasets/AmenRa/guardbench-results (last modified 2025-11-20).
- Metric: F1 only. Leaderboard "about" text: "We do not employ the Area Under the Precision-Recall Curve (AUPRC) as we found it overemphasizes models' Precision at the expense of Recall, thus hiding significant performance details." (Contrast: ShieldGemma reports AU-PRC, Meta reports AUPRC.)
- Who ran: the GuardBench authors (independent of all vendors); leaderboard accepts submissions "please contact us", so per-row provenance is not stated: unconfirmed whether any row was vendor-submitted.

Leaderboard F1 (fetched 2026-10-04, rounded to 3 decimals from results.json; DE/FR/IT/ES = prompts in German, French, Italian, Spanish):
| Model | EN prompts | EN responses | DE | FR | IT | ES |
|---|---|---|---|---|---|---|
| granite-guardian-3.0-8b | 0.903 | 0.837 | 0.847 | 0.845 | 0.827 | 0.855 |
| granite-guardian-3.1-8b | 0.901 | 0.859 | 0.852 | 0.850 | 0.846 | 0.863 |
| granite-guardian-3.2-5b | 0.880 | 0.855 | 0.838 | 0.841 | 0.831 | 0.841 |
| granite-guardian-3.1-2b | 0.874 | 0.852 | 0.828 | 0.840 | 0.822 | 0.840 |
| wildguard (7B) | 0.871 | 0.869 | 0.806 | 0.822 | 0.805 | 0.836 |
| granite-guardian-3.2-3b-a800m | 0.864 | 0.854 | 0.784 | 0.796 | 0.793 | 0.819 |
| Aegis LlamaGuard Defensive 1.0 | 0.861 | 0.788 | 0.816 | 0.824 | 0.816 | 0.828 |
| granite-guardian-3.0-2b | 0.860 | 0.787 | 0.768 | 0.764 | 0.750 | 0.781 |
| MD-Judge-v0.1 | 0.858 | 0.864 | 0.678 | 0.670 | 0.659 | 0.718 |
| Aegis LlamaGuard Permissive 1.0 | 0.849 | 0.779 | 0.775 | 0.782 | 0.773 | 0.790 |
| llama-3.1-nemoguard-8b-content-safety | 0.841 | 0.671 | 0.743 | 0.768 | 0.753 | 0.796 |
| Meta-Llama-Guard-2-8B | 0.828 | 0.776 | 0.728 | 0.735 | 0.731 | 0.758 |
| Llama-Guard-3-8B | 0.825 | 0.775 | 0.780 | 0.772 | 0.767 | 0.780 |
| LlamaGuard-7b | 0.816 | 0.674 | 0.718 | 0.714 | 0.708 | 0.732 |
| Llama-Guard-3-1B | 0.809 | 0.773 | 0.742 | 0.729 | 0.724 | 0.756 |
| shieldgemma-2b | 0.778 | 0.678 | 0.709 | 0.708 | 0.683 | 0.719 |
| shieldgemma-9b | 0.755 | 0.625 | 0.681 | 0.677 | 0.648 | 0.690 |
Granite Guardian 3.x holds the top EN-prompt rows (this is the basis of IBM's "top of GuardBench" claim). Missing from the leaderboard: Llama Guard 4, Qwen3Guard, gpt-oss-safeguard, ShieldGemma-27B, Nemotron 3/3.5, Shieldstral (leaderboard not updated since 2025-11). Note ShieldGemma here (binary output at default threshold) scores 0.755--0.778 EN prompts, far above IBM's 0.4 F1 run and below its own optimal-F1 claims: a third, independent data point.

### PolyGuard (Kumar et al., CMU / UW / AI2 et al., arXiv 2504.04377, COLM 2025 per memory)
- https://arxiv.org/abs/2504.04377 . Not independent: the authors release their own model (PolyGuard-Qwen-7B etc., 17 languages, PolyGuardMix 1.91M samples, PolyGuardPrompts 29K-sample benchmark) and claim it "outperforms existing state-of-the-art open-weight and commercial safety classifiers by 5.5%". Its benchmark is then reused by others (Qwen, NVIDIA, Mistral tables above), so PolyGuard numbers appear in rival-run form in sections 4, 7, 9. Full tables not transcribed (unconfirmed).

### "Bag of Tricks for guardrails"
Not located (WebSearch budget exhausted; no arXiv ID known). Unconfirmed whether such a paper exists under that title.

### Other independent sources not reached this session (unconfirmed, follow up if needed)
SEA-SafeguardBench (arXiv 2512.05501, by AI Singapore, who also ship SEA-Guard: not fully independent); LinguaSafe; DynaGuardrail and CoSA (custom-policy benchmarks used by NVIDIA).

---

## 12. Over-refusal / false positives of guard models (collected from the sections above)

| Source (who ran) | Model | Set | Number |
|---|---|---|---|
| Meta (own), LG3-1B card | LG3-8B / LG3-1B / LG3-1B-INT4 / GPT4 | XSTest | FPR 0.044 / 0.068 / 0.152 / 0.128 |
| Meta (own), LG3-8B card | LG3-8B vs LG2 | internal English response | FPR 0.040 vs 0.081 |
| Meta (own), LG4 card | LG4 | in-house English / multilingual / image | FPR 11% / 3% / 9% |
| Meta (own), PG1 card | Prompt Guard 1 | OOD jailbreak / multilingual | FPR 3.9% / 5.3% |
| Meta (own), PG2 card | PG2 86M / 22M / PG1 | private set | recall at 1% FPR 97.5% / 88.7% / 21.2% |
| IBM (rival-run), GG paper Table 11 | LG3-8B / GG-3.0-8B / SG-27B | aggregated harm | TPR at 1% FPR 0.320 / 0.290 / 0.191 |
| AI2 (rival-run), WildGuard Table 6 | Aegis-Guard-D as live filter | WildJailbreak benign | refusal-to-answer 16.8% vs 1.2% unfiltered |
| Google (own), SG2 Table 2 | SG2 / GPT-4o mini / Gemma 3 | UnsafeBench danger | 1 - FPR 88.7 / 92.3 / 93.8 |
| NVIDIA (own) | Nemotron-3 / 3.5 Content Safety | MMMU, DocVQA, AI2D (all safe) | FPR 0.023 / 0.058 / 0.001 (3) ; 0.03 / 0.060 / 0.001 (3.5) |
| ServiceNow (own) | AprielGuard | XSTest / OpenAI mod / wildjailbreak | FPR 0.09 / 0.22 / 0.31 |
| Qwen (own) | Qwen3Guard strict vs loose | ToxicChat prompt | strict F1 68.9 vs loose 82.8 (8B): strict over-flags borderline items |
OR-Bench numbers for guard models specifically: not found (OR-Bench reports are for chat LLMs, not guard classifiers): unconfirmed.

## Notable contradictions (summary)
1. ShieldGemma F1 on ToxicChat: 0.69--0.73 (Google, optimal-threshold F1) vs 0.18 (IBM, default threshold) vs 0.62--0.73 (Qwen, Mistral). GuardBench independent: 0.75--0.78 EN prompts aggregate. Threshold choice, not the model, drives the gap; AUPRC/AUC are steadier.
2. Llama Guard 3-1B: Meta's own English F1 0.899; IBM's OpenAI Mod F1 0.686; NVIDIA's OpenAI Mod F1 0.374 and XSTest 0.245 vs Meta's XSTest 0.821.
3. Qwen3Guard headline averages pick the best of strict/loose per benchmark; Mistral averages the two modes instead, giving lower Qwen numbers (ToxicChat 75.6 vs 68.9/82.8).
4. Granite Guardian 3.2-5B card states release "February 26, 2024" (typo; GitHub says Feb 2025).
5. Llama Guard 4 card English F1 61% vs LG3-8B card English F1 0.939: different internal test sets; within the LG4 set LG3 is 53%.
6. WildGuard XSTest refusal F1: 92.8 (own ablation table) vs 93.3 quoted by Qwen.
