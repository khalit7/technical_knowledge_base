# Visual ideas: ML platforms and workflows

The page's question: given a model in use, can you say what made it and make it again? Every visual answers part of that on the page's own recorded runs (src/runs/), not on illustrative data.

## Built
| idea | where | score (teaches / measurable / absent elsewhere / cost) | data | why it earns its place |
|---|---|---|---|---|
| Rerun everything vs resume, same failed run, drawn to scale (before/after animation, play/pause/step/scrub/speed, counters) | Reading section 3 | 5/5/5/2 | Metaflow task durations of runs 1792142900051724 (failed) and 1792142936774695 (resumed) | The core value of a workflow engine, seen rather than told; the real failure (MLflow pt2 default) made it |
| Cross-platform divergence chart, per step, log scale, toggle global vs rank-0 loss | Reading section 8 | 5/5/5/1 | xplat.json: 70 steps logged every step, native vs mi-train:1 | Shows that "same code, same seed, same version" is not "same bits", and that logging granularity hides it |
| Lineage graph from the recorded ids and hashes (click to trace ancestors and descendants; presets for the resume trap, the hung run, the other-data version) | tab Lineage graph | 5/4/5/3 | mp_lab.json | Makes lineage a thing you click through, and shows the three real traps found |
| Alias history stepper (before/after each registration) | tab Lineage graph | 4/4/4/1 | versions + replayed gate | The registry's one mutable thing, moving |
| Reproduce-a-run walkthrough (six steps, any version) plus all loss curves | tab Reproduce a run | 4/4/5/2 | reproduce.py outputs, MLflow curves | The page's question answered end to end; version 1 and 6 show where it breaks |
| Tool chooser with every fired rule listed | tab Tool chooser | 3/2/3/1 | rules from the Reading tab and the root Tool map | Turns section 4 into a decision with visible reasons; labelled opinion |
| Inline tables from data: step table (median task times), run record, gate table, MLmodel file, model files, REST response | Reading | n/a | mp_lab.json | Real records instead of described ones |

## Rejected
- A static "MLOps stack" diagram with logos: shows nothing measurable; the layer list in "In one screen" does the job in text.
- Rebuilding the root Tool map's census or picker: owned by the root (linked).
- Prefect version of the same flow for a side-by-side engine comparison: a second engine run teaches little beyond section 4's table and costs a second server; skipped (cheap runs over expensive).
- A W&B run: needs an account and network; not run (hosted service).
- Live MLflow UI screenshots: the page cannot load images by URL and screenshots would carry local URLs; the REST JSON is shown instead.

## What the methodology lacked
Nothing to reproduce from a paper: the "published figure" here is the platform's own behaviour (defaults, error messages), so the reproduce-a-figure rule became "reproduce your own registry's claim" (bit-identical rerun) and "say where it does not reproduce" (cross-platform).
