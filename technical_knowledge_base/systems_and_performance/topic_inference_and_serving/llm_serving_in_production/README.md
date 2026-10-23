# LLM serving in production: routing, autoscaling, cold starts, multi-LoRA, load testing

Notion: https://app.notion.com/p/3f35c17b0d0d818aa406da1f7a784c62 (child of Topic: inference-and-serving)
Site: https://khalit7.github.io/technical_knowledge_base/systems_and_performance/topic_inference_and_serving/llm_serving_in_production/

HTML-only page: `index.html` (built by `src/build.sh`). Tabs: Reading, Router lab, Autoscaling lab, Load-test lab, Further reading.
Evidence: three llama-server replicas behind a router written here, on a Mooncake-derived multi-turn trace; cold starts; multi-LoRA and
structured output on llama-server and vLLM 0.31.0 CPU; a 5-second stall under closed- and open-loop load; an HPA-style autoscaling
simulator checked against its Python reference. All measured on an Apple M1 Pro (October 2026). Details and rebuild: `src/README.md`.
