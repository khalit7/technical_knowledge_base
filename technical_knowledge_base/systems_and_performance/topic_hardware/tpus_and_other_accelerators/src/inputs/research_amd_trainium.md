# AMD Instinct and AWS Trainium: research notes (all fetched 2026-10-05)

## AMD CDNA 3 / MI300X
Source A: AMD CDNA 3 white paper, https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/white-papers/amd-cdna-3-white-paper.pdf (copyright 2025 revision; footnotes dated Nov 2023 and Feb 2025), fetched 2026-10-05.

1. Package layout
- "integrates up to 8 vertically stacked accelerator complex dies (XCD) and 4 I/O dies (IOD) ... connecting to 8 stacks of high-bandwidth memory (HBM)."
- CUs per XCD: "ACEs are each associated with 40 CUs, although at the aggregate level there are only 38 CUs active, with 2 disabled for yield management." 8 x 38 = 304.
- L2: "The 38 CUs all share a 4MB L2 cache"; "4MB and 16-way set associative ... 16 channels that are each 256KB." "The L2 itself is coherent within an XCD."
- IODs: "manufactured on TSMC's 6nm process and vertically stacked beneath a pair of XCDs. They contain a brand new AMD Infinity Cache and the HBM3 interface." "Each L2 is connected to the IOD across the set of sixteen channels and each channel is 64-bytes wide, for a total of 1K-bytes per XCD at the IOD interface."
- Infinity Cache: memory-side last level cache on the IODs; "eight stacks of HBM across the four IODs, for 128 channels or 256MB of data. The peak bandwidth from the Infinity Cache is ... 17.2 TB/s." "includes a snoop filter covering the multiple XCD L2 caches."
- HBM: "each IOD fans out through the package to two stacks of memory"; MI300X "5.2 Gbps and each stack contains 24GB" -> 192 GB, 5.3 TB/s.
- Interconnect: "4th Gen Infinity architecture fabric"; links "up to 32Gbps"; "Each IOD includes two 16-lane, bi-directional inter-package AMD Infinity Fabric links ... One of the links is multi-purpose and can be configured to act as a x16 PCIe Gen 5." (The phrase "Infinity Fabric AP" for the on-package die-to-die fabric is NOT in this white paper: UNCONFIRMED from it.)
- "Infinity Fabric AP" wording: appears in the CDNA 4 white paper (Source B) figure label "Infinity Fabric Advanced Package (AP) 5.5 TB/s bisection" for MI355X's die-to-die fabric; CDNA 4 also says MI355X uses "two larger IODs with a direct connection between them, rather than the four smaller IODs in the previous generation." The IOD-to-IOD link "is roughly 14% faster than in the AMD CDNA 3 architecture" (implies about 4.8 TB/s for MI300X if 5.5 is the comparable figure: derived, UNCONFIRMED). No AP bisection number for MI300X is printed in the CDNA 3 paper.
- Partitioning: MI300X "can be configured with up to eight partitions, one per XCD."

2. Matrix core rates (Table 1 and footnote MI325-019, FLOPS/clock/CU, dense)
- Matrix FP16 2048, BF16 2048, FP8 4096, TF32 1024, Matrix FP32 256, Matrix FP64 256, INT8 4096 (footnote text has a typo "4046").
- Sparsity: "at least two values within a group of four input values are zero ... doubling the computational throughput up to ... 8K operations per clock for a CU."
- Check: 304 CU x 2048 x 2.1 GHz = 1,307.4 TFLOPS BF16 dense (matches); FP8 304 x 4096 x 2.1 GHz = 2,614.9 TFLOPS (white paper: "2614.9 TFLOPS peak theoretical 8-bit precision (FP8)").

3. CU memory
- "The LDS in the AMD CDNA 3 compute units remain at 64KB similar to AMD CDNA 2."
- Instruction cache "shared between two CUs ... 64KB."

4. 8-GPU node
- "uses these seven high-bandwidth and low-latency AMD Infinity Fabric links to form a fully connected 8-GPU system. Each GPU is also connected to the host CPU via a x16 PCIe Gen 5 link." OCP UBB form factor.
- Spec table: "7 x16 AMD Infinity Fabric links, 1x16 PCIe Gen 5 to host CPU"; "P2P RING PEAK AGGREGATE I/O BANDWIDTH 896 GB/s (8 GPUs)" -> 896/7 = 128 GB/s per link (bidirectional peak, AMD's counting).
- Implication: no switch; any GPU pair has one direct 128 GB/s link, so a single point-to-point transfer gets 1/7 of the aggregate; collectives must use all 7 links at once (ring/all-to-all) to approach 896 GB/s; scale-up domain stops at 8 GPUs (beyond that, RDMA NICs).

## AMD CDNA 4 / MI355X
Source B: AMD CDNA 4 white paper, https://www.amd.com/content/dam/amd/en/documents/instinct-tech-docs/white-papers/amd-cdna-4-architecture-whitepaper.pdf (footnotes dated May and June 2025), fetched 2026-10-05.

5. Changes vs CDNA 3
- "integrates 8 vertically stacked accelerator complex dies (XCD) and 2 I/O Dies (IODs) ... connecting to 8 stacks of 12-Hi high-bandwidth memory (HBM3E)." (CDNA 3 had 4 IODs.)
- XCDs on "TSMC's N3P"; IODs stay on N6, "rebalanced across two massive IODs, rather than four."
- "Each XCD comprises 36 AMD CDNA 4 Compute Units organized as four arrays of 9 CUs, of which 32 are active ... The processor spans 8 XCDs, for up to 256 CUs." L2 still "shared 4MB, 16-way" per XCD. Infinity Cache "still acts as a shared 256MB" cache.
- LDS: "The LDS in the AMD CDNA 3 architecture and prior generations was a directly addressed structure with 32 banks, each containing 512 entries for 32-bits of data, a total of 64KB" ... "The LDS in the AMD CDNA 4 architecture is 160KB ... and also doubles the read bandwidth to 256 bytes per clock" and "supports loading data directly from the L1 data cache." L1 vector cache "32KB."
- Table 1 FLOPS/clock/CU, MI325X vs MI355X dense: Matrix FP16 2048 -> 4096; BF16 2048 -> 4096; FP8 4096 -> 8192; INT8 4096 -> 8192; MXFP6 NA -> 16384; MXFP4 NA -> 16384 (table prints "16834", an evident typo; 256 x 16384 x 2.4 GHz = 10.07 PF matches the stated "10 PF"); Matrix FP64 256 -> 128 (halved).
- Peak clock "2,400 MHz". Check: 256 x 4096 x 2.4 GHz = 2,516.6 TF BF16 dense (matches the verified figure); FP8 5.0 PF; MXFP4/MXFP6 10 PF dense.
- TF32: "moved out of hardware and is supported through software emulation utilizing the BF16 datatype."
- "transcendental rates have been increased by 2x to aid with attention acceleration."
- Memory: "288GB HBM3E with 8TB/s of bandwidth"; MI355X 1400 W, direct liquid cooled, UBB8.
- Links: "8 AMD Infinity Fabric links that are 16-bits wide ... at 38.4Gbps for a total link bandwidth of 76.8GB/s in each direction and each of the repartitioned IODs contains four links." Platform "identical to the prior generation with a fully connected 8-GPU system."
- Footnote MI350-007: "153.6 GB/s peak ... P2P bandwidth per AMD Infinity Fabric link"; "1,075.2 GB/s peak aggregate peer-to-peer" (7 links x 153.6). For CDNA 3 the same footnote: "896 GB/s peak aggregate peer-to-peer (P2P) and 1,024 total" (so MI300X: 128 GB/s per link bidirectional = 64 GB/s each direction, from 16 lanes x 32 Gbps).

## AMD per-CU registers and wavefront (item 3)
Source C: ROCm docs "GPU hardware specifications", https://rocm.docs.amd.com/en/latest/reference/gpu-arch-specs.html (page labelled ROCm 10.0.0 docs), fetched 2026-10-05 (read via a summarizing fetcher, so quote table values, not prose).
- MI300X (gfx942): wavefront size 64; LDS 64 KiB per CU; VGPR file 512 KiB per CU; SGPR file 12.5 KiB; L2 4 MiB per XCD (32 MiB total); 38 CUs per XCD.
- MI355X (gfx950): wavefront size 64; LDS 160 KiB; VGPR file 512 KiB; SGPR 12.5 KiB; L1 vector 32 KiB; 32 CUs per XCD.
- NVIDIA contrast (general knowledge, not fetched here): warp = 32 threads; H100 SM has 256 KB registers and up to 228 KB shared memory. UNCONFIRMED in this pass.
- Note: the wavefront is 64 lanes on CDNA (RDNA consumer GPUs support wave32); kernels ported from CUDA that hard-code 32-lane warp shuffles or ballot masks need changes.

## ROCm path for PyTorch (item 7)
- PyTorch HIP semantics, https://docs.pytorch.org/docs/2.14/notes/hip.html (last updated 2026-08-11), fetched 2026-10-05: "PyTorch for HIP intentionally reuses the existing torch.cuda interfaces. This helps to accelerate the porting of existing PyTorch code and models because very few code changes are necessary, if any." Check build with torch.version.hip vs torch.version.cuda.
- RCCL docs, https://rocm.docs.amd.com/projects/rccl/en/latest/index.html (RCCL 2.30.7 docs), fetched 2026-10-05: "The ROCm Communication Collectives Library (RCCL) is a stand-alone library that provides multi-GPU and multi-node collective communication primitives optimized for AMD GPUs." Supports "PCIe and xGMI" interconnects (xGMI = Infinity Fabric GPU links). In PyTorch, backend="nccl" maps to RCCL on ROCm builds (standard behaviour; not quoted from a fetched page: UNCONFIRMED here).
- HIPIFY docs, https://rocm.docs.amd.com/projects/HIPIFY/en/latest/index.html, fetched 2026-10-05: "Tools to automatically translate CUDA source code into portable HIP C++".
- Triton README, https://github.com/triton-lang/triton, fetched 2026-10-05: supported hardware "NVIDIA GPUs (Compute Capability 8.0+)", "AMD GPUs (ROCm 6.2+)".

## MI455X and Helios (item 6), AMD primary pages
Source D: AMD Instinct MI455X spec page, https://www.amd.com/en/products/accelerators/instinct/mi400/mi455x.html (footnotes "June 2026"), fetched 2026-10-05.
- "Launch Date 7/23/2026"; "GPU Architecture CDNA5"; "Lithography TSMC 2nm | 3nm"; "Work Group Processors 256"; "Peak Engine Clock 2400 MHz"; "Transistor Count 320 Billion".
- Peak dense: "OCP MXFP4 Performance 40.3 PFLOPs"; MXFP6, MXFP8, FP8 "20.1 PFLOPs"; "bfloat16 (BF16) Matrix Performance 5 PFLOPs" (10.1 with structured sparsity); Matrix FP64 "5 TFLOPs".
- "432 GB" "HBM4", "Stacks of Memory 12", "Peak Memory Bandwidth 23.3 TB/s", "L2 Cache 192 MB".
- "Scale-up (Peak) UALoE Bi-directional Bandwidth 3.6 TB/s"; "Scale-out (Peak) UALink Bi-directional Bandwidth 600 GB/s"; "Scale-out Bus Type UALink" (as printed; labelling UALink as scale-out looks like a page error, since UALink is a scale-up protocol. Flag as inconsistent.)
- Form factor "Enhanced Accelerator Module (EAM)", direct liquid cooling.
Source E: AMD Instinct MI400 series page, https://www.amd.com/en/products/accelerators/instinct/mi400.html, fetched 2026-10-05.
- "AMD Helios rackscale solution powered by 72 AMD Instinct MI455X GPUs"; "combines 72 AMD Instinct MI455X GPUs, AMD EPYC CPUs, and AMD Pensando DPUs ... in an open, double-wide ORW rack" (Meta Open Rack Wide, OCP).
- "Up to 2.9 ExaFLOPS OCP MXFP4"; "Up to 260 TB/s Scale-up Bandwidth" (labelled "per GPU" on the page but equals 72 x 3.6 TB/s = 259.2 TB/s, so it is the rack aggregate: label inconsistency); "31 TB HBM4 memory with up to 1.7 PB/s".
- "256 Work Group Processors with Wave32 execution": i.e. MI455X (CDNA 5) moves to WGPs and wave32, unlike CDNA 3/4 wave64. Notable change; only stated as a marketing tile, details UNCONFIRMED.
- "It's a reference design, not a product for sale." Open standards "OCP, UALink, and UEC".
- "UALoE" = UALink over Ethernet (expansion of the acronym not quoted on these pages: UNCONFIRMED wording).
- Source F: AMD press release 2025-06-12, https://www.amd.com/en/newsroom/press-releases/2025-6-12-amd-unveils-vision-for-an-open-ai-ecosystem-detai.html, fetched 2026-10-05: "AMD also previewed its next generation AI rack called 'Helios.'" (no extra numbers extracted).
- Note: the task brief says "MI450/MI455X"; AMD pages fetched name MI455X (Helios) and MI430X (sovereign AI/HPC). "MI450" as a product name not found on these pages.

## Independent measurement: SemiAnalysis (label as independent, not vendor)
SemiAnalysis, "MI300X vs H100 vs H200 Benchmark Part 1: Training", https://newsletter.semianalysis.com/p/mi300x-vs-h100-vs-h200-benchmark-part-1-training, dated 2024-12-22, fetched 2026-10-05.
- "AMD's Out of the Box Experience is very difficult to work with and can require considerable patience and elbow grease to move towards a usable state."
- "The CUDA moat has yet to be crossed by AMD due to AMD's weaker-than-expected software Quality Assurance (QA) culture."
- "MI300X performance is held back by AMD software."
(Dated late 2024; ROCm has moved since. State the date when quoting.)

# AWS Trainium (Neuron docs; all fetched 2026-10-05, pages undated "latest")
Base: https://awsdocs-neuron.readthedocs-hosted.com/en/latest/about-neuron/arch/neuron-hardware/

## 8. NeuronCore engines
NeuronCore-v3 (neuron-core-v3.html):
- "a fully-independent heterogenous compute unit consisting of 4 main engines: Tensor, Vector, Scalar, and GPSIMD, with on-chip software-managed SRAM memory".
- "Each NeuronCore-v3 has a total of 28MB of on-chip SRAM" (8 x 28 = 224, matching the chip's "SBUF Capacity (MiB) 224").
- Tensor: "based on a power-optimized systolic array ... highly optimized for tensor computations such as GEMM, CONV, and Transpose." "158 cFP8 TFLOPS, and 79 BF16/FP16/TF32 TFLOPS" per core; structured sparsity "up to 316 TFLOPS" with patterns "4:16, 4:12, 4:8, 2:8, 2:4, 1:4, and 1:2."
- Vector: "every element of the output is dependent on multiple input elements. Examples include axpi operations (Z=aX+Y), Layer Normalization, and Pooling"; "1 TFLOPS of FP32".
- Scalar: "every element of the output is dependent on one element of the input"; "1.2 TFLOPS of FP32" (activations, elementwise).
- GPSIMD: "eight fully-programmable 512-bit wide vector processors. They can execute general purpose C-code and access the embedded on-chip SRAM" (custom operators).
- Also: "supports control flow, dynamic shapes, and programmable rounding mode (RNE & Stochastic-rounding)".
NeuronCore-v4 (neuron-core-v4.html):
- "Each NeuronCore-v4 has a total of 32MiB of on-chip SRAM" (8 x 32 = 256 MiB); new "near-memory accumulation feature, which allows DMA engines to perform a read-add-write operation into existing SRAM data via a single transfer."
- Tensor: "315 MXFP8/MXFP4 TFLOPS"; "MXFP4 data types are converted to MXFP8 before Tensor Engine computation logic"; "79 BF16/FP16/TF32 and 20 FP32 TFLOPS"; sparsity "up to 315 TFLOPS of FP16/BF16/TF32". Output "FP32 or BF16".
- Vector: "1.2 TFLOPS of FP32"; new "Data quantization into MXFP8 ... from BF16/FP16" and "Fast exponential ... at 4x higher throughput than exponential on Scalar Engine, which is particularly useful in self attention".
- Scalar "1.2 TFLOPS of FP32"; GPSIMD unchanged (8 x 512-bit, "C/C++ code").
- Systolic array dimension (128x128) and PSUM size: not on these pages; see NKI section below.

## Chip pages
Trainium2 (trainium2.html): "eight NeuronCore-V3"; "1,299 FP8 TFLOPS, 667 BF16/FP16/TF32 TFLOPS, 2,563 FP8/FP16/BF16/TF32 sparse TFLOPS, 181 FP32 TFLOPS"; "96 GiB ... 2.9 TB/sec"; "3.5 TB/sec of DMA bandwidth, with inline memory compression and decompression"; "NeuronLink-v3 ... 1.28 TB/sec bandwidth per chip"; "16 CC-Cores orchestrate collective communication"; "Logical NeuronCore Configuration (LNC), which lets you combine the compute and memory resources of multiple physical NeuronCores into a single logical NeuronCore." Trainium1 comparison: 191 BF16 TF, 32 GiB, 0.8 TB/s, SBUF 48 MiB, 384 GB/s/chip interconnect.
Trainium3 (trainium3.html): "eight NeuronCore-v4"; "2,517 MXFP8/MXFP4 TFLOPS, 671 BF16/FP16/TF32, 2,517 sparse, 183 FP32"; "144 GiB ... 4.9 TB/sec"; DMA "4.9 TB/sec"; "NeuronLink-v4 ... provides 2.56 TB/sec bandwidth per device"; SBUF 256 MiB; "16 CC-Cores".

## 9. Topology
Trn2 (trn2-arch.html):
- "Trn2 instances are powered by 16 Trainium2 chips"; "16 Trainium2 chips are connected using a 4x4, 2D Torus topology."
- "A Trn2 UltraServer comprises four trn2u.48xlarge instances ... a total of 64 Trainium2 chips"; "Trainium2 chips with the same coordinates in each Trn2 instance are connected in a ring topology."
- Table: per instance 16 chips, 20.8 FP8 PF, 10.7 BF16 PF, 1,536 GiB device memory, 46.4 TB/s; UltraServer 64 chips, 83.2 FP8 PF, 42.8 BF16 PF, 6,144 GiB, 185.6 TB/s; "Intra-instance NeuronLink-v3 bandwidth (GB/sec/chip) 1,024"; "Inter-instance ... 256" (1,024 + 256 = 1,280 = the chip page's 1.28 TB/s, consistent); "EFAv3 bandwidth (Gbps) 3,200".
Trn3 (trn3-arch.html):
- "two UltraServer scale-up configurations: Gen1 with 64 Trainium3 chips per UltraServer, and Gen2 with 144 chips per UltraServer. Both configurations use NeuronSwitch-v1 interconnect technology to enable all-to-all connectivity".
- Gen1: "four servers with 16 Trainium3 devices per server"; "all-to-all connectivity design, replacing the previous 2D-torus architecture"; 161 PF dense MXFP8, 314 TB/s, 9 TB HBM.
- Gen2: "36 servers with 4 Trainium3 devices per server. Trainium3 devices within the same server are connected via a first-level NeuronSwitch-v1, while devices across servers are connected via two second-level NeuronSwitch-v1"; 362 PF dense MXFP8 (362,448 TF), 706 TB/s, 20 TB (20,736 GiB); BF16 96,624 TF; EFA 28,800 Gbps.
- Connectivity section: "Trn3 UltraServers use a PCIe switch-based interconnect architecture ... This replaces the point-to-point NeuronLink topology used in previous generations (Trn1, Trn2)". Per chip: intra-server "256 GB/s 4 x PCIe Gen6 x8 via intra-server switch"; inter-server "320 GB/s 5 x PCIe Gen6 x8"; inter-rack "128 GB/s 2 x PCIe Gen6 x8 direct links". Routing: "(rack, server, chip) ... encoded in the upper bits of the PCIe address"; switches use "BAR (Base Address Register) address matching".
- DISAGREEMENT (same docs): Trainium3 chip page says NeuronLink-v4 "2.56 TB/sec bandwidth per device"; Trn3 table says "NeuronLink-v4 bandwidth (GiB/sec/device) 2,048"; the PCIe link summary adds to 256 + 320 + 128 = 704 GB/s bidirectional per chip. Unit/definition differences not explained; flag rather than pick one.

## Tensor Engine geometry, SBUF/PSUM (NKI architecture guide)
Source: "Trainium2 Architecture Guide for NKI", https://awsdocs-neuron.readthedocs-hosted.com/en/latest/nki/guides/architecture/trainium2_arch.html, fetched 2026-10-05.
- "NeuronCore-v3 SBUF capacity is 28MiB (or, 128 partitions of 224KiB), up from 24 MiB in NeuronCore-v2. PSUM capacity remains the same at 2MiB."
- "the systolic array is still organized as a grid of 128x128 processing elements"; for FP8 "doubling the maximum contraction dimension of a matmul instruction from 128 (for BF16/FP16) to 256, effectively presenting a 256x128 systolic array to the programmer", each PE doing "two pairs of FP8 multiplications".
- Table 10 (Trainium2): Tensor data-path "4x128 (dense FP8 ...), 2x128 (dense BF16/FP16 input) or 5x128 (sparse input); 1x128 (output)", 2.4 GHz; Vector "512 BF16/FP16 input/output; 256 ... other data types", 0.96 GHz; Scalar "128 input/output", 1.2 GHz; GpSimd 1.2 GHz.
- Check: 128 x 128 PEs x 2 FLOPs x 2.4 GHz = 78.6 TFLOPS BF16 per core (doc: 79); x 8 cores = 629, vs the chip page's 667 BF16. Small gap (667/8 = 83.4 per core) not explained by docs; flag as minor inconsistency, possibly a different clock.
- Matmul mechanics: "LoadStationary" loads the stationary tile into the array; "MultiplyMoving ... streams the moving tensor horizontally across the loaded stationary tensor." Example double-FP8 matmul "M=128, K=256, N=512".
- "These tensors must still fit in the 128-partition SBUF, with each partition feeding data into each row of processing elements inside the TensorE."

## 10. NKI (Neuron Kernel Interface)
Sources: "About NKI", https://awsdocs-neuron.readthedocs-hosted.com/en/latest/nki/get-started/about/index.html ; "NKI Language Guide", https://awsdocs-neuron.readthedocs-hosted.com/en/latest/general/nki/programming_model.html ; both fetched 2026-10-05, "relevant for: Trn2, Trn3".
- "NKI is a tool for developing kernels for Trainium hardware. It has three main parts": "nki.language for high-level tile programming (similar to numpy and Triton), and nki.isa for direct access to hardware instructions"; "the NKI Compiler, built on MLIR"; "the NKI Library (NKI-Lib), which provides ready-to-use optimized kernels".
- "all NKI functions are syntactically valid Python functions. However ... they will be compiled by the NKI compiler and run on the Trainium accelerator."
- Shape of a kernel: @nki.jit decorated function; allocate tiles with nl.ndarray(shape, dtype, buffer=nl.sbuf); move HBM to SBUF with nisa.dma_copy; compute with nisa.tensor_tensor etc.; write result to nl.shared_hbm. Guard: "assert a_input.shape[0] <= nl.tile_size.pmax".
- Tile limits (in a code comment): "stationary: [128, 128], moving: [128, 512], output: [128, 512]" for nisa.nc_matmul(output, stationary, moving).
- "SBUF and PSUM tensors have a partition dimension at dim 0 that maps to the NeuronCore's parallel partitions"; "moving data across partitions generally requires a physical operation rather than a free view"; "the first tensor dimension always maps to the partition dimension, while the remaining dimensions are arranged in the free dimension."
- Integration: kernels are compiled when the framework traces "through the Neuron Backend"; output is a "Neuron Executable (NEFF)"; "In PyTorch, the @nki_op decorator handles registration of the custom operation"; NKI-Lib kernels usable "in your PyTorch or JAX code as regular Python functions."
- Contrast for a CUDA/Triton user: no threads/warps; you program 128-partition tiles explicitly placed in SBUF/PSUM and pick engines (nisa ops). Value of tile_size.pmax = 128 inferred from examples (UNCONFIRMED as a quoted constant).

## 10 (cont). Software path: PyTorch and JAX on Neuron
- PyTorch Support on Neuron, https://awsdocs-neuron.readthedocs-hosted.com/en/latest/frameworks/torch/index.html, fetched 2026-10-05: three levels: "TorchNeuron Native (recommended): The newest native PyTorch backend providing eager execution, torch.compile, and standard distributed APIs (FSDP, DTensor, DDP, Tensor Parallelism)"; "PyTorch NeuronX (torch-neuronx) (supported): The XLA-based PyTorch integration ... (This library is not included in Neuron 2.32.0 and later versions.)"; "torch-neuron (archived)" for Inf1.
- Native PyTorch for AWS Trainium, https://awsdocs-neuron.readthedocs-hosted.com/en/latest/frameworks/torch/pytorch-native-overview.html (relevant for Trn2, Trn3), fetched 2026-10-05:
  - "TorchNeuron is an open-source native PyTorch backend for AWS Trainium that integrates through PyTorch's standard PrivateUse1 device backend mechanism."
  - "Important: TorchNeuron is currently only available as part of a closed Beta program." DISAGREEMENT: the PyTorch index page calls it "recommended" and says torch-neuronx (XLA) is dropped from Neuron 2.32.0+, while this page says closed beta. Report both; status in flux.
  - Code changes: "Change .to('cuda') to .to('neuron')"; "torch.autocast(device_type=\"neuron\")"; torch.compile: "@torch.compile(backend=\"neuron\")". "TorchNeuron implements a custom backend for TorchDynamo that receives the forward and backward FX graphs" and lowers them "to Neuron IR".
  - Distributed: FSDP, DTensor, DDP, TP supported; "Pipeline Parallelism (PP) will be available soon." "On Trainium, the unit of distribution is the NeuronCore" (so TP degree counts NeuronCores, not chips).
  - "Adaptive Eager Execution applies optimizations such as operator fusion while guaranteeing identical stream order semantics and numerical accuracy."
  - NKI with PyTorch: "@nki.jit decorator and @nki_op for custom op registration"; training needs a backward via "register_autograd()"; "NKI uses similar definition and registration patterns as Triton".
- Older path (torch-neuronx): XLA-based, lazy tensors on an "xla" device, graphs compiled by neuronx-cc into NEFF. (Details of the XLA device string not re-fetched: UNCONFIRMED wording.)
- JAX Support on Neuron, https://awsdocs-neuron.readthedocs-hosted.com/en/latest/frameworks/jax/index.html, fetched 2026-10-05: "integrate AWS Trainium and Inferentia ... into JAX as pluggable devices using the PJRT (Plugin Runtime) mechanism"; packages libneuronxla and jax-neuronx; "JAX NeuronX is currently in beta."
- Frameworks index: "TensorFlow, MXNet, or torch-neuron (Inf1) ... have been archived."

## 11. Project Rainier (primary sources)
- Amazon, "AWS activates Project Rainier: One of the world's largest AI compute clusters comes online", https://www.aboutamazon.com/news/aws/aws-project-rainier-ai-trainium-chips-compute-cluster, dated October 29, 2025 (page metadata also carries an earlier 2025-06-24 date, from the original version of the article), fetched 2026-10-05:
  - "nearly half a million Trainium2 chips"; "provides more than five times the compute power Anthropic used to train its previous AI models."
  - "Claude is expected to be on more than 1 million Trainium2 chips, for workloads including training and inference, by the end of the year" (2025). (Also a line "now on more than 1 million Trainium2 chips", apparently a later update to the same page; the two lines disagree in tense.)
  - Designed as an "EC2 UltraCluster of Trainium2 UltraServers"; "an UltraServer combines four physical Trainium2 servers, each with 16 Trainium2 chips"; NeuronLinks inside UltraServers, "Elastic Fabric Adapter (EFA) networking ... connects UltraServers inside and across data centers"; "Spread across multiple data centers in the United States."
- Anthropic, "Powering the next generation of AI development with AWS", https://www.anthropic.com/news/anthropic-amazon-trainium, dated Nov 22, 2024, fetched 2026-10-05: "we're writing low-level kernels that allow us to directly interface with the Trainium silicon, and contributing to the AWS Neuron software stack"; "working closely with Annapurna Labs at AWS on the development and optimization of future generations of Trainium accelerators." (Does not give a chip count.)

## 12. Inferentia relation
- AWS Inferentia page, https://aws.amazon.com/ai/machine-learning/inferentia/, fetched 2026-10-05: Inferentia is AWS's inference-only chip line on the same Neuron SDK ("AWS Neuron SDK helps developers deploy models on the AWS Inferentia chips (and train them on AWS Trainium chips)"). "Each Inferentia2 chip has two second-generation NeuronCores", "32 GB of HBM per chip", "up to 190 ... TFLOPS of FP16". Inferentia2 shares NeuronCore-v2 with Trainium1 (the Neuron framework page lists "NeuronCores v2 architecture (Trn1, Trn2, Inf2, Trn1n)", though grouping Trn2 there conflicts with the chip page's NeuronCore-v3; flag).
- One line: Inferentia = inference-only sibling of Trainium, same NeuronCore lineage and Neuron SDK; Trn2/Trn3 are also marketed for inference, so no Inferentia3 has been announced in the sources read (absence UNCONFIRMED).
