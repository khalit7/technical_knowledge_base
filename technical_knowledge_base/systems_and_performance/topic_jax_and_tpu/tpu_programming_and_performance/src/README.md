# TPU programming and performance: how this page is built

Child page of Topic: jax-and-tpu (prefix `tq`, storage key `tq-tab`). One level deeper than the root's TPU and Pallas lab
(`../../src/tpu/`, whose `out/specs.json` and `out/roofline.json` this page reuses): published specs extended with low-precision
peaks, DCN, hosts, largest slices and prices; rooflines for a 7B layer and for decode with a KV cache; XLA's TPU tiling;
matmul precision emulated pass by pass; rematerialisation policies measured; every Cloud slice shape run through JAX's own
mesh placement; MaxText's published MFU table recomputed with its own FLOP counter; cost per token.

## Running the evidence (CPU only, shared venv; see the root's `src/data/README.md`)

```sh
export JX_SCRATCH=<the shared jax-and-tpu setup folder>
cd src
python3 -I -B runs/tq_specs.py                                                          # out/gens.json (asserts every number against inputs/)
JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B runs/tq_precision.py     # out/precision.json (about 1 min)
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B runs/tq_remat.py   # out/remat.json (compile only, about 10 s)
JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B runs/tq_slices.py        # out/slices.json (mock devices, under a second)
JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B runs/tq_errors.py        # out/errors.json (real error messages)
python3 -I -B runs/tq_mfu.py                                                            # out/mfu.json (reads MaxText configs in the pinned clone)
python3 -I -B runs/tq_source.py                                                         # out/source.json (file:line located by pattern)
$JX_SCRATCH/venv/bin/python -I -B runs/tq_recompute.py                                  # out/recompute.json (needs ml_dtypes)
python3 -I -B build_data.py                                                             # parts/22_js_tq_data.js
sh build.sh
python3 check_data.py                       # embedded data == out/*.json, 25 prose numbers == data, file:line refs, privacy
NPM_CONFIG_USERCONFIG=<empty file> node check_page.mjs ../index.html <screenshot dir>   # every control, 390 dark and 920 light; JS formulas == recompute.json
```

## Inputs (`inputs/`, all fetched 2026-10-15)
- `cloud_tpu_pages_extract.txt`: the v4, v5e, v5p, v6e and TPU7x Cloud pages (tables flattened), last updated 2026-10-13.
- `cloud_tpu_pricing_extract.txt`: the first rows of cloud.google.com/tpu/pricing (per chip-hour).
- `scaling_book_extracts.txt`: lines of the scaling book's tpus, roofline, inference, profiling and applied-training chapters.
- `maxtext_mfu_extract.txt`: MaxText's tiering table and performance-metrics notes at 1a95d1e5.
- `lambda_pricing_extract.txt`: Lambda's on-demand GPU prices (H100, B200).

## Departures from the child-page method
None of substance. The four labs the brief named are the four tabs. Shapes of the chip itself, Pallas and collective
bytes stay on their owners' pages (Hardware topic's TPU page, Pallas kernels, Sharding and scale) and are linked.
