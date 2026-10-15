# Reading tab: TODOs

Status 2026-10-15 (final pass): every box filled from the labs' outputs; `check_read.mjs` asserts each quoted number against its source file and reports 0 boxes left.

| # | Where | Filled from |
|---|---|---|
| 1 | Section 0 running example | `src/data/equiv.json` (setup, 500 steps) via `make_read_data.py` |
| 2 | Memory widget preset | equiv.json n_params 826,368 |
| 3 | Eager vs jit animation counts | `src/xla/out/read_numbers.json`: 3,411 primitives, 1,057 kernels (783 fusions); PyTorch 1,302 working aten ops (Training lab counts 1,309 top-level calls; 1,302 quoted, both named) |
| 4 | Section 3 strip, compile times, cost_analysis scan note | Compiler lab read_numbers.json and FACTS "xla" |
| 5 | Section 4 train step | `run_step.py` (now with donate_argnames) |
| 6 | Section 5 collectives table | `src/shard/out/rd_collectives.json` |
| 7 | Section 6 Pallas results, TPU7x devices, v5e bandwidth note | `src/tpu/out/pallas.json`, `specs.json`, FACTS "tpu" |
| 8 | Section 7 MaxText MFU | pinned clone 1a95d1e5, `docs/reference/models/tiering.md` (vendor) |
| 9 | Section 8 twin row | `src/train/out/twin_long.json` (4,000 steps) and equiv.json step times |
| 10 | Mistakes, donation | read_numbers.json memory_analysis; flax compilation.py:317-318 |
| 11 | Interview porting answer | `check_defaults.py` output and twin_long.json |
| 12 | Further reading free TPU access | specs.json "free" |
| 13 | Further reading lab times | Transforms 25, Compiler 16, Training 25 (labs); Sharding 19, TPU 24, Tool map 5 plus tables (measured from the built tabs at 200 words a minute) |

Open: nothing on the page. The child pages' reading times in Further reading say "being built" until they exist.
