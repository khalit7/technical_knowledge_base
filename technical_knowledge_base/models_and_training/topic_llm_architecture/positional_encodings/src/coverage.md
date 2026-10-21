# Coverage of the old page and of the material moved in

## The old Notion page (src/live.md, fetched 2026-10-03; Notion's copy dated 2026-09-20)
`mk_coverage.py` maps all 68 facts, links and caveats of live.md to the new page and checks a needle string for each in the built `index.html`: 68 of 68 found (`coverage.json`). Status per item is in that file; the changes are:

Corrected (visible on the page, in a correction box or Common mistakes):
1. "RoPE degrades because high-frequency dims see unseen rotation angles": it is the low-frequency pairs (YaRN section 3.2); correction box in "What breaks past the trained length", the tiny GPT's slow pairs named (7 to 15).
2. "NTK: raise the base, e.g. 10000 -> 500000+": NTK at s = 4, d = 128 gives 40,890; 500,000 is Llama 3's pretraining base (ABF).
3. "LongRoPE behind Phi-3's 2M-token claims": 2,048K is the LongRoPE paper's result on LLaMA2 and Mistral; Phi-3-mini uses LongRoPE for 128K.
4. "NoPE: weaker in-context retrieval at scale": Yang et al. found the NoPE variant put the most attention on the needle; it lags on standard benchmarks.
5. "Long-range decay falls out of the mixed frequencies": qualified (holds for the bound and aligned vectors, not in expectation); the figure lives on the RoFormer page.
6. "Llama 3 recipe: continued pretraining at 128K with scaled RoPE": qualified, the paper describes the stages, the llama3 scaling is in the released config.

Moved (2026-10-18 split of Topic: llms into Topic: llm-architecture):
- "Long context also depends on the attention mechanism ... lives in Topic: inference-and-serving" now links the Long context sibling (3fd5c17b0d0d81059ee1ce20c0326dc5) and Attention variants; "architecture notes in Topic: llms" now link the parent Topic: llm-architecture.

## The 2026-10-03 rebuild (the floor: src/old_parts, deleted after this rebuild; in git history)
Every section, table, chart and caveat is carried: In one screen (extended with measured columns), Absolute or relative, Six schemes (unchanged maths), The relative family, RoPE, Variants (extended), What breaks (animation kept, tiny GPT and DeepSeek-V4-Pro presets added), Stretching RoPE, Recipes (extended), Beyond RoPE, Common mistakes (extended with measured mistakes), Stretch the spectrum tab (extended), Further reading. Its text was checked against the sources it cites on 2026-10-03; numbers recomputed here by recompute.py agree (the same script, extended). Two link changes: the T5 bucket-function and convert_llama_weights links now point at pinned versions instead of main; the parent link moved to Topic: llm-architecture.

## Moved in from the LLM Architecture Gallery (its src/coverage.md, "Moved to the sibling that owns it")
- RoPE rotation equations and the one-pair dial with the 0.5403 worked example: Reading, "RoPE from zero" (dial ported from the Gallery's 2026-10-02 `13_js_pos.js`, git history before b8f6cac1).
- Pair frequencies (pair 0 at 1 radian per token, pair 63 of Llama 3 at 2.46e-6, wavelengths 6.3 to 2.56 million): Reading, RoPE from zero and the drill.
- The YaRN ramp (alpha 1, beta 32, temperature 0.1 ln s + 1) and the band chart with gpt-oss 9 / 9 / 14 pairs and its 1.347 factor: Reading, "Stretching RoPE" (presets extended from gpt-oss, DeepSeek V3, Kimi K2 and an illustrative Llama 3 shape to eight real configs including the tiny GPT; the illustrative Llama 3 YaRN preset was dropped because Llama 3.1 ships llama3 scaling, which the spectrum tab draws).
- Partial RoPE (Qwen3-Next 0.25, MiniMax M2 64 of 128, GLM-4.5 half), NoPE layers (SmolLM3, Kimi), iRoPE (Llama 4), per-layer bases (Gemma): Reading, Variants (MiniMax M2's 64 of 128 is in the census table).
- Kimi Linear and Kimi K3 "drop RoPE from their full-attention layers" (Gallery): carried and made explicit; their KDA layers carry no RoPE either, so neither model has RoPE anywhere (Variants table, census).
- Dropped from the Gallery's old text: "several 2026 models interleave RoPE and NoPE layers (Muse Glimmer, Solar Open 2)": no config for either in the topic's inputs on 2026-10-18, so not repeated (unconfirmed).
