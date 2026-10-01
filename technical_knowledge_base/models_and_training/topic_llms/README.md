# Topic: llms

Notion: https://app.notion.com/p/3c65c17b0d0d812d9e00f6ec89965286

`index.html` is the whole Notion page (one interactive HTML block). It is built from `src/` with `sh src/build.sh` and published with the `sync-KB-github` skill.

The page also carries a narrated video (not in this repository; its HyperFrames project is in `video/`) and the child pages below, one folder each.

- `ai2_olmo/`: Ai2: OLMo (fully open models)
- `alibaba_qwen/`: Alibaba: Qwen
- `anthropic_claude_family/`: Anthropic: Claude family
- `deepseek/`: DeepSeek
- `google_deepmind_gemini_and_gemma/`: Google DeepMind: Gemini and Gemma
- `llm_architecture_gallery/`: LLM Architecture Gallery (rasbt) and the architectural deltas that matter
- `meta_llama_and_msl/`: Meta: Llama and Meta Superintelligence Labs
- `minimax/`: MiniMax
- `mistral_ai/`: Mistral AI
- `moonshot_ai_kimi/`: Moonshot AI: Kimi
- `openai_gpt_family/`: OpenAI: GPT family
- `other_notable_providers/`: Other notable providers
- `xai_spacexai_grok/`: xAI / SpaceXAI: Grok
- `zhipu_glm/`: Zhipu: GLM

Folded into this page on 2026-10-01 (their Notion pages are marked for deletion): Mixture-of-Experts (MoE) models (now the "Deeper: inside an MoE" tab plus Axis 2 of the Reading tab; scripts in `src/moe/`), Reasoning models and test-time compute (the "Deeper: test-time compute" tab plus Axis 1; `src/ttc/`), and LLM release history (the "Release history" tab plus "How we got here"; `src/history/`).
