# Training Compute-Optimal Large Language Models (Chinchilla)

- **Authors/lab**: Hoffmann, Borgeaud, Mensch, Buchatskaya, Cai, Rutherford, de Las Casas, Hendricks, Welbl, Clark, ... Rae, Vinyals, Sifre (DeepMind)
- **Date**: March 2022 (NeurIPS 2022)
- **Links**: [arXiv:2203.15556](https://arxiv.org/abs/2203.15556)

## Best resources

- [Chinchilla's wild implications](https://www.lesswrong.com/posts/6Fpvch8RR29qLEWNH/chinchilla-s-wild-implications) (nostalgebraist): the best conceptual unpacking of what the result means; reframes scaling as data-bound rather than parameter-bound and works through the loss equation term by term.
- [Chinchilla data-optimal scaling laws: in plain English](https://lifearchitect.ai/chinchilla/) (Alan Thompson): the 20-tokens-per-parameter heuristic spelled out, with tables applying it to real model sizes.
- [Chinchilla scaling: a replication attempt](https://epoch.ai/publications/chinchilla-scaling-a-replication-attempt) (Epoch AI, Besiroglu et al. 2024): re-fits Approach 3 from the paper's own extracted data, finds fitting bugs, and shows the corrected fit agrees with Approaches 1-2. The essential critique.
- [Beyond Chinchilla-Optimal](https://arxiv.org/abs/2401.00448) (Sardana et al., MosaicML 2023): extends the scaling law to include inference cost, formalising why everyone now overtrains past the Chinchilla point.

## Problem

By 2022 the field was scaling parameters aggressively while holding training data roughly constant: GPT-3 (175B), Jurassic-1 (178B), Gopher (280B), and MT-NLG (530B) were all trained on about 300B tokens. This followed Kaplan et al. (2020), whose scaling-law fit said that with 10x more compute you should grow the model 5.5x but the data only 1.8x (N_opt scaling as C^0.73, D_opt as C^0.27). Hoffmann et al. ask the constrained question directly: given a fixed FLOP budget C, what (N, D) minimises final pretraining loss L(N, D) subject to FLOPs(N, D), approximately 6ND, equal to C? Kaplan's key methodological flaw, identified here: he used a fixed learning-rate schedule length for all runs, so intermediate losses overestimated what a model trained with a properly matched cosine schedule would achieve, systematically biasing the fit toward "bigger model, less data". Chinchilla sets the cosine decay horizon to match the actual token count of each run (decay by 10x over roughly D tokens), and uses larger models (most above 500M vs Kaplan's mostly sub-100M).

## Method

Over 400 transformer LMs trained, 70M to 16B parameters, on 5B to over 500B tokens of MassiveText, analysed three independent ways:

1. **Fixed model size, vary training horizon**: for each N, train 4 runs with cosine horizons spanning 16x; interpolate the smoothed loss curves; take the lower envelope of loss vs FLOPs across all runs; fit power laws to the envelope. Gives N_opt ~ C^0.50, D_opt ~ C^0.50.
2. **IsoFLOP profiles**: fix 9 FLOP budgets (6e18 to 3e21), vary model size at each, fit a parabola to loss vs parameters per budget, take the valley minimum, then fit power laws through the minima. Gives exponents 0.49 / 0.51.
3. **Parametric loss fit**: fit L(N, D) = E + A/N^alpha + B/D^beta to all final losses (E is irreducible text entropy, the N term is finite-capacity error, the D term is finite-data/finite-steps error), minimising Huber loss (delta = 1e-3) on log-loss with L-BFGS. Fitted values: E = 1.69, A = 406.4, B = 410.7, alpha = 0.34, beta = 0.28. Minimising under 6ND = C gives exponents a = alpha/(alpha+beta), b = beta/(alpha+beta), yielding 0.46 / 0.54.

All three approaches agree: **scale parameters and tokens in equal proportion** (both exponents about 0.5), in direct contradiction to Kaplan's 0.73 / 0.27. The practical corollary from Table 3 (tokens/params on the optimal frontier is roughly constant): about **20 training tokens per parameter** (e.g. 1B params / 20.2B tokens, 67B / 1.5T, 175B / 3.7T, 280B / 5.9T).

**The validation model**: Chinchilla, 70B params trained on 1.4T tokens (exactly 20 t/p), matching Gopher's compute budget of 5.76e23 FLOPs but 4x smaller and 4x more data. Same architecture and MassiveText data as Gopher except: AdamW instead of Adam (notably better final loss and downstream performance), a SentencePiece tokenizer without NFKC normalisation (helps math and chemistry), bfloat16 forward/backward with a float32 optimizer-state copy of weights, and a higher max LR (1e-4 vs Gopher's 4e-5). Trained on TPUv3/v4 with JAX and Haiku.

## Results

Chinchilla beats Gopher (280B), GPT-3 (175B), Jurassic-1 (178B), and MT-NLG (530B) essentially across the board at the same (or less) training compute:

- **MMLU**: 67.6% average 5-shot, +7.6 points over Gopher (60.0%), above GPT-3 (43.9%) and even above the expert forecasters' June 2023 prediction of 63.4%. First model above 90% on four subtasks.
- **BIG-bench**: 65.1% vs 54.4% for Gopher (+10.7 points), better on 58 of 62 tasks.
- **Language modelling**: lower bits-per-byte on every subset of The Pile; Wikitext103 perplexity 7.16 vs Gopher's 7.75 (with a train/test leakage caveat, since Chinchilla saw 4x more data).
- **Reading comprehension**: LAMBADA 77.4% (vs 74.5 Gopher, 76.6 MT-NLG 530B); RACE-h/m improved by more than 10 points over Gopher.
- **Closed-book QA**: Natural Questions new closed-book SOTA (31.5% 5-shot, 35.5% 64-shot vs Gopher's 24.5 / 28.2); TruthfulQA 43.6% 0-shot vs Gopher's 29.5%.
- And because it is 4x smaller, its inference and fine-tuning cost dropped 4x: the win is not just at training time.

Extrapolation from Table 3: Gopher should have been trained on 6.8T tokens (17x its actual 300B) to be compute-optimal at 280B; a 1T-parameter model is only optimal past 1e26 FLOPs. The IsoFLOP analysis replicated on C4 and GitHub code gives the same equal-scaling conclusion.

Stated limitations: only two directly comparable large-scale runs (Chinchilla vs Gopher); a power-law frontier is assumed but slight concavity in N_opt at high compute suggests the optimal size of large models may still be overestimated; everything is single-epoch.

## Why it matters

This paper reset how the field budgets pretraining. It killed the "parameters are all that matter" era: LLM progress became data-bound, and dataset scale plus quality became a first-class concern (a direct line to the 15T-token corpora of 2024-2025 and to data-curation research generally). The rule of thumb for a compute-optimal run is 20 tokens per parameter with N and D doubled together as budget doubles; the deeper, still-current lesson is the methodology (match the LR schedule to the horizon, use IsoFLOP sweeps of small models to pick (N, D) before committing the big run) and the L(N, D) = E + A/N^alpha + B/D^beta functional form, which later work reuses constantly.

Two important post-2022 updates for anyone planning runs today:

- **The Approach 3 fit had bugs, but the conclusion stands.** Epoch AI's 2024 replication (Besiroglu et al., arXiv:2404.10102) found the parametric fit averaged Huber losses instead of summing, causing early optimizer termination, and reported implausibly tight confidence intervals; their corrected fit gives a and b both about 0.5, consistent with Approaches 1 and 2 and with roughly 20 t/p. So the headline is robust; the specific published (A, B, alpha, beta) values are not the ones to reuse.
- **Chinchilla-optimal is not deployment-optimal.** The law minimises training loss for a training FLOP budget and ignores inference. When lifetime inference cost dominates, total cost is minimised by a smaller model trained far past 20 t/p (Sardana et al., arXiv:2401.00448). This is now standard practice: Llama 2 7B at ~290 t/p, Llama 3 8B at ~1875 t/p (15T tokens), Gemma 2 9B at ~890 t/p. The loss curve in D flattens but keeps improving, so overtraining trades extra training compute for a permanently cheaper model. Read Chinchilla as the compute-optimal anchor point from which you deliberately deviate toward more data once inference demand is factored in.

## Connections

- [Scaling Laws for Neural Language Models (2020)](../2020-01_scaling-laws/): the Kaplan result this paper corrects; the discrepancy comes down to LR-schedule handling and model-size range.
- [GPT-3 (2020)](../2020-05_gpt-3/): the archetypal under-trained model by this paper's account (175B on 300B tokens; the frontier says 3.7T).
- [Llama 3 (2024)](../2024-07_llama-3/): the flagship example of deliberate overtraining far past the Chinchilla point for inference economics.
- [DeepSeek-V3 (2024)](../2024-12_deepseek-v3/): modern frontier practice, heavily overtrained MoE; MoE models also need their own scaling treatment.
- [Switch Transformer (2021)](../2021-01_switch-transformer/): sparse models change the N in the FLOP accounting; Chinchilla's related work flags that MoE scaling analyses shared Kaplan's fixed-token-count flaw.
- Topics: `topics/llm-training-and-post-training` (pretraining budgets, scaling laws), `topics/data-curation-and-datasets` (the result that made dataset scale the binding constraint).
