Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d810682aae39bd614ec64 as of 2026-09-22T02:24:50.078Z:
<page url="https://app.notion.com/p/3c65c17b0d0d810682aae39bd614ec64">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d8118beeefaed56da6f8e" title="Topic: hardware"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"GPU architecture: Ampere to Blackwell"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 7 min read · +3h 25m resources
## Best resources
- [Modal GPU Glossary](https://modal.com/gpu-glossary/readme) (docs, \~30 min for the core pages): the fastest way to nail every term below (SM, warp, occupancy, TMA, ...)
- [How To Scale Your Model: GPUs chapter](https://jax-ml.github.io/scaling-book/gpus/) (\~1h): GPU rooflines and networking from a systems view
- [NVIDIA H100 whitepaper](https://resources.nvidia.com/en-us-tensor-core) (\~45 min) and [Blackwell architecture page](https://www.nvidia.com/en-us/data-center/technologies/blackwell-architecture/) (\~15 min): primary sources for the numbers
- [Chips and Cheese: Blackwell coverage](https://chipsandcheese.com/) (\~30 min per deep dive): independent microarchitecture analysis
- [Making Deep Learning Go Brrrr From First Principles](https://horace.io/brrr_intro.html) (25 min) (Horace He): why the memory subsystem, not FLOPs, usually rules
## The execution model in one paragraph
A GPU is a grid of **Streaming Multiprocessors (SMs)**: 108 on A100, 132 on H100,
148 per die on B200, 170 on the RTX 5090. Each SM has 4 processing blocks, each
with a **warp scheduler** that every cycle picks one ready **warp** (32 threads
executing in lockstep, SIMT) and issues its next instruction. Latency is hidden by
oversubscription, not caches: an SM keeps up to 64 warps resident and swaps between
them for free, so while one warp waits \~400 cycles on a DRAM load, others compute.
This is why occupancy and coalesced memory access matter, and why branch divergence
inside a warp halves throughput. Per SM you also get tensor cores (4), a register
file (256 KB), and a software-managed **shared memory / L1** slab (up to 228 KB on
Hopper); all SMs share an L2 (50 MB on H100) in front of DRAM.
## Tensor cores, generation by generation
Tensor cores are small matrix-multiply-accumulate units; each generation widens the
matrix operation and adds cheaper number formats.
<table header-row="true">
<tr>
<td>Gen</td>
<td>Arch</td>
<td>New formats</td>
<td>New machinery</td>
</tr>
<tr>
<td>3rd</td>
<td>Ampere (A100)</td>
<td>TF32, BF16, structured 2:4 sparsity</td>
<td>`mma.sync` warp-level MMA, `cp.async` (global -\> shared without registers)</td>
</tr>
<tr>
<td>4th</td>
<td>Hopper (H100)</td>
<td>FP8 (E4M3/E5M2) + Transformer Engine</td>
<td>**TMA**, **wgmma**, thread block clusters + distributed shared memory</td>
</tr>
<tr>
<td>4th (consumer)</td>
<td>Ada (4090)</td>
<td>FP8</td>
<td>no TMA/wgmma; Ampere-style `mma`</td>
</tr>
<tr>
<td>5th</td>
<td>Blackwell DC (B200)</td>
<td>FP4/FP6 (microscaling MXFP4, NVFP4)</td>
<td>`tcgen05.mma`, **TMEM** (dedicated 256 KB tensor memory per SM), 2nd-gen Transformer Engine</td>
</tr>
<tr>
<td>5th (consumer)</td>
<td>Blackwell GeForce (5090, sm_120)</td>
<td>FP4, FP8</td>
<td>TMA available, but no TMEM/tcgen05; kernels look Ada-like</td>
</tr>
</table>
Key Hopper machinery, because it defines how modern kernels (FlashAttention-3,
CUTLASS, DeepGEMM) are written:
- **TMA (Tensor Memory Accelerator)**: a per-SM DMA engine that copies
	multidimensional tiles between global and shared memory from a compact
	descriptor. One thread issues the copy asynchronously; no more warps burning
	issue slots on address arithmetic. Enables true producer/consumer
	(warp-specialised) pipelines.
- **wgmma (warpgroup MMA)**: asynchronous matrix multiply issued by a warpgroup
	(4 warps, 128 threads) that reads operands directly from shared memory. Hopper's
	peak FP8/BF16 throughput is only reachable via wgmma, not the old mma path.
- **Thread block clusters**: several blocks co-scheduled on adjacent SMs can read
	each other's shared memory (DSMEM), giving a new locality tier between SM and L2.
Blackwell datacenter replaces the wgmma register-heavy dance with `tcgen05`: MMA
accumulates into TMEM instead of the register file, freeing registers for the
epilogue, and a single MMA can span 2 SMs. FP4 with per-block scale factors
(NVFP4: FP8 scale per 16 values) doubles throughput again over FP8 and is the
format inference on Blackwell/Rubin is standardising on.
## Memory subsystem: HBM vs GDDR
- **HBM** (A100/H100/B200, MI300X, TPUs): DRAM dies stacked next to the GPU on a
	silicon interposer, very wide (1024-bit per stack) and relatively slow-clocked.
	Capacity and bandwidth scale with stack count: H100 3.35 TB/s (HBM3), H200 4.8
	TB/s (HBM3e), B200 8 TB/s, Rubin moves to HBM4 (\~13 TB/s class). Expensive
	(advanced packaging is the industry bottleneck), power-efficient per byte.
- **GDDR** (GeForce): discrete chips around the board on a narrower bus, clocked
	very high. The 5090's GDDR7 on a 512-bit bus hits 1.79 TB/s, remarkable for
	non-stacked memory, but capacity tops out (32 GB) and there is no ECC by default.
Bandwidth is the number to memorise, because decode-phase inference and most
pointwise ops are bandwidth bound: the ratio peak FLOPs / peak bytes (arithmetic
intensity needed to be compute bound) is \~295 for H100 BF16 and rising every
generation; see <mention-page url="https://app.notion.com/p/3c65c17b0d0d81faad1ef390b0e54d08"/>.
## NVLink across generations
Per-GPU aggregate bidirectional bandwidth: A100 (NVLink 3) 600 GB/s, H100
(NVLink 4) 900 GB/s, B200/B300 (NVLink 5) 1.8 TB/s. With NVSwitch this is
all-to-all within the domain: 8 GPUs in an HGX box, 72 in a GB200/GB300 NVL72
rack (130 TB/s aggregate). GeForce cards since the 4090 have no NVLink at all:
Khalid's dual 5090s talk over PCIe 5.0 x16, \~64 GB/s per direction, roughly 28x
less than one H100's NVLink. Consequence: across the pair, prefer data or
pipeline parallelism over tensor parallelism (see
<mention-page url="https://app.notion.com/p/3c65c17b0d0d81808563fd41fb163af0"/>).
## RTX 5090 vs H100 SXM in concrete numbers
<table header-row="true">
<tr>
<td>Metric</td>
<td>RTX 5090</td>
<td>H100 SXM</td>
<td>Ratio</td>
</tr>
<tr>
<td>SMs / CUDA cores</td>
<td>170 / 21,760</td>
<td>132 / 16,896</td>
<td>1.3x</td>
</tr>
<tr>
<td>BF16 tensor dense</td>
<td>\~210 TFLOPS (FP32 accumulate, GeForce half-rate)</td>
<td>989 TFLOPS</td>
<td>0.2x</td>
</tr>
<tr>
<td>FP8 dense</td>
<td>\~419 TFLOPS</td>
<td>1,979 TFLOPS</td>
<td>0.2x</td>
</tr>
<tr>
<td>FP4 dense</td>
<td>\~838 TFLOPS</td>
<td>n/a (no FP4)</td>
<td>-</td>
</tr>
<tr>
<td>Memory</td>
<td>32 GB GDDR7</td>
<td>80 GB HBM3</td>
<td>0.4x</td>
</tr>
<tr>
<td>Bandwidth</td>
<td>1.79 TB/s</td>
<td>3.35 TB/s</td>
<td>0.53x</td>
</tr>
<tr>
<td>Interconnect</td>
<td>PCIe 5.0 (64 GB/s)</td>
<td>NVLink 4 (900 GB/s)</td>
<td>0.07x</td>
</tr>
<tr>
<td>TDP</td>
<td>575 W</td>
<td>700 W</td>
<td>-</td>
</tr>
</table>
Reading of the table: for single-GPU, bandwidth-bound inference of models that fit
in 32 GB, the 5090 is genuinely about half an H100, and with FP4 quantisation it
can punch above that. For training it is much further behind: GeForce parts run
FP16/BF16 tensor math with FP32 accumulation at half rate, there is no NVLink for
tensor parallelism, and 32 GB caps model plus optimiser state. Dual 5090s are best
treated as: 64 GB total, DP/PP across PCIe, FP8/FP4 inference monsters, and a
perfect kernel-dev target for sm_120 (see
<mention-page url="https://app.notion.com/p/3c65c17b0d0d81c39f34d5e070d783c1"/>).
## Datacenter line quick reference
<table header-row="true">
<tr>
<td>Chip</td>
<td>Year</td>
<td>Memory</td>
<td>BW</td>
<td>Dense BF16 / FP8 / FP4</td>
<td>Power</td>
</tr>
<tr>
<td>A100</td>
<td>2020</td>
<td>80 GB HBM2e</td>
<td>2.0 TB/s</td>
<td>312 / - / - TFLOPS</td>
<td>400 W</td>
</tr>
<tr>
<td>H100 SXM</td>
<td>2022</td>
<td>80 GB HBM3</td>
<td>3.35 TB/s</td>
<td>989 / 1,979 / -</td>
<td>700 W</td>
</tr>
<tr>
<td>H200</td>
<td>2024</td>
<td>141 GB HBM3e</td>
<td>4.8 TB/s</td>
<td>989 / 1,979 / -</td>
<td>700 W</td>
</tr>
<tr>
<td>B200</td>
<td>2024-25</td>
<td>192 GB HBM3e</td>
<td>8 TB/s</td>
<td>2,250 / 4,500 / 9,000</td>
<td>1,000 W</td>
</tr>
<tr>
<td>B300 (Ultra)</td>
<td>2025</td>
<td>288 GB HBM3e</td>
<td>8 TB/s</td>
<td>FP4 dense 15 PFLOPS</td>
<td>1,400 W</td>
</tr>
<tr>
<td>Rubin</td>
<td>H2 2026</td>
<td>288 GB HBM4</td>
<td>\~13 TB/s</td>
<td>\~50 PFLOPS NVFP4 (inference)</td>
<td>higher</td>
</tr>
<tr>
<td>MI400 (AMD)</td>
<td>2026</td>
<td>\~432 GB HBM4</td>
<td>\~24 TB/s</td>
<td>2.9 EF per 72-GPU Helios rack, precision unstated</td>
<td>not disclosed</td>
</tr>
</table>
B200 is two reticle-limit dies joined by a 10 TB/s die-to-die link (NV-HBI),
presenting as one GPU: the first mainstream chiplet NVIDIA GPU. Blackwell Ultra
(B300) trades some FP64/INT for 50% more FP4 and 288 GB. Vera Rubin (Vera CPU +
Rubin GPU, NVL144 racks) entered production mid-2026. AMD's MI400 is the first row here
from another vendor because it is the first to be quoted at rack scale rather than per
card: 432 GB per GPU is ahead of Vera Rubin on memory capacity, and the comparison AMD
invites is Helios against NVL144 rather than chip against chip.
The first independent Rubin measurement is a rack-level one for the same reason. On
SemiAnalysis's AgentX replay of real agentic traffic (Sep 2026), a Vera Rubin NVL72 posts
up to 7x the token throughput per megawatt of a GB300 rack, and 1.4x to 3x the throughput
per total cost of ownership at a realistic interactivity of 60 to 100 tokens per second,
on early pre-release software. The per-TCO figure is the usable one; the headline 67x
performance per dollar is an extreme operating point and should not be quoted.
</content>
</page>