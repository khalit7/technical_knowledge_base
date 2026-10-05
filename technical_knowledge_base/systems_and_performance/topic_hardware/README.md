# Topic: hardware

Notion: https://app.notion.com/p/3c65c17b0d0d8118beeefaed56da6f8e

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). Follows one training step of Llama 3.1 8B down to the silicon, taught from zero: why GPUs, inside a GPU, memory technology, number formats, roofline and MFU, joining chips, the vendor landscape (per chip, per rack, per gigawatt), power and cooling, choosing and costing hardware. Tabs: Reading (`src/read/`), Chip atlas (`src/chips/`: 25 accelerators, every field sourced, dense vs sparse explicit), Performance calculator (`src/calc/`: training, inference and communication, checked against 27 published figures), Roofline lab (`src/roof/`: the M1 Pro GPU's measured roofline with real kernels, beside published rooflines), Further reading.
No NVIDIA GPU was available: real measurements are on the Apple M1 Pro GPU (MLX/Metal) and labelled; every other number is a sourced vendor spec or an independent measurement, kept apart. Shared chip facts were reconciled with the CUDA root through a common facts file. The old written root and its four children are saved verbatim in `src/read/old/` and checked in `src/read/coverage.md`.
