# Seq vs Seq: An Open Suite of Paired Encoders and Decoders (Ettin)

- **Authors/lab**: Orion Weller, Kathryn Ricci, Marc Marone, Dawn Lawrie, Benjamin Van Durme (Johns Hopkins CLSP) with Antoine Chaffin (LightOn)
- **Date**: July 2025 (arXiv 2507.11412; published at ICLR 2026)
- **Links**: [arXiv](https://arxiv.org/abs/2507.11412) | [GitHub (code, data, batch order)](https://github.com/JHU-CLSP/ettin-encoder-vs-decoder) | [HF models and data (jhu-clsp)](https://huggingface.co/jhu-clsp)

## Best resources

- [HuggingFace blog: Ettin Suite](https://huggingface.co/blog/ettin): the authors' own release post; condensed walkthrough of the suite, the recipe, and the encoder-vs-decoder findings with usage snippets

## Problem

The community defaults to decoder-only LLMs, but a large fraction of production NLP (classification, retrieval, embeddings) still runs on encoders, often 2019-era BERT variants, because encoder development mostly stalled. Whether that is the right call has never been cleanly testable: every prior encoder-vs-decoder comparison (DeBERTa vs GPT-2 and similar) confounded architecture with different parameter counts, data, tokenizers, and training recipes. ModernBERT revived encoder training but kept its data private. Ettin provides the first apples-to-apples testbed: paired encoder-only and decoder-only models that share everything except the objective, plus an open-data replication of the ModernBERT recipe.

## Method

**Paired training.** Six sizes (17M, 32M, 68M, 150M, 400M, 1B parameters), each trained twice from scratch with identical architecture, data, data order, and hyperparameters. The only two differences between a pair: attention pattern (bidirectional vs causal) and objective (MLM at 30% masking, dropped to 15% for the decay phase, vs CLM). Small models follow MobileLLM-style deep-and-thin shapes; the 1B keeps 28 layers but widens.

**Recipe** (ModernBERT-style, fully open data): three phases totaling up to 2T tokens with a trapezoidal LR schedule. (1) Base pretraining, 1.7T tokens on a broad mix (DCLM crawl, Dolma v1.7 sources, StarCoder, peS2o, Reddit, math). (2) Context extension / mid-training, 250B tokens: sequence length to 8k, RoPE theta to 160k, data upgraded to filtered DCLM plus Dolmino sources, inverse-sqrt decay to half peak LR. (3) Decay phase, 50B tokens on the highest-quality mix (books, Wikipedia, textbooks, Tulu FLAN), decaying to 0.02 of peak LR. Deliberate differences from ModernBERT: open data, no model merging, decay during context extension, 15% decay-phase masking, unified local/global RoPE. They release 236 checkpoints per model (every 8.5B tokens) plus the exact batch order, Pythia-style, so learning dynamics can be replayed.

**Cross-objective training.** To test the popular "adapt a decoder into an encoder" pattern (LLM2Vec etc.), each final model is continued-pretrained for 50B tokens on the reverse objective (about 5x the token budget LLM2Vec used): decoders get MNTP (masked token predicted from the previous position's hidden state, the CLM-aligned variant of MLM) to become encoders-from-decoders; encoders get CLM to become decoders-from-encoders. Same high-quality decay-phase data, fresh trapezoidal schedule.

**Evaluation.** Encoders: GLUE (fine-tuned), MTEB v2 English, MLDR long-context retrieval, CodeSearchNet, using ModernBERT's exact eval setup. Decoders: zero-shot lm-evaluation-harness tasks from the Pythia/SmolLM papers (ARC, HellaSwag, LAMBADA, TriviaQA, Winogrande, etc.). Cross-architecture: encoders run generatively via iterative mask filling; decoders run on MNLI and MS MARCO.

## Results

- **Recipe is SOTA on both sides, from one recipe.** Ettin encoders beat ModernBERT at matched sizes (base: 88.9 vs 88.4 GLUE avg, 54.0 MTEB v2; large: 90.8 GLUE) and beat distilled small baselines without distillation (68M: 87.2 GLUE vs DistilRoBERTa 83.8). Ettin decoders match or beat open-data peers: 150M outscores SmolLM2-135M (46.2 vs 45.2 avg), 1B outscores Llama 3.2 1B (59.0 vs 56.6).
- **Classification: encoders dominate across an order of magnitude of scale.** On MNLI the 150M encoder (89.2) beats the 400M decoder (88.2), and the 400M encoder beats the 1B decoder. Continued MLM pretraining of decoders barely moves this.
- **Retrieval: same story, adaptation helps but does not close the gap.** MNTP continuation clearly improves decoders on MS MARCO, yet at 400M the pure encoder still wins (42.2 vs 41.4 nDCG@10) despite the extra 50B tokens.
- **Generation: decoders dominate, and encoder-to-decoder conversion scales badly.** Decoders-from-encoders roughly match at 68M but fall more than 6 points behind real decoders by 1B. Nuance: on classification-flavored "generative" tasks (ARC, SciQ) encoders used generatively actually beat decoders; decoders win big on HellaSwag, TriviaQA, SIQA.
- **1B-scale hard benchmarks mirror this split**: decoder-from-encoder wins MMLU classification (37.0 vs 27.0) but collapses on generative GSM8k (18.9 vs 32.0).
- **Gender bias case study** (WinoGender Gotcha split): with identical data, MLM encoders predict far more neutral pronouns than CLM decoders; both skew male. Objective alone changes learned bias.

## Why it matters

This is the cleanest evidence to date in the encoder-vs-decoder debate: with data, recipe, and size held fixed, the pretraining objective and attention pattern alone create durable, architecture-specific advantages, and 50B tokens of continued training on the reverse objective does not erase them. Practical implications: for classification and retrieval at 1B or below, a native encoder beats a decoder several times its size, so fine-tuning encoders remains the right default for tasks like transcript or intent classification rather than adapting a small decoder LLM. Conversely, MTEB-style leaderboards are topped by 7B+ adapted decoders mainly because no large encoders exist; the results predict a natively trained ~3B encoder would win. It also flags a caveat from concurrent work (Gisserot-Boukhlef et al.): at very small token budgets (~100B) CLM-then-MLM can look better, an artifact of CLM's per-token data efficiency that disappears at SOTA scale. Beyond the headline question, the suite itself (paired open-data SOTA models, 236 checkpoints each, replayable batch order) is a Pythia-successor research platform for studying how objectives shape learning, with the gender-bias study as a first example.

## Connections

- Related papers here: [BERT](../2018-10_bert/) (the encoder lineage Ettin modernizes), [GPT-3](../2020-05_gpt-3/) (the decoder shift it interrogates), [OLMo 2](../2025-01_olmo-2/) (supplies the DCLM/Dolma/Dolmino data sources and the open-artifact philosophy; Pythia inspired the checkpoint release), [RoFormer/RoPE](../2021-04_roformer-rope/) (context extension via RoPE theta scaling), [Chinchilla](../2022-03_chinchilla/) (over-training far past compute-optimal is what made decoder adaptation popular)
- External anchors: ModernBERT (Warner et al. 2024, the recipe being replicated), LLM2Vec (BehnamGhader et al. 2024, the decoder-to-encoder adaptation being stress-tested), Pythia (Biderman et al. 2023, the suite-of-checkpoints template)
- KB topics: `topics/llm-training-and-post-training` (objectives, multi-phase recipe, continued pretraining), `topics/rag-and-retrieval` (encoder vs adapted-decoder embeddings and rerankers, MTEB implications)
