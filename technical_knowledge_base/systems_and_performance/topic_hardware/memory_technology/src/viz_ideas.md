# Visualisation ideas: Memory technology

What the text needs to be understood: why a read's cost depends on the reads before it (rows, banks); where bandwidth and energy go; the cache ladder as numbers, not a diagram; how bus width and pin rate make bandwidth; capacity against bandwidth as tiers; what the KV cache does to memory on real architectures. Scored 0 to 2 per criterion as in `html_utils/interactive-html-ideas.md` section 2 (reproduces/computable count double; build cost subtracted; +1 for a before/after animation).

## Built

| Idea | Placement | Score | Why |
|---|---|---|---|
| **One DRAM bank, the same 16 reads in three orders** (sequential row hits, random rows in one bank, random rows over 16 banks): Gantt of precharge, activate, column latency, burst on one time scale, banks strip, counters for time, rows opened, bytes opened vs used, effective rate | Reading s2 | 13 (anim 1) | The mechanism behind coalescing, row-buffer locality and bank parallelism, before/after on one input, drawn to scale. Timings illustrative and labelled; the JS (`BANKSIM`) equals `bank_sim()` in `code/build_data.py`. |
| **One conversation grows** on 7 real architectures (MHA, GQA, sliding window, local/global, alternating, hybrid linear, MLA): weights and KV drawn to scale inside one GPU's memory, 1K to 128K tokens, counters for KV, KV/weights, batch-1 ceiling, conversations that fit | KV tab | 13 (anim 1) | Khalid's favourite pattern: same input, the replaced and the new method, to scale. Does not repeat the DeepSeek page's MLA mechanism animation; this one is the memory view across architectures. |
| **Growth since A100** (BF16, bandwidth, capacity indexed; ridge; full-memory reads per second) | Reading s1 | 10 | The memory wall in NVIDIA's own numbers: bandwidth kept pace, capacity did not. |
| **Measured ladder** (bandwidth and latency against working set on the M1 Pro GPU, published cache sizes shaded) | Reading s3 and Memory lab | 12 (real data) | Real measurements; Little's law check against the CUDA root's simulator. |
| **Width x rate rectangles** (RTX 5090, H100, MI300X, one HBM4 stack; area = bandwidth) | Reading s4 | 9 | Makes the bandwidth equation visible: wide-and-slow vs narrow-and-fast. |
| **Energy bars** (Horowitz 45 nm table, log scale) | Reading s2 | 8 | Why bandwidth costs power, in one glance. |
| **Bandwidth ladder of tiers** (published SRAM to NIC; toggle: this laptop measured from caches to random 4 KiB SSD reads) | Reading s5 | 10 | Capacity against bandwidth as rungs, with measured rungs. |
| **Random-block bandwidth** (16 B to 16 KiB) | Memory lab 2, cited in s2 | 11 (real data) | Shows the line-granularity cliff and why KV blocks of a few KB read near full speed. |
| **Decode attention against cache bytes** (MHA, GQA, MQA; 1K to 128K) | Memory lab 3, cited in s6 | 11 (real data) | Decode is bound by bytes when the kernel is good; MQA shows when it is not. |
| **KV against context for 13 configs** + table + planner (conversations that fit, decode ceilings) | KV tab | 12 | Real configs; the planner's JS equals `plan()` on 1,170 cases. |

## Rejected
- **Contiguous vs paged KV allocation animation**: already built, at the paper's scale, on the PagedAttention paper page (tab "Simulate the KV cache"); linked instead.
- **MLA mechanism animation**: on the DeepSeek page; linked.
- **Decode token on four memories**: the parent root's section 3 animation; linked.
- **CPU latency ladder**: the C++ page Part 2 owns it; this page measures the GPU's.
- **Bandwidth against threads in flight**: the CUDA root's GPU simulator measured it on this GPU; cited for the Little's law cross-check.
- **HBM stack cross-section drawing**: a static picture with no numbers to read from; the mech cards and width x rate chart carry the idea.
- **Capacity vs bandwidth log-log scatter**: many tiers have no single capacity (links, host memory); the ladder bars show capacity as text instead.
- **HBM price history**: no primary-source prices (and Khalid removed price-history tabs elsewhere).

## What the methodology lacked
A rule for measured data whose labels are inferences (cache levels read off a curve without performance counters): the page shades published sizes "for orientation only" and says the steps do not line up exactly.
