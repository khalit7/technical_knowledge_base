# Language Models are Few-Shot Learners (GPT-3)

⏱ 10 min read · +~4h 40m resources

- **Authors**: Tom B. Brown, Benjamin Mann, Nick Ryder, Melanie Subbiah, Jared Kaplan, and 26 others (OpenAI)
- **Date**: May 2020 (arXiv v1; NeurIPS 2020 best paper)
- **Links**: [arXiv:2005.14165](https://arxiv.org/abs/2005.14165) (~3h, very long paper) | [OpenAI API announcement](https://openai.com/index/openai-api/) (~10 min) | no weights released (API only)

## Best resources

- [How GPT-3 Works: Visualizations and Animations](https://jalammar.github.io/how-gpt3-works-visualizations-animations/) (Jay Alammar) (~20 min): the standard visual intuition for the architecture and the prompt-as-conditioning idea
- [GPT-3 digest](https://samuelalbanie.com/digests/2022-07-gpt-3/) (Samuel Albanie) (~30 min): dense slide-style walkthrough of the whole paper, including the eval protocol and contamination analysis
- [AI Paper Review: Language Models are Few-Shot Learners](https://www.freecodecamp.org/news/ai-paper-review-language-models-are-few-shot-learners-gpt-3/) (freeCodeCamp) (~25 min): readable end-to-end review of the results and their significance
- [Review of GPT-3](https://sh-tsang.medium.com/review-gpt-3-language-models-are-few-shot-learners-ff3e63da944d) (Sik-Ho Tsang) (~15 min): concise per-benchmark summary with the key tables

## Problem

By 2020 the dominant recipe (BERT-style pretrain then fine-tune) still required a labeled dataset of thousands to hundreds of thousands of examples for every new task. That limits applicability, and fine-tuning on narrow distributions can exploit spurious correlations, so benchmark scores exaggerate true task performance. Humans, by contrast, pick up a new language task from a brief instruction or a couple of demonstrations. GPT-2 had hinted that a language model can be conditioned on a task description at inference time ("in-context learning"), but results were far below fine-tuning (4% on Natural Questions). The bet this paper tests: since in-context learning means absorbing many skills during pretraining and recognizing tasks at inference, and since loss scales smoothly with model size (Kaplan et al. scaling laws), in-context ability itself should improve sharply with scale.

## Method

There is deliberately no architectural novelty; the contribution is scale plus a systematic study of a new evaluation paradigm.

**In-context learning as the interface.** A task is specified purely in the prompt: a natural language instruction plus K demonstrations of context-completion pairs, then one final context the model must complete. No gradient updates ever. Three regimes: zero-shot (instruction only), one-shot (K=1), few-shot (K of 10 to 100, whatever fits in the 2048-token context). The paper frames pretraining as an outer loop of SGD that produces an inner-loop learner: the forward pass itself adapts to patterns in the context (Figure 1.1). One-shot and zero-shot are highlighted as the fairest comparison to humans.

**Architecture.** Same as GPT-2 (decoder-only transformer, pre-norm, modified initialization, BPE), except alternating dense and locally banded sparse attention layers as in the Sparse Transformer. Eight model sizes from 125M to 175B to measure scaling: GPT-3 175B has 96 layers, d_model 12288, 96 heads of d_head 128, context 2048, batch size 3.2M tokens, LR 0.6e-4 with cosine decay. Model parallelism along both depth and width on V100s (a Microsoft high-bandwidth cluster).

**Training data.** All models see 300B tokens. The mix: filtered Common Crawl (410B tokens available, 60% of the mix; 45TB of compressed plaintext filtered to 570GB using a quality classifier trained against high-quality reference corpora, plus document-level fuzzy deduplication), WebText2 (19B tokens, 22%), Books1 (12B, 8%), Books2 (55B, 8%), English Wikipedia (3B, 3%). Sampling is quality-weighted, not size-proportional: Common Crawl and Books2 are seen less than once (0.44 and 0.43 epochs), Wikipedia 3.4 times; a deliberate trade of mild overfitting for data quality. Roughly 93% of the data is English by word count.

**Compute.** About 3640 petaflop/s-days for the 175B model (roughly 3.1e23 FLOPs), an order of magnitude beyond T5-11B. Following the scaling laws, the models are much larger but trained on many fewer tokens than contemporary practice (Chinchilla later showed this ratio was far from compute-optimal).

**Evaluation mechanics.** Multiple choice is scored by per-token likelihood of each completion (for some tasks normalized by the unconditional probability given "Answer: "); free-form generation uses beam search (width 4). A contamination study flags 13-gram overlaps between benchmarks and pretraining data; a filtering bug meant overlaps were only partially removed, so Section 4 quantifies the residual effect (mostly negligible; PIQA and Winograd results get asterisks; several Wikipedia-derived LM benchmarks are dropped entirely).

## Results

The headline pattern matters more than any single number: zero-shot performance grows steadily with model size, but few-shot performance grows faster, so the gap between them widens with scale (Figure 1.3). Larger models are better in-context learners, not just better language models. Validation loss continues the Kaplan power law over two more orders of magnitude of compute.

- **Language modeling / completion**: new SOTA on PTB (perplexity 20.5 vs 35.8) and LAMBADA (86.4% few-shot, +18 points over prior SOTA; the fill-in-the-blank prompt format itself is a demonstration of what prompting buys you).
- **Closed-book QA**: TriviaQA 71.2% few-shot, beating not only fine-tuned closed-book T5 but also the fine-tuned open-domain RAG system that retrieves over 21M documents. Natural Questions stays well below fine-tuned SOTA (29.9 vs 36.6).
- **Translation**: few-shot into English beats prior unsupervised NMT (Fr-En 39.2, De-En 40.6, Ro-En 39.5 BLEU) despite translation never being trained for and only 7% non-English data; out of English is much weaker.
- **SuperGLUE**: 71.8 few-shot with 32 examples and no gradient updates, above fine-tuned BERT-Large (69.0); fewer than 8 examples suffice to pass BERT-Large. Still well below fine-tuned SOTA (89.0).
- **Synthetic probes**: 100% on 2-digit addition, 98.9% on 2-digit subtraction, 80.2% on 3-digit addition few-shot, with a sharp jump between 13B and 175B (13B solves 2-digit addition about half the time); overlap search shows the answers are essentially not memorized. Word unscrambling and using a novel word after one definition also work and are near-zero for small models.
- **Human detection**: people distinguish GPT-3-written ~500-word news articles from real ones at about 52% accuracy, barely above chance.
- **Clear failures**: WiC at 49.4% (chance), ANLI near chance until 175B shows first signs of life, and weak QuAC, RACE, and DROP. Tasks that require comparing two text fragments are the consistent weak spot.

## Limitations (as stated by the authors)

Text synthesis still repeats itself, loses coherence over long passages, and contradicts itself. Comparison-format tasks (WiC, ANLI, some reading comprehension) stay weak, plausibly because a unidirectional decoder cannot look back and compare two spans the way a bidirectional model can. The objective weights every token equally and only predicts text rather than acting toward goals; pretraining is wildly sample-inefficient versus a human lifetime of text. It is ambiguous whether few-shot prompting learns tasks "from scratch" at inference or recognizes tasks already learned in pretraining. A 175B model is expensive and awkward to serve (distillation at this scale untried). Plus the standard deep-learning caveats: poor interpretability, imperfect calibration, and inherited data biases.

## Why it matters

This is the paper that made prompting the interface to NLP. Before it, every task meant a dataset and a fine-tuning run; after it, one frozen model served arbitrary tasks specified in natural language, which is the operating model of every LLM product since. Concretely it: validated the scaling-hypothesis bet at 10x the previous largest dense model and triggered the scale race (Gopher, PaLM, Chinchilla, LLaMA); introduced zero/one/few-shot evaluation as the standard benchmark protocol; identified in-context learning as an ability that emerges with scale, seeding the emergent-capabilities literature; made data curation (quality filtering, dedup, contamination analysis) a first-class methodological concern; and, released only through an API, started the closed-weights frontier-lab era. Its documented weaknesses set the next agenda: GPT-3 could not follow instructions reliably or stay factual and harmless, which is exactly what InstructGPT-style RLHF was built to fix, and its params-heavy, tokens-light training ratio is what Chinchilla corrected. The paper's own open question, whether few-shot prompting learns tasks at inference or merely locates abilities learned in pretraining, remains an active research topic.

## Connections

- [`papers/2017-06_attention-is-all-you-need`](../2017-06_attention-is-all-you-need/): GPT-3 is the decoder half of the Transformer scaled 3 orders of magnitude
- [`papers/2020-01_scaling-laws`](../2020-01_scaling-laws/): the direct motivation (Kaplan is a co-author); GPT-3 extends the loss power law two more orders of magnitude and sized its models by it
- [`papers/2022-03_chinchilla`](../2022-03_chinchilla/): showed 175B params on 300B tokens is heavily undertrained; rebalanced the params/tokens ratio GPT-3 popularized
- [`papers/2018-10_bert`](../2018-10_bert/): the rival paradigm this paper displaced for generation tasks; the paper attributes its comparison-task failures partly to lacking bidirectionality
- [`papers/2022-03_instructgpt`](../2022-03_instructgpt/): RLHF on GPT-3 to fix the instruction-following and alignment gaps documented here
- [`papers/2019-09_megatron-lm`](../2019-09_megatron-lm/) and [`papers/2019-10_zero`](../2019-10_zero/): the model-parallel training techniques that make 100B+ dense training feasible
- Topics: `topics/llms` (the GPT lineage), `topics/llm-training-and-post-training` (pretraining at scale, scaling laws), `topics/data-curation-and-datasets` (CC filtering, dedup, quality-weighted mixing, contamination)
