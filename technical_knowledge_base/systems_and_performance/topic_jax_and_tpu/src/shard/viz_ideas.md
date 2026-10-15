# Sharding lab: visual ideas

Central question: given shardings, which collectives does the compiler insert, how many bytes, and what memory does each device keep?

## Built
1. **Same weight before/after sharding on a 2 x 4 mesh** (animation, 4 steps, 6 specs). Real `devices_indices_map` of blocks.0.mlp.fc1.w; counters for copies and bytes per device. Score high: before/after on one input, teaches PartitionSpec semantics including replication along unmentioned axes.
2. **PartitionSpec playground** (108 real compilations): x, W, output mode; per-device shards, output spec chosen, collectives with bytes, temp memory, error vs numpy. Plus a predict-the-collective drill on 6 cases. Every value from a compiled program.
3. **Collectives animator**: ring all-reduce, all-gather, reduce-scatter, all-to-all (drawn as direct sends), permute; 2 to 8 devices; naive gather-to-device-0 all-reduce as the before/after contrast. N = the running example's gradients (3.31 MB). Ring formula checked by the hand-written ppermute ring (224 B for a 128 B array on 8 devices).
4. **Six layouts table + chart** (memory per device stacked: params, Adam state, temp; or bytes sent per device stacked by collective kind), click for grouped collectives by phase, specs, loss check, GSPMD comparison.

## Rejected
- Timeline of collectives per step from the profiler: CPU-simulated device timings are meaningless.
- Torus mapping of mesh axes: belongs to the TPU lab (linked).
- Embedding visualize_array_sharding output for every spec: truncated at terminal width; drew our own tiles instead and kept one clean real output.
- Full HLO viewer: 1 to 2 MB per layout, too big for the page.

## What the methodology lacked
Nothing to reproduce from a publisher here; the "reproduce a published figure" axis was replaced by "reproduce a formula": the scaling book's ring costs, verified by the hand-written ring.
