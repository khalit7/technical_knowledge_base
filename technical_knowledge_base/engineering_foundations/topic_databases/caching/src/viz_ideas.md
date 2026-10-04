# Visualisation ideas: Caching

The question the page keeps returning to: which copy is a reader seeing, and what did keeping it cost or save? Scored 1 to 5 on teaching value (T), faithfulness to real data (F), cost (C, 5 = cheap). Built ones first.

| Idea | T | F | C | Placement | Data | Notes |
|---|---|---|---|---|---|---|
| Stale-set race replayed from real trials: reader and writer lanes on a millisecond axis drawn to scale, the reader's pause as a bar, cache and Postgres state as counters, a caption per event; toggle delete on write / lease / versioned keys / delayed double delete on the same trial (same seeded delays) | 5 | 5 | 3 | Reading section 3 (the before/after animation) | `m_race.py`: two Python clients, Postgres 16.2 and Redis 8.8, 400 trials per strategy, timestamps recorded | The suggested animation. The same trial number has the same delays under every strategy, so the fix is seen on one input. Results table: 56.8%, 7.5%, 0, 0, 36% stale. |
| Cache lab: workload, policy, cache size, two miss costs; hit ratio, cost-weighted hit ratio, backend time, keys held; all policies by size, bars at the chosen size | 5 | 5 | 3 | Tab | `m_evict.py` (94 real Redis runs), `m_sim.py` (exact LRU, LFU, FIFO, OPT, GreedyDual), `m_pg.py` (miss costs) | Shows GreedyDual: worst hit ratio, most work saved. Defaults reproduce nothing published; every point is a measurement here. |
| Threshold lab: model, dataset, threshold, true-match share, call and wrong-answer cost; served, wrong among served, value per 1,000 queries; nearest-neighbour view with unlabelled matches shown | 5 | 5 | 4 | Tab | `m_sem.py`: QQP validation (40,430 pairs), PAWS test (8,000), all-MiniLM-L6-v2 and bge-small-en-v1.5 | Mixing measured TPR/FPR with a chosen prior is labelled; the costs are illustrative inputs. |
| Skew of one real Wikipedia hour: share of views against share of pages (log x), and rank-frequency with the Zipf fit | 4 | 5 | 4 | Reading 1 | `m_skew.py`, `m_skew6.py` | Real access counts; the hour-to-hour overlap number comes from six hours. |
| Hit ratio by policy and size inline, per workload, with OPT and exact LRU dashed | 4 | 5 | 4 | Reading 5 | same as the lab | The findings list under it is computed from the runs, so prose cannot drift from data. |
| Cache-layer ladder on a log scale with "what a hit avoids" rows greyed | 4 | 4 | 4 | Reading 2 | `m_layers.py`, `m_pg.py`, SWE Numbers to know, Cloudflare | Mixes measured and sourced rows; each row names its source. |
| KV cache calculator: model, context, conversations; bytes per token from config.json | 4 | 5 | 5 | Reading 10 | `inputs/cfg/*.json`, `kv.json` | Reproduces the old page's 320 KiB and 40 GiB independently. |
| Prompt-caching break-even calculator with cost curves | 4 | 5 | 5 | Reading 11 | `prices.json` (docs read 2026-10-05) | Carries the 1.28-use correction; Gemini storage included. |
| Semantic curves (TPR and FPR by threshold) per model and dataset; hand-written pairs table | 4 | 5 | 5 | Reading 12 | `m_sem.py` | Hand pairs are illustrative inputs with measured similarities. |
| Materialised view, Memoize and prewarm tables | 3 | 5 | 5 | Reading 8 | `m_pg.py` | Tables, not charts: few numbers each. |

Rejected or not built:
- A stampede animation (one hot key expiring): built on Capacity planning and performance; linked.
- A prompt-layout animation (timestamp first against static first): built on ML system design, section 9; linked.
- An LRU/LFU eviction animation of a toy cache: the concept is on Capacity planning; the measured curves teach the comparison on real traffic.
- A replica-lag fill experiment with a real Postgres replica: the window is the same shape as the stale set and Facebook's remote-marker text describes it; Scaling a database owns replicas.
- Running a real LLM provider to measure prompt caching: needs keys and money; the arithmetic is exact from published prices and the OpenAI guide states the same 1.35 against 2.00.
- A CDN or nginx cache measurement: Capacity planning owns CDNs; a laptop cannot show edge latency.

What the methodology lacked for this page: guidance for experiments whose rates depend on chosen timings (the race). Rule used: report the counts with the timing distribution, say the share is a property of the forced timings, and make the claim about the zeros, not the percentages.
