# Visual ideas: built and rejected

Question the page keeps returning to: given a fixed KV memory and a step of fixed cost, which rule for "who runs, how
many tokens, where their cache lives" buys what, and how do you check it on your own server?

Scores 0 to 2 on: a quantity the reader moves; defaults reproduce a published figure (double); every input computable
(double); shows what a sentence cannot; corrects a misconception; measures the central question; absent elsewhere;
animation point (step by step, ideally against the method it replaced). Build cost subtracted.

## Built
| # | Idea | Where | Why it earns its place | Data |
|---|---|---|---|---|
| B1 | **One step for Orca's four requests, animated**: tensor batching (four separate passes, four weight reads) against selective batching (one [7, H] stack, split only for attention), counters for weight reads and tokens per pass | Reading s1 | Khalid's before/after pattern on the paper's own example (Orca Fig. 4 and 5); shows why the scheduler counts tokens | Orca paper |
| B2 | PagedAttention Fig. 2 redrawn from its printed labels (four kinds of memory) | Reading s2 | The three wastes named and sized; labels transcribed, segment order from the stacking | arXiv 2309.06180 |
| B3 | **Memory share holding tokens on real request lengths**: Max/Pow2/Oracle contiguous against paged at four block sizes, trace and max_tokens selectors | Reading s2 | Corrects "paging saves 60 to 80%" into "it depends on max_tokens against real answers": with Kimi's long prompts an oracle wastes 2%, a 16,384 reservation 55% | Mooncake traces, gen_frag.py |
| B4 | **Sixteen real agent requests through a prefix cache, five policies animated** (LRU tail first, LRU head first, FIFO, LFU, Belady), three cache sizes, cache drawn in eviction order, hits outlined, orphans counted | Reading s3 | The tie-break and the orphan problem are invisible in prose; a real excerpt (three tool-prompt families) beats an illustration | toolagent trace requests 11,890 to 11,905, gen_anim.py |
| B5 | Predict: does the Mooncake Table 1 reproduce on the released trace? | Reading s3 | Belief first; the honest answer is "same shape, 2 to 6 points higher" | Table 1 vs replay |
| B6 | **Reload or recompute calculator** (three models, five links, three prefix lengths) | Reading s4 | Makes the offload decision a ratio; shows reload wins by 4x to 40x except slow SSD on fast GPUs | parent planner, simulator roofline, bench pp512 |
| B7 | **Stall against TTFT per token budget**: M1 Pro measured (median and range of 3 runs) with the simulator's prediction, and the simulated H100 | Reading s5 | The chunked-prefill trade on a real engine, plus a check of the simulator on a new experiment | run_chunk.sh, gen_sched.py |
| B8 | **Two clients through FCFS, VTC and priority, animated over time**: per-request TTFT dots and stacked service per second | Reading s7 | Fairness is a time-series property; the same seeded requests under three policies | gen_sched.py fair_case |
| B9 | Eviction lab: hit rate against cache size, six policies, three traces, three units (blocks, tokens, GB for three models), table at a chosen size with share of Belady and orphans | Eviction lab s1 | Answers "which policy" and "how much memory" on a full hour of real traffic | gen_evict.py |
| B10 | Two-tier stacked bars with time saved per request | Eviction lab s2 | Turns hit rates into milliseconds for a chosen model | gen_evict.py replay_tiers |
| B11 | Published-vs-replay tables (Mooncake Table 1, FAST'25 Fig. 9 labels) and vLLM's real block pool as referee | Eviction lab s3, s4 | The lab's numbers are checked against both the authors and the engine | vllm_evict.py |
| B12 | Scheduling lab: chunk tables, budget sweep under steady traffic, two-client table, SJF chart, preemption table, check tables | Scheduling lab | Room for the full grids behind the Reading's single numbers | gen_sched.py, vllm_priority.py, regress.py |
| B13 | KV compression experiment: accuracy and perplexity against keep ratio for seven policies, freeable blocks, the needle's survival, which positions each policy keeps on one example | KV compression tab | The "cheap control" lesson on a real model, with the realisable saving beside the algorithmic one | kvc.py |

## Rejected
- **A live JavaScript port of the eviction policies and the scheduler** with free sliders: everything is precomputed in Python from the checked code instead; a second implementation would need its own parity checks and adds nothing the grids do not show.
- **Rebuilding the parent's Serving simulator tab** (static against continuous, paged against contiguous animations): linked by name instead.
- **A per-head heatmap of all 28 layers x 8 KV heads** for the compression experiment: too dense at phone width; replaced by the coverage strip (share of heads keeping each position).
- **A block-size waste animation**: the trace calculator (B3) shows the same with real lengths; an animation of one request filling blocks would teach less.
- **SGLang radix-tree animation**: owned by the SGLang page.
- **Disaggregation and routing visuals**: owned by the distributed and production pages.
- **A KV-quantization quality sweep beyond one model**: one llama.cpp perplexity run per cache type is enough to anchor section 8; quantization formats are owned by Quantization and Precision.

## What the methodology lacked for this page
A rule for traces: when a published production trace exists, replay it before inventing workloads, report what the
authors' own tables give on the same file, and say plainly when the released file and the paper disagree (here the mean
input length: 7,590 in the report, 8,590 in the file).
