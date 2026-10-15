# Reading and Further reading (Topic: data-curation-and-datasets)

Owned by the Reading agent (prefix `rd`). Parts: `../parts/20_read.html` (style, nav, section 0), `20_read_a` (1 why data, 2 sources), `20_read_b` (3 pipeline), `20_read_c` (4 dedup), `20_read_d` (5 quality), `20_read_e` (6 decontamination), `20_read_f` (7 mixing and staging), `20_read_g` (8 synthetic, 9 post-training data), `20_read_h` (10 storage and tools), `20_read_i` (11 choosing, mistakes, interview, child pages), `39_tab_more.html`. JS: `22_js_rd_data.js` (published figures), `23_js_rd_s012.js` (drills, bars helper, corpus chart), `24_js_rd_pipe.js` (page-through-pipeline animation, FineWeb funnel), `25_js_rd_dedup.js` (S-curve, global dedup bars), `26_js_rd_s56.js` (FineWeb-Edu vs DCLM, n-gram decontamination demo), `27_js_rd_s789.js` (OLMo 2 mid-training, model-collapse simulation), `28_js_rd_calc.js` (interview calculator).

Files here: `old/` the old Notion root and four children, verbatim (fetched read-only 2026-10-14); `coverage.md` every old claim verified, corrected, dropped or moved; `facts.md` the facts verified for this tab (same text as the "read" section of the topic's shared FACTS file); `todo.md` the filled and pending items; `viz_ideas.md`; `make_read_data.py` writes `../parts/22_js_rd_page.js` (the real page, funnel and char-dup numbers) from the Pipeline and Quality labs' outputs; `check_read.mjs` the data and prose check.

Reading time: about 47 minutes (9,449 words of prose and captions outside widgets at 200 words a minute, measured 2026-10-15) plus about 8 for the folded answers. Longer than the 15 to 20 minutes the RL lesson set for roots, because Khalid asked to be taught this topic from zero with all four goals and the labs' findings were folded in; the children hold the depth. Candidates to move to children: the tool table (Tool map), the storage list (Storage and loading), the post-training table and measured-samples paragraph (Post-training data), the extraction-defaults detail box (Extraction and filtering).

Departures from `html_utils/methods/topic_pages.md` Part A: the topic has no "things compared" in the Topic: llms sense; the Reading tab follows the pipeline order (the axis is the stage), with one section per stage and the cross-cutting trade-off (per-token quality against unique tokens) carried through sections 5, 7, 8 and the calculator.

## Child pages (built by the orchestrator; the list below was the Reading agent's first proposal)
Mapping from the old four: corpora -> 1 and 8; curation pipeline -> 2, 3, 4; mixing -> 5; synthetic and post-training -> 6, 7.
1. Pretraining corpora: lineage, licences and what to use (Tool map data at depth).
2. Web text extraction and heuristic filtering (Pipeline lab depth).
3. Deduplication internals: MinHash and LSH, suffix arrays, Bloom filters, semantic dedup (Dedup lab depth).
4. Quality classifiers and data selection (Quality lab depth), including decontamination or as its own page.
5. Data mixing, curricula and continued-pretraining ratios (Mixing lab depth; CMR).
6. Synthetic pretraining data and model collapse.
7. Post-training datasets: SFT, preference, verifiable rewards, environments.
8. Storage and data loading at scale (formats, sharding, streaming, packing).
