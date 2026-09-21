# Bitune: Leveraging Bidirectional Attention to Improve Decoder-Only LLMs

Dawid J. Kopiczko, Tijmen Blankevoort, Yuki M. Asano (UvA / Qualcomm AI Research). arXiv [2405.14862](https://arxiv.org/abs/2405.14862), May 2024, v2 Aug 2025. **Published at EMNLP 2025** (main track, pages 9510-9536). Added to the KB 2026-09-01 from a blog entry.

- [arXiv](https://arxiv.org/abs/2405.14862) | [ACL Anthology](https://aclanthology.org/2025.emnlp-main.481/) | [project page](https://dkopi.github.io/bitune/)
- Topics: llms, llm-training-and-post-training

### Problem

Decoder-only LLMs use masked causal attention everywhere, including over the prompt. That mask exists for autoregressive generation: a token must not see the future. But the **prompt is already fully available** when it is processed, so applying a causal mask to it discards information for no reason. Every prompt token can only attend leftwards, meaning an early instruction token never sees the instruction it belongs to.

This is a known weakness. It is why BERT and T5 outperform similarly sized GPT models on natural-language-understanding benchmarks, and why embedding work (LLM2Vec, NV-Embed) reintroduces bidirectional attention when repurposing decoder LLMs as encoders. Bitune asks the narrower question: can you get that benefit for ordinary instruction-following without changing the pretrained model or its generation behaviour?

### Method

Two passes over the prompt, then a learned combination.

1. **Causal pass**: the prompt through the model as normal, producing the causal features the model was pretrained to consume.
2. **Bidirectional pass**: the same prompt with the causal mask removed, so each prompt token sees the whole instruction.
3. **Two sets of weights.** The bidirectional pass uses its own key and value projections (`W_k^b`, `W_v^b`) while the causal pass keeps the original ones (`W_k^c`, `W_v^c`), which also generate the answer tokens. The model can therefore treat the two feature types differently instead of interpreting bidirectional features through weights trained on causal ones.
4. **Mixing**: the two feature sets are combined per transformer block with learned coefficients, and the result conditions ordinary autoregressive generation.
Generation stays strictly causal. Bidirectional attention applies only to prompt processing, so nothing about the decoding path changes. The extra parameters are small and the method is an add-on to existing finetuning rather than a replacement.

### Results

- Consistent gains in instruction-tuning and question-answering across **commonsense reasoning, arithmetic, and language understanding**.
- **Compatible with the PEFT stack**: works with LoRA-style methods and with full finetuning, which is what makes it practical rather than an architectural fork.
- Extensive ablations attribute the gain to the design rather than to added parameters, in particular the separate weight sets for the two passes.

### Why it matters

The useful idea is smaller than "bidirectional attention is back": it is that **the causal mask over the prompt is a legacy of the generation objective, not a requirement of it**, and the cost of that mask is measurable. Prefix-LM architectures made the same observation years earlier; Bitune's contribution is doing it to an already-pretrained decoder without retraining it, and showing the two feature types need separate projections to be useful.

Caveats: gains are consistent but not transformational, the two-pass design roughly doubles prompt-processing compute (a real cost at long context, and the paper's setting is short instructions), and the frontier has largely not adopted it. Read it for the diagnosis more than the recipe.

### Connections

- The same observation drives the encoder-repurposing line: LLM2Vec, NV-Embed, and the bidirectional-encoder half of Encoder-Decoder Gemma.
- Attention masking and prefix-LM variants: see the llms topic.
- Adjacent in this batch: LLM Modules and Trained Persistent Memory. All three attach trainable structure to a frozen pretrained model rather than retraining it.
