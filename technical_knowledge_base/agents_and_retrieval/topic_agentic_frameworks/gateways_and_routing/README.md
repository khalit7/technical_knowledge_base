# Gateways and routing: LiteLLM, OpenRouter, fallbacks, budgets, rate limits

Notion: https://app.notion.com/p/3f15c17b0d0d81e4a964c129a3e520ae (child of Topic: agentic-frameworks)

HTML-only page: `index.html`, built by `src/build.sh`. What a gateway does to one model call, read from LiteLLM 1.104.0's source and recorded request by request (routing strategies, retries, cooldowns, fallbacks, retries across layers, rate limits, budget reservation, response cache, format translation), OpenRouter's provider routing on its live catalogue, and a measured learned-router experiment. Tabs: Reading, Failure lab, Limits lab, Routing lab, Further reading. See `src/README.md`.
