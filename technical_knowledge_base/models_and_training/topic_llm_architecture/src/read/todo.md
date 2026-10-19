# Reading tab: lab numbers (all filled 2026-10-19 by the root fix pass)

Every `data-rd` key is filled from `lab_values.json` (written into `parts/22_js_rd_data.js` by `make_read_data.py`), and `check_data.py` checks each lab number against the recorded file it comes from (src/attn/out, src/block/out, src/inside/out, the Mixture of experts child's router file, the Positional Encodings child's past.json) and each child number quoted in prose against that child's `src/facts.md` (128 checks on 2026-10-19). `moe_rec` was dropped: the MoE caption in `20_read_e.html` now states the recorded source itself, and `moe_route` feeds the animation.

To change a lab number: edit `lab_values.json`, `python3 make_read_data.py`, `sh ../build.sh`, `python3 check_data.py`; then `node check_read.mjs <shots dir>` and update `#rd-time`, `#rd-time-qa` and `#rd-more-time` if the reading time moves.
