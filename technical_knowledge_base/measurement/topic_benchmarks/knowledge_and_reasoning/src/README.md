# Source of the Knowledge and reasoning benchmarks page

`sh build.sh` writes `../index.html` (same fail-safe build as the parent root: one `<script>` per JS part, `#jsErr` box, `{{text|url}}` links).

Shape: child page per `html_utils/methods/topic_pages.md` Part B. Reading tab (about 33 min, 7,600 words; long because this child owns the depth the root folded away) organised benchmark by benchmark: one screen table; how they are graded; MMLU, MMLU-Pro, multilingual (MMMLU, Global-MMLU, INCLUDE, MGSM pointer); GPQA; HLE (construction, judge, FutureHouse and HLE team audits, HLE-Verified, HLE-Diamond, tools on/off); SimpleQA and Verified; BIG-Bench/BBH/BBEH; HellaSwag/WinoGrande/ARC-Challenge; SimpleBench; ARC-AGI 1, 2, 3 (incl. the 67-cent transformer, harnesses, effort, RHAE); AA-Briefcase; residuals; what to use; common mistakes. Correction boxes against the old page throughout. Tabs: Grade it yourself (`t-grade`), Fix the key (`t-key`, the before/after animation), ARC-AGI lab (`t-arc`), Further reading. Root tabs (atlas, saturation, same model) are linked by name, not rebuilt.

## Files
- `live.md`: old Notion page verbatim (fetched; no child pages, databases, video or embed).
- `fetch_redux.py` (MMLU-Redux 2.0, needs pyarrow), `fetch_arc.py` (ARC tasks), `fetch_items.py` (HF samples), `save_excerpts.py` (text windows of every primary source into `inputs/excerpts/`).
- `tables.py`: transcribed published tables (MMLU-Redux T2, HLE-Verified T2, SimpleQA T3, MMLU-Pro T3, HLE tools pairs, HLE-Diamond).
- `recompute.py`: 54 checks and every derived number into `inputs/recompute.json`. `mk_data.py`: `parts/11_js_data.js` (`window.KR`).
- `mk_coverage.py` -> `coverage.json` (109 facts of live.md: 90 carried, 18 corrected, 1 superseded; each located in the built HTML).
- `check_ui.mjs`: every control at 390 dark and 920 light (702 actions), plus value checks (SimpleQA F, toy grader, ARC rules, solver, RHAE presets). `shots.mjs`: screenshots of each visual into `../.shots/parts/`.
- `viz_ideas.md`: ranked ideas.

Rebuild: `python3 recompute.py && python3 mk_data.py /path/to/redux_cache && sh build.sh && python3 mk_coverage.py` (mk_data works without the cache via `inputs/redux_seq.json`).
