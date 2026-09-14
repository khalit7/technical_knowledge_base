# Tokenizers

⏱ 5 min read · +6h 35m resources

## Best resources

- [Karpathy, "Let's build the GPT Tokenizer"](https://www.youtube.com/watch?v=zduSFxRajkE) (2h 15m) + [minbpe repo](https://github.com/karpathy/minbpe) (repo, ~30 min): byte-level BPE from scratch; the best single explainer.
- [HuggingFace NLP course, ch. 6](https://huggingface.co/learn/nlp-course/chapter6/1) (1h 30m): BPE vs WordPiece vs Unigram with worked algorithms.
- [SentencePiece paper](https://arxiv.org/abs/1808.06226) (45 min) and [Unigram LM paper (Kudo 2018)](https://arxiv.org/abs/1804.10959) (45 min): the originals, both short and readable.
- [tiktoken](https://github.com/openai/tiktoken) (repo, ~20 min) and [HF tokenizers](https://github.com/huggingface/tokenizers) (repo, ~30 min): the production implementations to know.

## The design space

A tokenizer maps text to integer ids. The granularity trade-off:

- **Word-level**: huge vocabularies for morphologically rich languages, and
  out-of-vocabulary (OOV) words are unrepresentable. Historical.
- **Character-level**: tiny vocabulary, no OOV, works for languages without word
  boundaries (Chinese, Japanese); but sequences get very long (more compute per
  text) and each token carries little semantics.
- **Subword-level**: the compromise every modern LLM uses. Frequent words stay
  whole; rare words decompose into meaningful pieces. Handles OOV while keeping
  vocabulary manageable (32k-256k typical).

Related historical trick, **negative sampling** (word2vec): instead of a softmax
over the full vocabulary, sample a few negative examples and train a binary
classifier (real context pair vs sampled noise). It existed purely to avoid the
cost of a huge-vocabulary softmax; modern LLMs just pay for the full softmax, but
the idea survives in contrastive objectives (InfoNCE) and embedding-model training.

## The algorithms

- **BPE (Byte-Pair Encoding)**: start from characters (or bytes), repeatedly merge
  the most **frequent** adjacent pair into a new token until the target vocab size.
  Guarantees no OOV (worst case falls back to characters/bytes); the cost is that
  unfamiliar words shatter into many small fragments. Encoding applies the learned
  merges in order.
- **Byte-level BPE**: run BPE over the 256 raw bytes (GPT-2 onward, Llama 3,
  tiktoken vocabularies). Any Unicode input is representable with zero OOV; no
  Unicode normalisation headaches.
- **WordPiece** (BERT): same skeleton as BPE, different merge criterion: merge the
  pair maximising the likelihood ratio P(ab) / (P(a) P(b)), i.e. pointwise mutual
  information, rather than raw frequency. Encoding is greedy longest-match-first
  with `##` continuation prefixes.
- **Unigram LM** (Kudo): the reverse direction. Start with a large candidate
  vocabulary, fit a unigram language model with EM, and iteratively **prune** the
  tokens whose removal least hurts corpus likelihood, until the target size.
  Tokenisation of a string picks the highest-probability segmentation (Viterbi);
  naturally supports sampling alternative segmentations (subword regularisation),
  a useful training-time augmentation.
- **SentencePiece**: a **toolkit**, not an algorithm. Language-agnostic: treats raw
  text as a character stream including whitespace (encoded as the meta symbol
  U+2581), so it needs no pre-tokenisation and round-trips losslessly. Trains
  either BPE or Unigram underneath. Used by T5, Llama 1/2, Gemma, many multilingual
  models.

## What current models use (2026)

- GPT-4/o series: byte-level BPE (tiktoken, o200k vocab ~200k).
- Llama 3 onward: 128k byte-level BPE via tiktoken-style regex splitting
  (moved off SentencePiece).
- Gemma: 256k SentencePiece; Qwen3: ~152k BPE; DeepSeek: ~128k BPE.
- Trend: vocabularies grew from 32k to 128-256k, mostly for multilingual and code
  compression; larger vocab = fewer tokens per text = cheaper effective context,
  at the cost of a bigger embedding/unembedding matrix (a real fraction of small
  models' parameters).

## Practical notes and failure modes

- **Fertility** (tokens per word) varies wildly by language; low-resource languages
  pay 3-5x more tokens for the same content, which is both a cost and a quality
  issue. Check fertility when picking a tokenizer for domain adaptation.
- Tokenisation causes classic LLM blind spots: character-level tasks (counting
  letters, reversing strings), digit chunking (modern tokenizers force 1-3 digit
  groups for arithmetic), trailing-whitespace sensitivity, and "glitch tokens"
  (undertrained tokens present in vocab but rare in training data).
- Special tokens (BOS/EOS, chat-template roles, tool-call markers) are added after
  training the vocab; chat-template mismatches between training and inference are
  a common silent bug in fine-tuning.
- Tokenizer-free/byte-level research (ByT5, MegaByte, BLT patches) keeps
  resurfacing but has not displaced subword BPE in production; frontier labs are
  instead experimenting with **SuperBPE**-style superword tokens (crossing
  whitespace) for better compression.
- Training your own: use HF `tokenizers` or SentencePiece on a corpus matching
  your target distribution; details in `topics/data-curation-and-datasets`.
