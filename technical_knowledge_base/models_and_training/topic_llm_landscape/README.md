# Topic: llm-landscape

Notion: https://app.notion.com/p/3c65c17b0d0d812d9e00f6ec89965286
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_llm_landscape/

Renamed from "Topic: llms" on 2026-10-18 (folder `topic_llms/` became `topic_llm_landscape/`; same Notion id). It owns the labs, their models, benchmarks, prices, release history and test-time compute; how an LLM is built moved to Topic: llm-architecture (`../topic_llm_architecture/`).

`index.html` is the whole page (read it on the site). It is built from `src/` with `sh src/build.sh` and published with the `sync-kb-github` skill.

The page also carries a narrated video (not in this repository; its HyperFrames project is in `video/`) and the child pages below, one folder each.

- `alibaba_qwen/`: Alibaba: Qwen
- `anthropic_claude_family/`: Anthropic: Claude family
- `deepseek/`: DeepSeek
- `google_deepmind_gemini_and_gemma/`: Google DeepMind: Gemini and Gemma
- (moved 2026-10-18) the Architecture Gallery is now a child of Topic: llm-architecture: `../topic_llm_architecture/llm_architecture_gallery/`
- `meta_llama_and_msl/`: Meta: Llama and Meta Superintelligence Labs
- `minimax/`: MiniMax
- `mistral_ai/`: Mistral AI
- `moonshot_ai_kimi/`: Moonshot AI: Kimi
- `openai_gpt_family/`: OpenAI: GPT family
- `other_notable_providers/`: Other notable providers (Ai2 OLMo merged in, 2026-10-24)
- `xai_spacexai_grok/`: xAI / SpaceXAI: Grok
- `zhipu_glm/`: Zhipu: GLM
- `test_time_compute_and_reasoning/`: Test-time compute and reasoning (2026-10-24, from the old "Deeper: test-time compute" tab)

Folded into this page on 2026-10-01 (their Notion pages are marked for deletion): Mixture-of-Experts (MoE) models (then the "Deeper: inside an MoE" tab plus Axis 2 of the Reading tab; scripts in `src/moe/`; on 2026-10-18 the tab was replaced by a link card to the Mixture of experts child of Topic: llm-architecture, which carries its content), Reasoning models and test-time compute (the "Deeper: test-time compute" tab plus Axis 1; `src/ttc/`), and LLM release history (the "Release history" tab plus "How we got here"; `src/history/`).

2026-10-24 (topic close): the Reading tab was rebuilt to the teaching contract as a map (core idea, a hero of each lab's best model with its answer on the three axes, comparisons, child cards); the interactive lab map and the Release history's Cadence view were retired; the old "Deeper: inside an MoE" tab is gone. See `src/README.md`.

2026-10-24: the "Deeper: test-time compute" tab (parts `34_*`, `src/ttc/`) moved to its own child page, `test_time_compute_and_reasoning/`; the root links it from section 2, the child cards and Further reading.
