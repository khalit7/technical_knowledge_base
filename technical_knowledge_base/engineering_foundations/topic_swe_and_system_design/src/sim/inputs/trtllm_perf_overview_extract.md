# GPT-OSS 120B

| Sequence Length (ISL/OSL) | B200<br/>DEP2 (FP4) | GB200<br/>TP1 (FP4) | H200<br/>TP1 (FP8) | H100<br/>DEP4 (FP8) |
|---|---|---|---|---|
| 1000/1000 | 25,943 | 27,198 | 6,868 | 4,685 |
| 1024/1024 | 25,870 | 26,609 | 6,798 | 4,715 |
| 1024/8192 | 17,289 | 14,800 | 3,543 | |
| 1024/32768 | 6,279 | 5,556 | | 1,177 |
| 8192/1024 | 6,111 | 6,835 | 1,828 | 1,169 |
| 32768/1024 | 1,392 | 1,645 | 519 | 333 |

unit: `output tokens per second per GPU`

---

(gpt-oss-20b)=

# GPT-OSS 20B

| Sequence Length (ISL/OSL) | B200<br/>TP1 (FP4) | GB200<br/>TP1 (FP4) | H200<br/>TP1 (FP8) | H100<br/>TP1 (FP8) |
|---|---|---|---|---|
| 1000/1000 | 53,812 | 55,823 | 13,858 | 11,557 |
| 1024/1024 | 53,491 | 56,528 | 13,890 | 11,403 |
| 1024/8192 | 34,702 | 38,100 | 12,743 | 8,617 |
| 1024/32768 | 14,589 | 16,463 | | |
| 8192/1024 | 11,904 | 12,941 | 4,015 | 3,366 |
| 32768/1024 | 2,645 | 2,905 | 915 | 785 |

unit: `output tokens per second per GPU`

---

(llama-v33-70b)=

# LLaMA v3.3 70B

| Sequence Length (ISL/OSL) | B200<br/>TP1 (FP4) | GB200<br/>TP1 (FP4) | H200<br/>TP2 (FP8) | H100<br/>TP2 (FP8) |
|---|---|---|---|---|
| 1000/1000 | 6,920 | 7,769 | 2,587 | 2,209 |
| 1024/1024 | 6,842 | 7,751 | 2,582 | |
| 1024/8192 | 3,242 | 3,805 | 2,009 | |
| 8192/1024 | 1,362 | 1,491 | 537 | 398 |
| 32768/1024 | 274 | 302 | 120 | |

unit: `output tokens per second per GPU`

---
## Throughput Measurements

The below table shows performance data where a local inference client is fed requests at a high rate / no delay between messages,
and shows the throughput scenario under maximum load. The reported metric is `Output Throughput per GPU (tokens/sec/GPU)`.

The performance numbers below were collected using the steps described in this document.

Testing was performed on models with weights quantized using [ModelOpt](https://nvidia.github.io/Model-Optimizer/) and published by NVIDIA on the [Model Optimizer HuggingFace Collection](https://huggingface.co/collections/nvidia/model-optimizer-66aa84f7966b3150262481a4).

RTX 6000 Pro Blackwell Server Edition data is now included in the perf overview. RTX 6000 systems can benefit from enabling pipeline parallelism (PP) in LLM workloads, so we included several new benchmarks for this GPU at various TP x PP combinations. That data is presented in a separate table for each network.


### Hardware
The following GPU variants were used for testing:
- H100 SXM 80GB (DGX H100)
- H200 SXM 141GB (DGX H200)
- B200 180GB (DGX B200)
- GB200 192GB (GB200 NVL72)
- RTX 6000 Pro Blackwell Server Edition

Other hardware variants may have different TDP, memory bandwidth, core count, or other features leading to performance differences on these workloads.
# Performance Summary - All Networks

## Units

All performance values are measured in `output tokens per second per GPU`, where `output tokens` includes the first and all subsequent generated tokens (input tokens are not included).

Data in these tables is taken from the `Per GPU Output Throughput (tps/gpu)` metric reported by `trtllm-bench`.
The calculations for metrics reported by trtllm-bench can be found in the dataclasses [reporting.py](../../../tensorrt_llm/bench/dataclasses/reporting.py#L570) and [statistics.py](../../../tensorrt_llm/bench/dataclasses/statistics.py#L188).


Source: https://github.com/NVIDIA/TensorRT-LLM/blob/8a9c66ce086594054d3722307cfed2d658d25e60/docs/source/developer-guide/perf-overview.md (file last changed 2026-09-11; fetched 2026-10-04)
