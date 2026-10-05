# GPU architecture: visual ideas (built and rejected)

Central question: for one matmul tile of a training step, what keeps the tensor cores waiting, and what did each NVIDIA generation add to stop it? Scores 0 to 2 per question (parameter to move, reproduces a published or measured figure x2, computable from public data x2, shows what a sentence cannot, corrects a misconception, measures the central question, absent from the parent and the CUDA topic, animatable before/after), minus build cost.

## Built
| # | Visual | Where | Score | Data and formulas | Notes |
|---|---|---|---|---|---|
| GA1 | **One tile through mma.sync, wgmma and tcgen05** (before/after animation, 6 steps per generation; counters: matrix instructions, copy instructions, where accumulators live, SM clocks) | Reading s7 | 15 | PTX ISA 9.4 shapes: (128/m)(128/n)(64/k) = 512, 8, 4; 2,048 cp.async of 16 B vs 2 TMA; accumulators 64 KB = 128 registers per thread vs 128 of 512 TMEM columns; clocks at 1,024 (A100 blog) and 2,048 (Hopper blog, "2x") FMAs per SM per clock; none for Blackwell (not published) | Required before/after. Checked by check_page.mjs against window.GA |
| GA2 | **One quadrant's scheduler: 2 warps, 16 warps, 16 warps with 4 loads in flight** (Gantt animation, 21 steps of 100 cycles) | Reading s3 | 14 | Latency 466 cycles (Luo et al. Table IV, A100); greedy-then-oldest scheduler (literature policy, labelled); Python reference hide_sim; steady utilisation 3.6%, 34%, 100%; bound W(n+C)/(n+C+L) | Corrects "max occupancy hides latency": 16 warps still idle 2/3 of the time without memory-level parallelism |
| GA3 | SM per generation (A100, H100, B200/B300, RTX 5090), drawn from counts | Reading s2 | 9 | Ampere, Hopper, Blackwell Ultra blogs; RTX whitepaper; CUDA guide | Static with a toggle |
| GA4 | Divergence bars, divergent vs uniform, K = 1..32 | Reading s5 | 12 | Measured on M1 Pro GPU (3 runs) | Corrects "divergence halves throughput" |
| GA5 | Formats per generation heat table (TFLOPS or ratio to BF16) | Reading s10 | 10 | Vendor pages via FACTS.md | Shows the halving ladder and where B300 and Rubin break it |
| GA6 | **Chip floorplans**: dies, GPCs, enabled/disabled SMs, L2, HBM sites or GDDR controllers from published counts, two chips compared with differing cells highlighted | Tab | 10 | Ampere/Hopper blogs, RTX whitepaper, Blackwell Ultra and Rubin blogs, Jarmusch and Chandrasekaran (B200) | Unknown counts drawn as "n/s" rather than guessed; disabled positions illustrative |
| GA7 | **M1 GPU lab**: latency ladder (pointer chase, 4 KB to 256 MB, H800 levels overlaid), coalesced read and pointer chase against threads (Little's law), occupancy cliff from reserved threadgroup memory | Tab | 13 | Measured here (MLX 0.32.3, 3 runs, medians with run spread); Luo et al. for the overlay | Each chart says what transfers to NVIDIA and what does not |
| GA8 | Predict-then-reveal: can one 4-byte load per thread saturate an H100? | Reading s3 | 7 | 132 x 2,048 x 4 B vs Little's law 0.91 MB | |

## Rejected
| Idea | Why |
|---|---|
| Roofline chart | Parent's Roofline lab owns it (measured); s10 gives ridge numbers only |
| Occupancy calculator | The CUDA topic's GPU simulator matches NVIDIA's header on every case; s4 works one example and links it |
| Real SASS viewer | The CUDA topic's Compiler explorer owns it; s7 cites its findings |
| Systolic array animation | TPUs and other accelerators sibling owns it |
| HBM stack cross-section, bandwidth against working-set size | Memory technology sibling owns them |
| Tensor-core rates of B200 from Jarmusch and Chandrasekaran | Their tables are internally inconsistent (H200 BF16 1,513.5 "achieved" above its 989.5 dense peak); configuration section used only |
| Die photos | Images not computable, and positions of disabled SMs are not published |
| simdgroup_matrix vs FMA on the M1 (no tensor core) | The CUDA topic's Kernel lab already measures simdgroup_matrix matmul; would not teach NVIDIA's tensor cores |

## What the methodology lacked
A rule for microbenchmarks run on a different vendor's hardware: here every M1 chart carries a "transfers" and a "does not transfer" line, and NVIDIA's own numbers are overlaid only from an independent paper, never mixed with vendor peaks.
