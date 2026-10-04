# Numbers to know (t-num): visual ideas

Central question of the tab: "is this design possible, and what will it cost?", answered with arithmetic before anything is built.

## Built
| Idea | Why it earns its place | Data | Score notes |
|---|---|---|---|
| Latency ladder on one log axis, 28 rungs in 5 groups, classic marks (Norvig 2001, Dean 2009, ~2012 gist) beside current marks, never merged; mark shape and colour by kind of source; detail opens under the clicked rung | Eleven decades on one axis is the point; shows what changed (sequential memory 14x faster, fsync spans 4 decades) and what did not (DRAM ~100 ns, CA to NL 150 vs 145 ms) | build_data.py (sources dated), local measurements in inputs/ | reproduces Dean's CA-NL figure within 4% from a 2026 measurement; corrects the old fsync claim |
| Human-scale toggle (1 ns = 1 s) | The classic intuition pump; turns 78 ms into 2.5 years | derived | cheap |
| Time-budget before/after animation, 3 scenarios (reuse the connection, move work off the request path, add a cache), bars to scale, caption per step, counters, RD.anim controls | Khalid's preferred before/after pattern; shows which piece of the wait a change removes, and that the user's own RTT remains | every bar from a ladder rung or labelled illustrative | totals checked by recompute.py |
| TechEmpower R23 bars (one query, JSON, fortunes) with the Stack Overflow 2016 reality check | Ceilings vs real load: 164k req/s FastAPI ceiling vs ~269 req/s per Stack Overflow server | te_r23.json extracted from the results JSON | independent |
| GPU table with $ per million output tokens if always busy | Separates per-user speed from GPU throughput; $4.14/M at batch 1 vs $0.50/M batched (70B FP8, 2,209 tokens/s per GPU, repo commit 8a9c66c) | TRT-LLM perf overview, llama.cpp scoreboard, Lambda prices | vendor flagged |
| Nines table, slider, chain-and-replicas builder, error budget with Google's two worked examples | Availability arithmetic is formulas a reader should move | SRE book ch. 3, Calculus of Service Availability | reproduces 52.56 min, 250 errors, 26 min; 27 min only with the article's rounding (said on the page) |
| Estimate calculator with 5 drills and worked steps; sanity check per drill against a published figure | The back-of-envelope method made executable | Twitter 2013, Stack Overflow 2016, OpenRouter prices, OpenAI token rule, AWS price list | Twitter average independent (1.015x); peak and SO servers by construction (said); chat drill (peak factor 2, as in the Reading and simulator) lands at the top of the API price range; at peak factor 3 it leaves it, which the check explains as utilisation |

## Rejected
- A spliced "2026 latency table" (one number per row): violates never-splice; the popular gist now does this with unsourced LLM rows.
- Colin Scott's extrapolated interactive latency numbers: extrapolations, not measurements.
- InferenceMAX Pareto curves: data lives in images and CI artifacts; could not be read as numbers.
- Per-core requests/s from TechEmpower: the 56-core figure's thread layout is not stated precisely enough to divide.
- Intra-zone round-trip measurement: no dated public measurement found in text form; the ladder shows Dean 2009, the Azure inter-zone target and a nearby-region P50 instead, labelled.

## What the methodology lacked here
Local measurements (made for this page on a laptop) are a new kind of source: real and reproducible but not server hardware; they got their own mark and a caution box.
