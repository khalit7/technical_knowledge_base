# Inputs

- `paper_v1.txt`, `tables_v1.txt`, `anchors.txt`: extracted from https://arxiv.org/html/2609.06966v1 (3 October 2026) by `extract_paper.py`.
- `figs.json`: printed labels of Figures 4 to 8, 10 to 17 and the decoded bars of Figure 3, from the vector PDFs in https://arxiv.org/e-print/2609.06966 (`decode_figs.py`).
- `features_gpt53_single_day.json`, `features_gpt53_multiday.json`: per account-day audit counts rolled up by `compute_features.py` from https://huggingface.co/datasets/forgelab/mole (configs `audit` and `labels`, Apache-2.0), with groups and cohorts from https://github.com/aashiqmuhamed/mole `bootstrap/org_template.yaml` and `bootstrap/insider_assignment.yaml`.
- `examples.json`: two account-days (tom.g0 2026-04-29, wei.r22 2026-05-14) from the `audit` and `transcripts` configs, split `gpt53_single_day` (`mk_example.py`).
- `clip_check.json`, `elicit_check.json`: from `clip_check.py` and `elicit_check.py` on the same release.
- `recompute.json`: written by `recompute.py`.
