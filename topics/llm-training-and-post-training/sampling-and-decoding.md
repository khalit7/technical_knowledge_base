# Sampling and Decoding

⏱ 5 min read · +3h 15m resources

## Best resources

- [Chip Huyen, Generation configurations: temperature, top-k, top-p](https://huyenchip.com/2024/01/16/sampling.html) (~35 min): clear, practical treatment of the standard knobs.
- [Min-p sampling paper (ICLR 2025 oral)](https://arxiv.org/abs/2407.01082) (45 min): the strongest recent addition to the sampler toolbox.
- [XGrammar paper](https://arxiv.org/abs/2411.15100) (45 min) and [docs](https://xgrammar.mlc.ai/docs/) (docs, ~25 min): how modern constrained decoding works and why it is near-zero overhead.
- [The Curious Case of Neural Text Degeneration (Holtzman 2019)](https://arxiv.org/abs/1904.09751) (45 min): the nucleus-sampling paper; why likelihood-maximising decoding fails for open-ended text.

## Deterministic search

- **Greedy decoding**: take the argmax token each step. Locally optimal, globally
  repetitive and dull for open-ended text; still fine for short factual answers,
  and effectively what temperature 0 means.
- **Beam search**: keep the B highest-probability partial sequences per step.
  Standard in machine translation/summarisation (short, closed-ended outputs);
  for open-ended LLM generation it produces degenerate, repetitive, low-diversity
  text (high-probability != human-like) and is essentially unused in chat LLMs.

## Stochastic sampling: the standard stack

Applied in order: temperature, then truncation, then renormalise, then sample.

- **Temperature T**: divide logits by T before softmax. T < 1 sharpens (more
  deterministic; T -> 0 approaches greedy); T = 1 is the raw distribution;
  T > 1 flattens toward uniform (more random/creative). Note reasoning models
  often want T around 0.6-1.0 to keep exploration; many providers now remap or
  ignore extreme values.
- **Top-k**: keep only the k most probable tokens, renormalise, sample. Flaw: a
  fixed k ignores the shape of the distribution: when it is sharp, k includes
  junk; when flat, k cuts off good options.
- **Top-p (nucleus)**: keep the smallest set of tokens whose cumulative
  probability >= p (e.g. 0.9), renormalise, sample. Adapts set size to the
  distribution; the long-time default for open-ended generation.
- **Min-p**: keep tokens whose probability >= p_min * P(top token) (e.g. 0.05-0.1
  of the max). Scales the truncation with model confidence: confident steps become
  near-greedy, uncertain steps stay diverse. Beats top-p at high temperatures
  (coherent creativity), adopted across vLLM/SGLang/llama.cpp and common in
  open-model serving defaults.
- **Repetition controls**: repetition penalty, presence/frequency penalties,
  no-repeat-ngram: blunt instruments; needed less as models improved, still useful
  for small models.
- Long tail of samplers from the local-model community: typical sampling
  (entropy-relative), mirostat (target perplexity), top-a, XTC, DRY; mostly niche.

Practical defaults 2026: chat T~0.7 with top-p 0.9-0.95 or min-p 0.05; code/math
greedy-ish (T 0-0.3); evals fix seeds and settings, or sample k and report
pass@k / majority-vote (self-consistency).

## Structured / constrained decoding

Guarantee outputs match a format (JSON schema, regex, CFG) by masking invalid
tokens each step: compile the constraint to an automaton over the tokenizer's
vocabulary, intersect with the current state, zero out disallowed logits.

- **Outlines**: regex/JSON-schema -> finite state machine over tokens; the
  approach that popularised near-zero-overhead structured output.
- **XGrammar**: full context-free grammars; splits tokens into context-independent
  (~99%, precomputed masks) and context-dependent (checked at runtime with a
  persistent pushdown-automaton stack), plus mask/compute overlap: microseconds
  per token. Default structured-output backend in vLLM, SGLang, TensorRT-LLM.
- **llguidance / Guidance**: lazy grammar evaluation, powers OpenAI-style strict
  JSON mode.
- Caveats: constraining can distort the distribution (the model wanted a token
  you masked): schema design and "thinking before JSON" mitigate quality loss;
  whitespace/token-boundary edge cases are the classic bugs.
- Provider-side "structured outputs" / function calling are this mechanism plus
  fine-tuning; grammar-constrained tool-call parsing is standard in serving
  stacks.

## Decoding-adjacent inference techniques

- **Self-consistency / best-of-n**: sample n, pick majority answer or best by
  reward model (BoN is also a baseline alignment method and a reward-hacking
  amplifier; see [reward-hacking.md](reward-hacking.md)).
- **Speculative decoding**: a draft model (or n-gram/Medusa/EAGLE heads) proposes
  tokens, the target model verifies in one pass; lossless speedup. Details in
  `topics/inference-and-serving`.
- **Test-time compute scaling**: longer CoT, parallel sampling + verifier reranking;
  the decoding-side half of the reasoning-model story
  (see [alignment-and-rlhf.md](alignment-and-rlhf.md)).
