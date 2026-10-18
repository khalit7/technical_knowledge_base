# Tokenizers: visualisation ideas

The question the page keeps returning to: **how does the choice of tokenizer change what the model sees and what a text costs?** (pieces per word, per language, per number; parameters per vocabulary entry). A visual is worth building when it makes one of those measurable on real tokenizers.

The old page had no visuals; its outbound links (Karpathy, minbpe, the HF course chapter 6, SentencePiece and Unigram papers, tiktoken, HF tokenizers) were the first sources. Existing knowledge base visuals checked so as not to repeat them: the Alignment page shows a Tulu 3 chat template token by token with loss masks (linked, not rebuilt); the Architecture Gallery has a vocabulary column in its config table but no timeline or embedding-share chart; the GPT-3 paper page counts r50k tokens of its in-context examples; no page had a vocabulary-over-time visual.

Scores: 0 to 2 on each Methodology question (parameter the reader controls; reproduces a published figure, counted double; computable from public data, counted double; shows what a sentence cannot; corrects a misconception; measures the central question; absent elsewhere; step-by-step animation against the method it replaced), minus build cost.

## Built

| # | Idea | Score | Placement | Data and formulas | Reproduces |
|---|---|---|---|---|---|
| 1 | **Train BPE, WordPiece and Unigram on the same editable text, step by step** (before/after across three algorithms; play, pause, step, scrub, speed; counters for vocabulary, tokens in corpus, bytes or characters per token, Unigram loss; candidate table per step showing why the pair won; WordPiece caption names the most frequent pair it skipped; Unigram highlights words whose segmentation changed), plus an encoder running all three trained models on any text | 15 | Reading, Train three on one text | `parts/22_js_algos.js`; `ref_algos.py` (library BpeTrainer; course code verbatim for WordPiece and Unigram); `check_algos.mjs` 36/36 | Independently: the course's WordPiece vocabulary (25 tokens), its Unigram start loss 413.10 and printed tokenization, the library's BPE merges on 4 corpora (accents, emoji, Cyrillic, Japanese, repeated letters) |
| 2 | **Same sentence in 20 languages and code, ten real tokenizers, token by token** (partial-byte tokens shown as hex; NFC-normalising Qwen shown as text) | 13 | Tab Same text | `tok_data.py` (tiktoken 0.14.0, tokenizers 0.23.2, tokenizer.json of each model, mirrors named), FLORES-200 sentence 366 | n/a (measurement) |
| 3 | **Premium of all 204 FLORES-200 languages, any two tokenizers compared**, with median, counts over 2x and 3x, worst language, total tokens | 14 | Tab Same text | Petrov et al. construction (dev + devtest joined by spaces) | Independently and exactly: Petrov et al.'s published lengths for r50k, cl100k, Llama 2, ByT5 bytes, UTF-32, 204/204 each |
| 4 | **GPT-4o's 20-language table recomputed** (cl100k and o200k) | 11 | Tab Same text | sentences verbatim from the 13 May 2024 Wayback capture (`inputs/gpt4o_sentences.tsv`) | 18 of 20 exactly; Persian and Japanese off by 1 to 2 (cause unconfirmed, said) |
| 5 | **One sentence at five granularities** (words, characters, bytes, GPT-2, GPT-4o), bars to scale in bytes, seven languages | 10 | Reading, Words, characters, bytes, subwords | same data | n/a |
| 6 | **Six-language premium bars across five tokenizer generations** | 9 | Reading, The language tax | flores_counts.json | same as 3 |
| 7 | **Failure gallery on ten real tokenizers**: letters (strawberry), digits (three digit rules, 2024 as 202 4), trailing space (ids 382, 220, 12650), glitch tokens (GPT-2 ids 43453, 37444), template markers as text | 12 | Reading, Failure modes | examples.json; Singh and Strouse, Guidance, LessWrong, Fishing for Magikarp | n/a (measured ids) |
| 8 | **One sentence, six ways to cut it** (bytes, 4-byte strides, real Llama 3 BPE, space, entropy, entropy + monotonic), stepped animation with steps-for-the-large-model counter | 11 | Reading, Beyond subwords | BLT Figure 3, three rows transcribed (labelled), aligned to the sentence by script | The figure's BPE row (23 tokens) matches the real tokenizer's count; one boundary differs (shown) |
| 9 | **Vocabulary size over time, 33 models** (log axis, family colours, click for config card, sourced table) | 12 | Tab Vocabulary size | `vocab_data.py` (config.json, HF API), tiktoken sizes | n/a |
| 10 | **Embedding share of every open model**, smallest first | 11 | Tab Vocabulary size | V x d x (1 or 2) / safetensors total | Gemma 3 270M: 167.8M of 268.1M, independently reproduces Google's "170 million embedding ... 100 million for our transformer blocks" |
| 11 | **Embedding calculator** (vocabulary slider 16K to 300K, width, tied, rest of model) | 9 | Tab Vocabulary size | same formula | defaults = Gemma 3 270M |
| 12 | **Tokens against vocabulary size**: all languages, all except English, or one language against English, relative to GPT-2 | 11 | Tab Vocabulary size | flores_counts.json, tokenizer entry counts | shows English flat (4.8 to 5.0 chars per token) while the multilingual total falls to 43% |

## Rejected

| Idea | Why |
|---|---|
| Running real production tokenizers live in the browser | The vocabulary files are 2 to 33 MB each; the sandbox page must stay small. Offline counts stored instead (56 KB of data). |
| Exact HF UnigramTrainer (EM with digamma, suffix-array seeds) in JS | A large port for little teaching gain over the course's version, which matches its published outputs; the simplification is labelled. |
| Subword-regularisation sampling demo | Needs the full EM-trained Unigram probabilities to be meaningful; described in text. |
| BLT entropy computed live | The entropy model is not runnable here; Figure 3 transcribed and labelled instead. |
| Arithmetic accuracy chart from Singh and Strouse | The GPT-4 numbers exist only in a figure (the Methodology forbids reading curves); the two quoted GPT-3.5 numbers go in text. |
| Chat template token-by-token with loss masks | Owned and built by the Alignment page; linked. |
| Price-per-language calculator in dollars | Prices change per model and date; the premium is the stable quantity, and dollar figures would invite a price tab Khalid removed elsewhere. |
| Llama 3's 3.17 to 3.94 chars/token reproduction | Meta's English sample is not public; measured on FLORES English instead and both shown with the different gains (24% against 15%). |

## What the Methodology lacked for this page

- A rule for **measurement visuals on real artefacts** (tokenizer files) rather than formulas: here the "reproduces a published figure" test was met by re-running a published measurement (Petrov's table, OpenAI's table) on the same inputs, which worked better than any formula recompute. Worth a line: when a paper publishes its inputs and outputs, reproduce the table exactly first, then extend it.
- A rule for **reference implementations that disagree with the library**: WordPiece training in the HF library is BPE; the course is the only runnable reference. Say which reference each check uses.
