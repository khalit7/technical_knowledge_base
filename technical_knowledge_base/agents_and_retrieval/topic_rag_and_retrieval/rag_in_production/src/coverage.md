# Coverage and corrections

This is a new page: there was no old Notion text to carry (the Notion page held only its title), so there is no coverage.json.

Claims elsewhere in the topic checked while building it:
- The root's src/data/README.md says "bge-small without its query prefix scores lower". On SciFact's 300 test claims, measured here (monitor.py, exact search, bge-small encoded on CPU without the prefix), nDCG@10 was 0.720 without the prefix against 0.713 with it (68 claims' top 10 changed). The statement may hold on other sets; on SciFact it does not. Suggested to the root.
- The vector_indexes page's numbers used here (tombstone work 977 vs 544 distances; post-filter recall 0.43 at 0.35% selectivity) are read from its facts.json, not re-measured.
- The ingestion page's re-indexing figures (15.0% of words changed, 75.8% and 49.2% re-embedded) are quoted from its published text, not re-measured.
