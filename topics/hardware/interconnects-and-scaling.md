# Interconnects and scaling: why the network picks your parallelism

⏱ 6 min read · +3h resources

Last updated: 2026-08-24.

## Best resources

- [How To Scale Your Model: All About Rooflines](https://jax-ml.github.io/scaling-book/roofline/) (~45 min) and the sharding chapters: communication rooflines done properly
- [GPU Interconnects and Rack-Scale Topology: the complete guide](https://blog.prompt20.com/posts/nvlink-and-rack-scale-topology/) (~35 min): NVLink/NVSwitch/NVL72 in one place
- [Nebius: leveraging GB200 NVL72 interconnect](https://nebius.com/blog/posts/leveraging-nvidia-gb200-nvl72-gpu-interconnect) (~15 min): practical NVL72 numbers
- [SemiAnalysis: 100k H100 cluster series](https://newsletter.semianalysis.com/p/100000-h100-clusters-power-network) (~45 min): network design, rail optimisation, reliability at scale
- [NCCL documentation](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/index.html) (docs, ~40 min for the core pages): what the collectives actually do

## The hierarchy of bandwidth

Every cluster is a hierarchy; each tier is roughly an order of magnitude slower
than the one above. Memorise the tiers, then parallelism strategy follows.

| Tier | Technology | Bandwidth (per GPU, bidir) |
|---|---|---|
| On-die | HBM | 3.35 TB/s (H100) to 8 TB/s (B200) |
| Scale-up (node/rack) | NVLink 4 / NVLink 5 via NVSwitch | 900 GB/s / 1.8 TB/s |
| Scale-out (cluster) | InfiniBand NDR/XDR or 400/800G RoCE | 50-100 GB/s per NIC |
| Storage/front-end | Ethernet | ~10 GB/s |

- **NVLink/NVSwitch**: point-to-point GPU links aggregated through switch chips so
  every GPU in the domain talks to every other at full speed. Domain sizes: 8 GPUs
  (HGX H100/B200 baseboard), 72 GPUs (GB200/GB300 NVL72 rack: 130 TB/s aggregate,
  copper spine), 144 with Rubin NVL144. NVLink also does in-switch reduction
  (NVLink SHARP).
- **InfiniBand vs RoCE**: both give RDMA (NIC writes straight into remote GPU
  memory via GPUDirect, no CPU). InfiniBand (Quantum switches, ConnectX/BlueField
  NICs) has credit-based lossless flow control, adaptive routing, and in-network
  reduction (SHARP), and is the low-drama default; RoCE v2 is RDMA over lossless
  Ethernet (PFC/ECN), cheaper and multi-vendor but tuning-sensitive. NVIDIA's
  Spectrum-X and the Ultra Ethernet Consortium have made Ethernet respectable at
  frontier scale (xAI Colossus runs it). Current speeds: NDR 400 Gb/s, XDR 800
  Gb/s per port (Quantum-X800 + ConnectX-8 on Blackwell clusters).
- **Rail-optimised topology**: each GPU k of every node connects to its own "rail"
  leaf switch k (8 rails for 8-GPU nodes). GPU 3 on node A reaches GPU 3 on node B
  in one hop without touching the spine. Since NCCL collectives are structured so
  same-index GPUs exchange the bulk of traffic (NVLink handles the intra-node
  transpose), rails keep most bytes off the oversubscribable spine tier. Clusters
  are built from ~32-node scalable units under a fat-tree.
- **TPU ICI**: the contrast case: no switches at all, direct chip-to-chip torus
  links plus optical circuit switches at cube boundaries (see [tpus.md](tpus.md)).
  Cheaper per bisection-byte, brilliant for ring collectives, no all-to-all
  guarantee.

## Collectives at the hardware level

All distributed training reduces to a few NCCL/RCCL primitives; know their cost
model (N ranks, message size S):

- **All-reduce** (sum grads in DP): ring implementation moves 2S(N-1)/N ~ 2S bytes
  per rank; equals a reduce-scatter followed by an all-gather. Tree algorithms cut
  latency at scale; SHARP does the reduction inside the switch, roughly halving
  traffic and offloading the adds.
- **Reduce-scatter / all-gather**: S(N-1)/N bytes each; the building blocks of
  ZeRO/FSDP (shard, reduce-scatter grads, all-gather params).
- **All-to-all**: every rank sends a distinct chunk to every other rank: MoE
  expert routing. This is the collective that punishes oversubscribed or
  rail-only networks, and a big reason MoE training wants fat NVLink domains
  (keep experts inside NVL72) or full-bisection fabrics.
- **Point-to-point send/recv**: pipeline parallelism's only traffic: tiny
  (activations at one cut), latency-tolerant.

## Why the interconnect determines the parallelism stack

Rule: match each parallelism's communication volume per step to a tier's
bandwidth. Per microbatch, roughly: TP communicates activations every layer
(all-reduce/all-gather, huge volume, latency critical); EP communicates routed
tokens every MoE layer (all-to-all); DP/FSDP communicates gradients/params once
per step (overlappable); PP communicates one activation tensor per stage boundary
(tiny).

- **Tensor parallel: inside the NVLink domain only.** TP=8 on an HGX node is
  standard; TP or EP up to 72 becomes possible on NVL72, which is exactly why the
  rack-scale NVLink domain exists (and why giant MoE inference loves NVL72).
  Running TP across InfiniBand wastes 90%+ of your FLOPs waiting.
- **Pipeline and data parallel: across nodes.** PP tolerates thin links; DP/FSDP
  gradient sync is large but overlaps with backward compute, and hierarchical
  NCCL algorithms + rails + SHARP keep it off the critical path. ZeRO-3/FSDP
  full-gather traffic is heavier, so it prefers intra-node sharding (HSDP:
  shard within node, replicate across).
- **On Khalid's dual 5090s** the "scale-up tier" is PCIe 5.0 (~64 GB/s), two
  orders below NVLink: so TP=2 only pays for very large layers at small batch;
  otherwise use DP for fine-tuning or PP/offload to fit bigger models. Same logic,
  smaller machine.
- Full parallelism math and implementations:
  [../llm-training-and-post-training/](../llm-training-and-post-training/)
  and [../jax-and-tpu/sharding-and-scale.md](../jax-and-tpu/sharding-and-scale.md).

## Quick sanity numbers

- Ring all-reduce of 8B params in BF16 grads (16 GB) over 400G IB (50 GB/s): ~2 x
  16/50 = 0.64 s if unoverlapped: fine if a step takes 5 s, fatal if 0.5 s.
- Same all-reduce over NVLink 4 (450 GB/s usable per direction): ~70 ms.
- TP=2 attention+MLP all-reduces for one 8B-scale layer stack easily exceed PCIe
  budgets at inference batch 1: measure before assuming TP helps on consumer
  boxes.
