# Inputs

- `paper_v1.txt`, `paper_v2.txt`, `tables_v1.txt`, `tables_v2.txt`, `anchors_v1.txt`, `anchors_v2.txt`: extract_paper.py from https://arxiv.org/html/2608.25593v1 and v2.
- `figs.json`: decode_figs.py from the vector PDFs of Figures 4 and 6 in the v2 e-print (https://arxiv.org/e-print/2608.25593v2).
- `recompute.json`: recompute.py.
- `overlap.json`: overlap.py (training harnesses from https://huggingface.co/datasets/JIT-Agent/jit-meta-harness against the test data in https://github.com/bingreeky/JIT at commit ababa06).
- `harness_stats.json`: harness_stats.py (same dataset).
- `release_extracts.txt`: fetch_release.sh (verbatim lines from the READMEs, the model card and the dataset card; upstream text may contain dashes the page itself does not).
