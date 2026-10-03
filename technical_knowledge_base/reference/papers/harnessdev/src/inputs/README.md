# Inputs

- `paper_v1.txt`, `tables_v1.txt`, `anchors.txt`: `extract_paper.py` run on the arXiv HTML of 2609.01437v1 (fetched 2026-10-03). The HTML itself is not kept.
- `figs.json`: `decode_figs.py` run on the two vector SVGs of Figures 7 and 8 (`rq2b_v6_official_shared_legend.svg`, `rq2b_v6_swepro_100_vs_heldout630_combined.svg` under https://arxiv.org/html/2609.01437v1/2609.01437v1/). The SVGs are not kept; the command is in the script's docstring.
- `recompute.json`: written by `recompute.py` (83 checks and the derived numbers the page shows).
