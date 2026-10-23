# Research notes: Gaudi 3, SambaNova, Etched, photos (fetched 2026-10-23)

## Intel Gaudi 3
Source: Roman Kaplan (Intel), "Intel Gaudi 3 AI Accelerator: Architected for Gen AI Training and Inference", Hot Chips 2024 slides,
https://www.hc2024.hotchips.org/assets/program/conference/day1/60_HC2024.Intel.RomanKaplan.Gaudi3-0826.pdf (text extracted with pdftotext).
- Generations table: Gaudi 16 nm, 400 W, 60 TFLOPs BF16, 32 GB, 900 GB/s; Gaudi 2 7 nm, 600 W, 432, 96 GB, 2.46 TB/s; Gaudi 3 5 nm, "900W (Air) / 1200W (Liquid)", "1835 TFLOPs", "128 GB", "3.67 TB/s"; embedded NIC 2 / 4.8 / 9.6 Tb/s bidirectional.
- "2 compute dies"; "8 HBM2e stacks"; "BF16 Matrix TFLOPs 1835", "FP8 Matrix TFLOPs 1835", "BF16 Vector TFLOPs 28.7", "MME Units 8", "On-die SRAM Capacity 96 MB".
- "Each DCORE: 2xMME, 16xTPC, 24MB cache"; "24 RDMA NIC 200GbE ports".
- MME: "Configurable, not programmable"; "Each MME is a large output stationary systolic array:"; "256x256 MAC structure w/ FP32 accumulators"; "64k MACs/cycle for BF16 and FP8".
- TPC: "Total of 64 TPC units across the chip"; "Executes non-Matmul operations"; "VLIW with 4 separate pipeline slots".
- HLS3 node: "8x Gaudi 3 OAM Cards"; "Peer-to-peer (P2P) connection between each pair of Gaudi3 cards"; "Gaudi NICs are used both for scale-up and for scale-out"; "No need for a network switch inside the node to support scale-out"; "Scale-up BW: Total of 67.2Tb/s bi-directional"; "Scale-out BW: Total of 9.6Tb/s bi-directional".
- Derived (recompute.py): clock = 1835e12 / (8 x 65,536 x 2) = 1.75 GHz (not on the slides); 8 x 21 x 200 Gb/s x 2 = 67.2 Tb/s; 8 x 3 x 200 x 2 = 9.6 Tb/s.
- Falcon Shores: TechCrunch, Jan 30 2025, https://techcrunch.com/2025/01/30/intel-wont-bring-its-falcon-shores-ai-chip-to-market (Intel's Q4 2024 call: internal test chip only).

## SambaNova SN40L
Source: Prabhakar et al., "SambaNova SN40L: Scaling the AI Memory Wall with Dataflow and Composition of Experts", arXiv:2405.07518 (v1 HTML).
- "520 MiB of on-chip PMU SRAM, 64 GiB of co-packaged HBM, and up to 1.5 TiB of DDR DRAM (using pluggable DIMMs)."
- "Each SN40L RDU socket has 638 BF16 TFLOPS of peak compute performance"
- "Unlike conventional fusion, streaming dataflow executes operators as a coarse-grained pipeline."; "fuse hundreds of complex operations with arbitrary access patterns into a single kernel call"
- PCU "is configurable as an output stationary systolic array or as a pipelined SIMD core."
- Samba-CoE: "a single SN40L Node that contains eight SN40L RDU sockets and a host"; "achieves an overall speedup of 3.7x over a DGX H100 and 6.6x over a DGX A100"; "the 8-socket RDU Node reduces machine footprint by up to 19x".
- SambaNova RDU page https://sambanova.ai/rdu (fetched 2026-10-23): SN50, fifth-generation RDU; 8 chips per node; 1600 TFLOPS BF16, 3200 FP8; 432 MB SRAM; 64 GB HBM2E; DDR5 up to 512 GB; scale-up up to 256 RDUs. SN40 column: 16 chips per node, 640 TFLOPS, 520 MB, 64 GB, up to 512 GB DDR5, up to 16 RDUs. Products named: SambaCloud, SambaStack, SambaRack.

## Etched Sohu
- Announcement https://www.etched.com/announcing-etched returns 404 (2026-10-23); web.archive.org not reachable from this machine.
- Quoted on LessWrong, Jun 26 2024, https://lesswrong.com/posts/qhpB9NjcCHjdNDsMG/new-fast-transformer-inference-asic-sohu-by-etched : "They claim 500k tokens per second with Llama 70B"; a comment quotes the announcement: "Benchmarks are for Llama-3 70B in FP8 precision, 2048 input/128 output lengths." Memory (144 GB HBM3E) appears only in secondary reports: not used.

## Photos
- Wikimedia Commons MediaSearch for Cerebras, "wafer scale engine WSE", Groq chip, AMD Instinct, Trainium/Inferentia/"Cerebras CS": no usable openly licensed photo of these accelerators (logos, Instinct MI50 screenshots only). The Commons API was rate-limited.
- Used instead: the three TPU v4 figures (CC BY 4.0) already in topic_jax_and_tpu/tpu_programming_and_performance/img, copied to ../img.
