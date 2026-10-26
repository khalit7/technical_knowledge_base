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

## Parts (since the 2026-10-24 rebuild)
- `10_header.html` title, subtitle with the measured reading time, tabs (Reading, Further reading).
- `20_read.html` styles, the top (core idea, hero, You need, New terms, legend, nav); `20_read_a.html` sections 1 to 3
  (threat model and trifecta, injection, supply chain); `20_read_b.html` 4 and 5 (gate, human approval);
  `20_read_c.html` 6 to 8 (sandbox, egress, credentials); `20_read_d.html` 9 to 11 (detection, red-teaming, what works)
  and the closed Depth blocks; `20_read_z.html` the footer.
- `26_js_hsec_data.js` the defensive data (generated, see below); `27_js_rd_hsec.js` every Reading figure (SVG at the
  measured width): hero, trifecta design tool, token stream, pin-and-hash stepper, gate stepper and the full gate table,
  approval bars, sandbox before/after, egress stepper, credential placement, DNS incident timeline.
- `39_tab_more.html` Further reading (t-more).
- `21_js_rd_common.js` and `99_js_tabs.js` are the explainer-page skill templates (storage key `hsec-tab`): nothing
  moves until the reader presses play or steps. `05z_errbox.js.html`, `01_head.html` from the parent root.

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
- `check_ui.mjs` checks nothing plays before input, then steps every stepper, toggles the sandbox switch and every
  trifecta control, opens the closed blocks and counts the 11 gate rows, at 390 dark and 920 light (puppeteer headless
  'shell'): no page error, NaN, undefined or sideways scroll.

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

## The 2026-10-24 rebuild to the teaching contract
**What changed and why.**
- **Top**: the core idea in one sentence, a hero figure (the trust boundary: untrusted text in, tool calls out, the
  controls outside the model between them and your files, secrets and network, with the three trifecta legs marked and
  section numbers on the figure), You need and Not here (links to the owners), six new terms.
- **The two tabs moved into the Reading flow** (each explained one mechanism): the Defence-in-depth simulator became the
  trifecta design tool in section 1 (one figure: tick controls, see which leg goes); the Permission gate decisions tab
  became a closed block under section 4 with all 11 rows.
- **Every core idea has a visual beside it** (0 SVG visuals before, 9 counted by the audit after, 10 figures): hero,
  trifecta tool, token stream (static), pin-and-hash stepper (new), gate rule-chain stepper (the old HTML list redrawn
  as the rule chain with the path lit), approval bars (new), sandbox before/after (redrawn as SVG, same measured
  results), egress stepper (redrawn), credential placement (new, static), DNS incident timeline to scale (new).
- **Absorbed what this page owns per the brief and did not yet teach**: tool and MCP-server supply chain (section 3,
  sourced to Invariant Labs and the MCP page), human approval design (section 5, Anthropic's 7 Aug 2026 figures,
  labelled VENDOR), detection and its limits (section 9), red-teaming agents (section 10, AgentDojo's counts checked
  against arXiv 2406.13352). Meta's Muse agent and the Grok injection are linked as worked examples, not re-taught.
- **Order** follows the threat model: who is attacked and how (1 to 3), then the controls from cheapest to strongest
  (4 to 8), then how you know they work (9, 10), then the grades (11).
- **Deleted as fat**: wind-ups, the "how this page is organised" paragraph, restatements, the Common mistakes block
  (every item restated a core section), pointers to the removed tabs. Interview answers are a closed block.

**Length judgement.**
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 wpm) | 25.4 min | 23.9 min |
| Reading, closed details | 1.7 min | 2.8 min |
| Other tabs (gate, simulator) | 3.8 min | 0 (moved inline or closed) |
| Further reading | 2.2 min | 2.7 min |
| Visuals counted inline | 0 | 9 |

Why about 24 minutes is right: the page now covers every concept OWNERS should list for it (threat model, injection,
supply chain, gate, approval, sandbox, egress, credentials, detection, red-teaming) where the old one skipped four of
them, and it still got shorter in total (29.2 to 23.9 core minutes including the old tabs) because restatement, the
mistakes list and tab prose went. Every remaining core unit carries a mechanism, a number or a source a reader needs.

**Update pass 2026-10-26** (update-kb): core 23.9 to 27.6 min (header 28). Integrated the LiteLLM 1.107.0 signed-pipeline
compromise and Railway (section 3), OpenShell and 1Password for Agents as credential injection (section 8), Anthropic's
Red-teaming Auto Mode and METR/Redwood's review of OpenAI monitoring (section 9, heading now "an alert is not a brake"
since blocking monitors do block), the UK AISI Mythos 5 assessment (section 9 callout), and the matching table rows and
checklist question. All new units are core (10 ledger units, section "added: ..."). The egress stepper's first line
now wraps (it clipped at 390 px in Linux Chromium fonts).

**Ledger** (`src/ledger.json`, `python3 html_utils/ledger.py check`: problems 0): 311 units, core 213, depth 22, fat 76.
299 drafted by `ledger.py init` from the old page; 12 added by hand for the new owned content (section names start
"added:"). Fat units carry a `note`.

**Departures**: no real image. The subject has no physical object or canonical figure a photo would teach better than
the diagrams; a product screenshot (a permission prompt) would be volatile and of unclear licence.

**Contract pass 2026-10-26** (after the routine audit): section 9's dated per-item material moved into two closed blocks, "METR and Redwood Research's review of OpenAI's agent monitoring (access 21 July to 11 August 2026)" and "Incidents with a first-party write-up, as read 26 October 2026" (the Anthropic, Wikimedia and UK AISI incidents). The blocking-monitor paragraph with the 55% figure and the lesson paragraph ("No boundary was broken in those incidents") stay in core. Header 26 min, plus 5 in closed details (measured 5,965 and 1,063 words at 230 a minute); 7 ledger units relabelled core to depth; `ledger.py check` problems 0.

2026-10-26 (final follow-up sweep): section 2 adds Task Shield and IPIGuard (action-boundary defences, from Emergence World; abstracts read 26 Oct 2026); section 6 adds 'a sandboxed interpreter is an injection decoder' (absorbed from the Grok page, which links here for it); section 9 adds MOLE's detection limit (best monitor 24 of 45 completed harms at 10 reviews a day). The Meta Muse links were already in place.
