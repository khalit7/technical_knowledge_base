# Sharding and scale: Mesh, GSPMD, shard_map and multi-host

Notion: https://app.notion.com/p/3c65c17b0d0d8125b084e6720cc66b3d (child of Topic: jax-and-tpu, 3c65c17b0d0d81ecbc04eea6aa45ea1a). The Notion page's old title was "Sharding and scale: GSPMD, Mesh, shard_map"; retitle it to the one above.
Site: https://khalit7.github.io/technical_knowledge_base/systems_and_performance/topic_jax_and_tpu/sharding_and_scale/

HTML-only page, built 2026-10-15: `index.html` is the whole page; `src/` builds it (`sh src/build.sh`).

Tabs (since the 2026-10-23 rebuild to the teaching contract): Reading (14 sections; the old Propagation explorer, Pipeline, Experts and Many processes tabs are now Reading sections 3, 8, 9 and 12); Mesh designer; Further reading.

Everything measured ran on an Apple M1 Pro CPU with 8 simulated devices (jax 0.11.2); TPU numbers are published ones, kept apart and labelled. The old Notion text is saved verbatim in the root's `src/read/old/sharding.md`; corrections are listed in `src/coverage.md`.
