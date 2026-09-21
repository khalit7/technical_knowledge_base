# 2026-09-07: T5Gemma and LCLM added to Papers

⏱ 2 min read

Follow-on from Khalid's research session on context-aware methods for long-input short-output question answering. He asked for two things to be added if absent. Both were: the KB mentioned Encoder-Decoder Gemma once in passing on the Bitune paper page and had nothing on context compression at all.

### Papers

- **[new]** [Encoder-Decoder Gemma and T5Gemma 2](../papers/2025-04_t5gemma/summary.md) (9 min read · +2h 35m resources). Zhang et al., Google / Google DeepMind, April 2025 and December 2025. **Filed as one page covering two papers**, against the usual one-page-per-paper rule: the second is the same adaptation recipe extended to Gemma 3, multimodality and long context, and splitting them would repeat the method section twice. One index row accordingly, dated 2025-2026.
- **[new]** [End-to-End Context Compression at Scale (Latent Context Language Models)](../papers/2026-06_lclm/summary.md) (9 min read · +3h 45m resources). Li, McLeish, Chen et al., June 2026. Encoder-decoder soft-token compression trained at scale, with the architecture search that settles the design questions.
Both rows added at the top of the Papers index, and tracker boxes as `2025-04_t5gemma` and `2026-06_lclm`.

### Topic pages patched

- [Google DeepMind: Gemini and Gemma](../topics/llms/google-gemini/overview.md) (7 to 8 min read). The Gemma lineage section jumped from Gemma 4 to the training-approach notes with no mention of the encoder-decoder branch, which is the only place a frontier lab currently ships open encoder-decoder LLMs. Added the adaptation method, the asymmetric 9B-2B result, and T5Gemma 2's long-context numbers. `Topic: llms` gained a T5Gemma line in Related papers.
- [Topic: inference-and-serving](../topics/inference-and-serving/summary.md) (14 to 15 min read). The page covered every way to make a KV cache cheaper but not the option of keeping the tokens out of the decoder entirely. Added a dated section on the two compression families, LCLM and REFRAG, and the distinction between algorithmic and systems-realisable cache reduction, which is the transferable lesson for reading anything in this area.
Estimates updated on both topic roots, the Gemma family page, the Papers index rollup (7h 21m to 7h 39m across 44 to 46 summaries, ~136h to ~142h of resources), and the KB root (33h 6m prose, ~1,453h resources).

### Open, flagged

- **A live disagreement between the two additions, deliberately left unresolved.** T5Gemma finds bidirectional encoder attention worth 4 to 5 points and treats it as the reason the architecture works; LCLM's from-scratch sweep finds causal encoder attention consistently better. They are doing different jobs, compressing to latents versus building a representation for cross-attention, but nothing in either paper reconciles them. Recorded on both paper pages rather than smoothed over.
- **Asymmetric encoder-decoder sizing has almost no evidence behind it beyond one data point each way.** T5Gemma's 9B-2B works; LCLM's scaling table found scaling the decoder helped loss more than scaling the encoder, with mixed downstream results (a 4B encoder won LongBench, LongHealth and GSM8K and lost every RULER length). Worth watching as a research direction rather than treating as settled.
- **Repo mirror not synced.** No repo access in this session, so `technical_knowledge_base` is behind by both paper pages, two index rows, two tracker boxes, this digest and the two topic patches.
