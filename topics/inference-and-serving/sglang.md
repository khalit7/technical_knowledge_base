# SGLang

Last updated: 2026-08-24

## Best resources

- [SGLang paper: "SGLang: Efficient Execution of Structured Language Model Programs"](https://arxiv.org/abs/2312.07104)
  (NeurIPS 2024): RadixAttention and the frontend DSL in one paper.
- [SGLang docs](https://docs.sglang.io), especially
  [Structured Outputs](https://docs.sglang.io/docs/advanced_features/structured_outputs).
- [sgl-project/sgl-learning-materials](https://github.com/sgl-project/sgl-learning-materials):
  curated talks and deep-dives from the team.
- [XGrammar-2 blog (MLC, May 2026)](https://blog.mlc.ai/2026/05/04/xgrammar-2-fast-customizable-structured-generation):
  the constrained-decoding backend SGLang leans on.
- Comparison reading: [Yotta Labs: What is SGLang?](https://www.yottalabs.ai/post/what-is-sglang-architecture-performance-and-when-to-use-it).

## What it is

SGLang (LMSYS origin, same lineage as Vicuna/Chatbot Arena) is a serving engine plus a
frontend language for LLM programs. The runtime idea: real traffic is full of repeated
prefixes (system prompts, few-shot blocks, RAG context, agent scratchpads, multi-turn
history), so make **KV reuse across requests** the organising principle of the engine
rather than an add-on. Highest-profile deployment: xAI serves Grok on SGLang; it is
also the reference engine for DeepSeek-style MLA/EP serving and many Chinese labs.

## RadixAttention

- All cached prefixes across all requests live in one **radix tree** whose edges are
  token sequences and whose nodes point at KV cache blocks (paged, like vLLM).
- A new request walks the tree, reuses the longest matched prefix's KV, and only
  prefills the tail. Eviction is LRU on tree leaves; a cache-aware scheduler orders
  requests to maximise hit rate instead of pure FCFS.
- Contrast with vLLM: vLLM V1 also has automatic prefix caching (block-hash based, near
  zero overhead), so the gap has narrowed a lot. SGLang's tree structure plus
  cache-aware scheduling and router still tend to win on workloads where 60-90% of
  input tokens are shared (agents, RAG, chatbots); on unique-prompt traffic the two are
  within noise of each other.

## Structured generation

- The original frontend DSL (`sgl.gen`, `fork`/`join`) lets you write multi-call LLM
  programs the runtime can parallelise and cache-share; in practice most users now hit
  the OpenAI-compatible server instead.
- Constrained decoding via **XGrammar** (JSON schema, regex, EBNF), compiled to token
  masks with microseconds of per-token overhead. SGLang pioneered compressed-FSM
  "jump-forward" decoding: when the grammar forces a multi-token string (keys, braces),
  it is appended in one step instead of decoded token by token.
- XGrammar-2 (May 2026) brought ~80x faster grammar compilation and better tool-call
  grammars; it is now the default structured backend in SGLang, vLLM, and TensorRT-LLM,
  so raw constrained-decoding speed is no longer a big differentiator; scheduling and
  jump-forward integration still are.

## How it differs from vLLM

| Axis | SGLang | vLLM |
|---|---|---|
| Organising idea | Cross-request KV reuse (radix tree) + LLM programs | Paged KV memory + continuous batching for general serving |
| Prefix caching | Core of the scheduler, cache-aware routing | On by default, block-hash, but scheduling less cache-driven |
| Structured output | Deepest integration, jump-forward decoding | xgrammar backend, catching up fast |
| Model/hardware coverage | Large, but narrower; NVIDIA/AMD focus | Broadest in OSS (incl. TPU, Neuron, CPU) |
| Scheduler | Overlapped CPU scheduling with zero-overhead batch prep | V1 engine core, persistent batch |
| MoE at scale | Reference for DeepSeek EP/MLA large-scale recipes | Wide-EP also strong, more general |
| Ecosystem | Grok, DeepSeek recipes, spec-bench leaders | Default everywhere: RLHF stacks, llm-d, clouds |

Performance folklore (2026): SGLang leads by ~20-30% throughput on prefix-heavy small/mid
models; at 70B+ dense scale differences shrink to a few percent; treat every benchmark
blog as workload-specific and rerun on your own traffic.

## Adoption and state (Aug 2026)

- Serves Grok at xAI; used by AMD (day-0 MI-series support), LinkedIn, Cursor, and
  most major Chinese model labs for reference deployments.
- Active co-development with NVIDIA Dynamo (P/D disaggregation) and the LMCache/Mooncake
  KV-offload ecosystem; SGLang router does cache-aware load balancing across replicas.
- Speculative decoding: EAGLE-2/EAGLE-3 well integrated, frequently top of the
  spec-decode benchmarks; MTP for DeepSeek-style models.
- Governance: community project under LMSYS non-profit; slower-moving than vLLM on
  long-tail model support, faster on some frontier serving recipes.

## When to choose it

Choose SGLang when traffic is agentic/multi-turn/RAG with fat shared prefixes, when
structured output dominates (heavy JSON tool calling), or when replicating a published
DeepSeek/Grok-style serving recipe. Choose vLLM for breadth, ecosystem, and anything
exotic (hardware, modality, RL integration). Running both behind a router is a real
pattern, and Dynamo/llm-d treat both as interchangeable workers.

## See also

- [vllm.md](vllm.md), [inference-techniques.md](inference-techniques.md) (prefix caching, spec decode).
