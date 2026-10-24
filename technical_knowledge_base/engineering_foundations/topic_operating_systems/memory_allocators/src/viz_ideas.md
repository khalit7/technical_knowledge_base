# Visual ideas: Memory allocators

The question the page keeps returning to: where does a training job's memory go between "I freed it" and "the kernel has it back", and what does each layer cost in memory and time? Scores: varies with a reader's parameter, reproduces a source, inputs computable from public data or real runs, shows what a sentence cannot (0 to 3 each).

| # | Idea | Placement | Score | Status | Data and checks |
|---|---|---|---|---|---|
| MA1 | **Caching allocator, before/after on one request stream**: two lanes (default against expandable_segments, or any two of five configurations), device memory to scale, segments and blocks, counters (allocated, reserved, reserved-unallocated, largest free block, driver calls), the OOM message filled in, jump buttons | Reading s9, full controls (moved from its own tab 2026-10-24) | 3+2+3+3 = 11 | built | `sim/cache_ref.py` from CUDACachingAllocator.cpp v2.14.1 with line numbers; JS checked step by step, 85 cases, 0 mismatches |
| MA2 | **Free-list lab**: OSTEP malloc.py ported line for line with Python's Mersenne Twister, heap to scale, free list, compare coalescing off and on, homework presets, predict mode, printed output | Reading s1 (moved from its own tab 2026-10-24; options in a closed block) | 3+3+3+2 = 11 | built | identical output to malloc.py on 178 option sets |
| MA3 | **Dynamic mmap threshold stepper**: the same program traced with the dynamic and a fixed threshold, step by step | Reading s3 | 1+3+3+3 = 10 | built | `raw/threshold.txt` |
| MA4 | **Long-run growth chart**: RSS over 120,000 samples for six allocator settings against live data, and an end view (RSS and time) | Reading s5 | 2+3+3+3 = 11 | built | `raw/loader.txt`, 3 runs, medians |
| MA5 | Fragmentation table with bars (98% freed, after malloc_trim, all freed; default and purging options) | Reading s5 | 1+3+3+2 = 9 | built | `raw/frag.txt`, `raw/frag_purge.txt` |
| MA6 | Arena bars and table (peak, end, time, all runs) | Reading s4 | 1+3+3+2 = 9 | built | `raw/arenas.txt` |
| MA7 | Chunk-size bars (request, usable, chunk) | Reading s2 | 1+3+3+1 = 8 | built | `raw/sizes.txt`; formula from request2size |
| MA8 | malloc+free cost table with the fastest and the cliffs marked | Reading s6 | 1+3+3+2 = 9 | built | `raw/bench.txt` |
| MA9 | Allocator stack diagram (HTML boxes) and five-takeaway cards | none | 0+2+3+2 = 7 | replaced 2026-10-24 by MA15 (the cards restated the sections) | |
| MA10 | Live slabinfo and buddyinfo excerpts as recorded outputs | Reading s1 | 0+3+3+2 = 8 | built | `raw/kernel.txt` |
| MA11 | Animated glibc bins (tcache, fastbins, unsorted, small, large) for a chosen request sequence | none | 2+1+2+2 = 7 | rejected for now: a faithful port of `_int_malloc` is large, and the free-list lab plus the measured cliffs teach the consequences; a simplified animation would teach a wrong order of checks |
| MA12 | Memory-snapshot timeline like pytorch.org/memory_viz | none | 2+1+0+2 = 5 | rejected: needs a GPU run to record; the simulator shows the same segments and blocks |
| MA13 | jemalloc/tcmalloc/mimalloc internal-structure animations | none | 1+1+2+1 = 5 | rejected: three designs at once would be a catalogue; the comparison table and measured behaviour carry the decision |
| MA14 | pymalloc arena occupancy grid (158 arenas, pools per size class) | none | 2+2+2+2 = 8 | rejected for length; a static version is MA17 |

What the methodology lacked here: for a mechanism that only runs on hardware we do not have (the CUDA allocator), "reproduce a published figure" became "reproduce the source": a reference model with every rule cited by line, checked against the page's JS, with its simplifications listed beside the visual.
| MA15 | **Hero**: the four allocators of the running job with what each returns and when (live against held strips), kernel and driver below, and the measured fragmentation result to scale (1,562 live, 110,524 RSS, 29,404 after trim) | Reading top | 0+3+3+3 = 9 | built 2026-10-24 | `raw/frag.txt` via `AD.frag` |
| MA16 | glibc malloc lookup order as a static ladder (tcache to sysmalloc), simplified, with what each place costs | Reading s3 | 0+2+3+2 = 7 | built 2026-10-24; replaces the bins table in the core (table now a closed block) | glibc 2.36 malloc.c |
| MA17 | pymalloc levels: one arena as 64 pools, three pinned by one live object; one pool of equal blocks | Reading s7 | 0+2+3+2 = 7 | built 2026-10-24 (static; pool contents illustrative, sizes from obmalloc.c) | `raw/pymalloc.txt` for the caption numbers |
| MA18 | Reference counting against the cycle collector: memory held after dropping 2,000 records, no cycle, cycles with gc on, gc off | Reading s7 | 1+2+3+2 = 8 | built 2026-10-24 | `exp/gc_cycles.py` on Python 3.11.9 and 3.14.8 (Apple M1 Pro, seconds) |
| MA19 | Real images: pytorch.org/memory_viz Allocator State History (segments with free gaps) and Active Memory Timeline | Reading s9 and s10 | real object | added 2026-10-24 | PyTorch docs, BSD-3-Clause, `img/CREDITS.md` |

Rebuild of 2026-10-24 (teaching contract): the two lab tabs each explained one mechanism, so both moved inline beside the claim they prove; nothing now lives one click away.

