# Topic: data-curation-and-datasets

Notion: https://app.notion.com/p/3c65c17b0d0d811fa5ecda8d365ab00f
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). Where training data comes from and how raw web crawls become a dataset a model learns well from, taught from zero on one running example (Common Crawl CC-MAIN-2024-30, WARC file 00000 and three more, matched to FineWeb, FineWeb-Edu, DCLM and Nemotron-CC samples; 7 benchmark test sets; Tulu 3, UltraFeedback and Cosmopedia samples). Tabs: Reading (`src/read/`), Pipeline lab (`src/pipe/`: extraction, language ID, heuristic rules, PII, the funnel), Dedup lab (`src/dedup/`: exact, MinHash, suffix arrays, Bloom filters, semantic, across crawls), Quality lab (`src/qual/`: FineWeb-Edu, DCLM, CCNet, a local fastText), Mixing lab (`src/mix/`), Post-training data lab (`src/post/`), Tool map (`src/map/`), Further reading. Shared running example and loaders in `src/data/`.
Real runs on an Apple M1 Pro (CPU), 2026-10-14 and 15; published numbers kept apart and dated; GPU runs still pending are shown as dashed boxes with their commands.
Nine child pages, each in its own folder: pretraining_corpora, extraction_and_filtering, deduplication, quality_classifiers_and_data_selection, data_mixing, synthetic_data, post_training_data, decontamination_pii_and_governance, storage_and_loading.
