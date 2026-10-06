# Build: Agent security page (DEFENSIVE ONLY)

`sh build.sh` assembles `../index.html` from `parts/`.
Order: `01_head` (shared CSS, page title) + `10_header` (title and tab bar) + `20_read.html` then `20_read_*.html`
(Reading) + `3*_tab_*.html` (one per standalone tab) + the error box + every `parts/*.js` in file-name order with
`99_js_tabs.js` last. Links written `{{text|n:<id>}}` or `{{text|#t-tab}}` are expanded by build.sh.

## Scope (revised 2026-10-06, Khalid, after a safety stop)
This page is **defensive only**. It teaches the attack classes (prompt injection direct/indirect, the lethal
trifecta, egress and credential exposure) conceptually, from published sources and dated incident reports. It does
**not** develop, test or record any way to bypass a gate or a sandbox, and it does **not** craft or run an injection
attack against any model or harness (including Claude Code). All hands-on evidence is a control doing its job on a
benign or clearly-dangerous action, with no model and no attack: see `sec/`.

## Parts
- `20_read.html` wrapper + nav + the MEASURED/SOURCE legend; `20_read_a..g.html` the sections
  (0 one screen + 1 trust boundary; 2 permission gate; 3 sandboxes; 4 egress + 5 credentials; 6 injection + 7 trifecta;
  8 incidents + 9 what works; mistakes + interview); `20_read_z.html` the footer.
- `26_js_hsec_data.js` the defensive data (generated, see below); `27_js_rd_hsec.js` the Reading-tab visuals.
- `35_tab_gate.html` + `36_js_gate.js` the Permission gate decisions tab (t-hsgate): the root gate table, reused.
- `37_tab_def.html` + `38_js_def.js` the Defence-in-depth simulator tab (t-hsdef): a no-model policy design tool.
- `39_tab_more.html` Further reading (t-more).
- `21_js_rd_common.js`, `99_js_tabs.js`, `05z_errbox.js.html`, `01_head.html` copied from the parent root unchanged
  (only the title in `01_head` and the storage key in `99_js_tabs` were changed for this page).

## Data and evidence (`sec/`), all benign
- `build_data.py` writes `parts/26_js_hsec_data.js` from three defensive sources: (1) the root Loop lab's real gate
  `check()` run on a fixed action set, reused verbatim from `../../../src/loop/gate_cases.json` (the root's approved
  table, not re-recorded); (2) a benign `sandbox-exec` (Seatbelt) demonstration run here via `sb_probe.py` under
  `net.sb` / `write.sb` (a benign command tries to open a local socket and to write outside its directory; the kernel
  refuses both; the only bytes sent are the fixed marker `/sandbox-demo-ping`); (3) `egress_policy.decide()` on
  representative outbound requests (a destination allow-list, as a pure function, no network). Ends with a privacy grep.
- `egress_policy.py` the destination egress allow-list (default-deny, covers DNS). Pure, inspectable, no network.
- `sb_probe.py`, `net.sb`, `write.sb` the benign Seatbelt demonstration helpers.
- `check_embed.py` proves the page embeds the data verbatim, carries no forbidden token, email, git identity, em-dash
  or offensive artefact, and that the prose numbers (11-action gate table: 4 allow, 7 deny, 4 named / 3 fail-closed;
  7 egress requests covering DNS; the benign sandbox results) match the data.
- `check_ui.mjs` clicks every control at 390 dark and 920 light (puppeteer headless 'shell'): no page error, NaN,
  undefined or sideways scroll.

## Pipeline
    cd sec && python3 build_data.py && cd .. && sh build.sh && cd sec && python3 check_embed.py
    (from the repo root) sh html_utils/checkpage.sh technical_knowledge_base/agents_and_retrieval/topic_agentic_harnesses/agent_security
    node technical_knowledge_base/agents_and_retrieval/topic_agentic_harnesses/agent_security/src/sec/check_ui.mjs <outdir>

## Reconciliation with the root and siblings
- Reuses the root's Loop lab `check()` and its `gate_cases.json` verdicts unchanged; does not rebuild the gate.
- Links the sibling Claude Code page for the permission RULE SYNTAX and its recorded permission matrix (twelve benign
  actions in eight configurations) and hook guard, rather than re-recording any of it.
- OS sandbox mechanics are linked to Containers and isolation, not repeated.
- Incidents are quoted from their first-party, dated reports only (OpenAI DNS report; OWASP LLM01; Willison).
