Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d8151bbc2e0ceea196187 as of 2026-09-22T02:31:25.264Z:
<page url="https://app.notion.com/p/3c65c17b0d0d8151bbc2e0ceea196187">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d8118beeefaed56da6f8e" title="Topic: hardware"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"TPUs: systolic arrays and pod-scale machines"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 6 min read · +3h 15m resources
Software stack (JAX/XLA, sharding) lives in
<mention-page url="https://app.notion.com/p/3c65c17b0d0d81ecbc04eea6aa45ea1a"/>; this page is the silicon and the pods.
## Best resources
- [How To Scale Your Model: TPUs chapter](https://jax-ml.github.io/scaling-book/tpus/) (\~50 min): the canonical modern explainer of TPU internals and pod networking
- [In-Datacenter Performance Analysis of a Tensor Processing Unit](https://arxiv.org/abs/1704.04760) (45 min) (Jouppi et al., 2017): the original TPU paper; the systolic-array rationale
- [TPU v4 paper](https://arxiv.org/abs/2304.01433) (45 min): optically reconfigurable supercomputer + embeddings (SparseCore)
- [Ironwood announcement](https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/ironwood-tpu-age-of-inference/) (\~10 min) and [TPU7x docs](https://docs.cloud.google.com/tpu/docs/tpu7x) (docs, \~20 min for the core pages): current-generation specs
- [Google TPU Architecture: 7 Generations Explained](https://introl.com/blog/google-tpu-architecture-complete-guide-7-generations) (\~25 min): generation-by-generation survey
## The systolic array idea
A GPU hides memory latency with tens of thousands of threads; a TPU removes the
memory traffic instead. The core is the **systolic array**: weights are loaded
once and stay fixed inside a 2-D grid of multiply-accumulate (MAC) cells, while
input activations stream rhythmically across the array (hence "systolic", like a
heartbeat). Each cell multiplies, adds to the partial sum flowing through, and
passes results to its neighbour. Intermediate values move cell-to-cell over
micrometers of wire, never round-tripping to registers or global memory. Since
moving a byte from DRAM costs orders of magnitude more energy than a MAC, this is
why TPUs win on performance per watt for dense linear algebra.
The supporting cast around the array:
- **MXU (Matrix Multiply Unit)**: the systolic array itself, 128x128 (v4/v5) or
	256x256 (v6e/v7) MACs; several per chip. Inputs BF16 (and FP8 from Ironwood),
	accumulation in FP32.
- **VPU (Vector Processing Unit)**: SIMD unit for everything that is not a matmul:
	activations, normalisation, softmax pieces.
- **Unified Buffer / CMEM / VMEM**: large software-managed on-chip SRAM staging
	activations and weights next to the MXU. No hardware cache hierarchy: the XLA
	compiler statically schedules every transfer. This is the big philosophical
	difference from GPUs: TPU performance is a compiler problem, not an occupancy
	problem.
- **SparseCore**: specialised dataflow engines (v4 onward, much expanded in
	Ironwood) for huge embedding lookups: recommender systems and, increasingly,
	MoE routing and other scatter/gather-heavy work that a systolic array is bad at.
- **ICI (Inter-Chip Interconnect)**: dedicated high-speed links soldered
	chip-to-chip, forming the pod fabric (next section).
The trade: TPUs sacrifice flexibility (no dynamic control flow to speak of, weak
at sparse/irregular work outside SparseCore, one vendor, one compiler) so nearly
every transistor turns tensor math into energy-efficient throughput. GPUs keep
programmability (CUDA, custom kernels, odd workloads) and pay for it in
schedulers, register files, and cache.
## Generations
<table header-row="true">
<tr>
<td>Gen</td>
<td>Year</td>
<td>Per-chip compute</td>
<td>HBM</td>
<td>Pod</td>
<td>Notes</td>
</tr>
<tr>
<td>v1</td>
<td>2015</td>
<td>92 TOPS INT8</td>
<td>8 GB DDR3</td>
<td>single chip</td>
<td>inference only</td>
</tr>
<tr>
<td>v2/v3</td>
<td>2017/18</td>
<td>45 / 123 TFLOPS BF16</td>
<td>16/32 GB</td>
<td>256 / 1,024 chips</td>
<td>training begins, liquid cooling (v3)</td>
</tr>
<tr>
<td>v4</td>
<td>2021</td>
<td>275 TFLOPS BF16</td>
<td>32 GB</td>
<td>4,096 chips, 3D torus</td>
<td>OCS reconfigurable topology, SparseCore</td>
</tr>
<tr>
<td>v5e</td>
<td>2023</td>
<td>197 TFLOPS BF16</td>
<td>16 GB, 0.8 TB/s</td>
<td>256 chips</td>
<td>cost-optimised serving/fine-tune</td>
</tr>
<tr>
<td>v5p</td>
<td>2023</td>
<td>459 TFLOPS BF16</td>
<td>95 GB, 2.77 TB/s</td>
<td>8,960 chips</td>
<td>training flagship of its era</td>
</tr>
<tr>
<td>v6e Trillium</td>
<td>2024</td>
<td>\~918 TFLOPS BF16</td>
<td>32 GB, 1.6 TB/s</td>
<td>256 chips</td>
<td>256x256 MXU, big efficiency jump</td>
</tr>
<tr>
<td>v7 Ironwood</td>
<td>2025, GA Apr 2026</td>
<td>4,614 TFLOPS FP8 (\~2,307 BF16)</td>
<td>192 GB HBM3e, 7.4 TB/s</td>
<td>9,216 chips</td>
<td>first native FP8, inference-first framing</td>
</tr>
</table>
Ironwood is the current flagship: a full 9,216-chip superpod is 42.5 FP8
ExaFLOPS with 1.77 PB of directly addressable HBM, and Ironwood-class capacity is
what Anthropic's 2025 deal for up to one million TPUs runs on. Per-chip it is
roughly a B200-class part (4.6 vs 4.5 PFLOPS FP8, 192 GB on both, 7.4 vs 8 TB/s);
the differentiation is pod scale and cost, not the chip.
Ironwood is also the first TPU generation Google sells for other companies' inference
workloads rather than keeping for internal use, and it is priced on that basis: Google
claims up to 50% better performance per dollar than Nvidia's B200 and B300 (Sep 2026).
Whether anyone outside Google reaches that number is a software question rather than a
silicon one, since it depends on how much of a decade of internal tooling can be
externalised, which is exactly what SemiAnalysis's system teardown of the Ironwood serving
stack sets out to measure. Commercially this matters more than any per-chip number above: a TPU
generation that can be rented is a competitor to the accelerators above in a way that
previous generations were not.
## Pod architecture and ICI
- Chips connect directly to neighbours via ICI links into a **2-D torus** (v5e,
	v6e) or **3-D torus** (v4, v5p, Ironwood): no switches between chips, unlike
	NVLink's NVSwitch fabric. Per-chip ICI bandwidth is \~1.2 TB/s aggregate on
	Ironwood.
- **Optical Circuit Switches (OCS)** sit at the torus boundaries (v4 onward):
	mirrors physically route light between 64-chip cubes, so Google can carve a pod
	into arbitrary-sized slices, route around failed cubes, and even change topology
	(twisted tori) per job, all without packet switching.
- Torus consequences: bisection bandwidth grows with the torus, nearest-neighbour
	collectives (all-reduce on a ring/torus) are extremely efficient, but
	point-to-point between distant chips is multi-hop. This is why TPU sharding
	thinking (see <mention-page url="https://app.notion.com/p/3c65c17b0d0d8125b084e6720cc66b3d"/>)
	is expressed as axes over a device mesh: the mesh is literally the machine.
- Beyond one pod, Google scales over its datacenter network ("multislice",
	data-parallel across pods), and Ironwood pairs pods with Axion Arm CPU hosts.
## TPU vs GPU, the engineer's summary
- Per-chip peak numbers are now comparable; TPUs win on cost per FLOP and
	power, plus deterministic performance (static compilation: no kernel-launch
	jitter), **GPUs win on flexibility and ecosystem** (custom CUDA/Triton kernels,
	every OSS project targets NVIDIA first).
- TPU torus + OCS scales one training job to \~10k chips as a single fabric;
	NVIDIA's answer is NVL72 scale-up domains stitched with InfiniBand/Ethernet
	(see <mention-page url="https://app.notion.com/p/3c65c17b0d0d81808563fd41fb163af0"/>).
- If your model maps to dense matmuls with static shapes, XLA on TPU will be
	excellent with no kernel work. The moment you need exotic attention variants,
	dynamic sparsity, or custom ops, you either wait for Pallas/Mosaic support or
	you want a GPU.
</content>
</page>