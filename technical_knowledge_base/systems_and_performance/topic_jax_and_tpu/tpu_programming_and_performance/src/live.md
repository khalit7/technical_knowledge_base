Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d8129b0a5fd82e44ecf6e as of 2026-09-22T02:07:30.521Z:
<page url="https://app.notion.com/p/3c65c17b0d0d8129b0a5fd82e44ecf6e">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81ecbc04eea6aa45ea1a" title="Topic: jax-and-tpu"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"TPU architecture and Pallas"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 7 min read · +3h 20m resources
Programming-side view. Die layout, full spec tables and GPU comparisons live in <mention-page url="https://app.notion.com/p/3c65c17b0d0d8151bbc2e0ceea196187"/>.
## Best resources
- [How to Think About TPUs (scaling book, ch. 2)](https://jax-ml.github.io/scaling-book/tpus/) (\~50 min):
	the best single explanation of MXU, HBM, VMEM, ICI, and pod topology; verified current.
- [Cloud TPU docs: system architecture](https://docs.cloud.google.com/tpu/docs/system-architecture-tpu-vm) (docs, \~40 min for the core pages)
	and per-generation pages (v5e, v5p, v6e, Ironwood): authoritative specs and topologies.
- [Pallas documentation](https://docs.jax.dev/en/latest/pallas/index.html) (docs, \~45 min for the core pages) and the
	[Pallas TPU pipelining guide](https://docs.jax.dev/en/latest/pallas/tpu/pipelining.html) (\~25 min):
	the kernel language; TPU details under `pallas/tpu`.
- [How to profile TPU programs (scaling book, ch. 9)](https://jax-ml.github.io/scaling-book/profiling/) (\~35 min):
	XProf/Tensorboard profiler, trace viewer, HLO reading.
- [TPU Research Cloud](https://sites.research.google/trc/about/) (\~5 min): free research TPUs.
## Chip anatomy: what a PyTorch/GPU person needs to remap
A TPU chip is a small number of big cores (1-2 TensorCores) instead of a GPU's \~100+
SMs. Each TensorCore has:
- **MXU** (Matrix Multiply Unit): a 128x128 **systolic array** doing one 128x128 matmul
	per cycle-ish; inputs flow through a grid of MACs, partial sums pulse through the
	array ("systolic" = data moves, weights stay). Newer generations pack several MXUs per
	core. Consequence: peak FLOPs only on large, aligned matmuls; pad dims to multiples of
	128 (and the minor-most tile to 8x128 registers) or waste the array.
- **VPU**: vector unit for elementwise ops, reductions, activations.
- **VMEM**: \~tens of MB of software-managed scratchpad (128 MB on newer chips), the
	analogue of a GPU's SMEM but per-core and much larger, with no hardware cache
	hierarchy behind it; compilers/Pallas stage HBM tiles through it with double
	buffering.
- **HBM**: main memory (v5e 16 GB, v5p 95 GB, v6e 32 GB, v7 192 GB per chip).
- **SparseCore**: embedding-lookup accelerators (recsys, MoE routing assists).
No warps, no thread blocks, no occupancy tuning: the mental model is "one wide VLIW
core: a matmul engine plus explicit memory pipelines", and the XLA compiler (not you)
schedules almost everything. Rooflines still rule: arithmetic intensity vs HBM bandwidth decides
whether you are compute- or memory-bound, exactly as on GPU.
## Generations (training-relevant)
<table header-row="true">
<tr>
<td>Gen</td>
<td>Year</td>
<td>Headline</td>
<td>Notes</td>
</tr>
<tr>
<td>v4</td>
<td>2021</td>
<td>275 bf16 TFLOP/s, 32 GB</td>
<td>3D torus + optical circuit switching (OCS); pods to 4096 chips</td>
</tr>
<tr>
<td>v5e</td>
<td>2023</td>
<td>\~197 bf16 TFLOP/s, 16 GB</td>
<td>Cost-efficiency part; what Colab/Kaggle give you; pods to 256</td>
</tr>
<tr>
<td>v5p</td>
<td>2023</td>
<td>\~459 bf16 TFLOP/s, 95 GB</td>
<td>Training flagship of its era; pods to 8960</td>
</tr>
<tr>
<td>v6e Trillium</td>
<td>2024</td>
<td>\~4.7x v5e per chip, 32 GB</td>
<td>Cheap workhorse; 256-chip pods</td>
</tr>
<tr>
<td>v7 Ironwood</td>
<td>GA Apr 2026</td>
<td>\>4x v6e per chip, 192 GB HBM, FP8 support</td>
<td>"Age of inference" pitch but also trains; superpods to 9216 chips</td>
</tr>
</table>
Trend to remember for interviews: Google runs two tracks ('e' = efficiency, 'p'/full =
performance), HBM per chip jumped 6x with Ironwood, and pod scale (thousands of chips on
one ICI fabric) is the differentiator vs GPU clusters.
## Interconnect and topology
- **ICI**: dedicated chip-to-chip links forming a 2D torus (v5e/v6e) or 3D torus
	(v4/v5p/v7), no NICs or Ethernet in the path. Collectives on ICI are why GSPMD can
	treat a pod slice as one machine; bandwidth is high enough that tensor/FSDP sharding
	across hundreds of chips is routine before pipeline parallelism is even considered.
- **OCS** (optical circuit switches, v4+): reconfigure the torus around failed cubes and
	carve pods into arbitrary slices (e.g. `v5p-128` = 64 chips; slice names count
	TensorCores on some gens, chips on others; check the docs per gen).
- **Host structure**: each host owns 4 chips (8 for some v5e configs); multi-host slices
	run one JAX process per host (see <mention-page url="https://app.notion.com/p/3c65c17b0d0d8125b084e6720cc66b3d"/>).
- Beyond one pod: data-parallel over DCN (normal data-centre network), e.g. MaxText
	multi-slice training with slices as an extra mesh axis.
## Pallas: kernels when XLA is not enough
Pallas is JAX's built-in kernel language (the Triton analogue; on GPU it can lower via
Triton, on TPU via the **Mosaic** compiler). You write a Python function over `Ref`s in
fast memory, launched on a grid, with `BlockSpec`s describing how each grid step's tile
maps into HBM arrays; Pallas/Mosaic handle the HBM-\>VMEM double-buffered pipeline.
```python
from jax.experimental import pallas as pl

def matmul_kernel(x_ref, y_ref, o_ref):        # refs live in VMEM
    o_ref[...] = x_ref[...] @ y_ref[...]

out = pl.pallas_call(
    matmul_kernel,
    grid=(M // bm, N // bn),
    in_specs=[pl.BlockSpec((bm, K), lambda i, j: (i, 0)),
              pl.BlockSpec((K, bn), lambda i, j: (0, j))],
    out_specs=pl.BlockSpec((bm, bn), lambda i, j: (i, j)),
    out_shape=jax.ShapeDtypeStruct((M, N), x.dtype),
)(x, y)
```
When you actually need it: fused attention variants (splash/flash attention on TPU ships
as Pallas kernels), MoE routing, quantised matmuls, ragged/blocksparse ops; MaxText and
vLLM-TPU pull kernels from `jax.experimental.pallas.ops.tpu`. TPU-specific notes: tiles
should respect (8, 128) lane/sublane granularity; `dimension_semantics` marks grid axes
parallel vs arbitrary; there is a distributed flavour for kernels that drive ICI
directly. Pallas kernels are jit/vmap/shard_map-compatible but you define custom VJPs
yourself. For most training work you never write one: XLA fusion + the stock attention
kernel is competitive out of the box, which is the core cultural difference from CUDA
land.
## Getting TPU time cheaply
1. **Colab**: free/Pro tiers expose a single v5e chip; enough for jax-core and NNX
	experiments and all scaling-book notebook exercises.
2. **Kaggle**: free v5e-8 (8 chips), roughly 20 h/month quota with \~9 h sessions:
	enough to really train the ported small LM with a `('data',)` or small FSDP mesh.
3. **TRC (TPU Research Cloud)**: apply at [sites.research.google/trc](http://sites.research.google/trc) (\~5 min); grants \~30 days of
	free on-demand/preemptible TPU VMs (typically v2-8/v3-8 up to v4/v5e pods slices),
	renewable if you publish/blog results. The standard route for exactly the
	"learning JAX, porting a model, writing it up" plan; mention the blog-post intent in
	the application.
4. **GCP spot/preemptible v5e or v6e** paid by the hour for anything bigger; queued
	resources or Multislice only when a single slice stops fitting.
Practical loop: develop on CPU (`jax.devices('cpu')`, everything traces identically),
smoke-test on Colab, train on Kaggle/TRC, profile with XProf before buying anything.
## Cross-links
- Hardware numbers and GPU-vs-TPU comparison: <mention-page url="https://app.notion.com/p/3c65c17b0d0d8151bbc2e0ceea196187"/>
- CUDA and Triton mental models to contrast with Pallas: <mention-page url="https://app.notion.com/p/3c65c17b0d0d81c39f34d5e070d783c1"/>
- Sharding and software view of pods: <mention-page url="https://app.notion.com/p/3c65c17b0d0d8125b084e6720cc66b3d"/>
</content>
</page>