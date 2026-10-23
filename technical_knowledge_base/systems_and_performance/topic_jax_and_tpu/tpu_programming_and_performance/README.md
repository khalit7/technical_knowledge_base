# TPU programming and performance

Notion: https://app.notion.com/p/3c65c17b0d0d8129b0a5fd82e44ecf6e (child of Topic: jax-and-tpu, 3c65c17b0d0d81ecbc04eea6aa45ea1a). The Notion page's old title is "TPU architecture and Pallas"; retitle it to the one above (Pallas moved to the sibling page "Pallas kernels", 3fa5c17b0d0d817699fcf65d085402e7).
Site: https://khalit7.github.io/technical_knowledge_base/systems_and_performance/topic_jax_and_tpu/tpu_programming_and_performance/

HTML-only page, built 2026-10-15: `index.html` is the whole page; `src/` builds it (`sh src/build.sh`).

Tabs: Reading; Roofline lab; Slice planner; Further reading (rebuilt 2026-10-23 to the teaching contract: the Tiles and padding and MFU calculator tabs moved into Reading; three CC BY 4.0 photos in `img/`).

No TPU was used. Chip numbers are published (Cloud TPU pages, last updated 2026-10-13; the scaling book; `jax/_src/tpu_info.py` at jax-v0.11.2; MaxText docs at 1a95d1e5) and labelled; the running example's precision, rematerialisation and JAX's mesh placement on mock slices were measured on an Apple M1 Pro CPU (jax 0.11.2); everything else is calculated. The old Notion text is saved verbatim in `src/live.md`; corrections are listed in `src/coverage.md`.
