# Topic: hardware

⏱ 10 min read · +9h 13m resources

The compute landscape that everything else in this knowledge base runs on: GPU architectures from Ampere to Blackwell (and Rubin), TPUs, the non-GPU accelerators, the interconnects that make clusters possible, and the back-of-envelope math that tells you whether a workload is compute bound or bandwidth bound before you run it.

### Taxonomy

```mermaid
graph TD
    HW[AI Compute] --> CPU[CPU vs GPU fundamentals]
    HW --> NV[NVIDIA]
    HW --> AMD[AMD Instinct]
    HW --> TPU[Google TPU]
    HW --> ASIC[Inference / custom ASICs]
    HW --> HUA[Huawei Ascend]
    HW --> NET[Interconnects]
    HW --> PERF[Performance math]

    NV --> DC[Datacenter]
    NV --> CONS[Consumer]
    DC --> A100[A100 Ampere 2020]
    A100 --> H100[H100/H200 Hopper 2022-24]
    H100 --> B200[B200 / GB200 NVL72 Blackwell 2024-25]
    B200 --> B300[B300 / GB300 Blackwell Ultra 2025]
    B300 --> RUBIN[Vera Rubin NVL144 H2 2026]
    CONS --> R4090[RTX 4090 Ada]
    R4090 --> R5090[RTX 5090 Blackwell, dual in Khalid's box]

    AMD --> MI300[MI300X 192GB]
    MI300 --> MI325[MI325X 256GB]
    MI325 --> MI355[MI355X CDNA4, FP4]
    MI355 --> MI400[MI400 HBM4 2026<br/>Helios rack: 72 GPUs, 31 TB HBM4]

    TPU --> SYS[Systolic array / MXU]
    TPU --> GEN[v4 -> v5p -> v6e Trillium -> v7 Ironwood]
    TPU --> POD[Pods, ICI, optical circuit switches]

    ASIC --> GROQ[Groq LPU]
    ASIC --> CER[Cerebras WSE-3 / CS-4]
    ASIC --> TRN[AWS Trainium / Inferentia]
    ASIC --> POS[Positron Asimov<br/>commodity-memory bet, pre-silicon]

    HUA --> A96["Ascend 960DT / 960PR 2027<br/>Atlas 860 / 960 SuperPoD racks"]

    NET --> NVL[NVLink / NVSwitch scale-up]
    NET --> UB["Huawei UnifiedBus<br/>scale-up, claimed to a million processors"]
    NET --> CAF["Cornelis Active Compute Fabric<br/>open, GPU-agnostic scale-up"]
    NET --> IB[InfiniBand vs RoCE scale-out]
    NET --> ICI[TPU ICI torus]
```

### Map of the space

- **CPU vs GPU**: a few complex, latency-optimised cores against thousands of simple throughput-optimised ones. Deep learning is dense linear algebra, exactly the regular, branch-free, massively parallel workload GPUs (and even more so TPUs) are built for. Details in [GPU architecture: Ampere to Blackwell](gpu-architecture.md).
- **NVIDIA datacenter line**: A100 -> H100 -> H200 -> B200 -> B300 Blackwell Ultra -> Vera Rubin (HBM4, NVL144 racks, ramping H2 2026); per-chip numbers, HBM packaging and NVLink generations in [GPU architecture: Ampere to Blackwell](gpu-architecture.md). The GB200/GB300 NVL72 rack, 72 GPUs in one **NVLink domain**, is the current unit of frontier training and inference: inside the domain tensor parallelism is affordable, outside it you are on InfiniBand or Ethernet at roughly a twentieth of the bandwidth. Nvidia's pitch for the Vera Rubin generation is data orchestration rather than FLOPS: the platform (Rubin GPUs, the Vera CPU, inference accelerators, storage and networking) is sold on how efficiently it feeds GPUs across a distributed system, with Nvidia's VP of storage technology citing "upwards of 3x improvement" on data-movement operations attributable to the Vera CPU removing memory bottlenecks (Aug 2026). Read alongside AMD's MI400 rack numbers below: both vendors have moved the unit of comparison from the card to the rack, and the differentiator each claims is system-level orchestration rather than peak per-chip throughput. [TechCrunch](https://techcrunch.com/2026/08/29/nvidias-ai-advantage-is-moving-beyond-the-gpu/) (~8 min)
- **Consumer**: RTX 4090 (Ada) and RTX 5090 (consumer Blackwell, 32 GB GDDR7 at 1.79 TB/s, native FP4), a serious local inference and fine-tuning card whose two real gaps against datacenter parts are memory capacity and the lack of NVLink (PCIe only between the pair).
- **AMD**: MI300X made AMD credible on inference (192 GB when H100 had 80). MI325X (256 GB) and MI355X (CDNA4: 288 GB HBM3e, 8 TB/s, FP4/FP6, ROCm with upstream PyTorch) are competitive on paper and increasingly in MLPerf. MI400 with 432 GB HBM4 lands 2026 in the Helios rack, which AMD detailed at Hot Chips 2026 (Aug 24): 72 GPUs in one rack delivering 2.9 exaflops, 31 TB of HBM4 and 1.7 PB/s of aggregate HBM4 bandwidth, so roughly 430 GB per GPU at about 24 TB/s, ahead of the Vera Rubin NVL144 generation on memory capacity per GPU. The software gap with CUDA has narrowed for inference (vLLM, SGLang first-class) more than for training; ROCm 10.0 and its agent-skills channel are covered on [Topic: cuda-and-gpu-programming](../cuda-and-gpu-programming/summary.md).
- **TPUs**: systolic-array machines, weights pinned in a grid of MACs while activations stream through, so almost no energy goes to data movement, and chips reaching their neighbours over ICI in a switchless torus, which is why a pod behaves like a single machine for ring collectives and why sharding on TPU is written as axes over a device mesh. Current generation is v7 Ironwood (4.6 PFLOPS FP8 per chip, 192 GB HBM3E, pods to 9,216 chips). Ironwood is also the first TPU generation Google sells for other companies' inference workloads rather than keeping for internal use, with Google claiming (Sep 8, 2026) up to 50% better performance per dollar than Nvidia's B200 and B300; whether anyone outside Google can reach that number depends on the software stack, and SemiAnalysis's system teardown of what externalising a decade of internal tooling requires is the test to read the claim against. [SemiAnalysis](https://inferencex.semianalysis.com/blog/tpu-inferencex-full-steam) (35 min). Hardware side in [TPUs: systolic arrays and pod-scale machines](tpus.md), software side in [Topic: jax-and-tpu](../jax-and-tpu/summary.md).
- **Inference ASICs** (application-specific integrated circuits) give up general programmability so nearly every transistor serves one workload shape, buying large gains in performance per watt and per dollar. **Groq LPU (Language Processing Unit)** removes HBM entirely and holds the whole model in on-chip SRAM, roughly 230 MB per chip, fed by a compiler-scheduled, statically timed dataflow with no caches, no dynamic schedulers and no arbitration, so every instruction's timing is fixed at compile time and latency is deterministic to the cycle. That buys extreme single-stream tokens per second at batch 1, exactly the regime where a GPU is bandwidth bound; it costs spreading a model of any size across hundreds of chips, because each one holds so little. **Cerebras WSE-3 (Wafer Scale Engine 3)** goes the opposite way and declines to cut the wafer into chips: one die of roughly 46,000 mm2 carrying about 900,000 cores and 44 GB of on-wafer SRAM, so weights and activations travel on-wafer at petabytes per second instead of crossing a package boundary, deleting the inter-chip network for any model that fits, which is where the 125 PFLOPS and the headline token rates come from. The price is wafer yield engineering, a bespoke compiler and toolchain, and capacity bought in whole systems rather than cards. Deployed by AWS and used by OpenAI for fast inference. The **CS-4** (announced Aug 19, 2026) puts three WSE-3 Turbo wafers in one system: 250 PFLOPS, 43.2 PB/s memory bandwidth, a claimed 30x GPU inference speed and over 1,000 tokens/s on 10T-plus parameter models, with first shipments in Q3 2026. [Cerebras](https://www.cerebras.ai/cs4) (~5 min). **AWS Trainium and Inferentia** are the hyperscaler cost play: conventional systolic-array accelerators (Trainium for training, Inferentia for serving) whose distinctive move is vertical integration, not microarchitecture. AWS owns the silicon, the NeuronLink interconnect, the Neuron SDK and the datacenter around them, so it can price FLOPs against Nvidia's margin instead of on top of it; Anthropic's Project Rainier is the largest deployment. The standing catch is software: Neuron trails CUDA by a wide margin, so the saving is real only for workloads worth porting. Qualcomm and Amazon announced co-designed custom inference silicon with optical connectivity for AWS on Sep 8, 2026, a second in-house line beside Trainium. Roughly a quarter of 2026 AI server shipments are ASIC-based systems. **Positron Asimov** is the funded bet against HBM itself: $875 million raised on Sep 10, 2026 at a $5 billion valuation, before the chip taped out, for inference silicon designed around commodity memory instead of high-bandwidth memory. Track it as a falsifiable claim against the arithmetic on this page: decode speed is bytes touched per token divided by memory bandwidth, and the industry has spent five years treating HBM bandwidth as the binding constraint. Positron's bet is that for inference specifically, capacity and cost per gigabyte matter more, which is plausible given the KV-cache work on [Topic: inference-and-serving](../inference-and-serving/summary.md): if the cache is what fills memory and is increasingly tiered to SSD anyway, a part with far more cheap memory and less peak bandwidth may serve more concurrent sequences per dollar. Unproven until silicon exists. [Converge Digest](https://convergedigest.com/positron-ai-raises-875m-asimov-inference-silicon/) (8 min)
- **CPUs and edge silicon**: **Arm Neoverse CSS N4** (Sep 8, 2026) is the conventional server counterpart to the ASICs: up to 128 cores per die at 3.8GHz on TSMC N3P, with LPDDR6 and PCIe 7, claiming 25% better efficiency and double the previous generation's performance on inference-heavy workloads. On device, **Apple's iPhone 18 Pro** ships a 2nm A20 Pro with dual 16-core Neural Engines, doubling on-device FP8 throughput.
- **Interconnects decide parallelism**: NVLink (1.8 TB/s per Blackwell GPU) inside the scale-up domain enables tensor parallelism; InfiniBand or RoCE across nodes (400-800 Gb/s per NIC) carries data and pipeline parallelism. See [Interconnects and scaling: why the network picks your parallelism](interconnects-and-scaling.md).
- **Performance math**: 6ND FLOPs, bytes per parameter, KV-cache size, roofline, MFU, tokens/sec: [Performance math: the arithmetic before every run](performance-math.md). Do this arithmetic before every training run and serving deployment. One caveat at frontier scale: the roofline of a single accelerator increasingly under-predicts, because the binding constraint is getting bytes to the SMs across the fabric, which is the claim both Nvidia's Rubin pitch and AMD's Helios rack numbers rest on.

### Rack-scale competition: Vera Rubin measured, Huawei UnifiedBus, Cornelis

**Vera Rubin NVL72 against GB300 Blackwell, on agentic traffic** (SemiAnalysis, Sep 15, 2026): the first independent measurement behind Nvidia's data-orchestration pitch above. Methodology decides how to read the numbers: the AgentX benchmark **replays real agentic traffic across a fleet of thousands of chips**, so the workload has multi-turn structure, long contexts, high prefix reuse and sub-agent bursts, a different shape from the single-turn traffic accelerator comparisons usually use.

- **Up to 7x better token throughput per megawatt** than GB300, on early pre-release software, against the 3x Nvidia claimed at GTC 2026.
- **1.4x to 3x better throughput per total cost of ownership** at realistic interactivity of 60 to 100 tokens per second. This is the number to use.
- Modelled economics at 75 tokens per second: $159.5B annual revenue and $149.9B modelled profit per all-in utility gigawatt, against GB300's $114.9B and $105.3B, roughly 39 to 42% higher.
- The headline "67x better performance per dollar" is an extreme operating point and should not be quoted.
The per-megawatt figure connects to the supply and grid section below: if energisation rather than fabrication is the 2027 constraint, performance per megawatt decides how much capability a fixed grid connection can host, and a 7x claim on that axis is worth more than any FLOPS comparison. Serving-side reading of the same evaluation on [Topic: inference-and-serving](../inference-and-serving/summary.md). [SemiAnalysis](https://newsletter.semianalysis.com/p/vera-rubin-nvl72-agentic-inference) (35 min)

**Huawei's Ascend 960 roadmap, and the argument that the interconnect is the product** (Reuters, Sep 17, 2026). The first substantial Chinese-silicon entry here, and Huawei's framing puts it in the interconnect discussion rather than the accelerator list. Schedule, pulled forward on stated demand: **Ascend 960DT in Q1 2027** (three quarters earlier than the previous roadmap), **Ascend 960PR in Q3 2027** (one quarter earlier), then Ascend 970 in 2028 and Ascend 980 in 2029 on an annual cadence. Systems: **Atlas 860 SuperPoD** air-cooled in Q2 2027 and **Atlas 960 SuperPoD** liquid-cooled in Q3 2027. Splitting the 960 into training (DT) and inference (PR) variants is the same move Nvidia and AMD have both made.

**UnifiedBus** is the part that matters. It is Huawei's answer to NVLink, and the claim is that superclusters can link up to **a million** AI processors, with more than 1,000 supernodes already shipped to over 370 customers and 11 semiconductors built on the architecture. Read against the NVLink domain above: because stepping outside a domain costs roughly a twentieth of the bandwidth, a vendor constrained on per-chip performance can still compete at rack and cluster scale by making the domain bigger. That is the bet, and it reframes the export-control question from chips to systems.

**Cornelis Active Compute Fabric** (Sep 14 to 18, 2026), $205M led by IAG Capital Partners, with a Qualcomm collaboration announced at the AI Infra Summit. The Intel spinout is attacking Nvidia's **software** lock rather than its silicon: an open, GPU-agnostic scale-up fabric aimed at the fraction of GPU time spent waiting for data, letting accelerators compute and transmit at once. Already shipping, next generation due later in 2026. It belongs next to the NVLink and InfiniBand entries above as the first well-funded open challenge to the **scale-up** domain specifically, as distinct from scale-out, where RoCE already provides a multi-vendor alternative. Whether it works, nobody has answered publicly yet. [TechCrunch](https://techcrunch.com/2026/09/14/ai-infrastructure-company-cornelis-raises-205m-to-chip-away-at-nvidias-dominance/) (8 min)

### Supply, demand and the grid

The demand denominator for every capacity and pricing claim in this KB is Nvidia's datacenter revenue. The Q2 FY27 print (Aug 26, 2026) was $96.2B total revenue (up 106% year on year), of which **$89.0B was datacenter** (up 117% year on year, up 18% sequentially) on the Blackwell Ultra ramp, with $108B guided for the following quarter. Hyperscaler revenue more than doubled year on year; the non-hyperscaler datacenter line (AI natives, enterprises, sovereigns) grew faster still at 138%. [CNBC](https://www.cnbc.com/2026/08/26/nvidia-nvda-earnings-report-q2-2027-live-updates.html) (~8 min)

Nvidia spent part of that on distribution rather than on silicon, confirming the **$12.93 billion acquisition of Hugging Face** on Sep 3, 2026: the default hosting point for open weights, roughly 3 million models and 18 million developers, along with its default training and inference integrations, now sits inside the company that sells the hardware those weights run on. Jensen Huang's statement that the platform stays open and that Nvidia compute will not be required to use it is a promise rather than a fact, and one worth dating and revisiting. [Nvidia](https://blogs.nvidia.com/blog/nvidia-to-acquire-hugging-face/) (~5 min)

That demand is visible in the memory market: DRAM prices were up roughly 500% in the twelve months to August 2026, with 128GB of DDR5 at $3,399, squeezed by AI datacenter demand. [Tom's Hardware](https://www.tomshardware.com/pc-components/ram/memory-prices-climb-500-percent-in-12-months-up-to-10x-the-lowest-ever-tracked-prices-128gb-of-ddr5-now-usd3-399) (~5 min). The industry's answer to HBM scarcity is a new tier: Hot Chips 2026 (Aug 24) coverage included **high-bandwidth flash (HBF)** as a capacity tier alongside HBM, which is the same direction Positron's commodity-memory bet and the SSD-tiered KV caches on [Topic: inference-and-serving](../inference-and-serving/summary.md) point. [Chips and Cheese](https://chipsandcheese.com/) (~15 min)

**Energisation, not fabrication, is the 2027 constraint.** Roughly 15GW of AI compute scheduled to come online in 2027 may sit dark because site-level infrastructure will not be ready: high-voltage transformers on 48 to 60 month lead times, backlogged North American grid interconnection queues, plus cooling, networking, permitting and turbine availability. Against an estimated 66GW of US data-center demand by 2027 that is a large fraction of planned capacity delayed after the chips exist. The claim originates with an Elon Musk post (Aug 29, 2026) and is directional rather than audited, but the transformer and interconnection bottlenecks are independently well documented, and it is the right frame for reading Nvidia's revenue growth: shipped is not the same as energised. [Crypto Briefing](https://cryptobriefing.com/musk-warns-15gw-ai-compute-stranded-2027/) (~5 min)

Supply is beginning to respond. **Samsung is expected to more than double HBM4 and HBM4E output in 2027** (reported Sep 20, 2026), the first sign of capacity answering the roughly 500% DRAM price rise above, with the usual multi-quarter lag before it reaches prices. On the demand side the cost of grid upgrades is being pushed onto developers: the **US House passed H.R. 9340 by 417 to 3** (Sep 16, 2026), requiring state utility regulators to charge data-centre sites above 100MW the full cost of the grid upgrades they trigger, with Senate action pending, the federal counterpart to Massachusetts Executive Order 658. **Nvidia and Google proposed a grid-stress framework** (Sep 16, 2026) built on shifting compute loads and paired generation during stress events, still theoretical with deployment testing next, and notable as the first utility-side proposal from the compute vendors rather than from regulators. Against all of that, SemiAnalysis mapped more than 300 local data-centre restrictions (Sep 15, 2026) and estimates only about **2.3GW** of US capacity is actually delayed by them, which is the number that keeps the moratorium story in proportion next to the energisation estimate above.

### Deep dives

- [GPU architecture: Ampere to Blackwell](gpu-architecture.md) (7 min read · +3h 25m resources): SMs, warps, tensor core generations, TMA/wgmma, HBM vs GDDR, 5090 vs H100.
- [TPUs: systolic arrays and pod-scale machines](tpus.md) (6 min read · +3h 15m resources): systolic arrays, MXU, SparseCore, generations v4 to Ironwood, pod and ICI architecture.
- [Interconnects and scaling: why the network picks your parallelism](interconnects-and-scaling.md) (6 min read · +3h resources): NVLink/NVSwitch, InfiniBand vs RoCE, rail-optimised fabrics, collectives in hardware.
- [Performance math: the arithmetic before every run](performance-math.md) (7 min read · +2h 40m resources): FLOPs per token, memory budgets, roofline, MFU, tokens per second, worked on 5090 and H100.

### Best resources for the topic

- [How To Scale Your Model](https://jax-ml.github.io/scaling-book/) (~6h for the full book) (Google DeepMind): the single best systems-for-LLMs text; TPU-centric with a GPU chapter
- [Modal GPU Glossary](https://modal.com/gpu-glossary/readme) (docs, ~30 min for the core pages): concise, accurate reference for every GPU term
- [SemiAnalysis](https://newsletter.semianalysis.com/) (newsletter, ~45 min per deep dive): the best reporting on datacenter hardware, networking, and accelerator economics
- [Chips and Cheese](https://chipsandcheese.com/) (~30 min per deep dive): microarchitecture deep dives on GPUs and accelerators
- [GPU architecture: Ampere to Blackwell](gpu-architecture.md)
- [Interconnects and scaling: why the network picks your parallelism](interconnects-and-scaling.md)
- [Performance math: the arithmetic before every run](performance-math.md)
- [TPUs: systolic arrays and pod-scale machines](tpus.md)
