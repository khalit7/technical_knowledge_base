# src: Observability page

Build: `sh build.sh` writes `../index.html` from `parts/` (same fail-safe build as the sibling Reliability engineering).

## Parts
- `01_head.html` (CSS, from the sibling plus page additions), `10_header.html` (title, tabs), `20_read_a..g.html` + `20_read_z.html` (Reading), `31_tab_alab.html`, `32_tab_real.html`, `39_tab_more.html`.
- JS: `21_js_data.js` (generated, the real run's extracts as `window.DEMO`), `22_js_common.js` (animation controller, copied), `23_js_wf.js` (trace waterfall, line chart, compact log line), `24_js_rd_a.js` (logs, percentiles, histogram_quantile, PromQL table, cardinality), `25_js_rd_b.js` (trace, traceparent, sampling, exemplars, profiling), `26_js_rd_ix.js` (the before/after incident animation), `27_js_rd_c.js` (dashboard row, sizing table), `31_js_alab.js` (Alert lab engine and UI), `32_js_real.js` (Real telemetry tab), `99_js_tabs.js`.

## Real data
- `demo/`: the instrumented services (`api.py`, `dep.py`, `common.py`), load generator, `prometheus.yml`, `run.sh`, `analyze.py` (queries Prometheus, extracts traces, logs, metric text into `inputs/demo_data.json`), `bench.py` (telemetry cost and sampling profiler), `rules/` (SLO alert rules plus promtool unit test, passing with promtool 3.15.0), `otelcol.yaml` (validated with otelcol-contrib 0.162.0). Run with `uv run --no-project --python 3.12 --with opentelemetry-sdk==1.45.0 --with prometheus-client==0.26.0`; Prometheus and the collector binaries were downloaded to scratch, not committed. A run takes about 4 minutes.
- `inputs/`: `demo_data.json` (analysis output), `explorer_logs.json`, `replica_stats.json`, `bench.json`, `profile_collapsed.txt`, `exemplars.json`.
- `make_data.py` compacts `inputs/` into `parts/21_js_data.js`.

## Checks
- `python3 recompute.py`: the SRE workbook's quoted figures from its formulas (one error found: the low-traffic "1,000x" burn rate is 100x), the Alert lab engine (`alertlab.py`) on 7 incidents x 5 SLOs, and the demo figures (exact percentiles, histogram_quantile by hand = Prometheus's 1.4619 s, log sizing, cardinality). Writes `recompute_out.json`.
- `node <this folder>/check_ui.mjs` from the repo root: clicks every control at 390 dark and 920 light, checks NaN/undefined/sideways scroll/errors, and compares the Alert lab's JavaScript with `recompute_out.json` on all 35 runs.
- `coverage.json`: root mentions and old-child facts this page owns or links; `viz_ideas.md`: visuals built and rejected.

## Departures from the child-page method
None of substance. The burn-rate tab differs from the sibling's Error budget and alerts tab on purpose: that one spends budget with the final rules; this one compares the workbook's six rules.
