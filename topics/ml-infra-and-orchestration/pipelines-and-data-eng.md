# Pipelines and Data Engineering for ML

⏱ 10 min read · +5h resources

Last updated: 2026-08-24

## Best resources

- [Dagster vs Airflow (Dataworkers)](https://dataworkers.io/resources/airflow-vs-dagster/) (~20 min) and [ZenML's orchestration showdown](https://www.zenml.io/blog/orchestration-showdown-dagster-vs-prefect-vs-airflow) (~25 min): clear-eyed comparisons of the task vs asset models.
- [Dagster docs: software-defined assets](https://docs.dagster.io/guides/build/assets) (docs, ~30 min for the core pages): the core idea in the authors' words.
- [Airflow 3 release notes](https://airflow.apache.org/docs/apache-airflow/stable/release_notes.html) (~25 min): what changed (DAG versioning, asset-aware scheduling, task execution API).
- [Polars user guide](https://docs.pola.rs/) (docs, ~60 min for the core pages): especially the lazy/streaming chapters.
- [The FineWeb paper](https://arxiv.org/abs/2406.17557) (90 min, long paper) and [datatrove](https://github.com/huggingface/datatrove) (repo, ~25 min for the entry path): the reference design for trillion-token text pipelines.

## Orchestrators: the models, not the logos

**Airflow (DAG of tasks)**: you declare tasks and edges; Airflow schedules runs, retries, backfills. It knows a task succeeded, not what data it produced. Airflow 3 (April 2025) modernised a lot: DAG versioning, asset-aware scheduling (`@asset`, data-triggered runs), a task execution API that isolates workers from the metadata DB, event-driven scheduling, and a React UI. Its moat is ecosystem: a thousand providers, every data team knows it, managed offerings everywhere (MWAA, Astronomer, Composer).

**Dagster (graph of assets)**: you declare **software-defined assets** (this table, this embedding index, this model) as functions of upstream assets; execution order, lineage, freshness, and partition state fall out of the graph. Ops/jobs exist underneath, but the asset is the unit of thought. This matches ML unusually well because ML work *is* materialised artifacts with data dependencies: "retrain when the features are stale" is a first-class concept, not a sensor hack. Strong local dev story, typed configs, built-in partitioning/backfills per asset.

**Prefect (dynamic Python flows)**: decorate functions (`@flow`, `@task`); the graph is discovered at runtime, so loops/conditionals/dynamic fan-out are just Python. The least ceremony of the three; weakest built-in data-lineage story. Business note: Prefect agreed to acquire Dagster Labs in July 2026; both products continue for now, expect convergence pressure.

**Flyte (typed, K8s-native)**: workflows are strongly-typed DAGs compiled to containerised tasks on Kubernetes; versioned, cached, reproducible by construction; GPU resources and map-tasks (huge fan-out) are first class. Heavier to operate (it is a K8s platform), great fit when reproducible ML at org scale on K8s is the actual requirement (Union.ai is the managed/commercial arm).

**Metaflow (Netflix)**: optimises for the data scientist: `@step` classes, local-first then `@batch`/`@kubernetes` decorators to burst to the cloud, automatic artifact snapshotting, `resume` from any step. Less of an org-wide scheduler, more of a personal-to-team ML workflow tool; pairs with AWS Batch/Step Functions natively.

### Which fits ML data work

| Situation | Reach for |
|---|---|
| Org already runs Airflow, mixed data + ML workloads | Airflow 3 (use assets/datasets features) |
| Greenfield ML/dbt platform, lineage and freshness matter | Dagster |
| Small team, dynamic Pythonic jobs, minimal ops | Prefect |
| K8s-first org, reproducibility/caching as hard requirements | Flyte |
| DS-driven experimentation bursting to AWS | Metaflow |
| Trillion-token corpus processing on a SLURM cluster | None of the above: datatrove-style array jobs (below) |

Key insight: orchestrators schedule and record; they should not move bytes. Heavy compute belongs in the engines below (or SLURM/K8s jobs the orchestrator launches); the orchestrator's job is dependencies, retries, observability, and lineage.

## Data engines: Polars vs pandas vs Dask vs Spark vs Ray Data

- **pandas**: the API everyone knows; single-threaded, eager, memory-hungry (typically needs 5-10x data size in RAM). Fine below ~1 GB and for glue code; pandas 2.x Arrow backing helps but does not change the ceiling.
- **Polars**: Rust, Apache Arrow, multi-threaded, with a lazy optimiser and a streaming engine that processes larger-than-RAM data on one machine; also a GPU engine (cuDF-backed) for interactive scale-up. Order-of-magnitude faster than pandas; a beefy EC2 box + Polars now covers a huge share of jobs that used to justify a Spark cluster. Default choice for new single-node work.
- **Dask**: distributed pandas/NumPy semantics; partitions dataframes across a cluster with a Python-native scheduler. Best when you genuinely need multi-node *and* want to stay in PyData idioms; also the parallelism layer inside many libraries (xarray, RAPIDS via dask-cudf). Weaker query optimiser than Spark/Polars, though dask-expr narrowed the gap.
- **Spark**: the JVM heavyweight: petabyte-proven, SQL + dataframes, mature shuffle, huge ecosystem (Databricks). Costs: cluster ops, JVM/Python serialisation boundary, slow iteration. Right when data is truly cluster-scale, the lakehouse is Spark-shaped, or the org already runs it.
- **Ray Data**: not a dataframe library; a streaming distributed dataset layer (map_batches over blocks) designed to feed GPU workloads: last-mile preprocessing, batch inference, streaming ingest into Ray Train. Use it to keep GPUs fed, not to do joins and aggregations.
- Worth knowing: **DuckDB** (embedded OLAP SQL, pairs beautifully with Parquet and Polars) and **Daft** (Rust distributed dataframes with multimodal types, aimed exactly at ML data).

Rule of thumb: pandas < 1 GB; Polars/DuckDB to hundreds of GB on one box; Dask when PyData-on-a-cluster; Spark at organisational petabyte scale; Ray Data for the last mile into GPUs.

## Trillion-token text pipelines (what datatrove-style tooling does)

The FineWeb pipeline (96 CommonCrawl snapshots to 15T+ clean tokens) is the reference architecture, and [datatrove](https://github.com/huggingface/datatrove) (repo, ~25 min for the entry path) is its engine. The shape:

1. **Sharded, embarrassingly parallel stages**: the corpus is thousands of files; each worker owns a shard end-to-end. datatrove pipelines are a list of blocks (reader, extractor, filters, dedup, writer) run by an executor: `LocalPipelineExecutor` for dev, `SlurmPipelineExecutor` (job arrays, one task per shard, per-task completion markers so reruns skip finished shards), or a Ray executor.
2. **Canonical stage order**: URL filtering; text extraction from WARC HTML (trafilatura); language ID (fastText); quality heuristics (Gopher/C4-style rules: doc length, symbol ratios, boilerplate lines); **deduplication** (MinHash LSH for fuzzy dedup, done per-snapshot in FineWeb because global dedup actually hurt); PII scrubbing; optional model-based quality scoring (FineWeb-Edu's classifier distilled from LLM annotations); tokenise/shuffle/pack into final training shards.
3. **Filtering is where quality lives**: each stage removes a large fraction; you keep per-stage removal stats and eyeball samples of what was dropped. Every decision is validated by ablation training runs, not by intuition.
4. **Ops properties that matter at this scale**: idempotent shards + completion tracking (any node can die), all intermediate data as compressed Parquet/JSONL on object storage or FSx, stats blocks for observability, and no orchestrator in the hot loop (SLURM arrays are the orchestrator).
5. Alternatives in the same niche: **NeMo Curator** (NVIDIA, GPU-accelerated dedup and classification), **Dolma toolkit** (AI2), or hand-rolled Spark. datatrove is the natural one for you since it speaks SLURM natively.

Cross-link: dataset composition and filtering strategy live in ../data-curation-and-datasets/; this file owns the pipes.
