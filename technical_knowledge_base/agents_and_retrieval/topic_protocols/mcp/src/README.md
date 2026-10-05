# src: MCP child page

- `build.sh` writes `../index.html` from `parts/` (same assembler as the root page; `{{text|url}}` links).
- `parts/`: `01_head.html` (shared CSS from the root), `10_header.html`, `20_read*.html` (Reading, sections a to k), `22_js_data.js` (generated), `25_js_read.js`, `31_*` (Two replicas tab), `32_*` (Wire lab tab), `39_tab_more.html`, `99_js_tabs.js`.
- `lab/`: every recording. `sh lab/run_all.sh <scratch dir>` re-runs them (about 3 minutes; venvs with mcp 2.3.0 and 1.30.0, a throwaway CA from `../../src/wire/make_ca.sh`, ports 30710 to 30761) and redacts `lab/out/` (`redact.py`: scratch and home paths, lab JWTs truncated, private patterns checked).
  - `ckpt_server.py`: the running example server (both protocol eras).
  - `replicas.py` + `lb_proxy.py`: two replicas behind a round-robin or affinity balancer, four setups, 20 runs each.
  - `transports.py` + `tcp_tap.py` + `tee_stdio.py`: stdio and Streamable HTTP, cold and warm timings, bytes per call, a progress stream.
  - `compat.py` + `modern_only.py`, `legacy_server.py`, `compat_client1.py`, `compat_client2.py`: every client era against every server era.
  - `auth_run.py` + `auth_as.py`, `auth_mcp.py`: the OAuth flow with a Client ID Metadata Document, then the failures and a mix-up.
  - `wire_checks.py`: hostile and malformed requests against the SDK server.
- `gen_data.py` turns `lab/out/*.json` into `parts/22_js_data.js` (trimming only).
- `check_embed.py` confirms the page embeds the current data and recomputes the 14 numbers quoted in prose; also greps for private and secret-like text.
- `live.md` is the old Notion page as fetched (copied from the root's `src/read/old/`); `coverage.json` maps each of its facts.
- `viz_ideas.md`: visuals built and rejected.

Shape: Part B of `html_utils/methods/topic_pages.md` (Reading by the subject's own logic, one tab per standalone visual). Departure: the Reading carries tables filled from recordings rather than charts, because the subject is message exchanges, not quantities; the one animation is in its own tab because it needs the width. No model is called anywhere; user consent and the user's "yes" are scripted and labelled.

A planned "attack lab" (scripted agent against poisoned tools) was dropped during the build; the security section teaches those threats from primary sources and links the root's existing benign recording instead.
