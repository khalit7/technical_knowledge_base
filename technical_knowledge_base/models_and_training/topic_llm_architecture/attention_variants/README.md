# Attention variants: MHA, MQA, GQA, MLA, sliding window, sparse attention and sinks

Notion: https://app.notion.com/p/3fd5c17b0d0d8120859ecc2d0236e846

Child page of Topic: llm-architecture. HTML only: `index.html` is the whole page, built by `src/build.sh` from `src/parts/`.

What each token leaves behind in the cache, derived and checked: why sharing keys and values costs little (the
spectrum of a trained MHA cache, head averaging against projection and uptraining), MLA as a low-rank factorisation
with the absorbed form and the decoupled RoPE key (checked to rounding on a trained model), an investigation of why
MLA trails MHA on the tiny GPT, sliding windows and local : global interleaves (a window sweep), sparse attention
(NSA, DSA, DeepSeek-V4; the measured premise on SmolLM2), sinks and output gates (a sink ablation), differential
attention, what 2023 to 2026 models chose, code at transformers v5.20.1, mistakes and interview questions.

Tabs: Reading, Cache ladder (eleven real configs: held, read and FLOPs per decoded token), Which keys are read
(SmolLM2's real attention under each variant; stacked-window reach), Design drill, Further reading.
How it was built and rerun: `src/README.md`.
