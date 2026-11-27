# How this page is built

Page kind: article (`.claude/skills/explainer-page/page-kinds/article.md`), built 2026-11-27 (started by one builder, finished by a second after a usage limit) from the reference folder `../../weight_space_programming/src/`, with `build.sh`, `mk_article.py`, `label_ledger.py` and the generic loop of `check_page.mjs` from `../../qorl_query_plans/src/` and `../../pretraining_progress_data/src/`, and `extract_article.py` from `../../transformers_from_memory/src/` (epoch.ai bounds: `<h2 id="key-takeaways">` to `<h2 id="about-the-authors"`). Page prefix `pp`.

## Build and check
```sh
git clone https://github.com/droodman/inference-cost <scratch>/repo && git -C <scratch>/repo checkout 9163c17ee7
python3 src/recompute.py <scratch>/repo             # (from the page folder) checks sha256 against inputs/manifest.json, writes inputs/recompute.json (about 15 s)
bash src/build.sh                                   # writes ../index.html; stops on a missing text fragment, an em-dash or an unexpanded macro
node <page>/src/check_page.mjs <page>/index.html    # from the repo root: every control at 390 dark, 920 and 1400 light; explorer rates against recompute.json; 15 prose numbers; Table 1 reproduced
python3 html_utils/ledger.py init <page> && python3 <page>/src/label_ledger.py && python3 html_utils/ledger.py check <page>
```
The authors' repository has no licence file, so none of its data is committed: `recompute.py` reads it from a folder you pass and commits only derived numbers (rates, counts, and the record-setting runs per primary benchmark, rounded). The article itself is CC BY 4.0. `inputs/article.txt` is gitignored; without it the build uses `fragments.json` and gives the same page.

## What recompute.py finds
- Our Python port of `build_runs` and `pareto_decline_qtr` reproduces all eleven model-free rates of Table 1 and the authors' `out/stair.csv` (asserted). Pooled 47.0% is geometric; the arithmetic mean is 46.8%.
- Release dates: the registry lookup takes the earliest id starting with the cleaned name, so o3, o1, QwQ-32B, Gemini 2.5 Pro and Gemini 1.5 Pro-001 get earlier models' dates. Corrected: pooled 46.5%; GPQA 75% example 14.8 months, not 17.2; Epoch's launch-thread FrontierMath 25% example (o3, 377x) is beaten on o3's real release day by o4-mini at $0.13; the article's open-weight "second dot" becomes DeepSeek-R1-Distill-Qwen-14B.
- Sensitivities (pooled): late prices dropped 46.0, GPU prices dropped 47.0 (no change), untruncated runs 51.2, horizons 45.5 and 44.4, lattices 42.6 to 55.5 (GPQA 42.9 to 57.9; the article prints 58.0 for the scaled lattice), score thirds 43.8 / 50.4 / 49.8, leave-one-model-out 43.0 (o1) to 52.1 (o3) over 110 record holders.
- SOTA age, model-free: 58.5, 62.6, 41.7, 50.2, 47.5, 17.5, 17.3, 5.2, 13.2% a quarter at 0 to 8+ quarters since a level's debut (the article's model: 66.3 to 32.4).

## Departures from page-kinds/article.md
- **The live ingredient is the hero**: the staircase explorer sits beside the core idea and the first two sections, since the frontier is the concept the whole article rests on; it is a widget (no autoplay).
- **Responses fold the authors' replies into Ord's challenge**; the many coverage pieces that only repeat the headline are summarised in one sentence.
- **Table 1 sits in a closed block** with our recomputed column; Tables 2 and B-1's other columns are linked, not transcribed (Table 2's average and per-benchmark rows feed the age chart).

## Length judgement
Reading 15 minutes core plus 4 in closed details (measured 2026-11-27, `audit_pages.mjs`: 3,376 and 927 words), against the article's own 41 (9,527 words with appendices). The article spends half its length on model families the authors themselves set aside (envelope, all-data, stochastic frontier, accuracy models); the page keeps one sentence on them and spends the room on the recompute and its tests. Ledger: 162 units, core 105, depth 52, volatile 3, fat 2, problems 0.

## Sources read (27 November 2026)
The article and three Wayback copies (22 September 21:59, 23 September 18:59, 29 September 00:27 UTC); the authors' repository at 9163c17ee7 (data, R sources, outputs, commit history); the CAISI DeepSeek evaluation's method page; X posts through a public JSON mirror (Epoch's launch thread and 39 replies, Toby Ord's two posts, David Roodman's seven replies); Marginal Revolution, The Decoder, Tom's Hardware, Epoch's Gradient Updates of 28 September and Brief of 8 October; Zhu, arXiv 2608.29843 v1 and v2; Toby Ord's essay of 22 December 2025. Not checked: Hacker News (the search API was unreachable); most of the launch thread's 207 replies.
