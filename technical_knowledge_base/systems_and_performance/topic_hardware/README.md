# Topic: hardware

Notion: https://app.notion.com/p/3c65c17b0d0d8118beeefaed56da6f8e
Site: https://khalit7.github.io/technical_knowledge_base/systems_and_performance/topic_hardware/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). The topic's map, rebuilt to the teaching contract on 2026-10-24 (`src/README.md`): what a training or serving step demands (arithmetic, bytes from memory, bytes between chips), the hardware that supplies each, how GPUs, TPUs and the other accelerators compare, the scale a number was measured at, choosing and costing, and cards for the six child pages. Tabs: Reading, Chip atlas (`src/chips/`: 27 accelerators, every field sourced, dense vs sparse explicit), Performance calculator (`src/calc/`: training, inference and communication, checked against 27 published figures), Roofline lab (`src/roof/`: the M1 Pro GPU's measured roofline with real kernels), Further reading.
No NVIDIA GPU was available: real measurements are on the Apple M1 Pro GPU (MLX/Metal) and labelled; every other number is a sourced vendor spec or an independent measurement, kept apart. Photos in `img/` (credits in `img/CREDITS.md`).
