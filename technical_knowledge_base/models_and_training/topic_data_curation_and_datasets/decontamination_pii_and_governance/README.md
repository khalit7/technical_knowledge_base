# Decontamination, PII and data governance

Notion: https://app.notion.com/p/3f95c17b0d0d8100b7e4e0f96074c309 (child of Topic: data-curation-and-datasets; a new page).
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/decontamination_pii_and_governance/

HTML-only page: `index.html`, built by `src/build.sh`. Tabs: Reading (the PII detector view and the provenance stepper inline since the 2026-10-24 rebuild to the teaching contract), Contamination checker, Further reading. Every benchmark item of seven benchmarks measured against the running example's crawl, corpus samples (and two whole FineWeb files) and post-training samples on an Apple M1 Pro (CPU); four PII detectors on a synthetic hand-labelled set; opt-out signals and today's robots.txt for the kept pages. Two GPU runs (Min-K% on Qwen3, an LLM judge) ran on 2026-10-15 from `src/scripts/run_pending.sh`. Details in `src/README.md`.
