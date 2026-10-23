# Topic: inference-and-serving

Notion: https://app.notion.com/p/3c65c17b0d0d81c08b3bc95ff45c7b13
Site: https://khalit7.github.io/technical_knowledge_base/systems_and_performance/topic_inference_and_serving/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`; how it was built and the 2026-10-23 rebuild in `src/README.md`). The map of LLM serving: one request's prefill and decode, why decode is slow, every lever on one screen with the child page that owns it, the KV cache, batching and scheduling, latency promises and cost, the engines compared, cheaper tokens, many GPUs, production, and the child pages. Tools that span the children: Serving simulator, Engine bench (measured on an Apple M1 Pro and on CPU, published GPU results kept apart) and Capacity planner. Data as of October 2026. Tabs: Reading, Serving simulator, Engine bench, Capacity planner, Further reading. Child pages, each in its own folder: batching_kv_cache_and_scheduling, sampling_and_decoding, speculative_decoding, vllm, sglang, local_and_on_device_inference (which absorbed Model formats on 2026-10-23), distributed_and_disaggregated_serving, llm_serving_in_production.
