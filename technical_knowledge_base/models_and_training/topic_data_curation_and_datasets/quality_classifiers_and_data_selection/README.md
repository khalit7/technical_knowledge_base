# Quality classifiers and data selection

Notion: https://app.notion.com/p/3f95c17b0d0d810baaabe41da6c9c50f (child of Topic: data-curation-and-datasets; a new page).

HTML-only page: `index.html`, built by `src/build.sh`. Tabs: Reading, Classifier replay, Threshold explorer, Bias browser, Further reading.
Seventeen scorers (DCLM's and FineWeb-Edu's published classifiers, NVIDIA's two Nemotron-CC graders and their ensemble rebuilt,
five fastText classifiers and a GPT-3-style classifier trained here, CCNet and Pythia-160M perplexity, DSIR toward three targets)
on the root's 2,617-document running example, with 200 hand labels, controlled typography and spelling edits, WebOrganizer topic
and format labels, and Nemotron-CC rewrites paired with their sources. Measured on an Apple M1 Pro (CPU); two GPU runs pending
(`src/scripts/run_pending.sh`). Details in `src/README.md`.
