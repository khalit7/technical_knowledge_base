# TPU and Pallas lab (tab `t-tpu`, parts `35_*`)

The TPU from the programmer's side and Pallas from zero, for the root page Topic: jax-and-tpu. No TPU was used: chip numbers are published (Cloud TPU pages, last updated 2026-10-13; the scaling book, 2025-02-04; both read 2026-10-15) or read from the pinned JAX source (`jax/_src/tpu_info.py` at jax-v0.11.2); everything about the running example and the kernels was run here on CPU; roofline and ICI times are calculations, labelled.

## Scripts (run in order; CPU only, shared venv, see ../data/README.md)
```sh
export JX_SCRATCH=<shared setup folder>
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B tp_specs.py     # out/specs.json: generations, disagreements, free access
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B tp_roofline.py  # out/roofline.json: the step's 99 dot_generals, 7B-class bounds
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B tp_pallas.py    # out/pallas.json: kernels, bugs, Mosaic, traffic (about 20 s)
JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B tp_torus.py                         # out/torus.json: create_device_mesh on mock slices
$JX_SCRATCH/venv/bin/python -I -B tp_source.py                                                     # out/source.json: pinned file:line
python3 -I -B tp_data.py                                                                           # ../parts/35_js_tp_0data.js
python3 check_tab.py                                       # embedded data == out/*.json, prose numbers == data, privacy
node check_tab.mjs ../../index.html <screenshot dir>       # every control at 390 dark and 920 light; page arithmetic vs data
```
`tp_kernels.py` holds the Pallas kernels (the page shows them verbatim, cut out by `tp_data.py`). Timings in `pallas.json` change from run to run (shared machine); the prose quotes the ratios of the committed run, and `check_tab.py` fails if a rerun changes them, so update the prose with the data.

## Departures
None from the root method; this is a lab tab. The chip itself (systolic cycle by cycle, pods, optical switches) is on the Hardware topic's TPU page and collectives on the Sharding lab; both are linked, not repeated.
