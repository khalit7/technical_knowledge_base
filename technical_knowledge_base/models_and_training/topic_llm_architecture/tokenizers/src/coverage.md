# Coverage of the old pages

Two floors, both carried in full.

1. **The Notion page of 20 September 2026** (`live.md`, verbatim): 61 facts, every one located in the rebuilt page by `mk_coverage.py` (phrase checks against `../index.html`, result in `coverage.json`: 61 of 61 found on 2026-10-18). Seven were corrected in the 2026-10-03 build and stay corrected:
   - "32k-256k typical": the upper end is 262K (Gemma 3 and 4, 262,144 entries).
   - "GPT-4/o series ... o200k": GPT-4 is cl100k_base (100,277); o200k_base (200,019) is GPT-4o onward.
   - "Llama 3 onward: 128k": Llama 4 is 202,048 (config) / 201,135 entries.
   - "Gemma: 256k": 256,000 for Gemma 1 and 2; 262,144 for Gemma 3 and 4.
   - "low-resource languages pay 3-5x": measured over 204 languages, median 2.26 (cl100k) and 1.75 (o200k); 65 / 15 / 8 languages above 3x; up to 15x.
   - "modern tokenizers force 1-3 digit groups": only some; LLaMA 2, Gemma, Qwen and now Nemotron 3 Super split single digits.
   - "frontier labs are experimenting with SuperBPE": unconfirmed (no released tokenizer measured has superword tokens).
2. **The 2026-10-03 interactive build** (the previous `index.html` and its parts): every section, card and tab kept (ids prefixed `tk-`), reordered from zero, and extended.

## Corrections and changes made in the 2026-10-18 rebuild
- Parent changed from Topic: llm-training-and-post-training to Topic: llm-architecture; Further reading rewritten around the new parent and siblings.
- **Embedding share** (Vocabulary size tab): the old bars divided by the Hub's safetensors totals, which include vision towers (Gemma 3 27B, Llama 4) and MTP layers. Replaced by the root Config calculator's text-only counts (validated to residual 0), with two new accountings (share of active parameters, output layer share of decode FLOPs). The Gemma 3 270M check (167.8M of 268.1M) is unchanged and stays in the calculator card.
- **Gemma 3 entries**: the `unsloth/gemma-3-1b-it` tokenizer.json has 262,145 entries (262,144 ordinary plus `<image_soft_token>`); the old page said 262,144 for the tokenizer, which is the ordinary count.
- **2026 models verified from their own files** (not configs): DeepSeek-V4-Pro (= V4-Flash, V3's 128,000 ordinary tokens), Kimi K3 (163,584 + 256 reserved = 163,840; the old page had no entry count for Kimi), Nemotron 3 Super (131,072, single digits), Gemma 4 31B (= Gemma 4 E2B), GLM-5 (= GLM-5.3; only 177 three-digit tokens), MiniMax-M3, Olmo 3, SmolLM3, Qwen3.5-397B.
- The old digit table listed DeepSeek-V3 in the three-digit family; V4 is added, plus MiniMax, OLMo/Olmo, Kimi K3 (from their files).
- Tokenizer library pinned to 0.23.3 (the old counts used 0.23.2): the running example's tokenizer retrains byte for byte under 0.23.3, the three trainers still match the references 36 of 36 (`check_algos.mjs`), and every count recomputed here with 0.23.3 equals the stored one where both exist (running text 222 tokens for Qwen3, as the root's smoke test). The 204-language FLORES counts were not recomputed (FLORES is not in scratch; they are deterministic and were verified against Petrov et al. 204 of 204).
- New, not on either old page: the running example's BPE retrained and swept (nine sizes), its merges replayed (Grow a vocabulary tab), its glitch tokens, quoted library source (trainer.rs, word.rs, byte_level.rs, modeling_utils.py, tiny_gpt.py) at pinned versions, real model outputs (OLMo 2 1B and Qwen3-1.7B arithmetic, SmolLM2-135M and the tiny GPT trailing space, Qwen3-0.6B letter counting), the special-token injection and double-BOS traps, interview questions, three predict-then-reveal drills.
- Qwen3.5 against Qwen3 overlap: the old page quoted 131,612 shared entries (with the 26 added tokens); this page quotes 131,586 shared ordinary entries (the same comparison without added tokens). The safetensors-based shares (Llama 3.2 1B 21%, DeepSeek-V3 0.3%) were replaced by the Config calculator's text-only shares (DeepSeek-V3 0.28%).
