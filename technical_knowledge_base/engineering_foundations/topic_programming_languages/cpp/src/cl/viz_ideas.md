# Part 3 (Reading llama.cpp): visualisation ideas

What the text needs: a map of a large codebase; the GGUF byte layout; strides and views; the graph of a forward pass; how a token travels through files; how threads share a matrix product; what a quantised block is in bytes; which kernel really runs; how speed depends on threads.

## Built (score: teaches / real data / interaction, each 1 to 3)
1. **Code tour tab** (3/3/3): the token's path through 12 files, 16 stops, animated with play/step/scrub; before/after toggle prompt (builds graph, allocates) against next token (graph reused: 4 stops skipped). Each stop: excerpt at the pinned commit, C++ features linked to Part 1/2, measured counts. Khalid's favourite pattern (same input, two paths).
2. **Quant blocks tab** (3/3/3): the real first 34 bytes of blk.0.attn_q.weight; the same 32 weights through Q8_0 and Q4_0 step by step (before/after), with bytes, bits per weight and error counters, and the packed 18 Q4_0 bytes; Q4_K block drawn to scale.
3. **Chunk scheduler animation** (Reading s9, 3/2/3): 4 threads, 16 chunks from an atomic counter against 4 fixed shares, one slow thread. Durations illustrative (labelled); the scheme and chunk count are the real ones (counted).
4. **Repo map** (s1, 2/3/2): lines per area and language at the commit.
5. **GGUF file to scale** (s4, 2/3/2): header, padding, every tensor group by real offsets.
6. **Stride views** (s6, 3/3/2): byte offsets of cache_k_l0 as stored, per head (get_k's view), transposed.
7. **Graph of one token** (s7, 3/3/2): eval-callback output, layer 0, input, last layer, histogram.
8. **Threads chart** (s9, 2/3/2): llama-bench medians and all samples, repack on/off, Metal line.
9. **Kernel call counts table** (s10, 3/3/1).

## Rejected
- A live flame graph or profile: Instruments and perf could not run here; call counters replace them.
- An animated attention/KV-cache explainer: inference-and-serving owns the concept.
- Simulated SIMD lanes for the q8_0 dot: Part 2's SIMD lanes tab already animates a NEON dot product; linked instead.
- A roofline for decode: Part 2's Roofline tab does it; linked.

## What the methodology lacked
Nothing for "is this the code that runs?": added call counters in an instrumented copy as a verification step. Worth keeping for any page that reads engine code.
