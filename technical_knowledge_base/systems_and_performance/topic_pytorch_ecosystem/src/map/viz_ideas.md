# Ecosystem map: visual ideas, built and rejected

Central question: which library should I use, and what does it really do with PyTorch underneath?

## Built
1. **Same step, five doors** (score 13/14). Real call stacks recorded at forward and optimizer.step for a plain loop, Lightning, HF Trainer, Accelerate and Accelerate on 2 processes; animated frame by frame with captions, counters (depth, library frames, losses). Before/after on the same input: identical losses (3.80137, 3.18793, 3.16783) prove the wrappers add no maths; the stacks show where they add layers (Lightning's closure puts forward inside optimizer.step).
2. **Atlas** (12). Filterable cards (layer, status, task, search) with a detail panel: owner, licence, latest release, status with primary source, core-API chips that reveal a real source line, imports, measured result where run.
3. **What calls what** (12). Bipartite picture per library (core APIs left, other libraries right, width by file count) plus the full matrix with click-for-evidence. Built from scanning released wheels, not from READMEs.
4. **Release timeline** (11). Releases 2.0 to 2.14 with cadence bars, ecosystem events lane, a date slider that recolours the atlas by status at that date (dated changes only), release details from the notes.
5. **What replaced what** table (10). Old API or library to replacement with version and source.
6. **Chooser** (9). Task x scale x hardware to a recommended stack, alternative and avoid list, each reason citing a count or measurement from the tab; labelled editorial.
7. Two predict-then-reveal questions (losses through the doors; DeepSpeed's FSDP use) and seven interview questions.

## Rejected
- Stars or download counts as a popularity axis: they measure attention, not fitness, and change daily.
- A full dependency graph of all libraries at once: unreadable at 390 px; replaced by the per-library bipartite view plus the matrix.
- Benchmark speedups per library (Unsloth's, Liger's, torch.compile's): vendor claims, and no GPU here; the Compile lab and the Reading tab own speed.
- Timing the wrappers' overhead on CPU: tiny and load-dependent; the bench lock belongs to the timing tabs.
- Installing DeepSpeed, Megatron Core, NeMo, Monarch: heavy builds or GPU-only; read from source instead.

## What the methodology lacked
A rule for status words when a project says nothing: added "quiet", defined as an inference from release dates and kept visually distinct from stated statuses.
