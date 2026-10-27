# Inputs

- `paper_v1.txt`, `tables_v1.txt`, `anchors.txt`: `extract_paper.py` run on the arXiv HTML of 2608.19880v1 (fetched 2026-10-03). The HTML itself is not kept.
- `figs.json`: `decode_figs.py` run on the vector SVGs of Figures 1, 5 and 6 (`figure1.svg`, `coevolution_swe_dual.svg`, `crossmodel_bars_python.svg` under https://arxiv.org/html/2608.19880v1/). The SVGs are not kept; the command is in the script's docstring.
- `alfworld_splits.txt`: ALFWorld's Table 1 (140 seen and 134 unseen evaluation tasks), from https://arxiv.org/pdf/2010.03768 with pdftotext.
- `release/`: files from https://github.com/google-research/envharness (Apache-2.0, fetched 2026-10-03): the six corpus configs, the core harness classes the live tab ports (`envharness.py`, `setup.py`, `rules.py`, `link.py`), the Toy24 bridge, `objectives.py`, the `build_env_stack` excerpt of `runner.py`, an excerpt of `rl/scripts/run_grpo.sh`, and the repository tree (`tree.txt`).
- `recompute.json`: written by `recompute.py`.
