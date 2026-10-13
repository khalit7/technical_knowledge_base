Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d810d9e1fdf9ec942c20d as of 2026-09-22T02:17:44.634Z:
<page url="https://app.notion.com/p/3c65c17b0d0d810d9e1fdf9ec942c20d">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d8150aa65ca44b6ed2fd5" title="Topic: pytorch-ecosystem"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"PyTorch performance stack: attention, torchao, memory, profiling"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 9 min read · +3h 5m resources
Last verified: 2026-09-22 (PyTorch 2.13, torchao 0.14.x).
## Best resources
- [FlexAttention blog post](https://pytorch.org/blog/flexattention/) (30 min): the canonical explainer (score_mod, block masks, performance model).
- [SDPA docs (torch.nn.attention)](https://docs.pytorch.org/docs/stable/generated/torch.nn.functional.scaled_dot_product_attention.html) (20 min) plus `torch.nn.attention.sdpa_kernel`.
- [torchao repo and docs](https://github.com/pytorch/ao) (repo, \~45 min for the entry path): README is a good index; see `torchao.quantization`, `torchao.float8`, `torchao.sparsity`.
- [Understanding GPU memory (PyTorch blog, parts 1-2)](https://pytorch.org/blog/understanding-gpu-memory-1/) (35 min): the memory-snapshot workflow.
- FlashAttention paper summary (45 min): the IO-aware tiling idea every backend below implements. See <mention-page url="https://app.notion.com/p/3c65c17b0d0d81e4a3e8e7a2c4771381"/>.
## SDPA backends
`F.scaled_dot_product_attention` dispatches among backends per input properties:
<table fit-page-width="true" header-row="true">
<tr>
<td>Backend</td>
<td>Notes</td>
</tr>
<tr>
<td>FLASH_ATTENTION</td>
<td>FlashAttention-2 kernels; FA-3 on Hopper; since 2.11 an **FA-4 backend** on Hopper/Blackwell</td>
</tr>
<tr>
<td>CUDNN_ATTENTION</td>
<td>cuDNN fused attention; often fastest on Hopper+, default candidate since 2.5</td>
</tr>
<tr>
<td>EFFICIENT_ATTENTION</td>
<td>xFormers-lineage mem-efficient kernel; widest coverage (odd head dims, some mask types)</td>
</tr>
<tr>
<td>MATH</td>
<td>Naive composed ops; always works; the numerics reference</td>
</tr>
</table>
- Pin or debug selection with `with sdpa_kernel([SDPBackend.FLASH_ATTENTION]):`; when a
	backend is skipped, enable warnings via `torch.backends.cuda.flash_sdp_enabled()` and
	friends, or `TORCH_LOGS=+sdpa` style debugging to see the reason (dtype, mask,
	head_dim, dropout are the usual disqualifiers).
- Arbitrary `attn_mask` tensors usually force EFFICIENT or MATH; `is_causal=True` keeps
	you on flash. That gap is what FlexAttention exists to close.
- 2.10 added `varlen_attn()`: ragged/packed sequences without padding, the
	flash_attn_varlen equivalent in core.
## FlexAttention
`torch.nn.attention.flex_attention` lets you write attention variants as two callables,
and torch.compile fuses them into a flash-style kernel instead of materializing scores:
- `score_mod(score, b, h, q_idx, kv_idx)`: elementwise tweak of pre-softmax scores.
	Covers ALiBi, relative bias, softcapping, sliding window, tanh clipping.
- `mask_mod` + `create_block_mask`: boolean sparsity compiled into a **BlockMask** that
	skips fully-masked tiles entirely (causal, document/jagged masking, prefix-LM,
	paged attention). Block sparsity is where the big wins come from; precompute the
	BlockMask once per shape and reuse.
- Always call it as `flex_attention = torch.compile(flex_attention)`; eager mode is a
	slow reference path. Backward is generated too (score_mod must be differentiable).
- Perf is typically within \~10-20% of hand-written FA2 while covering variants FA does
	not ship; since 2.13 it also runs on Apple Silicon (MPS), and CPU support exists.
- Used in production by HF transformers (attention_implementation="flex_attention"),
	torchtitan (document masking for packed pretraining), and gpt-fast lineage code.
## torchao
One library for training and inference low-precision, built on tensor subclasses so it
composes with torch.compile, FSDP2, and DTensor. Current line: 0.14.x.
- **Post-training quantization**: `quantize_(model, config)` with e.g.
	`Int8WeightOnlyConfig`, `Int4WeightOnlyConfig` (tinygemm), `Int8DynamicActivation...`,
	`Float8DynamicActivationFloat8WeightConfig`. Weight-only int4/int8 for memory-bound
	inference; dynamic act+weight for compute-bound. HF transformers accepts
	`TorchAoConfig` directly, and ExecuTorch consumes torchao-quantized checkpoints for
	edge.
- **QAT**: `torchao.quantization.qat` (fake-quant insert/convert flow), used with
	torchtune/Axolotl recipes to recover accuracy for int4.
- **float8 training**: `convert_to_float8_training(model)`; tensorwise or rowwise
	scaling recipes for matmul inputs, delayed vs dynamic scaling. Composes with FSDP2
	(fp8 all-gather to halve comm) and torch.compile; torchtitan reports \~1.5x throughput
	at 405B scale on H100s, and AMD upstreamed FNUZ-format fp8 for MI3xx (Aug 2026).
	MXFP8/MXFP4 (microscaling) recipes target Blackwell, including MoE grouped-GEMM
	training support.
- **Sparsity**: 2:4 semi-structured (`sparsify_`) with fused sparse GEMMs (\~1.3-1.6x on
	supported shapes), plus block sparsity and Wanda-style pruning flows.
## Memory: snapshot, viz, checkpointing
- **Memory snapshot**: `torch.cuda.memory._record_memory_history(max_entries=100000)`,
	run the workload, `torch.cuda.memory._dump_snapshot("snap.pickle")`, then drop the
	file on [pytorch.org/memory_viz](https://pytorch.org/memory_viz) (tool, \~10 min). You get a timeline
	of every allocation with stack traces: the tool for finding leaks, fragmentation, and
	what exactly holds peak memory. Categories separate params/grads/optimizer/activations.
- `torch.cuda.memory_summary()` and `max_memory_allocated()` for quick numbers;
	`PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True` for fragmentation-prone dynamic
	shapes.
- **Activation checkpointing**: \`torch.utils.checkpoint.checkpoint(fn, \*args,
	use_reentrant=False)\` (non-reentrant is the only variant to use; reentrant is legacy).
	Apply per transformer block. **Selective activation checkpointing (SAC)** via
	`create_selective_checkpoint_contexts` saves only expensive-to-recompute ops (matmul,
	SDPA) and recomputes cheap pointwise ops: better memory/compute tradeoff than
	all-or-nothing, and it composes with compile (memory-budget API in Inductor can pick
	automatically). torchtitan exposes none/selective(op\|layer)/full policies.
- `nn.LinearCrossEntropyLoss` (2.13) fuses the lm-head matmul with the loss, avoiding
	materializing the \[batch, seq, vocab\] logits tensor: a major peak-memory item for
	large-vocab LLMs (the Liger-kernel trick, now in core).
## torch.profiler workflow
```python
with torch.profiler.profile(
    activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA],
    schedule=torch.profiler.schedule(wait=1, warmup=2, active=3, repeat=1),
    on_trace_ready=torch.profiler.tensorboard_trace_handler("./tb"),
    profile_memory=True, with_stack=True, record_shapes=True,
) as prof:
    for step, batch in enumerate(loader):
        train_step(batch); prof.step()
```
- Read traces in Perfetto/chrome://tracing or TensorBoard; `with_stack=True` links
	kernels to Python lines (combine with `TORCHINDUCTOR_UNIQUE_KERNEL_NAMES=1` for
	compiled runs).
- What to look for: gaps on the GPU stream (dataloader or CPU-bound launch overhead),
	NCCL kernels not overlapping compute (check comm streams), many tiny kernels (fusion
	or CUDA-graph opportunity), memcpy D2H syncs (`.item()`, `.cpu()` in the step).
- `torch.cuda.synchronize()` + `time.perf_counter()` for honest microbenchmarks;
	`torch.utils.benchmark.Timer` handles warmup/median properly.
- Fleet-scale: Holistic Trace Analysis (HTA) ingests per-rank Kineto traces to find
	stragglers and comm/compute overlap stats across ranks.
- Rough triage order: memory snapshot for OOMs; profiler trace for throughput; NCCL
	flight recorder for hangs (see <mention-page url="https://app.notion.com/p/3c65c17b0d0d815e85aff8decd8f35ab"/>).
Cross-refs: kernel authoring (Triton, Helion, CUTLASS) in <mention-page url="https://app.notion.com/p/3c65c17b0d0d81c39f34d5e070d783c1"/>; quantization theory in <mention-page url="https://app.notion.com/p/3c65c17b0d0d817b8f41ff66fba4cd0e"/>.
</content>
</page>
