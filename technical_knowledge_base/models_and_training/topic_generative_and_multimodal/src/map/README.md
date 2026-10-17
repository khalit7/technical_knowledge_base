# Model map tab (t-map, prefix mm)

Parts: `../parts/36_tab_map_a.html` (CSS, intro), `36_tab_map_b.html` (timeline, stack animation), `36_tab_map_c.html` (table, picker, licences), `36_js_mm_0data.js` (generated), `36_js_mm_1core.js` (helpers, animation controller, table, detail), `36_js_mm_2time.js` (timeline and year sweep), `36_js_mm_3stack.js` (one prompt through six pipelines; five VLMs), `36_js_mm_4pick.js` (picker).

Rebuild the data (network, light; no weights downloaded), then the page:
```
python3 -I fetch_hf.py        # HF API metadata for hf_repos.txt -> out/hf_meta.json
python3 -I fetch_arxiv.py     # arXiv ids in arxiv_ids.txt -> out/arxiv.json
python3 -I fetch_configs.py   # pipeline configs -> inputs/cfg_*.json (VLM configs inputs/vcfg_*.json were fetched with curl from each repo's config.json)
python3 -I count_params.py    # component parameter counts from safetensors headers (HTTP range) -> out/component_params.json
python3 -I gen_data.py        # validate rows, build ../parts/36_js_mm_0data.js and out/mm_data.json
sh ../build.sh && python3 -I verify.py   # page embeds exactly out/mm_data.json; prose numbers match the data
node check_tab.mjs ../../index.html <shots dir>   # every control at 390 dark and 920 light
```
Rows live in `models_a.py` (image), `models_b.py` (video, audio), `models_c.py` (encoders, VLMs, native, libraries); field meanings at the top of models_a.py. Dates: paper v1 (arXiv API), vendor announcement, first Wayback capture, or Hugging Face repo creation (which can precede a public release by days). Rows with only press or Wikipedia confirmation carry `ev='secondary'` and show a "secondary" tag. Verified facts: `facts.md` (also in the topic's shared FACTS.md under "## map").

Departure from the method (topic_pages.md Part A data tabs): this is a release-and-licence map, not a benchmark grid. Quality is deliberately not ranked: image and video arenas move weekly and the Reading tab and the evaluation child page own measurement. Licences are kept verbatim per checkpoint, and "still downloadable" (removed SD 2.1, renamed SD 1.5) and "still served" (Sora) are tracked as status, following the methodology's rule for categorical licence data.
