# Chip atlas tab (t-chips)

Parts: `../parts/31_tab_chips.html` (markup and scoped CSS), `../parts/31_js_chips_0data.js` (generated), `31_js_chips_1core.js` (helpers, table, row detail, compare), `31_js_chips_2viz.js` (headline peel animation, timeline, compute-against-bandwidth animation, ridge chart, capacity chart, measured bars, prices, drills).

Files here:
- `chips_data.py`: every chip's figures, typed from the source named per field (all fetched 2026-10-05), with derivations stated. Writes `chips.json` and the data part.
- `recompute.py`: Python reference for every derived number (per-chip x domain against the vendor's rack and pod totals, ridge points, peel steps, generation growth, arithmetic-intensity lines, chips needed for weights). Writes `expected.json`.
- `check_page.mjs`: opens the built page and checks that it embeds exactly `chips.json`, that its JavaScript reproduces `expected.json`, and that numbers quoted in prose match.
- `unconfirmed.md`: claims that could not be verified and where they were looked for.
- `viz_ideas.md`: visuals built and rejected, with scores.

Rebuild: `python3 chips_data.py && python3 recompute.py && sh ../build.sh && node check_page.mjs` (the last from anywhere; it resolves paths itself).

Conventions: peaks are dense TFLOPS per chip (sparse printed beside); bandwidth TB/s; memory decimal GB (GiB converted and said so); link bandwidth as the vendor prints it (bidirectional total for NVIDIA, AMD, Google). Vendor figures and independent measurements are never mixed: measurements live in each chip's `meas` list and the "Vendor peak against independent measurement" chart.
