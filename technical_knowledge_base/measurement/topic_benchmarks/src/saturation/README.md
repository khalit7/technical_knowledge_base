# Saturation timeline (tab t-sat)

Data and checks for the "Saturation timeline" tab of Topic: benchmarks. Parts: `../parts/33_tab_sat.html`, `33_js_sat_a.js` (data, generated), `33_js_sat_b.js` (rules), `33_js_sat_c.js` (charts), `33_js_sat_d.js` (durations, trend, replay, tables). Data: `../data/saturation.json`.

Rebuild:
1. Download the raw files listed in `fetch_inputs.py` into a scratch folder, then `python3 fetch_inputs.py <scratch>` (writes the trimmed `inputs/*.json`, about 0.5 MB).
2. `python3 make_saturation.py` (writes `../data/saturation.json` and `../parts/33_js_sat_a.js`).
3. `python3 check_saturation.py` (data checks; recomputes every duration for 16 settings into `expected.json`), then `node check_core.mjs` (the page's JavaScript must agree: 368 of 368).
4. `sh ../build.sh`, then `node check_ui.mjs` (clicks every control at 390 px dark and 920 px light) and `node shots.mjs <scheme> <width> <benchmark id> [cal:i|age:i]` for section screenshots in `../../.shots/`.

Sources and verbatim quotes: `notes.md`. Visual ideas built and rejected: `viz_ideas.md`.
