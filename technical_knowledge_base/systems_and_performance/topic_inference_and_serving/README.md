# Topic: inference-and-serving

Notion: https://app.notion.com/p/3c65c17b0d0d81c08b3bc95ff45c7b13

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`) and published to Notion as an HTML-only page. How a trained model answers requests at scale, taught from zero: what one request costs, prefill and decode, the KV cache, batching and scheduling, the serving engines, quantization and speculative decoding, parallelism across GPUs, and how to size, tune and cost a deployment. Measured on real engines on an Apple M1 Pro and on CPU, with published GPU results kept apart. Data as of October 2026. Tabs: Reading, Serving simulator, Engine bench, Capacity planner, Further reading. Child pages, each in its own folder: batching_kv_cache_and_scheduling, distributed_and_disaggregated_serving, llm_serving_in_production, local_and_on_device_inference, model_formats, sampling_and_decoding, sglang, speculative_decoding, vllm.
