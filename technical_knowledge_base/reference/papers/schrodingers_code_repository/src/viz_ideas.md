# Visualisation ideas: Schrödinger's Code Repository (SchrodingerRepo)

The question the paper keeps returning to: **when a coding agent scores well on SWE-bench Verified, how much of it is knowing where things are in a familiar repository?** Every visual below either shows the instrument that removes familiarity, or measures how far the paper's evidence can carry its answer.

Scores: 0 to 2 on the Methodology's questions (reader-controlled quantity, reproduces a published figure, inputs public, shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere), total out of 14.

## Rows for the ideas log

| # | Idea | What it shows, and what the reader does | Data and sources | Placement | Score | Status |
|---|---|---|---|---|---|---|
| P-schrodingers_code_repository.1 | **Transform a repository, live** | The released Level 2 (tokenise, seeded token mapping, case-preserving rebuild, whole-word replacement) and Level 3 (definition-time dependency graph, random topological order) ported to JS with CPython's MT19937, run on the real Django code of django__django-11999; step animation per level, seed slider, Figure 4 preset (reproduces object_models.Blueprint, Character_unitField, picks, storage_engine/object_models/entries, anchor.py), full renaming table | Schrodinger-Repo e2eef98 (mapper.py, extractor.py, intra_file_reorder.py); Django 84633905; extractor run on the whole checkout; candidate words illustrative (released lexicon is LLM-generated, unpublished); checked against schro_ref.py for 10 seeds | Own tab | 12 | built |
| P-schrodingers_code_repository.2 | **Case study, familiar against renamed** | Before/after animation of the same issue in both views: the tree with renamed labels, the issue as each view words it, the step from Figure 4, the 37 against 217 action bar to scale at the end (no per-step counts invented) | §V-E, Figure 4 | Reading, case study | 10 | built |
| P-schrodingers_code_repository.3 | **Search both views** | A regular-expression box run over the excerpt in the original and renamed views; hits that vanish are cues an agent loses | Same excerpt and port | Transform tab | 9 | built |
| P-schrodingers_code_repository.4 | **RQ4 power calculator (predict, then reveal)** | Tasks and assumed-drop sliders; power curve with the 80% line; default 110 tasks and the 4.1-point drop Verified implies (13% power; 80% needs about 14 points) | Table III; recompute.py | Reading, RQ4 | 11 | built |
| P-schrodingers_code_repository.5 | Table I chart with intervals | Pass@1 / actions / input tokens per model and setting, baseline tick, the paper's stars, unpaired 95% whiskers; predict question on which level costs most | Table I; recompute.py | Reading, RQ1 | 9 | built |
| P-schrodingers_code_repository.6 | Figure 1 and Figure 3 redrawn from printed labels | Recall grades per model (leakage share and patch/test share recounted); split of the extra actions with the exploration share marked | Figure 1, Figure 3 images (printed numbers only) | Reading | 7 | built |
| P-schrodingers_code_repository.7 | Every printed change recomputed | 108 changes in Tables I to III; two wrong (Table I +12.78% for +2.76%; Table II 0.75 for 0.55, repeated in §VIII) | tables.json, recompute.py | Tables tab and Reading boxes | 10 | built |
| P-schrodingers_code_repository.8 | McNemar limits for the stars | For each Pass@1 drop of k instances, the most fail-to-pass flips a paired test can absorb at p<0.05 | Table I | Tables tab | 8 | built |
| P-schrodingers_code_repository.9 | Level panel with Figure 4's renamings | Original / Level 1 / 2 / 3 / 4 applied to the real issue and path (Levels 1 and 4 described, not run) | port, Figure 4 | Reading, four levels | 7 | built |
| P-schrodingers_code_repository.10 | Command flow diagram | Agent, translator, real container, patch recovery | §III-A, §III-C, Figure 2 | Reading, Idea | 5 | built |

## Rejected

- **Replaying a real trajectory**: none released (the case study's two runs exist only as Figure 4's boxes).
- **Rerunning Level 1 or Level 4**: both need an LLM call; a sandboxed page cannot make one, and inventing a paraphrase or rewrite would be fabricated output.
- **Bootstrapping per-instance results**: not released; the McNemar arithmetic and power calculator are what the printed counts allow.
- **A "meaningful but unfamiliar names" condition**: the experiment the page argues is missing; cannot be run without agents.
- **Then and now**: a 2026 evaluation paper with no successor yet.

## What the methodology lacked for this page

When the paper's contribution is an instrument (a transformation of benchmarks) rather than a model or a result, the strongest live ingredient is the instrument itself, ported from the released code and checked against it seed for seed; papers.md's table has no row for "evaluation method" papers. Reading the released code against the text is where most of this page's corrections came from (Level 3 file selection, Level 1 prompt, default view counts, silent fallback).
