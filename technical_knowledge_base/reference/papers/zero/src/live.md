Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d81879a7ed90bca007699 as of 2026-09-20T17:35:14.267Z:
<page url="https://app.notion.com/p/3c65c17b0d0d81879a7ed90bca007699">
<ancestor-path>
<parent-data-source url="collection://d440058d-ec1c-4b72-b141-046d5d969389" name="papers"/>
<ancestor-2-database url="https://app.notion.com/p/97163af7655541438b224f753fef6f6f" title="papers"/>
<ancestor-3-page url="https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f" title="Papers"/>
<ancestor-4-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-5-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"Paper":"ZeRO: Memory Optimizations Toward Training Trillion Parameter Models","Takeaway":"ZeRO shards optimizer states, gradients, and parameters across data-parallel ranks (16 bytes/param for mixed-precision Adam down to 16 Psi/N_d at stage 3, at most 1.5x DP communication), making memory scale with cluster size and spawning DeepSpeed and FSDP.","Topics":["llm-training-and-post-training","pytorch-ecosystem"],"Year":"2019","url":"https://app.notion.com/p/3c65c17b0d0d81879a7ed90bca007699"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 9 min read · +\~3h 45m resources
- **Authors/lab**: Samyam Rajbhandari, Jeff Rasley, Olatunji Ruwase, Yuxiong He (Microsoft)
- **Date**: October 2019 (arXiv v1); v3 May 2020; published at SC20
- **Links**: [arXiv](https://arxiv.org/abs/1910.02054) (\~1h) \| [DeepSpeed repo](https://github.com/microsoft/deepspeed) (repo, \~20 min for the README and entry path) \| [Microsoft Research blog](https://www.microsoft.com/en-us/research/blog/zero-deepspeed-new-system-optimizations-enable-training-models-with-over-100-billion-parameters/) (\~15 min)
## Best resources
- [HF Ultra-Scale Playbook, ZeRO section](https://huggingface.co/spaces/nanotron/ultrascale-playbook?section=zero_zero_redundancy_optimizer) (\~40 min): the clearest modern walkthrough of the stage-by-stage memory math and communication schedules, with diagrams
- [DeepSpeed ZeRO tutorial](https://www.deepspeed.ai/tutorials/zero/) (docs, \~20 min): the practitioner view, config flags for stages 1/2/3, offload, and what each knob costs
- [Lilian Weng, How to Train Really Large Models on Many GPUs](https://lilianweng.github.io/posts/2021-09-25-train-large/) (\~45 min): places ZeRO in the full DP/TP/PP/MoE landscape
- [PyTorch FSDP docs](https://docs.pytorch.org/docs/stable/fsdp.html) (docs, \~25 min for the core pages): the PyTorch-native descendant of ZeRO-3; maps ZeRO stages onto FSDP sharding strategies
## Problem
In 2019 the two ways to scale training both hit walls. Data parallelism (DP) replicates the full model state on every GPU, so plain PyTorch DDP ran out of memory beyond \~1.4B parameters on 32GB V100s regardless of GPU count. Model parallelism (Megatron-style tensor parallelism) partitions memory but slices each layer into fine-grained compute with heavy per-layer communication, so it collapses past a single NVLink node: a 40B model across two DGX-2 nodes ran at \~5 TFLOPS/GPU, under 5% of peak. Neither approach touches the real culprit: most training memory is not the fp16 weights but the redundantly replicated optimizer states and gradients.
## Method
The paper first does the accounting ("Where did all the memory go?"). For a model with Psi parameters trained with mixed-precision Adam, the model states per GPU are:
- fp16 parameters: 2 Psi bytes
- fp16 gradients: 2 Psi bytes
- optimizer states: K Psi bytes, with K = 12 for mixed-precision Adam (fp32 master parameters 4 Psi + fp32 momentum 4 Psi + fp32 variance 4 Psi)
Total: (2 + 2 + K) Psi = 16 Psi bytes. A 1.5B GPT-2 needs 3GB for fp16 weights but at least 24GB of model states, which is why it would not fit on a 32GB GPU under DDP. Everything else (activations, temporary buffers, fragmentation) is "residual states".
**ZeRO-DP** keeps the DP execution model (every GPU sees a different mini-batch shard, full layers execute locally at full granularity) but partitions the model states across the N_d data-parallel ranks instead of replicating them, materializing each piece only for the moment it is needed. Three cumulative stages, with per-GPU model-state memory:
<table header-row="true">
<tr>
<td>Stage</td>
<td>Partitions</td>
<td>Per-GPU memory</td>
<td>Limit as N_d grows</td>
<td>Comm volume vs DP</td>
</tr>
<tr>
<td>Baseline DP</td>
<td>nothing</td>
<td>(2 + 2 + K) Psi = 16 Psi</td>
<td>16 Psi</td>
<td>2 Psi (all-reduce)</td>
</tr>
<tr>
<td>ZeRO-1 (P_os)</td>
<td>optimizer states</td>
<td>2 Psi + 2 Psi + K Psi / N_d</td>
<td>4 Psi (4x)</td>
<td>2 Psi (same)</td>
</tr>
<tr>
<td>ZeRO-2 (P_os+g)</td>
<td>  • gradients</td>
<td>2 Psi + (2 + K) Psi / N_d</td>
<td>2 Psi (8x)</td>
<td>2 Psi (same)</td>
</tr>
<tr>
<td>ZeRO-3 (P_os+g+p)</td>
<td>  • parameters</td>
<td>(2 + 2 + K) Psi / N_d = 16 Psi / N_d</td>
<td>linear in N_d</td>
<td>3 Psi (1.5x)</td>
</tr>
</table>
Concrete example from the paper (7.5B model, N_d = 64, K = 12): 120GB per GPU at baseline, 31.4GB with ZeRO-1, 16.6GB with ZeRO-2, 1.9GB with ZeRO-3.
How each stage keeps communication cheap:
- **ZeRO-1**: each rank stores and updates 1/N_d of the optimizer states, hence updates only 1/N_d of the fp32 master params; an all-gather at the end of the step distributes updated parameters. Standard ring all-reduce is already reduce-scatter + all-gather (Psi + Psi = 2 Psi moved per rank), so total volume is unchanged.
- **ZeRO-2**: gradients are reduce-scattered so each rank keeps only the gradient slice for the parameters it updates, bucketized to overlap with the backward pass; the rest of gradient memory is freed immediately. Still reduce-scatter (Psi) + parameter all-gather (Psi) = 2 Psi, identical to DP.
- **ZeRO-3**: parameters themselves are sharded; the owning rank broadcasts each layer's weights just before they are needed in forward and again in backward, and they are discarded after use. That is one extra all-gather of all parameters per step (Psi), giving 2 Psi + Psi = 3 Psi, a 1.5x overhead in exchange for memory that scales as 1/N_d: with enough GPUs, arbitrary model size fits.
**ZeRO-R** attacks residual states: P_a partitions activation checkpoints across model-parallel ranks (MP replicates activations; partitioning cuts activation memory by the MP degree, e.g. 33GB to 2GB per GPU for a 100B model at MP = 16) with all-gather on demand, optionally offloading checkpoints to CPU (P_a+cpu) for near-zero activation footprint; C_B uses constant-size fused communication buffers instead of buffers proportional to model size; M_D defragments memory by pre-allocating contiguous buffers for long-lived tensors (checkpoints, parameter gradients), avoiding OOMs that occurred with 30%+ memory still free.
ZeRO composes with tensor/model parallelism: max memory reduction becomes N_d x N_m, and the analysis shows 1T parameters fitting on 1024 GPUs with 16-way MP within nodes and 64-way ZeRO-DP across nodes.
## Results
- **ZeRO-100B** (the implemented subset: ZeRO-2 + ZeRO-R, in PyTorch, model wrapping only, no model code changes) trained models up to **170B parameters** on 400 V100s, 8x larger than Megatron-LM alone could handle efficiently.
- **15 PFLOPS aggregate** sustained (\~38 TFLOPS/GPU, over 30% of peak) on 100B-scale models, up to **10x throughput** over Megatron baseline at the same size, which drops below 5 TFLOPS/GPU once MP crosses nodes.
- **Super-linear scaling** from 64 to 400 GPUs: doubling GPUs more than doubles throughput, because sharding frees memory that goes into larger per-GPU batches, raising arithmetic intensity.
- **Usability**: up to 13B parameters trainable with no model parallelism at all (vs 1.4B for DDP), at 40+ TFLOPS/GPU on 128 GPUs.
- Powered **Turing-NLG (17B)**, the largest LM at the time, with SOTA Webtext-103 perplexity (10.21), at 41.4 TFLOPS/GPU.
- Memory analysis validated: measured max model sizes under ZeRO-1 match the theoretical bounds (Table 2).
## Why it matters
This paper launched **DeepSpeed** and defined the vocabulary ("ZeRO-1/2/3", "stage 3") still used daily in every training stack. Its core insight, that DP's memory redundancy can be eliminated without giving up DP's communication efficiency or requiring model surgery, became the default way to train large models without (or alongside) tensor parallelism; BLOOM, Turing-NLG, MT-NLG 530B and countless fine-tuning runs sit on it. **PyTorch FSDP (and FSDP2 with DTensor sharding) is the direct native descendant of ZeRO-3**, with SHARD_GRAD_OP corresponding to ZeRO-2 style sharding and FULL_SHARD to ZeRO-3. The follow-up line extended the idea across the memory hierarchy: **ZeRO-Offload** (2021) pushes optimizer states and the update step to CPU, **ZeRO-Infinity** (2021) adds NVMe offload and infinity-scale sharding for trillion-parameter fine-tuning on modest clusters, **ZeRO++** (2023) cuts stage-3 communication with quantized weights/gradients and hierarchical partitioning. The 16-bytes-per-parameter accounting from Section 3 remains the standard back-of-envelope every practitioner uses to size a training run.
## Connections
- Megatron-LM: the tensor-parallel baseline ZeRO measures against and composes with; ZeRO-R's P_a partitions Megatron's replicated activations
- GPT-3: the scale regime (175B) this systems line made trainable
- FlashAttention: complementary attack on activation memory at the kernel level rather than the sharding level
- Switch Transformer: the MoE route to parameter scale, orthogonal to state sharding
- Topics: `topics/llm-training-and-post-training` (ZeRO, FSDP, distributed training), `topics/pytorch-ecosystem` (FSDP2, DeepSpeed integration)
</content>
</page>
