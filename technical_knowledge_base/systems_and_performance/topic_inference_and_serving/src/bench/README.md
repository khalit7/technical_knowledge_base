# Engine bench tab (t-bench): sources and how to rebuild

Real measurements on an Apple M1 Pro laptop (16-core GPU, 16 GB), 2026-10-08, labelled "measured" on the page.
Engines: llama.cpp 0.5.0 (Homebrew, build 11146, commit 7fe450e19, Metal), MLX 0.32.3 with mlx-lm 0.32.0,
vLLM 0.31.0 CPU image `vllm/vllm-openai-cpu:v0.31.0-arm64` in Docker Desktop (5 CPUs, 9.7 GiB). SGLang not run
(CPU backend targets Intel AMX; prebuilt CPU images are x86-64 only); TensorRT-LLM needs NVIDIA.

Models (downloaded to a scratch folder, never to the repo): Qwen3-0.6B BF16 GGUF (unsloth @ 50968a44) quantized here
to F16/Q8_0/Q4_K_M with llama-quantize (no imatrix); Qwen3-1.7B Q8_0/Q4_K_M (unsloth @ d7f544ee); Qwen3-4B Q4_K_M
(Qwen @ bc640142); MLX Qwen3-0.6B 4/8-bit and bf16 converted here from Qwen/Qwen3-0.6B @ c1899de2 (group 64);
mlx-community/Qwen3-1.7B-4bit @ 3b1b1768; vLLM ran Qwen/Qwen3-0.6B @ c1899de2 safetensors in float32.
Perplexity text: WikiText-2 raw test (Salesforce/wikitext, wikitext-2-raw-v1).

## Files
- `scripts/`: what produced the raw results. `loadgen.py` (load generator, standard library, closed loop and Poisson,
  fixed seeds, streamed SSE, TTFT/TPOT per request), `lb.sh` (llama-bench), `bb.sh` (llama-batched-bench),
  `mb.sh` (mlx_lm benchmark), `srv.sh`/`run_sets.sh` (server load tests), `ppl.sh` (llama-perplexity), `spec.sh` +
  `spec_client.py` (llama-server speculative decoding), `mlx_spec.py` (MLX speculative decoding), `lock.sh` (shared
  bench lock: no two heavy runs at once), `env.sh` (set `INF_DIR` to the scratch folder), `check_tab.mjs` (puppeteer).
  Every run records the one-minute load average before and after (the laptop was shared).
- `results/`: compact copies of every raw result (model paths written `<models>/`; per-token gaps kept only for the
  two streaming examples).
- `build_data.py <raw dir>`: writes `data.json` and `../parts/32_js_bch_0data.js` (window.BCH_DATA).
- `recompute.py`: every derived number (facts filled into `data-f` spans, the bandwidth fit, the speculative-decoding
  cost model); the page's JavaScript reimplements the fit and the model and is checked against it.
- `check_data.py`: page embeds data.json unchanged; data.facts == recompute.facts(data); every placeholder has a fact.
- `viz_ideas.md`: visuals built and rejected.

## Rebuild
`python3 -I build_data.py <raw results>` then `sh ../build.sh`, `python3 -I check_data.py`, and from the repo root
`sh html_utils/checkpage.sh technical_knowledge_base/systems_and_performance/topic_inference_and_serving`.

## Notable findings recorded on the page
- Decode-vs-context fit: t0 2.18 ms + bytes / 147 GB/s, against about 143 GB/s plain reads measured on Topic: hardware.
- llama-server 0.5.0: `-md` alone loads the draft but does nothing; `--spec-type draft-simple` is required.
- Speculative decoding slowed decode on this GPU except on a highly predictable prompt (llama.cpp, up to 1.32x);
  MLX was slower at every k, and at k = 6 two prompts' greedy output differed from the baseline.
- mlx_lm.server under overload (Poisson 3 req/s and up): footprint grew to 12 GB, Metal out-of-memory, generation
  thread died (twice). The first attempt's files are kept as `msv_0.6b_4bit_poissonA_*`.
- vLLM CPU at 16 users: KV usage 100%, 8 preemptions, throughput fell from 8 to 16 users. bfloat16 fell back to a
  slow matmul path on the M1 (no BF16 instructions), so it ran in float32.
