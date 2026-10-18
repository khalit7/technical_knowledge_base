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

## Added in the 2026-10-18 rebuild (on the running example)

| # | Idea | Score | Placement | Data | Reproduces |
|---|---|---|---|---|---|
| 13 | **One sentence through the tokenizer, stage by stage** (text, bytes, pre-tokens, merges per chunk with ranks, ids, embedding rows, decode), stepped with captions and counters | 12 | Reading, What a tokenizer does | `make_page_data.py` replays the real merges; asserted equal to the library's ids | the library's ids for the sentence (by assertion) |
| 14 | **Replay the 3,839 merges on the running sequence** (before/after: raw bytes to 4,096 entries; slider, play, jump to 512, 1,024, 2,048) with counters for tokens, embedding and output FLOPs | 15 | Tab Grow a vocabulary | committed tokenizer.json; JS encoder | the library at 13 merge counts, 26/26 (`check_grow.mjs`) |
| 15 | **Cost of nine trained vocabulary sizes**: characters per token and the tiny GPT's FLOPs (blocks vs output layer, a U with its minimum at 2,048) with a marker following the slider | 13 | Tab Grow a vocabulary; table in Reading | `bpe_sweep.py` (measured counts) plus a stated FLOPs formula | n/a; 4,096 equals the committed file byte for byte |
| 16 | **Glitch tokens of the running example**: training count against embedding norm for all 4,096 ids, unseen ids in red, with real continuations after an unseen token | 13 | Reading, Failure modes | `freq_glitch.py` | n/a (measurement); matches Land and Bartolo's description |
| 17 | **Arithmetic before/after**: the same 100 additions written plainly and with commas, on a 3-digit-chunk tokenizer (OLMo 2 1B) and a single-digit control (Qwen3-1.7B), digits coloured right/wrong | 14 | Reading, Numbers and code | `probe/arith.py` | direction of Singh and Strouse 2024 (GPT-3.5/4), on open models |
| 18 | **Trailing space before/after**: top-5 next tokens and greedy text with and without one space, SmolLM2-135M and the tiny GPT | 11 | Reading, Failure modes | `probe/space_letters.py` | n/a |
| 19 | **Letter counting, word vs spelled out** (Qwen3-0.6B, 24 words) | 10 | Reading, Failure modes | same | n/a |
| 20 | **Digit chunks under three rules** for any sum | 9 | Reading, Numbers and code | computed from the rules (checked on 12345678 against every file) | n/a |
| 21 | **Embedding share three ways** (total, active, output-layer share of decode FLOPs) over the Config calculator's 45 configs | 13 | Tab Vocabulary size (replaces the safetensors-based bars) | root `src/calc/out/py_results.json` | residual 0 against the Hub (the calculator's own validation) |

Rejected in this rebuild:

| Idea | Why |
|---|---|
| Loss per character of the tiny GPT at each vocabulary size | Needs a GPU training run per size and re-tokenised data (the agent was CPU-only while three GPU labs ran); Tao et al. 2024 cited instead, listed as pending in the report. |
| A second merge animation for WordPiece or Unigram on TinyStories | The three-algorithm trainer already shows both on one text; repeating it at scale adds no mechanism. |
| Re-running the 204-language FLORES counts with tokenizers 0.23.3 | Deterministic counts already verified exactly against Petrov et al.; spot checks with 0.23.3 agree. |
| Animating the KV cache cost of extra tokens | Owned by the root's Attention lab and the Long context child; linked. |
