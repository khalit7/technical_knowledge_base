# Visual ideas: Architecture map tab

Central question: which design choices did each model make, and what does each cost in cache and parameters?

| # | Idea | Data | Reproduces | Score | Status |
|---|---|---|---|---|---|
| 1 | Timeline by lab lane, colour by attention or FFN kind, ring for sliding windows, year sweep with share counters, numbered flags where each shift first appears in this map | facts.yml + configs | flags computed from rows | 15 | built |
| 2 | "Same model, two eras": a real model's block rebuilt from the 2018 design, one shift per step, cache drawn to scale against MHA, expert grid, counters | shifts.py from configs | Gemma 3 10.41 GiB, gpt-oss 4.5 GiB, Qwen3-Next 3 GiB + 36 MiB state, DeepSeek-V3 68.6 KiB per token: all equal the gallery page's figures (independently, from configs) | 17 (before/after on the same model) | built |
| 3 | Filterable, sortable table over every axis with a detail card and layer strip | map.json | KV per token equals the gallery for 25 shared models | 14 | built |
| 4 | Constraint picker with reasons, costs and a computed ranking of models | map.json | | 12 | built |
| 5 | Predict-then-reveal drills computed from rows | map.json | | 10 | built |
| 6 | Per-layer strips and attention ladder for every model | | | | rejected: owned by the LLM Architecture Gallery child; a compact strip sits in the detail card only |
| 7 | KV-per-token over time scatter | | | | rejected: labels collide at 390 px and the gallery has it; the sweep counters carry the trend |
| 8 | Parameter breakdown per model (embedding, attention, FFN) | | | | rejected here: owned by the Config calculator tab |
| 9 | Benchmark score or price column | | | | rejected: owned by Topic: llms |
