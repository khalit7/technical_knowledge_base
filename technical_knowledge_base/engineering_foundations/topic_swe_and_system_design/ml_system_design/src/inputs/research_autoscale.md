# MSD research: autoscaling, metrics, cold starts (gathered 2026-10-04)

Format per item: topic | fact | quote | URL | version/date | status

## 1. vLLM Prometheus metrics (latest stable: v0.30.0, published 2026-09-22 per GitHub releases API)

Source file at tag: https://github.com/vllm-project/vllm/blob/v0.30.0/vllm/v1/metrics/loggers.py
Design doc at tag: https://github.com/vllm-project/vllm/blob/v0.30.0/docs/design/metrics.md
User doc: https://docs.vllm.ai/en/latest/usage/metrics.html (source docs/usage/metrics.md at v0.30.0; metric list is generated from code)

- vllm:num_requests_running | Gauge | documentation="Number of requests in model execution batches." | loggers.py v0.30.0 L499 | verified
- vllm:num_requests_waiting | Gauge | documentation="Number of requests waiting to be processed." | loggers.py v0.30.0 L509 | verified. Also new vllm:num_requests_waiting_by_reason (L519).
- vllm:kv_cache_usage_perc | Gauge | documentation="KV-cache usage. 1 means 100 percent usage." (a 0 to 1 fraction despite the name) | loggers.py v0.30.0 L567 | verified
- Rename history: vllm:gpu_cache_usage_perc renamed to vllm:kv_cache_usage_perc. Code comment at v0.11.0: "Deprecated in 0.9.2 - Renamed as vllm:kv_cache_usage_perc ... With 0.11.x you can enable with --show-hidden-metrics-for-version=0.10 ... TODO: remove in 0.12.0". v0.9.1 has only gpu_cache_usage_perc; v0.9.2 has both (old one help "DEPRECATED: Use vllm:kv_cache_usage_perc instead."); v0.12.0 has only kv_cache_usage_perc. | https://github.com/vllm-project/vllm/blob/v0.11.0/vllm/v1/metrics/loggers.py | verified by diffing tags v0.9.1, v0.9.2, v0.11.0, v0.12.0
- vllm:time_to_first_token_seconds | Histogram | "Histogram of time to first token in seconds." | L812 | verified
- vllm:inter_token_latency_seconds | Histogram | "Histogram of inter-token latency in seconds." | L822 | verified. Replaces vllm:time_per_output_token_seconds: help string "DEPRECATED: Use vllm:inter_token_latency_seconds instead." first appears at v0.10.2; v0.11.0 comment "Deprecated in 0.11 - Renamed as vllm:inter_token_latency_seconds"; still present behind show_hidden_metrics in v0.12.0; absent in v0.30.0. | verified
- vllm:request_time_per_output_token_seconds | Histogram, per-request TPOT | design doc: "computed as `(end-to-end latency - TTFT) / (number of output tokens - 1)`. It is recorded as zero for requests that generate no more than one token." | metrics.md v0.30.0 | verified
- ITL vs TPOT difference (design doc): "These two metrics differ when an output bundles multiple tokens (e.g. speculative decoding) or when mean ITL and mean per-request TPOT are aggregated over differing weights." | metrics.md v0.30.0 | verified
- vllm:e2e_request_latency_seconds | Histogram | "Histogram of e2e request latency in seconds." | L842 | verified
- Other request-phase histograms at v0.30.0: vllm:request_queue_time_seconds, vllm:request_inference_time_seconds, vllm:request_prefill_time_seconds, vllm:request_decode_time_seconds | L852-882 | verified
- vllm:prompt_tokens (exposed as vllm:prompt_tokens_total) | Counter | "Number of prefill tokens processed." | L676 | verified
- vllm:generation_tokens (exposed as vllm:generation_tokens_total) | Counter | "Number of generation tokens processed." | L710 | verified. The _total suffix: design doc: "When exposing the time series for counter, a `_total` suffix will be added." (prometheus_client behaviour) | verified
- vllm:prompt_tokens_cached | Counter | "Number of cached prompt tokens (local + external)." | L701 | verified
- Prefix cache: vllm:prefix_cache_queries "Prefix cache queries, in terms of number of queried tokens."; vllm:prefix_cache_hits "Prefix cache hits, in terms of number of cached tokens." Hit rate = rate(hits)/rate(queries) (token-weighted). Also vllm:external_prefix_cache_queries/_hits for KV connector caches. | L590-626 | verified
- vllm:num_preemptions (counter) | L667 | verified
- Deprecation policy: "when metrics are deprecated in version `X.Y`, they are hidden in version `X.Y+1` but can be re-enabled using the `--show-hidden-metrics-for-version=X.Y` escape hatch, and are then removed in version `X.Y+2`." | docs/usage/metrics.md v0.30.0 | verified

## 2. KServe autoscaling for LLMs (latest KServe release: v0.21.0, published 2026-09-25). Docs from kserve/website main @ 71c8b22 (2026-08-31). Knative Serving latest: knative-v1.23.0 (2026-07-29).

- KServe InferenceService + KEDA with vLLM metric. Doc: https://kserve.github.io/website/docs/model-serving/generative-inference/autoscaling (source https://github.com/kserve/website/blob/71c8b22a05d6be72560b2cc326865930063cd0e8/docs/model-serving/generative-inference/autoscaling/autoscaling.md) | verified
  - Quote: "KEDA ... allowing applications to scale based on external metrics such as vLLM metrics for the number of waiting requests or KV Cache usage."
  - Quote: "Autoscaling using KEDA is only available in Standard mode."
  - Quote: "configured Prometheus to track the `vllm:num_requests_running` metric for our LLM server. This example uses a target value of 2 concurrent requests per pod ... if our LLM receives 6 concurrent requests with our target of 2 requests per pod, the system will scale to 3 replicas"
  - Real YAML (verbatim):
```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-qwen
  annotations:
    serving.kserve.io/deploymentMode: "Standard"
    serving.kserve.io/autoscalerClass: "keda"
    serving.kserve.io/enable-prometheus-scraping: "true"
    prometheus.io/scrape: "true"
    prometheus.io/path: "/metrics"
    prometheus.io/port: "8080"
    prometheus.io/scheme: "http"
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      args:
        - --model_name=qwen
      storageUri: "hf://Qwen/Qwen2.5-0.5B-Instruct"
      resources:
        limits:
          cpu: "2"
          memory: 6Gi
          nvidia.com/gpu: "1"
        requests:
          cpu: "1"
          memory: 4Gi
          nvidia.com/gpu: "1"
    minReplicas: 1
    maxReplicas: 5
    autoScaling:
      metrics:
        - type: External
          external:
            metric:
              backend: "prometheus"
              serverAddress: "http://prometheus.istio-system.svc.cluster.local:9090"
              query: vllm:num_requests_running
            target:
              type: Value
              value: "2"
```
  - KServe creates a KEDA ScaledObject named <isvc>-predictor targeting apps/v1.Deployment. Doc also: "The period to wait after the last trigger reports active before scaling the resource back to 0 in 5 minutes (300 seconds) by default."
  - OpenTelemetry variant: annotation sidecar.opentelemetry.io/inject, metric type PodMetric, backend "opentelemetry", query "vllm:num_requests_running", target value "4"; uses kedify otel-add-on (push instead of polling): "polling can introduce latency and additional load on the cluster." | verified
- KServe LLMInferenceService (v1alpha2) autoscaling with WVA (llm-d Workload Variant Autoscaler). Doc source: https://github.com/kserve/website/blob/71c8b22a05d6be72560b2cc326865930063cd0e8/docs/model-serving/generative-inference/llmisvc/autoscaling/llmisvc-autoscaling.md | verified
  - Quote: "WVA makes scaling decisions based on inference-specific metrics such as KV cache utilization, queue depth, and request saturation, signals that better reflect real LLM serving pressure." (original dash replaced by a comma)
  - Quote: "WVA is the sole source of scaling decisions, the actuator (HPA or KEDA) acts as a pass-through that directly applies the replica count computed by WVA." (original dash replaced by a comma)
  - WVA controller publishes `wva_desired_replicas` Prometheus metric; actuator "Configured with `target=1` so it acts as a direct pass-through".
  - KEDA actuator example: pollingInterval: 5, cooldownPeriod: 120, initialCooldownPeriod: 60, idleReplicaCount: 1, fallback {failureThreshold: 3, replicas: 2}. Quote: "`initialCooldownPeriod` is particularly useful for LLM deployments where the model takes time to load before it can serve traffic, preventing premature scale-up decisions during startup."
  - HPA actuator example behavior: scaleUp stabilizationWindowSeconds 0, Percent 100 per 60s; scaleDown stabilizationWindowSeconds 300, 1 Pod per 120s.
  - Prefill can be scaled independently: "For disaggregated prefill-decode deployments, the prefill workload can be independently autoscaled using `spec.prefill.scaling`."
- KServe KPA (Knative, Serverless mode). Doc source: https://github.com/kserve/website/blob/71c8b22a05d6be72560b2cc326865930063cd0e8/docs/model-serving/predictive-inference/autoscaling/kpa-autoscaler.md | verified
  - "The annotation `autoscaling.knative.dev/target` is a soft limit rather than a strictly enforced limit. If there is a sudden burst of requests, this value can be exceeded." YAML: `spec.predictor.scaleTarget: 1`, `scaleMetric: concurrency`.
  - "The autoscaler calculates average concurrency over a 60-second window, so it takes a minute to stabilize at the desired concurrency level. However, it also calculates a 6-second panic window and will enter into panic mode if that window reaches 2x target concurrency. ... Once the panic conditions are no longer met for 60 seconds, the autoscaler will return to the 60-second stable window."
  - "`ContainerConcurrency` ... is a hard limit, and if the concurrency reaches the hard limit, surplus requests will be buffered and must wait until enough capacity is free" (YAML `spec.predictor.containerConcurrency: 10`)
  - "KServe by default sets `minReplicas` to 1. If you want to enable scaling down to zero, especially for use cases like serving on GPUs, you can set `minReplicas` to 0"
  - "The default for `scaleMetric` is `concurrency` and possible values are `concurrency`, `rps`, `cpu`, and `memory`."
- Knative defaults (docs main, docs/versioned/serving/autoscaling/): https://knative.dev/docs/serving/autoscaling/kpa-specific/ , /concurrency/ , /scale-to-zero/ | verified
  - stable-window Default `60s` (range 6s to 1h). "When scaling to zero Replicas, the last Replica will only be removed after there has not been any traffic to the Revision for the entire duration of the stable window."
  - panic-window-percentage Default `10.0` ("in panic mode the window will be 10% of the stable window size", i.e. 6 s).
  - panic-threshold-percentage Default `200.0`: "panic mode will be started if traffic is twice as high as the current replica population can handle." "When using panic mode, the Revision will not scale down to avoid churn."
  - Soft limit container-concurrency-target-default Default "100"; hard limit containerConcurrency default 0 = no limit; "If both a soft and a hard limit are specified, the smaller of the two values will be used."
  - target utilization container-concurrency-target-percentage Default `70`: "if `containerConcurrency` is set to 10, and the target utilization value is set to 70 (percent), the Autoscaler will create a new replica when the average number of concurrent requests across all existing replicas reaches 7."
  - scale-to-zero-grace-period Default `30s` (network programming bound, not retention); scale-to-zero-pod-retention-period Default `0s`.

## 3. KEDA and Kubernetes HPA

KEDA latest: v2.21.0 (published 2026-09-23). Docs: https://keda.sh/docs/2.21/reference/scaledobject-spec/ (source kedacore/keda-docs main content/docs/2.21/reference/scaledobject-spec.md) | verified
- pollingInterval: "Optional. Default: 30 seconds". "By default, KEDA will check each trigger source on every ScaledObject every 30 seconds"
- cooldownPeriod: "Optional. Default: 300 seconds". "The period to wait after the last trigger reported active before scaling the resource back to 0, in seconds. By default, it's 300 (5 minutes)." and "the KEDA `cooldownPeriod` only applies when scaling to 0; scaling from 1 to N replicas is handled by the Kubernetes Horizontal Pod Autoscaler."
- initialCooldownPeriod: Default 0 seconds. minReplicaCount: "Default: 0". maxReplicaCount: "Default: 100". idleReplicaCount: "must be less than minReplicaCount".
- HPA poll inside KEDA: "While scaling from 1 to N, on top of KEDA, the HPA will also poll regularly for metrics, based on the `--horizontal-pod-autoscaler-sync-period` parameter ... which by default is 15 seconds."
- fallback: after `failureThreshold` consecutive scaler failures, KEDA returns a normalised metric so the HPA holds `fallback.replicas`.
- KEDA two phases (https://keda.sh/docs/2.21/concepts/scaling-deployments/#activating-and-scaling-thresholds): "Activation phase: ... decide if the workload should be scaled from/to zero ... only applies to 0<->1 scaling." "Scaling phase: ... it is the HPA controller who takes the scaling decisions ... This phase applies the to 1<->N scaling." | verified
- Prometheus scaler (https://keda.sh/docs/2.21/scalers/prometheus/) | verified. Example verbatim:
```yaml
triggers:
- type: prometheus
  metadata:
    # Required fields:
    serverAddress: http://<prometheus-host>:9090
    query: sum(rate(http_requests_total{deployment="my-deployment"}[2m])) # Note: query must return a vector/scalar single element response
    threshold: '100.50'
    activationThreshold: '5.5'
```
  - "`threshold` - Value to start scaling for. (This value can be a float)"
  - "`activationThreshold` - Target value for activating the scaler. ... (Default: `0`, Optional, This value can be a float)"
  - "`ignoreNullValues` ... (Values: `true`,`false`, Default: `true`, Optional)"
  - Note: the threshold is used as an HPA AverageValue target (per-pod), so desired replicas = ceil(query_value / threshold). [Inference from KEDA behaviour; KServe doc example "6 concurrent requests with our target of 2 ... scale to 3 replicas" matches.] | partly verified

Kubernetes HPA (docs main, https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/ ; Kubernetes current release line 1.37 per kubernetes/website schedule.yaml) | verified
- Sync period: "The interval is set by the `--horizontal-pod-autoscaler-sync-period` parameter to the `kube-controller-manager` (and the default interval is 15 seconds)."
- Algorithm: "desiredReplicas = ceil[currentReplicas * (currentMetricValue / desiredMetricValue)]". "The control plane skips any scaling action if the ratio is sufficiently close to 1.0 (within a configurable tolerance, 0.1 by default)."
- Tolerance: "If you don't set this field, the HPA applies the default cluster-wide tolerance of 10%." Per-HPA `behavior.scaleUp.tolerance` is behind feature gate HPAConfigurableTolerance.
- Default behavior (verbatim YAML from doc):
```yaml
behavior:
  scaleDown:
    stabilizationWindowSeconds: 300
    policies:
    - type: Percent
      value: 100
      periodSeconds: 15
  scaleUp:
    stabilizationWindowSeconds: 0
    policies:
    - type: Percent
      value: 100
      periodSeconds: 15
    - type: Pods
      value: 4
      periodSeconds: 15
    selectPolicy: Max
```
- "For scaling down the stabilization window is _300_ seconds (or the value of the `--horizontal-pod-autoscaler-downscale-stabilization` command line option, if provided)." "For scaling up there is no stabilization window. ... There are 2 policies where 4 pods or a 100% of the currently running replicas may at most be added every 15 seconds till the HPA reaches its steady state."

## 4a. GKE "Best practices for autoscaling large language model (LLM) inference workloads with GPUs on Google Kubernetes Engine (GKE)"
URL: https://cloud.google.com/kubernetes-engine/docs/best-practices/machine-learning/inference/autoscaling | page "Last updated 2026-10-02 UTC." | verified (fetched 2026-10-04)
- Recommended server metrics: "Queue Size: The number of requests awaiting processing in the server queue. Use queue size to maximize throughput and minimize cost within a certain target latency threshold." / "Batch Size: The number of requests undergoing inference. Use batch size to reach lower target latency thresholds than queue size." / "These metrics are often resilient to performance and traffic fluctuations, making them a reliable starting point for autoscaling across diverse GPU hardware setups."
- Why GPU utilization is a bad signal (table, GPU Utilization DCGM_FI_DEV_GPU_UTIL): "Measures the duty cycle, which is the amount of time that the GPU is active." Limitation: "Does not measure how much work is being done while the GPU is active. This makes it difficult to map inference based performance metrics, such as latency and throughput, to a GPU Utilization threshold."
- Why GPU memory is a bad signal (DCGM_FI_DEV_FB_USED): "For workloads that preallocate GPU memory or never deallocate memory (such as workloads running on TGI and vLLM), this metric only works for scaling up, and won't scale down when traffic decreases."
- CPU: "For inference workloads running on GPUs, we don't recommend CPU and memory utilization as the only indicators ... using CPU metrics alone for autoscaling can lead to suboptimal performance and costs."
- Queue size reasoning: "Queue size directly correlates to request latency. Incoming requests queue up in the model server before they are processed, and this queue time adds to overall latency." "Queue size is a sensitive indicator of load spikes, as increased load quickly fills the queue." "largely workload-agnostic, because queue size is independent of request size, model, or hardware." "vLLM and TGI use continuous batching, which maximizes concurrent requests and keeps the queue low when batch space is available. The queue grows noticeably when batch space is limited, so use the growth point as a signal to initiate scale-up."
- Queue threshold: "start with a value between 3-5 and gradually increase it until requests reach the preferred latency." "For thresholds under 10, fine-tune HPA scale-up settings to handle traffic spikes." Tolerance: "defaults to a 0.1 no-action range around the target value to dampen oscillation."
- Queue limitation: "Queue size doesn't directly control concurrent requests, so its threshold can't guarantee lower latency than the max batch size allows."
- Batch size reasoning: "We recommend choosing batch size-based autoscaling if you have latency-sensitive workloads where queue-based scaling isn't fast enough". "Larger batch sizes increase throughput but also raise latency due to the prefill phase of some requests interrupting the decode phase of others in continuous batching model servers." Threshold: "set the initial target value slightly beneath this maximum and decrease it until the preferred latency is achieved." Limitation: "Varying request sizes and hardware constraints make finding the right batch size threshold challenging."
- HPA tuning: "Defaults are 5 minutes for scale-down (avoiding premature downscaling) and 0 for scale-up (ensuring responsiveness)."
- KV cache: NOT mentioned in the current (2026-10-02) version of this page. Claim "GKE recommends KV cache utilization" is unconfirmed for this page.
- Companion how-to (https://cloud.google.com/kubernetes-engine/docs/how-to/machine-learning/inference/autoscaling, last updated 2026-10-02) uses TGI metrics: HPA type Pods, metric `prometheus.googleapis.com|tgi_queue_size|gauge` (or `tgi_batch_current_size`), target type AverageValue. | verified

## 4b. vLLM production stack KEDA tutorial
URL: https://github.com/vllm-project/production-stack/blob/014d070e6f7611978d321bdb05cbe9a934b614e7/tutorials/20-keda-autoscaling.md (main @ 014d070, 2026-10-02; latest helm release vllm-stack-0.1.13, 2026-09-29) | verified
- "You'll configure KEDA to monitor queue length and dynamically adjust the number of replicas based on load."
- ScaledObject (tutorials/assets/keda-scaled-object.yaml): minReplicaCount 1, maxReplicaCount 2, pollingInterval 15, cooldownPeriod 360, trigger type prometheus, query `vllm:num_requests_waiting`, threshold '5'. Tutorial: "Scale up when the queue exceeds 5 requests"; HPA shows "`0/5 (avg)`".
- Scale-to-zero dual trigger: second trigger query `sum(rate(vllm:num_incoming_requests_total[1m]) > bool 0)` threshold "1" (router metric). "Scale-to-zero: Only occurs when both triggers are below their thresholds (no queue AND no traffic)". "This is a unique capability of KEDA compared to Kubernetes' HPA, which always maintains at least one replica."

## 4c. AIBrix autoscaler (latest release v0.7.0, 2026-06-18)
Doc: https://github.com/vllm-project/aibrix/blob/v0.7.0/docs/source/features/autoscaling/metric-based-autoscaling.rst | verified
- "AIBrix Autoscaler includes ... the Knative-based Kubernetes Pod Autoscaler (KPA), the native Kubernetes Horizontal Pod Autoscaler (HPA), and AIBrix's custom Advanced Pod Autoscaler (APA) tailored for LLM-serving."
- KPA: "maintains two time windows: a longer ``stable window`` and a shorter ``panic window``. It rapidly scales up resources in response to sudden spikes in traffic based on the panic window measurements. Unlike other solutions that might rely on Prometheus for gathering deployment metrics, AIBrix fetches and maintains metrics internally, enabling faster response times."
- APA: "similar as HPA but it has fluctuation parameter which acts as minimum buffer before triggering scaling up and down to prevent oscillation."
- "While HPA and KPA are widely used, they are not specifically designed and optimized for LLM serving". "AiBrix supports all the vllm metrics."
- Annotation defaults: max-scale-up-rate 2, max-scale-down-rate 2, scale-up/down-tolerance 0.1, KPA panic-threshold 2.0, scale-up-cooldown-window 0s, scale-down-cooldown-window 300s, scale-to-zero false.
- Samples (https://github.com/vllm-project/aibrix/blob/v0.7.0/samples/autoscaling/kpa.yaml and apa.yaml): PodAutoscaler (autoscaling.aibrix.ai/v1alpha1), scalingStrategy KPA or APA, metricsSources pod http port 8000 path metrics, `targetMetric: gpu_cache_usage_perc`, `targetValue: '0.5'`, min 1 max 8. Note: sample still uses the pre-0.9.2 vLLM metric name (removed from vLLM in 0.12). | verified
- Optimizer-based autoscaler (https://github.com/vllm-project/aibrix/blob/v0.7.0/docs/source/features/autoscaling/optimizer-based-autoscaling.rst): offline per-GPU profiling per input/output pattern plus SLO; "It proactively calculates the overall capacity needed for serving requests under SLO and ensures that the GPU capacity is fully used but not overloaded." Exposes `vllm:deployment_replicas` "Number of suggested replicas." to PodAutoscaler. | verified

## 4d. NVIDIA Dynamo Planner (latest release v1.5.0, 2026-09-21)
Doc source: https://github.com/ai-dynamo/dynamo/blob/v1.5.0/docs/fern/pages/developer-guide/knowledge-base/modular-components/planner/overview.md and planner-design.md (same folder) | verified
- Subtitle: "Autoscaler that adjusts prefill and decode replicas using engine performance models and traffic prediction to meet TTFT and ITL SLAs."
- Why not HPA: "Latency depends on request content, not just request count. A single request with a 32K-token prompt consumes orders of magnitude more compute than a short one."
- "Prefill and decode have different scaling characteristics. In disaggregated serving, prefill is compute-bound (scales with input length) while decode is memory-bound (scales with concurrent sequences and KV cache usage). A single replica count doesn't capture both."
- "HPA can't target 'keep P95 TTFT under 500ms' because that requires understanding the relationship between sequence lengths, GPU memory pressure, and latency."
- "Scaling decisions are expensive. Spinning up a GPU worker takes minutes, not seconds. ... The autoscaler needs to predict demand, not just react to it."
- optimization_target values: `throughput` (default) "scaling based on queue depth and KV cache utilization"; `latency` "Scales up at lower utilization thresholds"; `load` "user-defined prefill queue token and decode KV cache utilization thresholds"; `sla` "Targets specific TTFT/ITL SLA values" (requires ttft_ms, itl_ms).
- Two loops: throughput-based (predictive; load predictors ARIMA, Prophet, Kalman, Constant; "default 180s") and load-based (ForwardPassMetrics, "default 5s"). "When both modes are enabled, throughput-based scaling provides a capacity floor (long-term planning) while load-based scaling handles real-time adjustments above that floor."
- Design: throughput loop "gives scale-out enough time to complete before the predicted load arrives"; load loop handles "short-term overload, prediction or profiling error, runtime metadata changes such as KV hit rate or speculative accept length".
- KubernetesConnector "Directly PATCHes the DGD resource to update replica counts"; resolves prefill/decode services separately.

## 4e. llm-d autoscaling (Workload Variant Autoscaler, now deprecated in favour of plain KEDA)
- Repo renamed: github.com/llm-d/llm-d-workload-variant-autoscaler now redirects to https://github.com/llm-d/llm-d-autoscaling (main @ 3c06c88, 2026-09-21; last release v0.9.0, 2026-08-13). | verified
- README main: "The Workload-Variant-Autoscaler (WVA) is deprecated ... The last supported code, manifests, and docs are on the `release-0.9` branch, released as `v0.9.0`." and "Autoscaling for llm-d is driven by KEDA reading inference metrics (queue depth, KV-cache utilization, and other vLLM/EPP signals) straight from Prometheus and scaling model-server Deployments through the HPA it manages. No custom controller sits in that path." | https://github.com/llm-d/llm-d-autoscaling/blob/3c06c8814bcde4f7da0c7b4fadeed015e135a9de/README.md | verified. NOTE: KServe LLMInferenceService docs (2026-08-31) still document WVA; flag the tension.
- Recommended PD-disaggregation KEDA blueprint (benchmark/config/scenarios/guides/pd-disaggregation.yaml @ 3c06c88): per role (prefill, decode), two prometheus triggers: `max(vllm:num_requests_waiting{model_name=...,role="prefill"})` threshold "20", and `max(vllm:kv_cache_usage_perc{...,role="prefill"})` threshold "0.95" (metricType AverageValue, activationThreshold "0"); maxReplicas 4; scaleUp stabilization 0 with 1 Pod per 180 s; scaleDown stabilization 300 with 1 Pod per 300 s. | verified
- WVA v0.9 (release-0.9 README, https://github.com/llm-d/llm-d-autoscaling/blob/release-0.9/README.md): "a Kubernetes-based global autoscaler for inference model servers serving LLMs ... It determines optimal replica counts for a given request traffic load by considering constraints such as GPU availability, energy budget, and performance budget (latency/throughput)." Variants: "multiple model servers in an InferencePool that all serve the same base model but differ in hardware configuration (e.g., GPU type), serving configuration (e.g., tensor parallelism, max batch size, quantization), or both." "P/D disaggregation: prefill is one variant, decode is another". "Capacity model obtains KV cache utilization and queue depth to determine desired replica counts". "Cost Optimization: Minimizes infrastructure costs by picking the correct accelerator variant". | verified

## 5. Cold starts

### 5a. vLLM sleep mode
- Doc at v0.30.0: https://github.com/vllm-project/vllm/blob/v0.30.0/docs/features/sleep_mode.md | verified
  - "vLLM's Sleep Mode allows you to temporarily release most GPU memory used by a model, including model weights and KV cache, without stopping the server or unloading the Docker container."
  - "Offloads model weights to CPU RAM and discards KV cache, releasing up to 90%+ of GPU memory for other tasks."
  - "Level 1 sleep will offload the model weights and discard the KV cache. ... Level 2 sleep will discard both the model weights and the KV cache". Enabled with `enable_sleep_mode=True` (offline) / sleep and wake_up HTTP endpoints. "This feature is now supported on CUDA and ROCm platform."
- vLLM blog "Sleep mode" 2025-10-26 (authors Vensen Mu, Jeff Aw, Jun Kang Chow, Tun Jian Tan, Pin Siang Tan, Amir Balwel, Ye Hur Cheong, Zhiyao Cen, Kaichao You), benchmarks on vLLM 0.11.0, cudagraph_mode FULL_AND_PIECEWISE. URL https://vllm.ai/blog/2025-10-26-sleep-mode (old blog.vllm.ai URL redirects) | verified
  - "Reload models on-demand → 30-100+ seconds per switch (slow, wasteful)"
  - "Both levels are 18-200x faster than full reload"
  - Cold start cost table (verbatim rows): "1. VRAM load time: Copying weights to GPU"; "2. Memory allocator setup: CUDA allocator initialization"; "3. CUDA graph capture: Record execution graphs"; "4. GPU kernel JIT compilation: DeepGEMM, FlashInfer, TorchInductor"; "5. Cache warm-up: First-request overhead". "Even with instant weight loading, every cold start pays hidden costs that Sleep Mode avoids".
  - "benchmarks show Sleep Mode inference is 61-88% faster than cold starts." "First inference is 4-7x slower (see benchmarks: 0.92s wake vs 3.72s cold start)".
  - A100 TP=1, Qwen3-0.6B (A) / Phi-3-vision-128k-instruct (B) switching: No Sleep total 357.1s; Level 1 112.6s, wake 0.26s / 0.82s; Level 2 124.6s, wake 0.85s / 2.58s. 
  - A4000: "Wake times are incredibly fast (~0.1-0.8s), achieving 58-203x speedup vs cold starts"; "Total time savings: 62% (85s vs 226s for 5 model switches)".
  - Large models (A100, Qwen3-235B-A22B TP=4, Qwen3-Coder-30B-A3B): "~3-6s for large models" wake; text also says "Waking a sleeping model is 18-20x faster than loading a fresh vLLM instance." (A100 chart).

### 5b. Weight loading: Run:ai Model Streamer, fastsafetensors, vLLM load formats
- NVIDIA Technical Blog "Reducing Cold Start Latency for LLM Inference with NVIDIA Run:ai Model Streamer", 2025-09-16, authors Omer Dayan, Noa Neria, Ekin Karabulut. URL https://developer.nvidia.com/blog/reducing-cold-start-latency-for-llm-inference-with-nvidia-runai-model-streamer/ | verified (numbers grep-checked in page text)
  - Setup: "Experiments were run on an AWS g5.12xlarge instance with NVIDIA A10G GPUs"; Llama 3 8B, 15 GB single safetensors file.
  - Load times (s): GP3 SSD: Model Streamer (concurrency 16) 14.34, HF Safetensors Loader 47.99, Tensorizer (16 workers) 16.11. IO2 SSD: Streamer (conc 8) 7.53, HF 47, Tensorizer 10.36. S3: Streamer (conc 32) 4.88, Tensorizer 37.36.
  - Total vLLM readiness (s): GP3 35.08 / 66.13 / 36.19; IO2 28.28 / 62.69 / 30.88; S3 Streamer 23.18 vs Tensorizer 65.18. Quote: "On S3, Model Streamer achieved 23.18 seconds total readiness, while Tensorizer required 65."
  - Teaching point: even with weights loaded in ~5 s, readiness is ~23 s, the rest being engine init (allocator, CUDA graphs, compile).
- fastsafetensors paper: "Speeding up Model Loading with fastsafetensors", arXiv 2505.23072v1, 2025-05-29. https://arxiv.org/abs/2505.23072 | verified
  - "machine learning code often deserializes each parameter as a tensor object in host memory before copying it to device memory. We found that this approach underutilized storage throughput". "Our approach first copies groups of on-disk parameters to device memory, where they are directly instantiated as tensor objects." "parallelized copying, peer-to-peer DMA, and GPU offloading". "Experimental results show performance improvements of 4.8x to 7.5x in loading models such as Llama (7, 13, and 70 billion parameters), Falcon (40 billion parameters), and the Bloom (176 billion parameters)."
- vLLM v0.30.0 `--load-format` options (vllm/config/load.py and model_loader/__init__.py at tag): auto, safetensors, fastsafetensors, instanttensor ("distributed loading with pipelined prefetching and fast direct I/O"), ipc_cache ("map post-quantized weights from a local weight cache daemon via CUDA IPC for fast engine restarts"), tensorizer ("CoreWeave's tensorizer library"), runai_streamer, runai_streamer_sharded, sharded_state, modelexpress. Run:ai doc: "Run:ai Model Streamer is a library to read tensors in concurrency, while streaming it to GPU memory." Usage `vllm serve ... --load-format runai_streamer`. | https://github.com/vllm-project/vllm/blob/v0.30.0/vllm/config/load.py | verified

### 5c. Image pull, node disks, snapshots, model caches
- GKE Image streaming (https://cloud.google.com/kubernetes-engine/docs/how-to/image-streaming, last updated 2026-10-02) | verified
  - "GKE streams data from eligible images as requested by your applications. You can use Image streaming to allow your workloads to initialize without waiting for the entire image to download". "Without Image streaming, GKE downloads the entire container image onto each node".
  - Example: "In this example output, GKE needed almost 24 seconds. With Image streaming enabled, GKE only needed 1.5 seconds to pull the image data that the workload required to start." (gb-frontend sample, not an LLM image)
- GKE secondary boot disks (https://cloud.google.com/kubernetes-engine/docs/how-to/data-container-image-preloading, last updated 2026-10-02) | verified
  - "improve workload startup latency by using secondary boot disks ... to preload data or container images on new nodes. This enables workloads to achieve a fast cold start". "preload them with data, such as a machine learning (ML) model, or a container image." "Adding secondary boot disks to your node pools does not normally increase the node provisioning time. GKE provisions secondary boot disks from the disk image in parallel with the node provisioning process." No numeric benchmark on this page.
- KServe LocalModelCache (https://github.com/kserve/website/blob/71c8b22a05d6be72560b2cc326865930063cd0e8/docs/model-serving/generative-inference/modelcache/localmodel.md) | verified
  - "By caching LLM models locally, the `InferenceService` startup time can be greatly improved. For deployments with more than one replica, the local persistent volume can serve multiple pods with the warmed up model cache."
  - CRDs: LocalModelCache (cluster-scoped), LocalModelNamespaceCache, LocalModelNodeGroup, LocalModelNode; uses node-local NVMe; "By default, model caching is disabled in KServe." No numbers given.
- Modal "GPU memory snapshots" blog, 2025-07-30, Luis Capelo and Colin Weld. https://modal.com/blog/gpu-mem-snapshots | verified (text grep-checked)
  - "vLLM running Qwen2.5-0.5B-Instruct would previously take 45s (P0) to startup and now takes 5s (P0)."
  - "Parakeet ... would take about 20s (P0) to cold boot. Using GPU memory snapshots, the same Function can now take as low as 2s (P0)."
  - "A fully-loaded ViT inference function that previously took 8.5s (P0) seconds with CPU-only snapshots and torch.compile now takes 2.25s (P0). We entirely skip the torch.compile operation and use the compiled artifacts."
  - "GPU memory snapshots are available in alpha at Modal." (at publication)
- Synthesis (for the page; components of a GPU pod cold start, each sourced above): (1) node provisioning when no free GPU node (Dynamo: "Spinning up a GPU worker takes minutes, not seconds"), (2) container image pull (GKE image streaming 24 s to 1.5 s example), (3) weight download/load (Run:ai: 47.99 s HF loader vs 4.88 to 14.34 s streamer for 15 GB), (4) engine init: allocator, CUDA graph capture, kernel JIT / torch.compile (vLLM sleep blog table), (5) first-request warm-up. BentoML / Anyscale measurements: not gathered (unconfirmed).

## 6. Spot / preemptible GPUs
- AWS EC2 (https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html, fetched 2026-10-04) | verified
  - "A Spot Instance interruption notice is a warning that is issued two minutes before Amazon EC2 stops or terminates your Spot Instance." "We recommend that you check for these interruption notices every 5 seconds." "Interruption notices are emitted on a best effort basis." Delivered "as an EventBridge event and as items in the instance metadata". Hibernation: no two-minute warning.
- GCP Compute Engine Spot VMs (https://cloud.google.com/compute/docs/instances/spot, last updated 2026-10-02) | verified. NOTE: the notice is now configurable, not simply 30 s.
  - "up to 91% discounts for many machine types, GPUs, TPUs, and Local SSDs".
  - Preemption notice via metadata `preempted` = TRUE; "The preemption notice duration ... can be set to one of the following values while you are creating a Spot VM: 120 seconds: We recommend setting the preemption notice duration to 120 seconds for any workloads that need a dedicated duration or longer than 30 seconds to handle preemption." and "0 seconds (default)".
  - "The shutdown period for Spot VMs is best effort and up to 30 seconds, which is shorter than the shutdown period for other instances." Then ACPI G3 Mechanical Off.
- Azure Spot VMs (https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms, ms.date 2026-02-06) | verified
  - "You can opt in to receive in-VM notifications through Azure Scheduled Events. These are delivered on a best effort basis up to 30 seconds prior to the eviction."
  - Eviction policy "Deallocate (default) or Delete".
- SkyServe (SpotHedge policy), EuroSys 2025, arXiv 2411.01438 v2 (2025-03-03). https://arxiv.org/abs/2411.01438 | verified
  - "SpotHedge intelligently spreads spot replicas across different regions and clouds to improve availability and reduce correlated preemptions, overprovisions cheap spot replicas than required as a safeguard against possible preemptions, and dynamically falls back to on-demand replicas when spot replicas become unavailable."
  - "SkyServe reduces cost by 43% on average while achieving high resource availability compared to using on-demand replicas. Additionally, SkyServe improves P50, P90, and P99 latency by 2.3x, 2.1x, 2.1x on average compared to other research and production systems."
- SpotServe, ASPLOS 2024, arXiv 2311.15566 (2023-11-27). https://arxiv.org/abs/2311.15566 | verified
  - "SpotServe dynamically adapts the LLM parallelization configuration for dynamic instance availability and fluctuating workload". Migration as "a bipartite graph matching problem, which uses the Kuhn-Munkres algorithm". "stateful inference recovery ... commits inference progress at a much finer granularity" to use the grace period.
  - "SpotServe can reduce the P99 tail latency by 2.4 - 9.1x compared with the best existing LLM serving systems ... saving 54% monetary cost compared with only using on-demand instances."

## 7. Serving metric definitions

### TTFT, ITL, TPOT (vLLM benchmark doc v0.30.0) https://github.com/vllm-project/vllm/blob/v0.30.0/docs/benchmarking/cli.md | verified
- "Metric terminology is not standardized across benchmarking tools. When comparing results, use the measurement points and formulas rather than the metric names alone."
- "Time to first token (TTFT) is the time from sending a request to receiving its first streamed output."
- "Inter-token latency (ITL) records the time between consecutive streamed outputs."
- "Time per output token (TPOT) is calculated once per request, excluding the first token": TPOT = (end-to-end latency - TTFT) / (number of output tokens - 1).
- Speculative decoding example: "the benchmark observes two 40 ms ITL samples ... mean ITL is 40 ms. TPOT is `(180 ms - 100 ms) / (5 - 1) = 20 ms/token`."

### Goodput (DistServe, OSDI 2024), arXiv 2401.09670 v3 (2024-06-06). https://arxiv.org/abs/2401.09670 | verified
- Definition: "maximize per-GPU goodput, defined as the maximum request rate that can be served adhering to the SLO attainment goal (say, 90%) for each GPU provisioned - higher per-GPU goodput directly translates into lower cost per query." (original dash replaced by a hyphen)
- Throughput contrast: existing systems "maximize the overall system throughput - tokens generated per second across all users and requests".
- Worked example (13B model, one A100, 90% SLO attainment): colocated goodput "about 1.6 requests per second (rps)"; prefill-only 5.6 rps, decode-only 10 rps; "by allocating 2 GPUs for prefill and 1 GPU for decoding, we can effectively serve the model with an overall goodput of 10 rps, or equally 3.3 rps per GPU, which is 2.1x higher than existing systems."
- Abstract: "DistServe can serve 7.4x more requests or 12.6x tighter SLO, compared to state-of-the-art systems, while staying within latency constraints for > 90% of requests."

### OpenTelemetry GenAI semantic conventions
- MOVED: as of semantic-conventions v1.44.0 (2026-08-04), docs/gen-ai/gen-ai-metrics.md says "GenAI semantic conventions have moved to the OpenTelemetry GenAI semantic conventions repository" (https://github.com/open-telemetry/semantic-conventions-genai). | verified
- Current doc: https://github.com/open-telemetry/semantic-conventions-genai/blob/e07f4ebacb08f56db8c4c882d117720333fbca04/docs/gen-ai/gen-ai-metrics.md (main @ e07f4eb, 2026-10-02; no releases tagged; manifest schema_url gen-ai-dev/1.42.0-dev, "stability: development", depends on semconv v1.44.0). Document "**Status**: Development"; every metric badge is "development". | verified
- Server metrics (all Histogram, unit s, Development):
  - `gen_ai.server.request.duration`: "Generative AI server request duration such as time-to-last byte or last output token."
  - `gen_ai.server.time_per_output_token`: "Time per output token generated after the first token for successful responses."
  - `gen_ai.server.time_to_first_token`: "Time to generate first token for successful responses."
- Client metrics: `gen_ai.client.operation.duration` (Histogram, s) "GenAI operation duration."; new `gen_ai.client.operation.time_to_first_chunk` and `gen_ai.client.operation.time_per_output_chunk` (Histogram, s).
- Token metrics: `gen_ai.client.token.usage` (Histogram, {token}, in semconv v1.37.0 https://github.com/open-telemetry/semantic-conventions/blob/v1.37.0/docs/gen-ai/gen-ai-metrics.md) is no longer defined in the genai repo's model/gen-ai/metrics.yaml; current doc gen-ai-token-metrics.md defines Counters `gen_ai.client.inference.usage.input_tokens`, `.output_tokens`, `.cache_read.input_tokens`, `.cache_write.input_tokens`, `.reasoning.output_tokens` and Histograms `gen_ai.client.inference.operation.input_tokens` / `.output_tokens`. Quote: "Usage (`gen_ai.client.inference.usage.*` counters) are the primary instruments for measuring token consumption." | verified (presence/absence); exact deprecation note for token.usage unconfirmed

## 8. Little's law and MLPerf latency constraints

### Little's law
- Original: J. D. C. Little, "A Proof for the Queuing Formula: L = λW", Operations Research 9(3):383-387, June 1961, DOI 10.1287/opre.9.3.383 | verified via Crossref API
- Applied to LLM serving, llm-d WVA queueing model (release-0.9, docs/developer-guide/slo-queuemodel.md): https://github.com/llm-d/llm-d-autoscaling/blob/release-0.9/docs/developer-guide/slo-queuemodel.md | verified
  - "With `n` concurrent requests, the iteration time is: T_iter(n) = α + n × δ"
  - "By Little's Law, the average number of concurrent requests is `n = λ × (o_l + 1) × T_iter`." Closed form "T_iter = α / (1 - ρ) where ρ = λ × (o_l + 1) × δ". "The system is stable when ρ < 1. As ρ → 1, `T_iter` diverges, this is the fundamental capacity limit of a single replica." (original dash replaced by a comma)
  - "TTFT = T_iter + (β + γ) × i_l" (residual wait for current iteration plus prefill work).
- NVIDIA Dynamo planner decode perf model (v1.5.0, components/src/dynamo/planner/core/perf_model/decode.py): "Find the maximum decode engine request rate within an ITL target." "Request rate is derived via Little's law: ``engine_rps = best_batch_size / (osl * wall_time_per_iter)``." Batch upper bound: "``max_kv_tokens / context_length`` -- KV cache capacity" and "``max_num_seqs`` -- engine concurrency limit". https://github.com/ai-dynamo/dynamo/blob/v1.5.0/components/src/dynamo/planner/core/perf_model/decode.py | verified
- AIBrix v0.7.0 pkg/cache/pending_load_provider.go: "PendingLoad = 1 / PendingRequests = 1 / (Throughput * Latency), where PendingRequests = Throughput * Latency follows Little's Law" | https://github.com/vllm-project/aibrix/blob/v0.7.0/pkg/cache/pending_load_provider.go | verified
- Worked use for the page (derived, not quoted): concurrency L = arrival rate λ x mean latency W, so 10 req/s with 8 s mean e2e latency means ~80 requests in flight; divide by per-replica sustainable batch to size replicas.

### MLPerf Inference rules (mlcommons/inference_policies inference_rules.adoc, master @ ff7edba, 2026-08-20). https://github.com/mlcommons/inference_policies/blob/ff7edba545fded369e7e7e3d5a2f0bab4a95eece/inference_rules.adoc | verified
- Scenario table: "Server/Interactive | LoadGen sends new queries to the SUT according to a Poisson distribution | 600 seconds | 1 | Benchmark specific | 99%* | Maximum Poisson throughput parameter supported" (tail-latency percentile 99%).
- Footnote: "For LLM benchmarks, 2 latency metrics are collected - time to first token (TTFT) which measures the latency of the first token, and time per output token (TPOT) which measures the average interval between all the tokens generated."
- Llama2-70b (OpenOrca): "Conversational category: TTFT/TPOT: 2000 ms/200 ms. Interactive category: TTFT/TPOT: 450 ms/40 ms." (the old "Server" scenario is labelled "Conversational" in current rules)
- Llama3.1-8B: Conversational 2000 ms/100 ms; Interactive 500 ms/30 ms.
- Llama3.1-405B: Server 6000 ms/175 ms; Interactive 4500 ms/80 ms.
- Mixtral-8x7B: 2000 ms/200 ms. DeepSeek-r1: Server 2000 ms/80 ms; Interactive 1500 ms/15 ms. GPT-OSS-120B: Server 3000 ms/80 ms; Interactive 2000 ms/20 ms.
- Round versioning: rules file on master is not round-tagged; latest mlcommons/inference code release tag is v5.1.1 (2025-10-28). Which round first introduced Llama2-70b interactive (believed v5.0, 2025) is unconfirmed here.

## 9. Priority and fairness

### vLLM priority scheduling (v0.30.0) | verified
- Config (https://github.com/vllm-project/vllm/blob/v0.30.0/vllm/config/scheduler.py L141): `policy: SchedulerPolicy = "fcfs"`; ""fcfs" means first come first served, i.e. requests are handled in order of arrival." ""priority" means requests are handled based on given priority (lower value means earlier handling) and time of arrival deciding any ties)." CLI flag `--scheduling-policy` (vllm/engine/arg_utils.py L1615).
- Request field (vllm/entrypoints/openai/chat_completion/protocol.py L381): `priority` default 0: "The priority of the request (lower means earlier handling; default: 0). Any priority other than 0 will raise an error if the served model does not use priority scheduling."
- Preemption (vllm/v1/core/sched/scheduler.py ~L745): when KV blocks cannot be allocated, "# Preempt the lowest-priority request." Under PRIORITY: `preempted_req = max(self.running, key=lambda r: (r.priority, r.arrival_time))` (largest priority value, latest arrival); under FCFS: `self.running[-1]` (most recently added).

### Fairness in Serving LLMs (Virtual Token Counter, VTC), OSDI 2024; arXiv 2401.00588 v2 (2024-06-05). https://arxiv.org/abs/2401.00588 | verified
- Problem: "most major LLM inference services have request rate limits, to ensure that no client can dominate the request queue. However, this rudimentary notion of fairness also results in under-utilization of the resources and poor client experience when there is spare capacity."
- Definition: "the definition of LLM serving fairness based on a cost function that accounts for the number of input and output tokens processed." Cost W(t1,t2) = w_p * n_p + w_q * n_q; experiments: "Following OpenAI pricing, we set w_p=1 and w_q=2."
- Mechanism: per-client virtual counter (like Linux CFS vruntime); "The request from the client with the smallest counter will be scheduled each time." Built on continuous batching; work-conserving.
- Guarantee: "We prove a 2x tight upper bound on the service difference between two backlogged clients"; formally |W_f(t1,t2) - W_g(t1,t2)| <= 2 max(w_p * L_input, w_q * M) (M = max tokens in a batch).
- Rate-limit comparison numbers: "cluster-wise throughput is ≈340 output tokens per second when RPM=5, as opposed to ≈779 tokens per second in VTC or FCFS". Code: https://github.com/Ying1123/VTC-artifact (built on S-LoRA/LightLLM per paper; not re-verified).
