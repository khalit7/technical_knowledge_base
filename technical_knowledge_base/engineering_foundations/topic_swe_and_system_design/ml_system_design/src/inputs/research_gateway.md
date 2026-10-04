# ML system design research: gateways, rate limits, batch, caching (fetched 2026-10-04)

Format per item: topic | fact | quote | URL | version/date | status

## Release versions (GitHub releases API, fetched 2026-10-04)
- LiteLLM | latest non-prerelease by date published: v1.104.0 (2026-10-03T22:50Z); patch v1.103.3 published 2026-10-03T23:33Z; v1.105.0-rc.1 prerelease 2026-10-04. LiteLLM ships many parallel patch lines (v1.100.x .. v1.104.x) | n/a | https://github.com/BerriAI/litellm/releases/tag/v1.104.0 | v1.104.0, 2026-10-03 | verified (API)
- Envoy AI Gateway | the repo envoyproxy/ai-gateway now redirects (HTTP 301) to theagentrouter/agent-router, description "Manages Unified Access to Generative AI Services built on Envoy Gateway", homepage https://theagentrouter.ai/. Latest release v1.1.0 (2026-08-21); v1.0.0 was 2026-06-23; v0.5.0 2026-01-23 | "Manages Unified Access to Generative AI Services built on Envoy Gateway" | https://github.com/theagentrouter/agent-router/releases/tag/v1.1.0 | v1.1.0, 2026-08-21 | verified (API); rename context to confirm below
- Gateway API Inference Extension | latest release v1.6.2 | n/a | https://github.com/kubernetes-sigs/gateway-api-inference-extension/releases/tag/v1.6.2 | 2026-09-17 | verified (API)
- llm-d | latest release v0.10.0 | n/a | https://github.com/llm-d/llm-d/releases/tag/v0.10.0 | 2026-09-29 | verified (API)
- vLLM production-stack | latest release vllm-stack-0.1.13 (Helm chart tag) | n/a | https://github.com/vllm-project/production-stack/releases/tag/vllm-stack-0.1.13 | 2026-09-29 | verified (API)

## 1. LiteLLM (BerriAI/litellm), docs fetched 2026-10-04, source pinned at tag v1.104.0
- Routing strategies | options `simple-shuffle` (default), `least-busy`, `usage-based-routing`, `usage-based-routing-v2`, `latency-based-routing`, `cost-based-routing` | docs: "We recommend using `simple-shuffle` (default) for best performance in production." source: `routing_strategy: RoutingStrategyName = "simple-shuffle"`; strategy to logger map "usage-based-routing": "lowesttpm_logger", "usage-based-routing-v2": "lowesttpm_logger_v2", "latency-based-routing": "lowestlatency_logger", "cost-based-routing": "lowestcost_logger" | https://docs.litellm.ai/docs/routing ; https://github.com/BerriAI/litellm/blob/v1.104.0/litellm/router.py (lines ~800, ~1298) | v1.104.0 | verified
- Per-deployment tpm/rpm | set `rpm`/`tpm` in a deployment's litellm_params; used by usage-based routing | `rpm: 900` / `tpm: 100000` (docs example under `model: azure/chatgpt-v-2`) | https://docs.litellm.ai/docs/routing | 2026-10 | verified
- num_retries precedence | 4 levels, highest first: `x-litellm-num-retries` header, `num_retries` in request body, `num_retries` in deployment litellm_params, router-wide default | (paraphrase of a numbered list) | https://docs.litellm.ai/docs/routing | 2026-10 | verified (docs page)
- Retry default | `DEFAULT_MAX_RETRIES: Final = int(os.getenv("DEFAULT_MAX_RETRIES", 2))` | same | https://github.com/BerriAI/litellm/blob/v1.104.0/litellm/constants.py (line 68) | v1.104.0 | verified
- Cooldown defaults | allowed_fails 3, cooldown 5 s (code constants); can be set per deployment in `model_info` | `DEFAULT_ALLOWED_FAILS: Final = int(os.getenv("DEFAULT_ALLOWED_FAILS", 3))`; `DEFAULT_COOLDOWN_TIME_SECONDS: Final = int(os.getenv("DEFAULT_COOLDOWN_TIME_SECONDS", 5))`; router: `self.cooldown_time = cooldown_time or DEFAULT_COOLDOWN_TIME_SECONDS` | https://github.com/BerriAI/litellm/blob/v1.104.0/litellm/constants.py (lines 78, 80) | v1.104.0 | verified. NOTE: the proxy reliability docs page text says "Default cooldown period (30 seconds)" alongside a config that sets cooldown_time: 30; the code default is 5 s. Cite code.
- Fallback kinds | `fallbacks` (any failure after retries), `context_window_fallbacks`, `content_policy_fallbacks` | "For litellm.ContextWindowExceededErrors - LiteLLM maps context window error messages across providers"; "For litellm.ContentPolicyViolationError - LiteLLM maps content policy violation errors across providers" | https://docs.litellm.ai/docs/proxy/reliability | 2026-10 | verified
- Weighted failover (new) | `enable_weighted_failover`: with simple-shuffle, a retryable failure re-picks across other deployments in the same model group before cross-group fallback | "a retryable failure on one deployment causes the request to re-pick (weighted) across the other deployments in the same model group before any cross-group fallback runs" | https://github.com/BerriAI/litellm/blob/v1.104.0/litellm/router.py (line ~855) | v1.104.0 | verified
- Real config.yaml (copied from docs; model names as they appear in docs today) | 
```yaml
model_list:
  - model_name: zephyr-beta
    litellm_params:
      model: huggingface/HuggingFaceH4/zephyr-7b-beta
      api_base: http://0.0.0.0:8001
  - model_name: gpt-5.6-luna
    litellm_params:
      model: gpt-5.6-luna
      api_key: <my-openai-key>
  - model_name: gpt-5.6-terra
    litellm_params:
      model: gpt-5.6-terra
      api_key: <my-openai-key>

litellm_settings:
  num_retries: 3
  request_timeout: 10
  fallbacks: [{"zephyr-beta": ["gpt-5.6-luna"]}]
  context_window_fallbacks: [{"gpt-5.6-luna": ["gpt-5.6-terra"]}]
  content_policy_fallbacks: [{"gpt-5.6-luna": ["gpt-5.6-terra"]}]
  allowed_fails: 3
  cooldown_time: 30
```
  | URL https://docs.litellm.ai/docs/proxy/reliability | 2026-10 | verified (as rendered by fetch tool; re-copy from page before publishing)
- Budgets | `max_budget` (USD) and `budget_duration` on keys, users, teams; durations "30s", "30m", "30h", "30d" | "Budget is reset at the end of specified duration. If not set, budget is never reset."; error: "Authentication Error, ExceededTokenBudget: Current spend for token: 7.2e-05; Max Budget for Token: 2e-07"; team member: "ExceededBudget: Crossed spend within team" | https://docs.litellm.ai/docs/proxy/users | 2026-10 | verified
- Per key / team rate limits | `tpm_limit`, `rpm_limit` on /key/generate and /team/new; violations return 429 with headers like `x-litellm-key-remaining-requests-{model}` | `--data '{"tpm_limit": 20, "rpm_limit": 4}'` | https://docs.litellm.ai/docs/proxy/users | 2026-10 | verified
- Spend computation | token counts x per-token prices from model_prices_and_context_window.json; cost returned in `x-litellm-response-cost` header; override with `input_cost_per_token` / `output_cost_per_token` | "LiteLLM automatically tracks spend for all known models. See our model cost map" | https://docs.litellm.ai/docs/proxy/cost_tracking | 2026-10 | verified
- Cost map source + LITELLM_LOCAL_MODEL_COST_MAP | default URL `https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json` (overridable via env `LITELLM_MODEL_COST_MAP_URL` per `model_cost_map_url: str = os.getenv(`), fetched at import | source docstring: "Pulls the cost + context window + provider route for known models from https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json ... This can be disabled by setting the LITELLM_LOCAL_MODEL_COST_MAP environment variable to True."; docs: use "the local copy of the model cost map", tradeoff "you will need to upgrade to get updated pricing, and newer models." | https://github.com/BerriAI/litellm/blob/v1.104.0/litellm/litellm_core_utils/get_model_cost_map.py ; https://github.com/BerriAI/litellm/blob/v1.104.0/litellm/__init__.py (line 421-423); https://docs.litellm.ai/docs/completion/token_usage | v1.104.0 | verified (URL override env var LITELLM_MODEL_COST_MAP_URL confirmed in source)
- completion_cost() | "Returns a `float` of cost for the `completion` call" | https://docs.litellm.ai/docs/completion/token_usage | verified
- Cache types | redis, redis-semantic, valkey-semantic, qdrant-semantic, s3, gcs, local (in memory), disk | (list) | https://docs.litellm.ai/docs/proxy/caching | 2026-10 | verified
- Semantic cache config (docs) |
```yaml
litellm_settings:
  cache: True
  cache_params:
    type: "redis-semantic"
    similarity_threshold: 0.8
    redis_semantic_cache_embedding_model: azure-embedding-model
```
```yaml
litellm_settings:
  cache: True
  cache_params:
    type: qdrant-semantic
    qdrant_semantic_cache_embedding_model: openai-embedding
    qdrant_collection_name: test_collection
    qdrant_quantization_config: binary
    qdrant_semantic_cache_vector_size: 1536
    similarity_threshold: 0.8
```
  | https://docs.litellm.ai/docs/proxy/caching_semantic | 2026-10 | verified
- similarity_threshold semantics (source) | 0.0 to 1.0, required; converted to a vector distance `1 - threshold` | "similarity_threshold: Threshold for semantic similarity (0.0 to 1.0)"; `self.distance_threshold = 1 - similarity_threshold`; "similarity_threshold must be provided, passed None" | https://github.com/BerriAI/litellm/blob/v1.104.0/litellm/caching/redis_semantic_cache.py (lines 76, 98, 106) | v1.104.0 | verified
- mock_response | returns a canned response without calling the provider; also `mock_testing_rate_limit_error: true` and `mock_testing_fallbacks` for testing the proxy | "This will return a response object with a default response (works for streaming as well), without calling the LLM APIs." | https://docs.litellm.ai/docs/completion/mock_requests ; https://docs.litellm.ai/docs/routing | 2026-10 | verified

## 2. Envoy AI Gateway (now "Agent Router"), source pinned at tag v1.1.0 (2026-08-21)
- Rename | github.com/envoyproxy/ai-gateway 301-redirects to github.com/theagentrouter/agent-router; main-branch README: "The open source control plane for AI and agent traffic, powered by Envoy." and "An Agentic AI Foundation project. Formerly Envoy AI Gateway." The v1.1.0 tag README still says "Envoy AI Gateway"; API group still `aigateway.envoyproxy.io/v1beta1`. Old docs host aigateway.envoyproxy.io 301-redirects to theagentrouter.ai (that docs path returned 404 when fetched) | quotes as given | https://github.com/theagentrouter/agent-router (main README) | fetched 2026-10-04 | verified. Rename date not found.
- Two-tier pattern | "The Tier One Gateway handles authentication, top-level routing, and global rate limiting"; "The Tier Two Gateway provides fine-grained control over self-hosted model access, with endpoint picker support for LLM inference optimization." | https://github.com/theagentrouter/agent-router/blob/v1.1.0/README.md | v1.1.0 | verified
- Token rate limiting mechanism | built on Envoy Gateway Global Rate Limit API (Redis-backed); usage charged after the response | "AI Gateway leverages Envoy Gateway's Global Rate Limit API to provide token-based rate limiting for LLM requests."; "Token usage is charged after the response completes."; "If the existing charged usage is over the limit, the request is rejected with a 429 status code" | https://github.com/theagentrouter/agent-router/blob/v1.1.0/site/docs/capabilities/traffic/usage-based-ratelimiting.md | v1.1.0 | verified
- Streaming overshoot | "AI Gateway does not interrupt an already admitted stream if that stream pushes the token count over the configured limit."; example: 1,000-token hourly limit, admitted request "can stream 1,200 tokens successfully. The bucket is then 200 tokens over the limit" | same URL | v1.1.0 | verified
- llmRequestCosts types | InputToken, CachedInputToken, OutputToken, TotalToken, CEL; scoped per AIGatewayRoute; model header `x-ai-eg-model` | YAML:
```yaml
spec:
  llmRequestCosts:
    - metadataKey: llm_input_token
      type: InputToken # Counts tokens in the request
    - metadataKey: llm_cached_input_token
      type: CachedInputToken # Counts cached input tokens in the request prompt
    - metadataKey: llm_output_token
      type: OutputToken # Counts tokens in the response
    - metadataKey: llm_total_token
      type: TotalToken # Tracks combined usage
```
```yaml
spec:
  llmRequestCosts:
    - metadataKey: custom_cost
      type: CEL
      cel: "(input_tokens - cached_input_tokens) + (cached_input_tokens * 0.1) + output_tokens * 1.5"
```
  | same URL | v1.1.0 | verified
- QuotaPolicy vs rate limit | "Use QuotaPolicy when you need to cap cumulative token spend, and usage-based rate limiting (this page) when you need to control request velocity." | same URL | v1.1.0 | verified
- BackendTrafficPolicy (token limit per tenant per model), excerpt verbatim:
```yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: model-specific-token-limit-policy
  namespace: default
spec:
  targetRefs:
    - name: envoy-ai-gateway-token-ratelimit
      kind: Gateway
      group: gateway.networking.k8s.io
  rateLimit:
    type: Global
    global:
      rules:
        - clientSelectors:
            - headers:
                - name: x-tenant-id
                  type: Distinct
                - name: x-ai-eg-model
                  type: Exact
                  value: gpt-4
          limit:
            requests: 1000 # 1000 total tokens per hour
            unit: Hour
          cost:
            request:
              from: Number
              number: 0 # Set to 0 so only token usage counts
            response:
              from: Metadata
              metadata:
                namespace: io.envoy.ai_gateway
                key: llm_total_token # Uses total tokens from the responses
```
  | same URL | v1.1.0 | verified (comment lines trimmed)
- Provider fallback / priority | backendRefs with `priority`; first is primary; fallback driven by BackendTrafficPolicy retry | "The first backend is treated as primary, and subsequent backends are considered fallbacks."; "Fallback is triggered based on retry policies" | https://github.com/theagentrouter/agent-router/blob/v1.1.0/site/docs/capabilities/traffic/provider-fallback.md | v1.1.0 | verified. YAML:
```yaml
apiVersion: aigateway.envoyproxy.io/v1beta1
kind: AIGatewayRoute
metadata:
  name: provider-fallback
  namespace: default
spec:
  parentRefs:
    - name: provider-fallback
      kind: Gateway
      group: gateway.networking.k8s.io
  rules:
    - matches:
        - headers:
            - type: Exact
              name: x-ai-eg-model
              value: us.meta.llama3-2-1b-instruct-v1:0
      backendRefs:
        - name: provider-fallback-always-failing-upstream # Primary backend (expected to fail)
          priority: 0
        - name: provider-fallback-aws # Fallback backend
          priority: 1
```
  plus retry policy: `numAttemptsPerPriority: 1`, `numRetries: 5`, backOff baseInterval 100ms maxInterval 10s, perRetry timeout 30s, retryOn httpStatusCodes [500], triggers connect-failure, retriable-status-codes.

## 3. Gateway API Inference Extension (GIE) and llm-d
- GIE version | v1.6.2, released 2026-09-17 | n/a | https://github.com/kubernetes-sigs/gateway-api-inference-extension/releases/tag/v1.6.2 | verified
- MAJOR CHANGE: EPP and InferenceObjective moved out of GIE | at v1.6.2 the GIE README says EPP, InferenceObjective, InferenceModelRewrite and BBR moved to llm-d repos; GIE keeps InferencePool, a lightweight EPP (LWEPP) and conformance tests | "The Endpoint Picker (EPP), InferenceObjective and InferenceModelRewrite APIs, and Body Based Router (BBR) packages have moved to new repositories: EPP and associated APIs: llm-d/llm-d-router; BBR: llm-d/llm-d-inference-payload-processor"; "This repository will continue to host the lightweight EPP (LWEPP) and the InferencePool API" (discussed in issue #2430) | https://github.com/kubernetes-sigs/gateway-api-inference-extension/blob/v1.6.2/README.md | v1.6.2 | verified. The GIE v1.6.2 tree contains only api/v1 InferencePool and apix/v1alpha1 InferencePoolImport types; no InferenceModel / InferenceObjective.
- InferencePool definition | "InferencePool represents a set of Inference-focused Pods and an extension that will be used to route to them." ; "In practice, that means that you'd replace a Kubernetes Service with an InferencePool." | https://github.com/kubernetes-sigs/gateway-api-inference-extension/blob/v1.6.2/site-src/concepts/api-overview.md | v1.6.2 | verified
- InferencePoolImport (multi-cluster) | "a cluster-local, controller-managed representation of an imported InferencePool from another cluster" | same | v1.6.2 | verified
- Mechanism | ext-proc: "leveraging Envoy's External Processing (ext-proc) to extend any gateway that supports both ext-proc and Gateway API into an inference gateway"; "an extensible request scheduling algorithm that is kv-cache and request cost aware, avoiding evictions or queueing as load increases" | https://github.com/kubernetes-sigs/gateway-api-inference-extension/blob/v1.6.2/README.md | v1.6.2 | verified
- Criticality history | GIE v0.3.0 InferenceModel (v1alpha2) had enum `criticality`: Critical, Standard, Sheddable; later replaced by InferenceObjective with integer `priority` | "Critical defines the highest level of criticality. Requests to this band will be shed last."; "Criticality impacts how traffic is handled in resource constrained situations. It handles this by queuing or rejecting requests of lower criticality." | https://github.com/kubernetes-sigs/gateway-api-inference-extension/blob/v0.3.0/api/v1alpha2/inferencemodel_types.go (lines 81-145) | v0.3.0 | verified
- InferenceObjective now (llm-d-router v0.11.0, released 2026-09-27, apix/v1alpha2) | spec has `priority` (int32, higher = more critical, negatives allowed, unset treated as 0) and `poolRef` | "Priority is used in flow control, primarily in the event of resource scarcity(requests need to be queued)."; "flow control will _always_ allow requests of higher priority to be served first."; "Fairness is only enforced and tracked between requests of the same priority." | https://github.com/llm-d/llm-d-router/blob/v0.11.0/apix/v1alpha2/inferenceobjective_types.go | v0.11.0 | verified
- EPP scheduler lifecycle (llm-d docs) | Filter, Score, Pick per SchedulingProfile; final score = sum(weight x scorer score in [0,1]) | "the scheduler follows a Filter -> Score -> Pick lifecycle for every request"; "if Scorer A (weight 2.0) returns 0.8 and Scorer B (weight 1.0) returns 0.5, the endpoint's final score is (0.8 * 2.0) + (0.5 * 1.0) = 2.1" | https://github.com/llm-d/llm-d/blob/v0.10.0/docs/architecture/core/router/epp/scheduling.md | llm-d v0.10.0 (2026-09-29) | verified
- EPP scorers (signals) | kv-cache-utilization-scorer, latency-scorer (predicted latency vs SLO), lora-affinity-scorer, prefix-cache-scorer, queue-depth-scorer, running-requests-size-scorer, token-load-scorer, session-affinity-scorer, no-hit-lru-scorer; filters incl. prefix-cache-affinity-filter, slo-headroom-tier-filter, prefill/decode filters; default picker max-score-picker | "Prefers endpoints with lower KV cache utilization"; "Prefers endpoints with shorter request queues"; "Scores based on the total token load (input + output) handled by the endpoint" | same URL | v0.10.0 | verified
- Scorer formulas (llm-d-router v0.11.0 READMEs) | KV: "score(endpoint) = 1 - kvCacheUsagePercent" (reads metric KVCacheUsagePercent); queue: (maxQueue - queue)/(maxQueue - minQueue) from WaitingQueueSize; prefix: "score = matchLengthWeight*matchLengthScore + (1.0-matchLengthWeight)*matchRatioScore", matchRatioScore = matchBlocks / totalBlocks, default ratio only; quadratic length term because "attention computation grows quadratically as a function of prompt length"; load-aware: score in [0, 0.5], "waitingRequests == 0 -> score = 0.5" | https://github.com/llm-d/llm-d-router/tree/v0.11.0/pkg/epp/framework/plugins/scheduling/scorer (prefix/, kvcacheutilization/, queuedepth/, loadaware/ README.md) | v0.11.0 | verified
- Approx vs precise prefix cache | prefix-cache-scorer defaults to `approx-prefix-cache-producer`; `precise-prefix-cache-producer` "Publishes PrefixCacheMatchInfo from its event-driven KV-cache index" | https://github.com/llm-d/llm-d/blob/v0.10.0/docs/architecture/core/router/epp/scheduling.md | v0.10.0 | verified
- llm-d version | v0.10.0, 2026-09-29 | n/a | https://github.com/llm-d/llm-d/releases/tag/v0.10.0 | verified
- llm-d optimized baseline (default well-lit path) | two criteria: prefix-cache aware via prefix-cache-affinity-filter, load-aware via token-load-scorer | "Prefix-cache aware using the prefix cache affinity filter, which narrows candidates to "sticky" endpoints with high estimated prompt prefix cache reuse, with a saturation-aware override that spreads load when endpoints get hot."; "Load-aware using the token load scorer, which scores endpoints based on the total prefill token load handled by each model server." | https://github.com/llm-d/llm-d/blob/v0.10.0/guides/optimized-baseline/README.md | v0.10.0 | verified. Note peakPrefillThroughput default 15928 measured for Qwen3-32B on H100 TP=2.
- llm-d headline claims | "3x higher output throughput and 2x faster TTFT with prefix-cache-aware routing vs round-robin" (Llama 3.1 70B on 4x MI300X); "40% reduction in TTFT and ITL with predicted-latency scheduling vs heuristics" | https://github.com/llm-d/llm-d/blob/v0.10.0/README.md | v0.10.0 | verified (vendor claims)
- Flow control (llm-d) | "Flow control lets the router hold excess requests in the EPP instead of immediately dispatching them to already busy model servers." | https://github.com/llm-d/llm-d/blob/v0.10.0/guides/optimized-baseline/README.md | v0.10.0 | verified

## 4. vLLM production-stack (vllm-project/production-stack), pinned at tag vllm-stack-0.1.13 (2026-09-29)
- Routing logic options | `--routing-logic` choices: roundrobin, session, kvaware, loadaware, prefixaware, disaggregated_prefill, disaggregated_prefill_orchestrated, priority | `choices=["roundrobin","session","kvaware","loadaware","prefixaware","disaggregated_prefill","disaggregated_prefill_orchestrated","priority"]` | https://github.com/vllm-project/production-stack/blob/vllm-stack-0.1.13/src/vllm_router/parsers/parser.py (line ~229) | vllm-stack-0.1.13 | verified
- session | "Route the request to the appropriate engine URL based on the session key in the request headers" | https://github.com/vllm-project/production-stack/blob/vllm-stack-0.1.13/src/vllm_router/routers/routing_logic.py (line 230) | verified
- kvaware (uses LMCache controller) | "Route the request to the appropriate engine URL by where the KV cache of the longest prefix match is found." | same file (line 284) | verified
- prefixaware (router-side prefix tracking) | "Route the request to the appropriate engine URL by where the longest prefix match is found. In this class, we assume that there is no eviction of prefix cache." | same file (line 759) | verified
- loadaware (new) | "score(i) = matched_tokens(i) / prompt_tokens - beta * relative_load(i)"; "relative_load(i) = (load(i) - mean_load) / max(1, mean_load)"; "a warm-but-saturated instance can lose to a cold-but-idle one" | same file (line 481) | verified
- Helm values example (prefix-aware), copied verbatim:
```yaml
servingEngineSpec:
  runtimeClassName: ""
  modelSpec:
  - name: "llama"
    repository: "lmcache/vllm-openai"
    tag: "2025-05-27-v1"
    modelURL: "meta-llama/Llama-3.2-1B-Instruct"
    replicaCount: 2
    requestCPU: 6
    requestMemory: "30Gi"
    requestGPU: 1
    pvcStorage: "50Gi"
    vllmConfig:
      enablePrefixCaching: true
      maxModelLen: 16384

    lmcacheConfig:
      enabled: true
      cpuOffloadingBufferSize: "60"
      logLevel: "DEBUG"

    env: []
    hf_token: <hf-token>

routerSpec:
  repository: "lmcache/lmstack-router"
  tag: "kvaware"
  resources:
    requests:
      cpu: "1"
      memory: "2G"
    limits:
      cpu: "1"
      memory: "2G"
  routingLogic: "prefixaware"
```
  | https://github.com/vllm-project/production-stack/blob/vllm-stack-0.1.13/tutorials/assets/values-18-prefix-aware.yaml | vllm-stack-0.1.13 | verified
- Tutorial quote | "Prefix aware routing ensures that subsequent requests with the same prompt prefix are routed to the same instance, maximizing KV cache utilization and improving performance." | https://github.com/vllm-project/production-stack/blob/vllm-stack-0.1.13/tutorials/18-prefix-aware-routing.md | verified

## 5. Provider rate limits (fetched 2026-10-04)
### OpenAI (platform.openai.com/docs/guides/rate-limits now 301-redirects to developers.openai.com)
- Measures | "RPM (requests per minute), RPD (requests per day), TPM (tokens per minute), TPD (tokens per day), IPM (images per minute)" | https://developers.openai.com/api/docs/guides/rate-limits | fetched 2026-10-04 | verified (via fetch summarizer; re-check exact wording on page)
- Scope | "Rate limits are defined at the organization level and at the project level, not user level." | same | verified
- Headers | x-ratelimit-limit-requests, x-ratelimit-limit-tokens, x-ratelimit-remaining-requests, x-ratelimit-remaining-tokens, x-ratelimit-reset-requests, x-ratelimit-reset-tokens (also project-scoped x-ratelimit-limit-project-tokens / x-ratelimit-remaining-project-tokens, and Retry-After) | header names | same | verified (names); descriptions paraphrased by fetch tool
- max_tokens counting | "Your rate limit is calculated as the maximum of `max_tokens` and the estimated number of tokens based on the character count." (i.e. a big max_tokens reserves TPM even if unused) | same | verified (summarizer quote; older wording ended "...character count of your request")
- Failed requests | "Unsuccessful requests contribute to your per-minute limit" | same | verified
- Batch queue | "Batch API queue limits are calculated based on the total number of input tokens queued for a given model." | same | verified
### Anthropic (docs.claude.com/en/api/rate-limits now 301-redirects to platform.claude.com/docs/en/api/rate-limits)
- Token bucket | "The API uses the token bucket algorithm to do rate limiting. This means that your capacity is continuously replenished up to your maximum limit, rather than being reset at fixed intervals." | https://platform.claude.com/docs/en/api/rate-limits | fetched 2026-10-04 | verified
- Burst enforcement | "a rate of 60 requests per minute (RPM) might be enforced as 1 request per second. Short bursts of requests can exceed the limit and trigger rate limit errors." | same | verified
- Measures + 429 + retry-after | "The rate limits for the Messages API are measured in requests per minute (RPM), input tokens per minute (ITPM), and output tokens per minute (OTPM) for each model class. If you exceed any of the rate limits you will get a 429 error describing which rate limit was exceeded, along with a retry-after header indicating how long to wait." | same | verified
- Acceleration limits | "You might also encounter 429 errors because of acceleration limits on the API if your organization has a sharp increase in usage." | same | verified
- Cache-aware ITPM | "For most Claude models, only uncached input tokens count toward your ITPM rate limits."; cache_read_input_tokens "Do NOT count toward ITPM for most models"; input_tokens and cache_creation_input_tokens do count; exception: "Claude Haiku 3.5 (marked with footnote 4 in the following rate limit tables) also counts cache_read_input_tokens toward ITPM rate limits." | same | verified
- Worked example | "With a 2,000,000 ITPM limit and an 80% cache hit rate, you could effectively process 10,000,000 total input tokens per minute (2M uncached + 8M cached)" | same | verified
- Total input formula | "total_input_tokens = cache_read_input_tokens + cache_creation_input_tokens + input_tokens" | same | verified
- OTPM and max_tokens (contrast with OpenAI) | "OTPM rate limits are evaluated in real time as output tokens are produced, counting only the actual tokens generated. The max_tokens parameter does not factor into OTPM rate limit calculations, so there is no rate limit downside to setting a higher max_tokens value." | same | verified
- ITPM estimation | "ITPM rate limits are estimated at the beginning of each request, and the estimate is adjusted during the request to reflect the actual number of input tokens used." | same | verified
- Per-model | "Rate limits are applied separately for each model" | same | verified
- Example tier numbers | Start tier, Claude Opus 5.5 and Sonnet 5.5: 1,000 RPM, 2,000,000 ITPM, 400,000 OTPM; Scale tier: 10,000 RPM, 10,000,000 ITPM, 2,000,000 OTPM | table | same | verified (2026-10-04)
- Spend caps | Start $500, Build $1,000, Scale $200,000 per month; at cap: HTTP 429 `rate_limit_error` with `error_code: enforced_spend_limit_reached` and "the response has no retry-after header"; self-set limit returns HTTP 400 invalid_request_error | same | verified
- Workspace limits | "Organization-wide limits always apply, even if Workspace limits add up to more." | same | verified
- Headers | retry-after ("The number of seconds to wait until you can retry the request. Earlier retries will fail."); anthropic-ratelimit-{requests,tokens,input-tokens,output-tokens}-{limit,remaining,reset} (reset in RFC 3339; remaining tokens "rounded to the nearest thousand"); anthropic-priority-{input,output}-tokens-{limit,remaining,reset} (Priority Tier only) | same | verified
- Batch rate limits | "The Message Batches API has its own set of rate limits which are shared across all models."; Start tier 1,000 RPM, 200,000 batch requests in processing queue, 100,000 per batch; Scale 4,000 RPM, 500,000 queue | same | verified

- Anthropic 429 vs 529 | "429 - rate_limit_error: Your organization has hit a rate limit, reached its usage tier's monthly spend cap, or reached a spend limit on the Claude Code workspace."; "529 - overloaded_error: The API is temporarily overloaded."; "529 errors can occur when the API experiences high traffic across all users." | https://platform.claude.com/docs/en/api/errors | fetched 2026-10-04 | verified. Design point: 429 = your quota (per org), 529 = provider-wide capacity.
- Anthropic SDK retry | "The official SDK automatically retries transient failures (such as connection errors, rate limits, and 5xx server errors) with exponential backoff, twice by default, honoring the retry-after header when present." | same | verified
- Anthropic 500 | "Retry the request with exponential backoff" | same | verified
- Long requests | "Consider using the streaming Messages API or Message Batches API for long-running requests, especially those over 10 minutes." | same | verified
- Request size | Messages API 32 MB, Batch API 256 MB, 413 request_too_large | same | verified

## 6. Batch, flex, priority / fast tiers (fetched 2026-10-04)
### OpenAI
- Batch API | "50% cost discount compared to synchronous APIs"; "Each batch completes within 24 hours (and often more quickly)"; "separate pool of significantly higher rate limits"; max 50,000 requests per batch, input file up to 200 MB, up to 2,000 batches per hour; expired requests reported with error code `batch_expired`, completed ones still charged | https://developers.openai.com/api/docs/guides/batch | fetched 2026-10-04 | verified (summarizer; limits paraphrased)
- Batch queue limits | "Batch API queue limits are calculated based on the total number of input tokens queued for a given model." | https://developers.openai.com/api/docs/guides/rate-limits | verified
- Flex processing | "Flex processing provides lower costs for Responses or Chat Completions requests in exchange for slower response times and occasional resource unavailability."; priced "at Batch API rates, with additional discounts from prompt caching"; `service_tier: "flex"`; may return "429 Resource Unavailable", "You will not be charged when this occurs."; SDK default timeout 10 minutes, examples raise to 15 minutes; "Flex processing is in beta with limited model availability." | https://developers.openai.com/api/docs/guides/flex-processing/ | fetched 2026-10-04 | verified
- Priority processing RENAMED to Fast mode | pricing page: "Priority processing was renamed Fast mode on July 30, 2026."; fast-mode guide: "Fast mode delivers up to 2.5x faster speeds and more consistent latency with pay-as-you-go pricing."; request with `service_tier: "fast"`, `"priority"` still accepted for backward compatibility on supported models; "Fast mode charges a per-token premium over Standard processing." (2x standard in the example rows); "If your traffic ramps too fast, the system may downgrade some Fast mode requests to standard speeds and charge standard rates." (ramp guidance: no more than 50% every 15 minutes once above 1M input TPM); downgraded responses show `service_tier: "default"` | https://developers.openai.com/api/docs/pricing/ ; https://developers.openai.com/api/docs/guides/fast-mode/ | fetched 2026-10-04 | verified (the old URL /guides/priority-processing now 404s). Also an `ultrafast-mode` guide exists in the sitemap (not read).
- Example price row (pricing page, as rendered) | gpt-6-luna per 1M tokens: Standard $0.10 input / $0.01 cached / $0.50 output; Batch and Flex $0.05 / $0.005 / $0.25; Fast $0.20 / $0.02 / $1.00 | https://developers.openai.com/api/docs/pricing/ | 2026-10-04 | verified via summarizer only; re-check before quoting numbers
### Anthropic
- Message Batches | "most batches finishing in less than 1 hour while reducing costs by 50% and increasing throughput"; "A Message Batch is limited to either 100,000 Message requests or 256 MB in size, whichever is reached first."; "Batches expire if processing does not complete within 24 hours."; "Batch results are available for 29 days after creation."; "All usage is charged at 50% of the standard API prices."; expired requests: "You will not be billed for these requests." | https://platform.claude.com/docs/en/build-with-claude/batch-processing | fetched 2026-10-04 | verified
- Batch + caching stack | "The pricing discounts from prompt caching and Message Batches can stack"; "cache hits are provided on a best-effort basis. Users typically experience cache hit rates ranging from 30% to 98%"; suggests the 1-hour cache "Because batches can take longer than 5 minutes to process" | same | verified
- Priority Tier (now closed to new buyers) | "Priority Tier capacity commitments are no longer available for purchase. Organizations with an existing commitment can continue to use Priority Tier through their contract end date"; "The API prioritizes requests in this tier over all other requests. This prioritization helps minimize "server overloaded" errors"; commitment = ITPM + OTPM + duration "(1, 3, 6, or 12 months)" + model version; "Priority Tier targets 99.5% uptime with prioritized computational resources. Requests beyond your committed capacity automatically fall back to standard tier."; `service_tier`: "auto" (default) or "standard_only"; response `usage.service_tier: "priority"`; burndown: cache reads 0.1, 5-min cache writes 1.25, 1-hour cache writes 2.00 tokens per token; "Requests assigned Priority Tier pull from both the Priority Tier capacity and the regular rate limits." | https://platform.claude.com/docs/en/api/service-tiers | fetched 2026-10-04 | verified
- Anthropic fast mode | research preview `speed: "fast"` on Opus 5.5, Opus 5, Opus 4.8 with separate rate limits and anthropic-fast-* headers | https://platform.claude.com/docs/en/api/rate-limits | verified (mention only)

## 7. Prompt caching price multipliers (fetched 2026-10-04)
### Anthropic (raw markdown at https://platform.claude.com/docs/en/build-with-claude/prompt-caching.md)
- Multipliers | "5-minute cache write tokens are 1.25 times the base input tokens price"; "1-hour cache write tokens are 2 times the base input tokens price"; "Cache read tokens are 0.1 times the base input tokens price (see the table footnote for per-model exceptions)"; exceptions: "Cache hits and refreshes on Claude Fable 5.1 and Claude Mythos 5.1 are priced at 0.025x the base input price."; "Cache hits and refreshes on Claude Opus 5.5 are priced at 0.05x the base input price." | https://platform.claude.com/docs/en/build-with-claude/prompt-caching | 2026-10-04 | verified
- Example rows ($/MTok: base input, 5m write, 1h write, cache hit, output) | Claude Opus 5.5: $4, $5, $8, $0.20, $20; Claude Sonnet 5.5: $2, $2.50, $4, $0.20, $10; Claude Haiku 4.5: $1, $1.25, $2, $0.10, $5; Claude Opus 4.8: $5, $6.25, $10, $0.50, $25 | same | verified
- TTL | "By default, the cache has a 5-minute lifetime. The cache is refreshed for no additional cost each time the cached content is used."; 1-hour: `"cache_control": {"type": "ephemeral", "ttl": "1h"}`; "Currently, "ephemeral" is the only supported cache type" | same | verified
- Minimum cacheable length | 512 tokens (Fable 5.1, Mythos 5.1, Opus 5.5, Opus 5, Sonnet 5.5, Fable 5, Mythos 5); 1,024 (Opus 4.8, Sonnet 5, Sonnet 4.6, Sonnet 4.5, Opus 4.1, Opus 4, Sonnet 4); 2,048 (Mythos Preview, Opus 4.7, Haiku 3.5); 4,096 (Opus 4.6, Opus 4.5, Haiku 4.5); "Shorter prompts cannot be cached, even if marked with cache_control. Any requests to cache fewer than this number of tokens will be processed without caching, and no error is returned." | same (line ~604) | verified
- Breakpoints and lookback | "You can define up to 4 cache breakpoints"; "The lookback window is 20 blocks. The system checks at most 20 positions per breakpoint" | same | verified
- Concurrency gotcha | "a cache entry only becomes available after the first response begins. If you need cache hits for parallel requests, wait for the first response before sending subsequent requests." | same | verified
- Automatic caching mode | top-level `cache_control` places the breakpoint on the last cacheable block | same | verified (summarizer)
### OpenAI (https://developers.openai.com/api/docs/guides/prompt-caching/)
- Default on, discount | "Prompt caching is enabled by default for supported OpenAI models."; cached input "discounted up to 95%" | https://developers.openai.com/api/docs/guides/prompt-caching/ | 2026-10-04 | verified
- Minimum | "The minimum cacheable prompt length is 1,024 tokens for GPT-5.6 and later and varies by request settings for earlier models." | same | verified
- New write charge on GPT-5.6+ | "For GPT-5.6 and later, cache writes cost 1.25x the standard, uncached input-token rate. Subsequent reads cost 0.1x that rate on most of these models and 0.05x on GPT-6.1 Sol."; "writing a prefix once and fully reusing it once costs 1.35x its ordinary input cost, compared with 2x for processing it twice without caching. Across ten requests, one write and nine full reads cost 2.15x" | same | verified. (Earlier models: no cache-write charge per comparison table, "Model-dependent cached-input rate".)
- Implicit vs explicit | `prompt_cache_options.mode` "implicit" or "explicit"; explicit uses `prompt_cache_breakpoint: { "mode": "explicit" }` on a content block; "Each request can create up to four cache writes." | same | verified
- TTL / retention | GPT-5.6+: "Use prompt_cache_options.ttl to control the minimum cache lifetime. The only supported value, 30m, is also the default."; earlier models `prompt_cache_retention`: "in_memory: Entries typically remain active for around 5 to 10 minutes of inactivity, up to one hour. 24h: Extended retention typically keeps entries available for around 30 minutes and can retain them for up to 24 hours." | same | verified
- Routing and prompt_cache_key | routing depends on machine load, "A hash of the initial tokens after the hidden OpenAI content, including tool definitions when present", and "A supplied prompt_cache_key, which separates cache reuse between groups of requests and helps optimize cache routing"; "Cached states live on individual machines, where traffic above 15 requests per minute can lead to overflow routing."; "Caches are not shared across organizations" | same | verified
- Usage fields | `input_tokens_details.cached_tokens` and `cache_write_tokens`; cached_tokens rounds "down to the nearest multiple of 128" | same | verified

## 8. HTTP 429 and Retry-After
- RFC 6585 section 4 "429 Too Many Requests" (April 2012) | "The 429 status code indicates that the user has sent too many requests in a given amount of time ("rate limiting")."; "MAY include a Retry-After header indicating how long to wait before making a new request."; "this specification does not define how the origin server identifies the user, nor how it counts requests."; "Responses with the 429 status code MUST NOT be stored by a cache." | https://www.rfc-editor.org/rfc/rfc6585#section-4 | RFC 6585, April 2012 | verified
- RFC 9110 section 10.2.3 Retry-After (June 2022) | "Servers send the "Retry-After" header field to indicate how long the user agent ought to wait before making a follow-up request."; `Retry-After = HTTP-date / delay-seconds`; "A delay-seconds value is a non-negative decimal integer, representing time in seconds."; examples "Retry-After: Fri, 31 Dec 1999 23:59:59 GMT" and "Retry-After: 120" | https://www.rfc-editor.org/rfc/rfc9110#section-10.2.3 | RFC 9110, June 2022 | verified

## 9. Company LLM gateway posts
- Uber | "Navigating the LLM Landscape: Uber's Innovation with GenAI Gateway", July 11, 2024, Tse-Chi Wang and Roopansh Bansal | quotes: "GenAI Gateway is a Go service that acts as an encompassing layer around the clients for third-party vendors, complemented by the in-house serving stacks tailored for Uber's LLMs."; "A pivotal design decision was to mirror the HTTP/JSON interface of the OpenAI API"; "GenAI Gateway incorporates a PII redactor that anonymizes sensitive information within requests before forwarding them to third-party vendors."; components for "authentication and authorization, metrics emission to facilitate reporting and alerting, and the generation of audit logs" used for "comprehensive cost attribution, security audit purposes, quality evaluation"; "used by close to 30 customer teams and serves 16 million queries per month, with a peak QPS of 25." | https://www.uber.com/blog/genai-gateway/ | 2024-07-11 | verified via WebFetch summarizer (direct curl blocked; re-check exact wording on page)
- Uber, negative check | a second fetch found no sentences on rate limiting, quotas, provider fallback, caching or model routing in the Uber post; it covers auth, OpenAI-compatible API, PII redaction, audit logs and cost attribution | same URL | verified (summarizer)
- Bloomberg + Tetrate (Envoy AI Gateway origin) | "Introducing Envoy AI Gateway", 2024-10-18, author handle missberg (Tetrate) | "traditional rate-limiting based on number of requests doesn't work for controlling usage of LLM providers as they're computationally complex services."; "To measure usage LLM providers tokenize the words in the request message and response message, and count the number of tokens used."; MVP features: "Usage Limiting - to control LLM usage based on word tokens", "Unified API - to simplify client integration with multiple LLM providers", "Upstream Authorization - to configure Authorization to multiple upstream LLM providers" | https://github.com/theagentrouter/agent-router/blob/v1.1.0/site/blog/2024/2024-10-18-introducing-envoy-ai-gw.md | 2024-10-18 | verified
- Bloomberg KubeCon NA 2024 end user keynote (Alexa Griffith) | "Centralizing & Simplifying Enterprise AI Workflows with Envoy AI Gateway"; "Organizations now require centralized infrastructure to manage and optimize access to self-trained, open source, and commercial AI models at scale."; video https://www.youtube.com/watch?v=do1viOk8nok | https://github.com/theagentrouter/agent-router/blob/v1.1.0/site/blog/2024/2024-11-14-kubecon-end-user-keynote.md | 2024-11-14 | verified
- Salesforce Trust Layer (product page, not an engineering post; no date shown) | "Data masking is the process that replaces sensitive Personally Identifiable Information (PII) or proprietary business data with non-identifiable tokens before the prompt is sent to the LLM."; "Zero data retention is a strict policy where the prompts and generated responses are never stored or used to train the underlying third-party large language models."; "Toxicity detection employs advanced classification models to scan and categorize generated content in real time" | https://www.salesforce.com/artificial-intelligence/trusted-ai/ | undated, fetched 2026-10-04 | verified (summarizer); page now says "Salesforce Trust Layer" rather than "Einstein Trust Layer"
- LinkedIn "Musings on building a Generative AI product" | checked: no gateway, quota, TPM, or cost-allocation content; not useful for this topic | https://www.linkedin.com/blog/engineering/generative-ai/musings-on-building-a-generative-ai-product | n/a | verified negative
- NOT FOUND in this pass: Shopify, Roblox, Netflix, Pinterest, LinkedIn gateway posts. The session's WebSearch budget (200 calls) was exhausted before this topic, so these could not be searched; GitLab's AI gateway design-doc URL returned only navigation / 404. Unconfirmed; worth a follow-up search.
