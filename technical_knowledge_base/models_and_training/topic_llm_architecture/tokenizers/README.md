# Tokenizers

Notion: https://app.notion.com/p/3c65c17b0d0d817187bcd94a1b0f15ea

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`; see `src/README.md`). A child page of Topic: llm-architecture (moved from Topic: llm-training-and-post-training on 2026-10-18, rebuilt the same day on the topic's running example). It teaches tokenization from zero: the running example's own 4,096-token byte-level BPE retrained, swept from 257 to 65,536 entries and replayed merge by merge; BPE, WordPiece and Unigram trained live on the same text; encoding and pre-tokenizers with the library source quoted; what a vocabulary costs in parameters and compute (the root Config calculator's numbers, total, active and decode FLOPs); 2026 models' tokenizers read from their own files; numbers and code (with a measured arithmetic run on OLMo 2 1B and Qwen3-1.7B); the language tax over 204 FLORES-200 languages with ten real tokenizers; failure modes with real model outputs; special tokens; byte-level alternatives; mistakes and interview questions.

Tabs: Reading, Grow a vocabulary, Same text ten tokenizers, Vocabulary size, Further reading. No child pages, databases or video.
