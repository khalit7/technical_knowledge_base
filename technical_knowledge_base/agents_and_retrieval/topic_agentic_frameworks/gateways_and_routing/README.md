# Gateways and routing: LiteLLM, OpenRouter, fallbacks, budgets, rate limits

Notion: https://app.notion.com/p/3f15c17b0d0d81e4a964c129a3e520ae (child of Topic: agentic-frameworks)
Site: https://khalit7.github.io/technical_knowledge_base/agents_and_retrieval/topic_agentic_frameworks/gateways_and_routing/

HTML-only page: `index.html`, built by `src/build.sh`. What a gateway does to one model call, read from LiteLLM 1.104.0's source and recorded request by request (routing strategies, retries, cooldowns, fallbacks, retries across layers, rate limits, budget reservation, response cache, format translation), OpenRouter's provider routing on its live catalogue, and a measured learned-router experiment. Rebuilt 2026-10-24 to the teaching contract: core idea and hero at the top, the former lab tabs inside the Reading sections they prove, cascades, semantic caching risks and a tools comparison with one dated table added. Tabs: Reading, Further reading. See `src/README.md`.
