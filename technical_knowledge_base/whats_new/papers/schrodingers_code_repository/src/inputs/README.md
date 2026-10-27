# Inputs

| File | What it is | Where it came from |
|---|---|---|
| `paper_v1.txt`, `tables_v1.txt`, `anchors.txt` | The paper's text, its three tables and its HTML anchors | `extract_paper.py` on https://arxiv.org/html/2609.27891v1 (fetched 3 October 2026) |
| `django_fields_init_84633905.py` | `django/db/models/fields/__init__.py` at the base commit of `django__django-11999` | https://github.com/django/django/blob/84633905273fc916e3d17883810d9969c03f73c2/django/db/models/fields/__init__.py (BSD-3-Clause, Django Software Foundation) |
| `django_base_excerpt_84633905.py` | Lines 403 and 941 to 944 of `django/db/models/base.py` at the same commit | same repository and licence |
| `swebench_django__django-11999.json` | The SWE-bench Verified row (issue, gold patch, tests, base commit) | Hugging Face datasets server, `princeton-nlp/SWE-bench_Verified` |
| `excerpt.json` | What the page transforms, with the Level 3 run specs | `mk_excerpt.py` |
| `level2_targets.json` | The released Level 2 extractor's targets that occur in the excerpt, plus Django-wide counts | `extract_targets.py` (needs checkouts of Schrodinger-Repo at e2eef98 and Django at 84633905, not kept; about 60 MB) |
| `lexicon.json` | Five candidate words per token (illustrative, written for this page) and the renamings the paper itself shows | hand-written; the attested ones from Figure 4 and §III-C |
| `recompute.json` | Every derived number on the page | `recompute.py` |

Figures 1 and 3 have their printed labels in `mk_tables.py` (read from the figure images at https://arxiv.org/html/2609.27891v1/background.png and rq2.png; every number is printed on the figure).
