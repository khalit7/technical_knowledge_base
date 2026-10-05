# Coverage of the old pages (Reading tab agent)

Old pages saved verbatim in `old/`, copied by a script from the read-only Notion fetch results (2026-10-05): the root (00, last edited 2026-09-28, has a narrated video and four child pages) and its four children (01 GPU architecture, 02 TPUs, 03 Interconnects, 04 Performance math; all last edited 2026-09-22). The old text is treated as unverified notes. Verdicts: **verified** (primary source checked, carried), **corrected** (carried with the correction), **unconfirmed** (no primary source found; not stated as fact), **dropped** (with the reason). "Where" names the Reading section (s1..s10) or another tab.

The Performance calculator agent's verdicts on child 04 are in `../calc/old_perfmath_checks.md` and are not repeated here except where the Reading tab uses the fact.

## Root (00)
| Old claim | Verdict | Where |
|---|---|---|
| Video "the chip, the rack, the substation" (re-cut Sep 23 2026) | stays on the Notion page; it describes the old text. Ask Khalid whether to keep it | n/a |
| Reading instruction: per chip, per scale-up domain, per gigawatt | verified as a framing; rebuilt as a sourced scale ladder (B200: 2.25 PF, 18 PF, 180 PF, about 1,050 EF per GW derived) | s7 |
| Taxonomy diagram (NVIDIA lines, AMD, TPU, ASICs, Huawei, interconnects) | replaced by the bets cards and the Chip atlas | s7, Chip atlas |
| CPU vs GPU: latency cores vs throughput cores | verified and measured (M1 CPU core 97.5 GFLOP/s, GPU core 313) | s1 |
| NVIDIA line A100 to Vera Rubin; Rubin "NVL144, ramping H2 2026" | corrected: NVIDIA's current naming is Vera Rubin NVL72; "production shipments starting this fall" (NVIDIA newsroom May 31 2026); per-GPU 4 PF BF16 dense, 288 GB HBM4 | s7 |
| NVL72 is 72 GPUs in one NVLink domain; outside it "roughly a twentieth of the bandwidth" | verified: NVLink 5 900 GB/s per direction vs 50 GB/s per 400 Gb/s NIC is 1/18 | s6 |
| Nvidia "data orchestration" pitch, "upwards of 3x" from the Vera CPU (TechCrunch, Aug 29 2026) | dropped: secondary press quote of a vendor claim, no hardware number to teach | n/a |
| RTX 5090: 32 GB GDDR7, 1.79 TB/s, native FP4; gaps are capacity and no NVLink | verified (RTX Blackwell whitepaper) | s3, s4, s6 drill |
| MI300X 192 GB when H100 had 80; MI325X 256 GB; MI355X 288 GB, 8 TB/s, FP4/FP6 | verified (AMD data sheets) | s7 |
| MI400 432 GB HBM4, Helios rack 72 GPUs, 2.9 EF, 31 TB, 1.7 PB/s (Hot Chips Aug 24 2026) | verified from AMD pages via the shared facts file (MI455X: 432 GB, 23.3 TB/s, max 2,500 W; Helios 2.9 EF FP4, 1.67 PB/s); the "Hot Chips" date unconfirmed | s7 (MI455X power), Chip atlas |
| "ROCm 10.0 and agent-skills channel" | belongs to the CUDA root (its agent verifies) | n/a |
| TPU systolic arrays, weights pinned, activations stream | verified (How To Scale Your Model, TPUs) | s1 |
| ICI switchless torus; mesh axes | verified (scaling book; TPU v4 paper) | s6 |
| Ironwood 4.6 PFLOPS FP8, 192 GB, pods to 9,216 | verified: 4,614 TF FP8, 192 GiB (docs) / 192 GB (blog), 9,216 chips, 42.5 EF | s6, s7 |
| Ironwood sold to others; "up to 50% better perf per dollar than B200/B300" (Sep 8 2026) | unconfirmed (no primary source fetched); dropped | n/a |
| SemiAnalysis TPU InferenceX teardown | dropped as a claim; SemiAnalysis is in Further reading | Further reading |
| Groq LPU: no HBM, ~230 MB SRAM per chip, static schedule, deterministic | corrected: Groq's current page lists the NVIDIA Groq 3 LPX rack (announced): 256 LPUs, 128 GB SRAM, 40 PB/s, 1,000 tok/s/user; static scheduling verified (Groq, Mar 7 2025); first-gen 230 MB unconfirmed here | s3, s7 |
| Cerebras WSE-3: ~46,000 mm2, ~900,000 cores, 44 GB SRAM, 125 PFLOPS | verified (press release Mar 13 2024; 46,225 mm2); 125 PF is sparse (CS-3 datasheet, via Chip atlas) | s7 |
| Cerebras deployed by AWS, used by OpenAI | unconfirmed; dropped | n/a |
| CS-4 (Aug 19 2026): 3 WSE-3 Turbo, 250 PF, 43.2 PB/s, 30x GPU, Q3 shipments | partly verified (Cerebras site lists WSE-3 Turbo 250 PF and CS-4 "30x"); left to the Chip atlas; dropped from Reading | Chip atlas |
| AWS Trainium/Inferentia: vertical integration, Neuron trails CUDA, Project Rainier | bet verified as framing; Trainium2/3 numbers verified (Neuron docs); Project Rainier unconfirmed, dropped | s7 |
| Qualcomm + Amazon co-designed inference silicon (Sep 8 2026) | unconfirmed; dropped | n/a |
| "Roughly a quarter of 2026 AI server shipments are ASIC-based" | unconfirmed (no source); dropped | n/a |
| Positron Asimov, $875M at $5B (Sep 10 2026), commodity-memory bet | unconfirmed (secondary source only); dropped. The idea it taught (capacity vs bandwidth for inference) is carried by the memory section | s3 |
| Arm Neoverse CSS N4; iPhone 18 Pro A20 Pro | dropped: not accelerators for training, unverified | n/a |
| NVLink 1.8 TB/s per Blackwell GPU; IB/RoCE 400-800 Gb/s per NIC | verified | s6 |
| Single-accelerator roofline under-predicts at frontier scale | kept in spirit (MFU, communication) | s5, s6 |
| Vera Rubin NVL72 vs GB300 (SemiAnalysis, "Sep 15 2026"): up to 7x per MW, 1.4-3x per TCO at 60-100 tok/s, $/GW economics, "67x" | corrected date: published Sep 14 2026 (paywalled); 7x and 1.4-3x verified from the accessible part; $159.5B/$114.9B per GW and 67x not verifiable (paywall), dropped | s8 |
| Huawei Ascend 960DT/960PR roadmap, Atlas SuperPoDs, UnifiedBus to a million processors (Reuters Sep 17 2026) | unconfirmed (no primary source fetched); dropped | n/a |
| Cornelis Active Compute Fabric, $205M (Sep 2026) | unconfirmed; dropped | n/a |
| DSX Ready certification (Sep 22 2026) | unconfirmed; dropped | n/a |
| China may clear ByteDance/Alibaba; 1M RTX Pro 5500 | unconfirmed; dropped (news, not a hardware idea) | n/a |
| Nvidia Q2 FY27: $96.2B revenue, $89.0B datacenter, $108B guide | dropped: earnings do not teach a hardware idea (primary source not fetched) | n/a |
| Nvidia acquires Hugging Face for $12.93B (Sep 3 2026) | dropped: not hardware | n/a |
| DRAM prices up ~500%, 128 GB DDR5 $3,399 (Tom's Hardware) | dropped: secondary source, not a hardware idea | n/a |
| High-bandwidth flash (HBF) at Hot Chips 2026 | unconfirmed; dropped (candidate for the memory child page) | n/a |
| 15 GW stranded in 2027 (Musk post), 66 GW US demand, transformer lead times 48-60 months | unconfirmed (not primary); dropped. Power is taught with the IEA's 415 TWh (2024) and 945 TWh (2030) | s8 |
| Samsung to double HBM4 output in 2027; H.R. 9340; Nvidia+Google grid framework; SemiAnalysis 300 restrictions, 2.3 GW | unconfirmed; dropped | n/a |
| 10-year Treasury 5.17%; Anthropic $11.6B Akamai deal; Project Suncatcher launch Oct 1 2026 with four TPUs | unconfirmed; dropped (finance and news, not hardware teaching) | n/a |
| Best resources: How To Scale Your Model, Modal GPU Glossary, SemiAnalysis, Chips and Cheese | verified links | Further reading |

## Child 01: GPU architecture, Ampere to Blackwell
| Old claim | Verdict | Where |
|---|---|---|
| SMs: 108 A100, 132 H100, 148 per die B200, 170 RTX 5090 | A100, H100, 5090 verified; "148 per die" corrected: B200 SM count is not on NVIDIA's pages fetched; Blackwell Ultra has "up to 160 SMs" per GPU (two dies). Chip atlas holds it | s2, Chip atlas |
| 4 processing blocks per SM, each with a warp scheduler | verified (sub-partitions; scaling book) | s2 |
| Warp = 32 threads, SIMT; up to 64 resident warps per SM | verified (Hopper tuning guide) | s2 |
| "~400 cycles on a DRAM load" | unconfirmed number; carried as "hundreds of cycles" | s2 |
| "branch divergence inside a warp halves throughput" | corrected: divergent paths are serialised (cost depends on the paths); details on the CUDA root | s2 |
| 4 tensor cores, 256 KB register file, up to 228 KB shared memory per SM (Hopper); 50 MB L2 | verified | s2 |
| Tensor core generation table (Ampere TF32/BF16/sparsity, cp.async; Hopper FP8, TMA, wgmma, clusters; Ada FP8 no TMA/wgmma; Blackwell FP4/FP6, tcgen05, TMEM 256 KB; GeForce Blackwell TMA but no TMEM/tcgen05) | Ampere, Hopper, Blackwell rows verified (A100 whitepaper, Hopper tuning guide, Blackwell Ultra blog, PTX ISA); Ada and sm_120 rows unconfirmed here, left to the CUDA root | s2 |
| TMA, wgmma (4 warps, 128 threads), clusters with DSMEM | verified | s2 |
| tcgen05 accumulates into TMEM; one MMA spans 2 SMs | verified (PTX ISA via facts file; Blackwell blog) | s2 |
| NVFP4: FP8 scale per 16 values; doubles throughput over FP8 | verified (NVIDIA Jun 24 2025; HGX table) | s4 |
| HBM: stacked on interposer, 1024-bit per stack; H100 3.35, H200 4.8, B200 8 TB/s, Rubin HBM4 "~13 TB/s class" | verified except Rubin, corrected: NVIDIA lists 22 TB/s (HGX page, Rubin blog) and 19.2 TB/s (NVL72 page), disagreement in the facts file | s3, Chip atlas |
| GDDR7 5090 512-bit, 1.79 TB/s, 32 GB, "no ECC by default" | bus and bandwidth verified; ECC claim unconfirmed, dropped | s3 |
| Ridge "~295 for H100 BF16 and rising every generation" | corrected: 153 (A100), 295 (H100), 281 (B200) at BF16; rises only with FP8/FP4 | s5 |
| NVLink per GPU: A100 600, H100 900 GB/s, B200 1.8 TB/s; NVL72 130 TB/s; GeForce no NVLink | verified | s6 |
| "dual 5090s ... PCIe 5.0 ~64 GB/s per direction, ~28x less than NVLink" | corrected: per direction it is 64 against 450 GB/s, about 7x (14x against the 900 GB/s two-direction total), not 28x; the "Khalid's dual 5090s" framing dropped (no NVIDIA GPU in this build) | s6 drill |
| RTX 5090 vs H100 table: BF16 ~210 (FP32 acc) vs 989; FP8 ~419 vs 1,979; FP4 ~838 vs n/a | BF16 and FP8 verified; FP4 corrected: 1,676 dense (838 is not a whitepaper figure for dense FP4) | s4 |
| 5090 CUDA cores 21,760, H100 16,896 | H100 verified (132 x 128); 5090 = 170 x 128 = 21,760 consistent, left to Chip atlas | Chip atlas |
| Datacenter table: A100 312, 80 GB, 2.0 TB/s, 400 W; H100/H200; B200 192 GB, 8 TB/s, 2,250/4,500/9,000, 1,000 W; B300 288 GB, "FP4 dense 15 PF", 1,400 W | A100, H100, H200 verified; B200 capacity corrected (180 GB HGX/DGX, 186-192 elsewhere); B200 power corrected (up to 1,200 W per NVIDIA blog Table 2); B300 FP4 dense 15 PF verified (blog), 13.5 per GPU from HGX B300 totals; 1,400 W verified | s7, s8, Chip atlas |
| Rubin "~50 PFLOPS NVFP4 (inference)" | verified as a sparse figure (footnoted); 35 PF dense training | Chip atlas |
| MI400 2.9 EF per Helios rack, precision unstated | corrected: FP4 per AMD's Helios page | Chip atlas |
| B200 two reticle-limit dies, 10 TB/s NV-HBI, first chiplet NVIDIA GPU | verified (Blackwell architecture page); "first" unconfirmed, dropped | s2 |
| B300 trades FP64/INT for 50% more FP4 | verified (HGX B300 FP64 10 TF and INT8 3 POPS sparse; FP4 15 vs 10 PF dense) | Chip atlas |
| Vera Rubin "entered production mid-2026" | verified ("ramping into full production", May 31 2026) | s7 |
| SemiAnalysis Rubin vs GB300 paragraph | see root | s8 |
| Best resources: Modal, scaling book GPUs, H100 whitepaper, Blackwell page, Chips and Cheese, Horace He | verified links | Further reading |

## Child 02: TPUs
| Old claim | Verdict | Where |
|---|---|---|
| Systolic array idea; energy argument | verified (TPU v1 paper, scaling book) | s1 |
| MXU 128x128 (v4/v5), 256x256 (v6e/v7) | corrected: scaling book says v6e is 256x256 and "all previous generations" 128x128; Ironwood's size unconfirmed | s1 |
| VPU, VMEM/CMEM, compiler-scheduled memory | verified (scaling book) | s1 |
| SparseCore (v4 onward) | verified (TPU v4 paper: 5x-7x on embeddings, 5% of die area and power) | Chip atlas, child page |
| Generations table v1 to Ironwood | v5e, v5p, v6e, TPU7x verified (Cloud docs via facts file); v1 92 TOPS, v2/v3, v4 275 TF unconfirmed here (left to the TPU child page) | Chip atlas |
| Ironwood pod 42.5 EF FP8, 1.77 PB HBM; Anthropic deal for up to 1M TPUs | 42.5 EF verified; 1.77 PB = 9,216 x 192 GB derived; Anthropic deal unconfirmed, dropped | s6 |
| "roughly a B200-class part (4.6 vs 4.5 PF FP8, 192 GB on both, 7.4 vs 8 TB/s)" | verified per chip (B200 FP8 4.5 PF dense HGX, 180 GB HGX) with the capacity caveat | s7 |
| 2D torus v5e/v6e, 3D v4/v5p/Ironwood; ICI ~1.2 TB/s per Ironwood chip | verified (scaling book; Ironwood blog 1.2 TBps bidirectional) | s6 |
| OCS at cube boundaries, twisted tori | verified (TPU v4 paper) | s6 |
| TPU vs GPU summary | carried as interview answer | s10 |

## Child 03: Interconnects
| Old claim | Verdict | Where |
|---|---|---|
| Bandwidth hierarchy table: HBM 3.35-8 TB/s, NVLink 900 GB/s / 1.8 TB/s, IB 50-100 GB/s per NIC, storage Ethernet ~10 GB/s | verified except storage tier (unconfirmed, dropped); directions made explicit | s6 |
| NVLink domains: 8 (HGX), 72 (NVL72, 130 TB/s), "144 with Rubin NVL144", 72 in Helios | 8, 72, 130 TB/s verified; NVL144 corrected (NVIDIA now names it Vera Rubin NVL72); Helios 72 verified | s6, s7 |
| NVLink SHARP in-switch reduction | verified in kind (Quantum-X800 SHARP v4 for InfiniBand); NVLink SHARP left to the child page | s6 caption |
| UnifiedBus, Cornelis | see root (dropped) | n/a |
| InfiniBand vs RoCE (credit-based lossless, adaptive routing, SHARP; RoCE needs PFC/ECN); NDR 400, XDR 800 Gb/s | verified (Quantum-X800 page for 800 Gb/s); Llama 3 on RoCE verified | s6 |
| xAI Colossus runs Ethernet; Spectrum-X; UEC | unconfirmed here; dropped | n/a |
| Rail-optimised topology, ~32-node scalable units | unconfirmed here; for the interconnects child page | n/a |
| Collective costs: ring all-reduce 2S(N-1)/N; RS/AG S(N-1)/N; all-to-all for MoE; P2P for PP | verified (standard; NCCL docs) | s6 |
| TP inside NVLink; PP/DP across nodes; HSDP | verified with Llama 3 Table 4 and DeepSeek-V3 | s6 |
| "Running TP across InfiniBand wastes 90%+ of your FLOPs" | corrected: the calculator gives 141% of layer compute in communication for 70B TP8 over 400 Gb/s (so about 59% of time waiting if nothing overlaps), not 90%+ | s6 |
| Dual 5090s PCIe TP=2 advice | kept as a drill (251 ms all-reduce of 16 GB over PCIe) without the personal hardware framing | s6 |
| Sanity: 16 GB all-reduce over 400G IB ~0.64 s; over NVLink 4 ~70 ms | corrected: 2(N-1)/N x S / B gives 0.56 s and 62.5 ms for N = 8 (the old 2S/B is the large-N limit) | s6 |

## Child 04: Performance math
Verdicts in `../calc/old_perfmath_checks.md`. Used in the Reading tab: 6ND (s1, s5), 16 bytes per parameter (s1, s3), KV per token 128 KiB (s3), ridge points (s5, with the "rising" correction), decode ceiling = bandwidth / bytes (s3), MFU definition and calibration (s5), the checklist (s9). Its two corrections (the 64K FP8-KV example's "/8" should be "/2", and the activation formula's s and b swapped) are carried by the calculator, not the Reading tab. Best resources (Transformer Math 101, kipply, scaling-book rooflines, Horace He, PaLM Appendix B): all in Further reading.

## Counts
87 rows: verified 42, unconfirmed 16, corrected 15, other 8, dropped 6.
