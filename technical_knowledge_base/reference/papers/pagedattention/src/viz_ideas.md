# Visualisation ideas: PagedAttention (vLLM)

The question the paper keeps returning to: **where does KV cache memory go under contiguous allocation, and how many more requests fit once it is paged?** Every visual either runs the allocation rules on the paper's own numbers or rebuilds one of its figures from their vector graphics.

Scoring follows `html_utils/interactive-html-ideas.md` section 2 (0 to 2 each; reproduces and computable count double; build cost subtracted; plus one for a step-by-step animation against the method it replaced), with the paper criteria R (runs the paper's own mechanism) and P (supports a predict-then-reveal question).

## Built

| id | Idea | Placement | Score | Why |
|---|---|---|---|---|
| P-pagedattention.1 | **KV cache simulator, before/after animation**: the same eight requests on the same 64 slots, Orca (Max), Orca (Pow2), Orca (Oracle) with a buddy allocator, and vLLM with 4-slot blocks on demand; one square per slot, coloured by token, reserved, internal fragmentation, rounding/free; counters for steps, running/waiting/done, preemptions | Own tab, Simulate the KV cache | 15 (R 2, anim 1) | The method's "systems" ingredient and Khalid's DeepSeek-MLA pattern: the replaced method and the new one on one input, to scale. Shows Figure 3's three wastes appearing and vanishing. |
| P-pagedattention.2 | **The same simulator at the paper's scale** (15,728 slots, Figure 11 histograms, the released benchmark's filters and limits), with trace, block size, samples per request and seed; waste bars beside Figure 2's and batch sizes beside Figure 13's | Simulate tab | 14 (R 2) | Reproduces Figure 2 and Figure 13a approximately and independently (Orca (Max) exactly 7, 8.9% free; vLLM about 96%); Alpaca's vLLM batch does not reproduce (177 against 132.44), said plainly with the likely reason (arrival-bound). Parallel-sampling savings 6.2/9.2/9.9% against 6.09/8.53/9.79%. The JS port is checked against `sim.py` number for number. |
| P-pagedattention.3 | **Block tables animated on the paper's own Figures 6 to 9**: one request, two requests, parallel sampling with reference counts and copy-on-write, beam search with blocks freed | Reading, Block tables | 13 (anim 1) | The paper's walk-through, stepped with captions and counters, using its block numbers and words so the reader can hold the figure beside it. |
| P-pagedattention.4 | **Throughput curves with a latency threshold slider** (Figures 12, 14, 16, 17 from vector paths): crossing rate per system and vLLM's ratio, beside the text's claim | Figures tab | 13 (P) | The paper never states the latency it compares at; making it a control shows the multiples depend on it, and exposed the 175B panel below "1.7x to 2.7x". |
| P-pagedattention.5 | **Ablations rebuilt** (Figure 18a kernel, Figure 19 recompute against swap) with the claims' out-of-range cells marked | Figures tab | 11 | Found that "20 to 26%" holds only at batch 32 and that the "20% of swapping's latency" sentence fails as written (117% at 256). |
| P-pagedattention.6 | **Figure 1 (right) redrawn** from its points: memory and throughput against batch size, existing systems against vLLM | Reading, Problem | 9 | The problem statement in one chart: memory hits 40 GB at a batch of 8 against 38.4. |
| P-pagedattention.7 | **Three predict-then-reveal questions**: Orca (Oracle)'s token share (38.2%), parallel-sampling saving (9.79%), best block size on Alpaca (16 and 32) | Reading | 9 (P) | Each at a point where intuition fails: an oracle still wastes 62%; sharing a short prompt saves little; the biggest block is not the fastest. |
| P-pagedattention.8 | **Table 1 recomputed** from OPT configurations, plus the bar-chart table and Figure 11 histograms with recomputed means | Figures tab | 8 | 13B and 175B slots reproduce; 66B gives 9.56K against 9.7K (memory column probably rounded); 175B's 346 GB is below 2 x 175. |
| P-pagedattention.9 | **"Every number in the text, checked"** table: claim, section, printed, recomputed, verdict | Figures tab | 7 | One place for the honesty pass; feeds "How much of this to believe". |
| P-pagedattention.10 | **Then and now timeline with a survived/changed table** | Own tab | 7 | The design became standard; the swap path was removed in 2026; each step sourced. |

## Rejected

- **A trained toy model**: the paper's claim is about allocation, not about what a model computes; a model would add size and teach nothing.
- **Simulated latency curves (seconds)**: would need a cost model for prefill, kernel overhead and swapping the paper does not give; the simulator counts steps only and says so.
- **Swapping in the simulator**: preemption is by recomputation, the released default for single sequences; swapping would need PCIe timings.
- **Reading curve values by eye**: replaced by vector-path extraction calibrated on each panel's ticks.
- **A paged-attention kernel visual (warps reading blocks)**: the kernel is the paper's least novel part and its cost is covered by the Figure 18a rebuild.

## What the methodology lacked for this page

- A rule for figures whose claims depend on an unstated reading threshold: make the threshold a control and report the range, not a single multiple.
- A rule for simulators: port the Python line for line into JS and have the check script compare every default number, so the page and the script cannot drift.
