# src/read: notes behind the Reading tab

Since the 2026-10-23 rewrite the Reading tab is a map of the topic in static HTML (parts `20_read*.html`, `39_tab_more.html`), checked by the knowledge ledger (`../ledger.json`) and `../check_stages.mjs`; see `../README.md`. The older `data-rd` fills, their generator (`make_read_data.py`, `lab_values.json`), checks (`check_data.py`, `check_read.mjs`) and lab-number todo were removed on 2026-11-18 (in git history): they targeted parts deleted on 2026-10-23 (commit bc10a299b).

Files here:
- `derive.py`: every derived number quoted in prose (KV bytes, parameters, FLOPs, the design answer), from config values with sources; writes `derived.json`.
- `facts.md`: facts verified, with sources. `viz_ideas.md`: visuals built and rejected.
