# Agent security: permissions, sandboxes, prompt injection, egress

Notion: https://app.notion.com/p/3f15c17b0d0d81ad9fb7d1dd74217335 (child of Topic: agentic-harnesses)

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`; see `src/README.md`). A new page (no old Notion text, no child pages, databases or video). It extends section 5 of the harnesses root and reconciles with the root's Loop lab gate: it reuses that gate's real `check()` and verdict table rather than rebuilding it.

Teaches, from zero, the layered defence around an agent that runs tools with your rights: the trust boundary (confused deputy), the permission gate (allow/ask/deny, the fail-closed default, the python-vs-python3 lesson), OS sandboxes (macOS Seatbelt and Linux bubblewrap/Landlock, with a benign `sandbox-exec` demonstration measured here), egress control by destination (default-deny, covering DNS), credential isolation, direct and indirect prompt injection, the lethal trifecta, the verified OpenAI DNS incident, and a table of defences that work vs ones that only look like they do.

## Scope: defensive only (revised 2026-10-06, after a safety stop)
The attack classes are taught conceptually, from published sources (OWASP LLM01; Simon Willison's lethal trifecta) and dated, first-party incident reports (the OpenAI DNS report). The page does not develop, test or record any bypass of a gate or sandbox, and does not craft or run an injection attack against any model or harness. Every hands-on piece is a control doing its job on a benign or clearly-dangerous action, with no model and no attack performed.

Real evidence (all local, benign, 6 Oct 2026): a `sandbox-exec` (Seatbelt) demonstration where a benign command cannot open a socket or write outside its directory (the only bytes sent are a fixed marker to a local listener started and stopped for the test); the root Loop lab gate deciding on a fixed action set with no model; and a destination egress allow-list evaluated as a pure function. The sibling Claude Code page's recorded permission matrix (twelve benign actions in eight configurations) and hook guard are linked and reused, not re-recorded.

Tabs: Reading, Permission gate decisions, Defence-in-depth simulator, Further reading.
