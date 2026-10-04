# ML system design research: LLM and ML services (architecture facts)

Note: WebSearch budget for the session was exhausted; all facts below come from direct WebFetch of known URLs. "verified" = quote read on the fetched page.

## 1. Uber Michelangelo

- Topic: Michelangelo feature store size
  - Fact: about 10,000 features in the shared Feature Store (2017)
  - Quote: "approximately 10,000 features in Feature Store that are used to accelerate machine learning projects"
  - URL: https://www.uber.com/blog/michelangelo-machine-learning-platform/
  - Date: 2017-09-05
  - Status: verified
- Topic: online features in Cassandra
  - Quote: "features needed for online models to be precomputed and stored in Cassandra where they can be read at low latency"
  - URL/date as above; verified
- Topic: online vs offline serving
  - Quote: "In the case of online models, the prediction is returned to the client service over the network. In the case of offline models, the predictions are written back to Hive"
  - verified
- Topic: latency
  - Quote: "In the case of a model that does not need features from Cassandra, we typically see P95 latency of less than 5 milliseconds"; "models that do require features from Cassandra, we typically see P95 latency of less than 10ms"
  - verified
- Topic: throughput
  - Quote: "The highest traffic models right now are serving more than 250,000 predictions per second"
  - verified
- Topic: Michelangelo 2019 model representation
  - Fact: moved to native Spark ML pipelines with an OnlineTransformer interface (batch via Datasets, single-row "scoreInstance" for online); load time cut from 8x--44x to 2x--3x slower than custom protobuf
  - Quote: "reduce native Spark model load time for our benchmark examples from 8x-44x to only 2x-3x slower than loading from our custom protobuf"
  - URL: https://www.uber.com/blog/michelangelo-machine-learning-model-representation/ ("Evolving Michelangelo Model Representation for Flexibility at Scale")
  - Date: 2019-10-16; verified (no Palette mention in this post)
- Topic: Michelangelo 2024 scale and Palette
  - Fact: 5,000+ production models, 10 million real-time predictions/s at peak, ~400 active projects, 20,000+ monthly training jobs, 20,000 features in Palette; 60%+ of tier-1 models adopted DL (2019--2023 phase)
  - Quote (summary-level from fetch, numbers verified on page): "5,000+ production models", "10 million real-time predictions per second at peak", "20,000 features" in Palette
  - URL: https://www.uber.com/blog/from-predictive-to-generative-ai/
  - Date: 2024-05-02; verified (numbers); exact sentence wording paraphrased by fetch tool, re-check before quoting verbatim
- Topic: Michelangelo GenAI Gateway capabilities (2024 overview post)
  - Quote: "Logging and auditing: Ensuring comprehensive tracking and accountability"; "Cost guardrails and attribution: Managing expenses while attributing usage"; "Personal identifiable information (PII) Redaction"
  - URL: https://www.uber.com/blog/from-predictive-to-generative-ai/ ; 2024-05-02; verified

## 2. GenAI gateways and LLM serving accounts

- Topic: Uber GenAI Gateway
  - Title: "Navigating the LLM Landscape: Uber's Innovation with GenAI Gateway"
  - URL: https://www.uber.com/blog/genai-gateway/ ; Date: 2024-07-11
  - Quote: "A pivotal design decision was to mirror the HTTP/JSON interface of the OpenAI API." (verified)
  - Quote: "Beyond its serving component, an integral facet of GenAI Gateway is the incorporation of a Personal Identifiable Information (PII) redactor." (verified)
  - Quote: "a PII redactor that anonymizes sensitive information within requests before forwarding them to third-party vendors" (verified)
  - Quote: "Today, GenAI Gateway is used by close to 30 customer teams and serves 16 million queries per month, with a peak QPS of 25." (verified)
  - Fact: Go service wrapping third-party vendor clients (OpenAI, Vertex AI) plus internal models; audit logs for "cost attribution, security audit purposes, quality evaluation" (verified)
  - Caveat: the post does NOT mention "fallback", "caching" or "rate limit" verbatim (checked); do not attribute those to it
- Topic: LinkedIn "Musings on building a Generative AI product"
  - Authors: Juan Pablo Bottaro and Karthik R.; Date: 2024-04-25
  - URL: https://www.linkedin.com/blog/engineering/generative-ai/musings-on-building-a-generative-ai-product
  - Fact: three-step pipeline: Routing (pick agent), Retrieval (internal APIs, search), Generation (verified)
  - Quote: "getting it 80% was fast, but that last 20% took most of our work" (verified); 95% quality took four more months (verified, paraphrase)
  - Fact: LLM produced invalid YAML about 10% of the time; defensive YAML parser cut errors "to ~0.01%" (verified)
  - Fact: evaluation scaled to 500 daily conversations; trade-offs between CoT quality, latency, GPU capacity (verified, paraphrase)
- Topic: OpenAI "Scaling PostgreSQL to power 800 million ChatGPT users"
  - URL: https://openai.com/index/scaling-postgresql/ (direct fetch 403; read via r.jina.ai reader)
  - Date: January 2026 per brief; exact day unconfirmed from fetched text
  - Fact: single primary Azure PostgreSQL with nearly 50 read replicas across regions, millions of QPS (verified via reader)
  - Quote: "PostgreSQL load has grown by more than 10x"; "low double-digit millisecond p99 client-side latency and five-nines availability" (verified via reader)
  - Quote: cache locking so "only a single reader that misses on a particular key fetches the data" (thundering herd protection) (verified via reader)
  - Fact: workload isolation of "low-priority and high-priority" traffic onto separate instances; multi-layer rate limiting; PgBouncer cut connection time from 50 ms to 5 ms; shardable write-heavy work moved to Azure Cosmos DB (verified via reader)
- Topic: Anthropic postmortem (multi-hardware serving)
  - Title: "A postmortem of three recent issues"; URL: https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues ; Date: 2025-09-17
  - Quote: "We deploy Claude across multiple hardware platforms, namely AWS Trainium, NVIDIA GPUs, and Google TPUs." (verified)
  - Quote: "Despite these variations, we have strict equivalence standards for model implementations." (verified)
  - Quote: "The first bug was introduced on August 5, affecting approximately 0.8% of requests made to Sonnet 4." (verified)
  - Quote: "At the worst impacted hour on August 31, 16% of Sonnet 4 requests were affected." (verified)
  - Quote: "Approximately 30% of Claude Code users who made requests during this period had at least one message routed to the wrong server type, resulting in degraded responses." (verified)
  - Quote: "However, some users were affected more severely, as our routing is 'sticky'." (verified)
  - Quote: "To state it plainly: We never reduce model quality due to demand, time of day, or server load." (verified)
  - Quote: "The evaluations we ran simply didn't capture the degradation users were reporting, in part because Claude often recovers well from isolated mistakes." (verified)
  - Facts: bug 1 context-window routing (short requests sent to 1M-context servers); bug 2 TPU misconfiguration producing Thai/Chinese characters; bug 3 approximate top-k XLA:TPU miscompilation, fixed by switching to exact top-k and fp32 (verified, paraphrase)
- Topic: Character.AI "Optimizing AI Inference at Character.AI"
  - URL: https://blog.character.ai/optimizing-ai-inference-at-character-ai/ ; Date: 2024-06-20
  - Quote: "Character.AI serves around 20,000 queries per second – about 20% of the request volume served by Google Search, according to public sources." (verified; note the source uses a dash glyph, render as comma if quoting under no-em-dash rule)
  - Quote: "Since we launched Character.AI in 2022, we have reduced our serving costs by at least 33X." (verified)
  - Fact: "less than one cent per hour of conversation" (verified)
  - Unconfirmed: the technical details (multi-query attention, hybrid local/global attention, cross-layer KV sharing, KV cache reduced "more than 20X", 95% inter-turn cache rate, int8) were in the original research.character.ai/optimizing-inference post, which now redirects to the blog homepage; the current blog version did not contain these strings. Treat as unconfirmed in this pass.

## 3. Training-serving skew, feature stores

- Topic: Google "Rules of Machine Learning" (Martin Zinkevich)
  - URL: https://developers.google.com/machine-learning/guides/rules-of-ml ; date: original 2016 doc, page undated (unconfirmed exact date)
  - Definition: "Training-serving skew is a difference between performance during training and performance during serving. This skew can be caused by: A discrepancy between how you handle data in the training and serving pipelines. A change in the data between when you train and when you serve. A feedback loop between your model and your algorithm." (verified)
  - Rule #29: "The best way to make sure that you train like you serve is to save the set of features used at serving time, and then pipe those features to a log to use them at training time." (verified)
  - Rule #29 example: "YouTube home page switched to logging features at serving time with significant quality improvements and a reduction in code complexity" (verified)
  - Rule #31: "Beware that if you join data from a table at training and serving time, the data in the table may change." (verified)
  - Rule #32: "Re-use code between your training pipeline and your serving pipeline whenever possible." (verified)
  - Rule #37: "Measure Training/Serving Skew." (verified)
- Topic: Sculley et al., "Hidden Technical Debt in Machine Learning Systems", NIPS 2015 (NeurIPS 28)
  - URL: https://papers.nips.cc/paper_files/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html (PDF: .../file/86df7dcfd896fcaf2674f757a2463eba-Paper.pdf); Date: December 2015
  - Quote (Fig. 1 caption): "Only a small fraction of real-world ML systems is composed of the ML code, as shown by the small black box in the middle. The required surrounding infrastructure is vast and complex." (verified from PDF text)
  - Quote: "We refer to this here as the CACE principle: Changing Anything Changes Everything." (verified)
  - Quote: "a mature system might end up being (at most) 5% machine learning code and (at least) 95% glue code" (verified)
  - Quote: "Undeclared consumers are expensive at best and dangerous at worst, because they create a hidden tight coupling of model ma to other parts of the stack." (verified)
  - Quote: "Pipeline jungles can only be avoided by thinking holistically about data collection and feature extraction." (verified)
- Topic: Feast feature store
  - Latest release: v0.66.0, published 2026-08-21 (GitHub API, https://github.com/feast-dev/feast/releases) (verified)
  - Quickstart URL: https://docs.feast.dev/getting-started/quickstart (verified)
  - Quote: "Feast joins these tables with battle-tested logic that ensures point-in-time correctness so future feature values do not leak to models." (verified)
  - Code (verbatim from quickstart):
    ```python
    entity_df = pd.DataFrame.from_dict({
        "driver_id": [1001, 1002, 1003],
        "event_timestamp": [
            datetime(2021, 4, 12, 10, 59, 42),
            datetime(2021, 4, 12, 8, 12, 10),
            datetime(2021, 4, 12, 16, 40, 26),
        ],
        "label_driver_reported_satisfaction": [1, 5, 3],
    })
    store = FeatureStore(repo_path=".")
    training_df = store.get_historical_features(
        entity_df=entity_df,
        features=[
            "driver_hourly_stats:conv_rate",
            "driver_hourly_stats:acc_rate",
            "driver_hourly_stats:avg_daily_trips",
        ],
    ).to_df()
    ```
    ```bash
    CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S")
    feast materialize-incremental $CURRENT_TIME
    ```
    ```python
    feature_vector = store.get_online_features(
        features=[
            "driver_hourly_stats:conv_rate",
            "driver_hourly_stats:acc_rate",
            "driver_hourly_stats:avg_daily_trips",
        ],
        entity_rows=[{"driver_id": 1004}, {"driver_id": 1005}],
    ).to_dict()
    ```
- Topic: Tecton point-in-time correctness
  - URL: https://docs.tecton.ai/docs/reading-feature-data/reading-feature-data-for-training/constructing-training-data ; undated docs
  - Quote: "When training a model, data from before the prediction generation time is fair game, but data from after that moment should not be included." (verified)
  - Fact: implemented as AS OF (point-in-time) joins; each training event's timestamp must be the real prediction context time (impression, transaction), not collection time (verified, paraphrase)
- Topic: Databricks point-in-time joins
  - URL: https://docs.databricks.com/aws/en/machine-learning/feature-store/time-series ("Point-in-time feature joins"); undated docs
  - Quote: point-in-time correctness means "a training dataset that reflects feature values as of the time each label observation was recorded" (verified)
  - Quote: data leakage is "when you use feature values for model training that were not available at the time the label was recorded"; "This type of error can be hard to detect and can negatively affect the model's performance." (verified)
  - Example: a CO2 reading at 8:52 AM must not be joined to a label recorded at 8:50 AM (verified)

## 4. Batch scoring vs online inference; online/offline consistency

- Topic: DoorDash Sibyl prediction service
  - Title: "Meet Sibyl: DoorDash's New Prediction Service" (title per URL slug; exact title unconfirmed); author Cody Zeng; Date: 2020-06-29
  - URL: https://careersatdoordash.com/blog/doordashs-new-prediction-service/ (direct 403; read via r.jina.ai)
  - Quote: "over 100,000 predictions per second" in load testing (verified via reader)
  - Quote: "3x drop in latency (versus our old prediction service)" after fraud and dasher pay models moved in March 2020 (verified via reader)
  - Facts: request-level batch predictions (many feature sets per call), asynchronous shadow predictions for candidate models on the same data, models cached in memory at startup, features fetched from Redis per prediction; LightGBM and PyTorch via C++ native APIs over JNI; Kotlin coroutines; best batch size 100--200 per request (verified via reader, paraphrase)
- Topic: Uber Michelangelo batch vs online (see section 1): offline predictions "written back to Hive", online returned over the network (verified)
- Topic: Airbnb Chronon open source
  - URL: https://medium.com/airbnb-engineering/chronon-airbnbs-ml-feature-platform-is-now-open-source-d9c4dba859e8 (direct 403; read via r.jina.ai)
  - Date: April 2024 (exact day unconfirmed); repo https://github.com/airbnb/chronon latest tag v0.0.101 (2025-07-10)
  - Quote: users "define their features only once, powering both offline flows for model training as well as online flows for model inference" (verified via reader)
  - Quote: "Every feature computation is guaranteed to be window-accurate as of that timestamp." (backfills) (verified via reader)
  - Fact: consistency measurement compares "the logs of the online fetch requests" against "backfilled values to measure consistency" (verified via reader)
  - Quote: "We're excited to be making this announcement along with our partners at Stripe, who are early adopters and co-maintainers of the project." (verified via reader)
  - Motivation quote: practitioners "were spending the majority of their time managing the data that powers their models rather than on modeling itself" (verified via reader)

## 5. Embedding services

- Topic: Hugging Face Text Embeddings Inference (TEI)
  - Repo: https://github.com/huggingface/text-embeddings-inference ; latest release v1.9.4, published 2026-09-15 (GitHub API) (verified)
  - README features: "Token based dynamic batching"; "Optimized transformers code for inference using Flash Attention, Candle and cuBLASLt" (verified)
  - CLI docs URL: https://huggingface.co/docs/text-embeddings-inference/en/cli_arguments (verified, undated docs)
  - --max-batch-tokens (default 16384, env MAX_BATCH_TOKENS): "This represents the total amount of potential tokens within a batch." "For `max_batch_tokens=1000`, you could fit `10` queries of `total_tokens=100` or a single query of `1000` tokens." "Overall this number should be the largest possible until the model is compute bound." (verified)
  - --max-concurrent-requests (default 512): "Having a low limit will refuse clients requests instead of having them wait for too long and is usually good to handle backpressure correctly" (verified)
  - --max-batch-requests: "Optionally control the maximum number of individual requests in a batch" (no default) (verified)
  - --max-client-batch-size (default 32): "Control the maximum number of inputs that a client can send in a single request" (verified)
  - --auto-truncate defaults to true; payload limit default 2,000,000 bytes; Prometheus port default 9000 (verified)
- Topic: OpenAI embeddings models and cost
  - URL: https://developers.openai.com/api/docs/guides/embeddings (formerly platform.openai.com/docs/guides/embeddings); undated docs
  - text-embedding-3-small: 1536 dims, ~62,500 pages per dollar; text-embedding-3-large: 3072 dims, ~9,615 pages per dollar; max input 8192 tokens (verified)
  - Quote: "Usage is priced per input token." (verified)
  - Quote: developers "can shorten embeddings (i.e. remove some numbers from the end of the sequence) without the embedding losing its concept-representing properties" (verified)
  - Quote: "a `text-embedding-3-large` embedding can be shortened to a size of 256 while still outperforming an unshortened `text-embedding-ada-002` embedding with a size of 1536." (verified)
- Topic: OpenAI Batch API (bulk embedding backfills)
  - URL: https://developers.openai.com/api/docs/guides/batch ; undated docs
  - Quote: "50% cost discount compared to synchronous APIs"; 24-hour completion window (verified)
  - Facts: embeddings endpoint supported; up to 50,000 requests per batch (200 MB file); embedding batches capped at 50,000 total embedding inputs (verified, paraphrase)
- Topic: re-embedding when the model changes
  - Status: no primary-source post located in this pass (web search budget exhausted). Safe general statement for the page: vectors from different embedding models live in different spaces, so changing the model means re-embedding the whole corpus (a backfill, cheapest through the Batch API at 50% off) and usually dual-writing to a new index before cutover. Mark as reasoning, not a sourced quote.

## 6. Semantic caching

- Topic: GPTCache (Zilliz)
  - Repo: https://github.com/zilliztech/GPTCache ; latest release 0.1.44 published 2024-08-01 (GitHub API; project effectively dormant since) (verified)
  - README tagline: "Slash Your LLM API Costs by 10x 💰, Boost Speed by 100x ⚡" (marketing claim, verified as quoted)
  - Quote: GPTCache "employ[s] embedding algorithms to convert queries into embeddings and uses a vector store for similarity search on these embeddings." (verified)
  - Quote: "In a semantic cache, you may encounter false positives during cache hits and false negatives during cache misses." (verified)
  - Metrics named in README: hit ratio, latency, recall (verified)
- Topic: GPTCache paper
  - "GPTCache: An Open-Source Semantic Cache for LLM Applications Enabling Faster Answers and Cost Savings" (title from ACL page heading may be shortened; exact full title unconfirmed), Fu Bang, NLP-OSS 2023 workshop, pp. 212--218, December 2023, DOI 10.18653/v1/2023.nlposs-1.24
  - URL: https://aclanthology.org/2023.nlposs-1.24/
  - Fact: abstract says integrating with OpenAI's GPT service can make responses 2--10 times faster on a cache hit (verified, paraphrase)
- Topic: vCache (error rates of semantic caches)
  - "vCache: Verified Semantic Prompt Caching", Schroeder, Desai, Cuadron, Chu, Liu, Zhao, Krusche, Kemper, Zaharia, Gonzalez; arXiv 2502.03771, v1 2025-02-06
  - URL: https://arxiv.org/abs/2502.03771
  - Quote: "Existing systems use the same static similarity threshold across all requests to determine whether two prompts can share similar responses. However, we observe that static thresholds do not give formal correctness guarantees, result in unexpected error rates, and lead to suboptimal cache hit rates." (verified)
  - Quote: "It employs an online learning algorithm to estimate an optimal threshold for each cached prompt" (verified)
  - Quote: "up to 12.5× higher cache hit and 26× lower error rates" vs static-threshold and fine-tuned embedding baselines (verified)
- Topic: GPT Semantic Cache paper
  - "GPT Semantic Cache: Reducing LLM Costs and Latency via Semantic Embedding Caching", Sajal Regmi, Chetan Phakami Pun; arXiv 2411.05276, 2024-11-08
  - URL: https://arxiv.org/abs/2411.05276
  - Facts: API calls reduced by up to 68.8%; hit rates 61.6%--68.8%; "positive hit rates exceeding 97%" (i.e. about 3% of hits judged wrong) (verified)
- Topic: Redis LangCache
  - URL: https://redis.io/langcache/ (product page, undated; vendor marketing)
  - Fact: "fully-managed semantic caching solution" via REST API (verified)
  - Claims: headline "Save 90% on API costs"; customer example (Mangoes.ai) 70% cache hit rate, 70% savings on LLM spend, "it's 4X faster" (verified as vendor claims, not independent measurement)

## 7. ML system design interview framing and LLM app architecture

- Topic: Chip Huyen "Machine Learning Systems Design" booklet
  - URL: https://huyenchip.com/machine-learning-systems-design/toc.html (2019 booklet; exact date unconfirmed)
  - Fact: design section in four parts: Project setup, Data pipeline, Modeling (model selection, training incl. debugging, hyperparameter tuning, scaling), Serving; preceded by "Research vs production" (verified)
- Topic: ByteByteGo "Machine Learning System Design Interview" (Ali Aminian, Alex Xu, 2023)
  - URL: https://bytebytego.com/courses/machine-learning-system-design-interview/introduction-and-overview (course page is login-gated; content not retrievable)
  - Reference repo: https://github.com/ByteByteGoHq/ml-bytebytego (Chapter 1 "Introduction and Overview" references include shadow deployment, A/B testing, canary release) (verified)
  - 7-step list (clarifying requirements; framing the problem as an ML task; data preparation; model development; evaluation; deployment and serving; monitoring and infrastructure): UNCONFIRMED from a primary page in this pass (gated); widely cited, consistent with the book's Chapter 1, but not quoted verbatim here
- Topic: Alex Xu general system design framework (System Design Interview vol. 1, ch. 3 "A Framework for System Design Interviews")
  - URL: https://bytebytego.com/courses/system-design-interview/a-framework-for-system-design-interviews (read via r.jina.ai)
  - Steps and times for a 45-minute interview: Step 1 Understand the problem and establish design scope (3--10 min); Step 2 Propose high-level design and get buy-in (10--15 min); Step 3 Design deep dive (10--25 min); Step 4 Wrap up (3--5 min) (verified)
  - Quote: "Do not jump right in to give a solution. Slow down. Think deeply and ask questions to clarify requirements and assumptions." (verified)
  - Quote: "Time management is essential as it is easy to get carried away with minute details that do not demonstrate your abilities." (verified)
- Topic: Chip Huyen, AI Engineering (O'Reilly, 2025), Chapter 10 "AI Engineering Architecture and User Feedback"
  - ToC source: https://github.com/chiphuyen/aie-book/blob/main/ToC.md (verified)
  - Verbatim section titles: "Step 1. Enhance Context" (p. 450); "Step 2. Put in Guardrails" (p. 451); "Step 3. Add Model Router and Gateway" (p. 456); "Step 4. Reduce Latency with Caches" (p. 460); "Step 5. Add Agent Patterns" (p. 463); "Monitoring and Observability" (p. 465); "AI Pipeline Orchestration" (p. 472); "User Feedback" (p. 474) with "Extracting Conversational Feedback", "Feedback Design", "Feedback Limitations" (verified)
  - Book publication: January 2025 per general knowledge; exact date unconfirmed (O'Reilly page 403)
- Topic: Chip Huyen blog "Building A Generative AI Platform" (precursor of chapter 10)
  - URL: https://huyenchip.com/2024/07/25/genai-platform.html ; Date: 2024-07-25
  - Step quotes: "Enhance context input into a model by giving the model access to external data sources and tools for information gathering."; "Put in guardrails to protect your system and your users."; "Add model router and gateway to support complex pipelines and add more security."; "Optimize for latency and costs with cache."; "Add complex logic and write actions to maximize your system's capabilities." (verified; note the blog's step 5 wording differs from the book's "Add Agent Patterns")
  - Gateway: lets developers "access different models ... the same way"; "a centralized and controlled point of access"; "fine-grained access controls, specifying which user or application should have access to which model" (verified)
  - Gateway fallback: "When the primary API is unavailable, the gateway can route requests to alternative models, retry after a short wait, or handle failures in other graceful manners." (verified)
  - Gateway extras: "load balancing, logging, and analytics" (verified)
  - Router: "an intent classifier that predicts what the user is trying to do"; route "simpler queries to cheaper models" (verified)
  - Semantic cache: "Compared to other caching techniques, semantic cache's value is more dubious because many of its components are prone to failure." "Its success relies on high-quality embeddings, functional vector search, and a trustworthy similarity metric." "Setting the right similarity threshold can also be tricky and require a lot of trial and error" (verified)

## 8. Shadow, canary, mirroring at the infrastructure level

Versions (GitHub API "latest release", checked 2026-10-04): Istio 1.31.1 (2026-09-21); Argo Rollouts v1.10.0 (2026-08-27); Flagger v1.45.0 (2026-09-01); KServe v0.21.0 (2026-09-25). (verified)

- Topic: Istio traffic mirroring (shadowing)
  - URL: https://istio.io/latest/docs/tasks/traffic-management/mirroring/ (verified)
  - YAML (verbatim):
    ```yaml
    apiVersion: networking.istio.io/v1
    kind: VirtualService
    metadata:
      name: httpbin
    spec:
      hosts:
      - httpbin
      http:
      - route:
        - destination:
            host: httpbin
            subset: v1
          weight: 100
        mirror:
          host: httpbin
          subset: v2
        mirrorPercentage:
          value: 100.0
    ```
  - Quote: "These requests are mirrored as 'fire and forget,' which means that the responses are discarded." (verified)
  - Fact: mirrored requests get "-shadow" appended to the Host/Authority header (e.g. cluster-1 becomes cluster-1-shadow) (verified)
  - ML note: for an ML shadow, the shadow model's predictions must be logged by the shadow service itself, since Istio discards its responses (reasoning)
- Topic: Argo Rollouts canary
  - URL: https://argo-rollouts.readthedocs.io/en/stable/features/canary/ (verified)
  - Steps (verbatim): `- setWeight: 10`, `- pause: {duration: 1h}`, `- setWeight: 20`, `- pause: {}` (indefinite pause until promoted) (verified)
  - Without a traffic router, weight is approximated with replica counts (10 replicas, setWeight 10 gives 1 canary + 9 stable); quote: "the Rollout makes a best effort attempt to achieve the percentage listed in the last `setWeight` step between the new and old version." (verified)
  - Analysis URL: https://argo-rollouts.readthedocs.io/en/stable/features/analysis/ (verified)
  - YAML (verbatim, inline analysis step):
    ```yaml
    strategy:
      canary:
        steps:
        - setWeight: 20
        - pause: {duration: 5m}
        - analysis:
            templates:
            - templateName: success-rate
            args:
            - name: service-name
              value: guestbook-svc.default.svc.cluster.local
    ```
    AnalysisTemplate metric: `successCondition: result[0] >= 0.95` over a Prometheus query of non-5xx istio_requests_total ratio over 5m (verified)
  - Quote: inline analysis "blocks the rollout until the run is completed" (verified)
- Topic: KServe canary
  - Doc: "Canary Rollout Example", https://kserve.github.io/website/docs/model-serving/predictive-inference/rollout-strategies/canary-example (verified)
  - Quote: "Add the `canaryTrafficPercent` field to the predictor component and update the `storageUri` to use a new/updated model." (verified from docs source)
  - YAML (verbatim excerpt):
    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "sklearn-iris"
      namespace: kserve-test
    spec:
      predictor:
        model:
          modelFormat:
            name: sklearn
          storageUri: "gs://kserve-examples/models/sklearn/1.0/model-2"
        canaryTrafficPercent: 10
    ```
  - Promotion: remove canaryTrafficPercent and reapply, all traffic goes to the new revision; rollback: set canaryTrafficPercent: 0 to send 100% back to the previous revision (verified, paraphrase)
- Flagger: version only (v1.45.0); config example not fetched in this pass (unconfirmed)

## 9. Degradation and load shedding

- Topic: Google SRE book, ch. 21 "Handling Overload" (Alejandro Forero Cuervo; edited by Sarah Chavis), 2016
  - URL: https://sre.google/sre-book/handling-overload/ (verified)
  - CRITICAL_PLUS: "Reserved for the most critical requests, those that will result in serious user-visible impact if they fail." (verified)
  - CRITICAL: "The default value for requests sent from production jobs. These requests will result in user-visible impact, but the impact may be less severe than those of CRITICAL_PLUS." (verified)
  - SHEDDABLE_PLUS: "Traffic for which partial unavailability is expected. This is the default for batch jobs, which can retry requests minutes or even hours later." (verified)
  - SHEDDABLE: "Traffic for which frequent partial unavailability and occasional full unavailability is expected." (verified)
  - Propagation: "If a backend receives request A and, as part of executing that request, issues outgoing request B and request C to other backends, request B and request C will use the same criticality as request A by default." (verified)
  - Degraded responses: "One option for handling overload is to serve degraded responses: responses that are not as accurate as or that contain less data than normal responses, but that are easier to compute." (verified from page text)
  - Quote: "it's best to build clients and backends to handle resource restrictions gracefully: redirect when possible, serve degraded results when necessary, and handle resource errors transparently when all else fails." (verified)
  - Adaptive throttling: clients track `requests` and `accepts` over two minutes; "Clients can continue to issue requests to the backend until requests is K times as large as accepts." (verified); "We generally prefer the 2x multiplier." (verified)
  - Formula: rendered as an image on the page; the book's formula is max(0, (requests - K x accepts) / (requests + 1)) (from memory; the fetch tool returned a simplified variant; UNCONFIRMED verbatim)
- Topic: Anthropic stance on degradation under load
  - Quote: "To state it plainly: We never reduce model quality due to demand, time of day, or server load." (2025-09-17 postmortem; verified; see section 2)
- Topic: OpenAI December 11, 2024 outage (control-plane overload, not model fallback)
  - URL: https://status.openai.com/incidents/ctrsv3lwd797 ; Date: 2024-12-11, 3:16 PM--7:38 PM PST (verified)
  - Quote: a new telemetry service caused "every node in each cluster to execute resource-intensive Kubernetes API operations whose cost scaled with the size of the cluster" (verified); this overloaded the Kubernetes control plane and broke DNS-based service discovery (verified, paraphrase)
  - Remediations: phased rollouts, fault injection, "break-glass mechanisms" for control-plane access, decoupling data and control planes (verified)
- Topic: ChatGPT free tier at the limit (current policy)
  - URL: https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq (read via r.jina.ai; "updated 2 months ago" as of 2026-10-04)
  - Quote: "When you reach that limit, GPT access pauses until the limit resets; ChatGPT shows the reset timing in-product." (verified) Note: earlier versions of this FAQ described an automatic switch to a mini model; that older wording is not on the current page (historical claim UNCONFIRMED here)
- Topic: GitHub Copilot fallback to included models
  - URL: https://docs.github.com/en/copilot/concepts/billing/copilot-requests (undated docs) (verified)
  - Quote: once the premium request allowance is used, "you can still use Copilot with one of the included models for the rest of the month" (verified)
  - Quote: "Response times for the included models may vary during periods of high usage. Requests to the included models may be subject to rate limiting." (verified)
  - Quote: "Rate limiting is in place to accommodate for high demand." (verified)
- Topic: OpenAI PostgreSQL post (see section 2) as load-shedding example: separate "low-priority and high-priority" traffic onto different instances; multi-layer rate limiting (verified via reader)
- Not covered in this pass (no WebSearch budget): Cursor and Notion AI published degradation accounts; Envoy raw request_mirror_policies config; Flagger canary YAML; LinkedIn Feathr; Netflix/Spotify batch-vs-online posts.
