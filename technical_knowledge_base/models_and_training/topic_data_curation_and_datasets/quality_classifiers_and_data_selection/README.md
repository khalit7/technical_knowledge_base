# Quality classifiers and data selection

Notion: https://app.notion.com/p/3f95c17b0d0d810baaabe41da6c9c50f (child of Topic: data-curation-and-datasets; a new page).
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/quality_classifiers_and_data_selection/

HTML-only page: `index.html`, built by `src/build.sh`. Tabs: Reading, Classifier replay, Threshold explorer, Bias browser, Further reading.
Seventeen scorers (DCLM's and FineWeb-Edu's published classifiers, NVIDIA's two Nemotron-CC graders and their ensemble rebuilt,
five fastText classifiers and a GPT-3-style classifier trained here, CCNet and Pythia-160M perplexity, DSIR toward three targets)
on the root's 2,617-document running example, with 200 hand labels, controlled typography and spelling edits, WebOrganizer topic
and format labels, and Nemotron-CC rewrites paired with their sources. Measured on an Apple M1 Pro (CPU, plus one GPU run: Qwen3-1.7B perplexity); a
larger 50,000-row encoder run was dropped as teaching little. Details in `src/README.md`.
