# Visualisations: built and rejected

What the text needs to be understood: (1) a tool schema is generated from a function, and each library generates a different one; (2) structured output depends on where the schema travels (prompt, tool, response field, decoder), and the native route depends on the server; (3) handoffs and transfers are just tools, and the history moves with them; (4) a parallel guardrail lets the agent's first call happen; (5) the smolagents local executor is a rule set, not a sandbox.

## Built
| # | Idea | Score (teach / real data / cost) | Placement | Data |
|---|---|---|---|---|
| 1 | **One case through every output route** (step animation, route toggle = before/after on the same input): request (where the schema sits), what the server does with it, the model's reply, the library's verdict and retry | 5 / 5 / 3 | Reading s2 (inline) | recorded wire of each library on the local model; outlines in-process; Claude stream-json |
| 2 | Results table: route x valid / right function / right category / line parses / calls / first-prompt tokens | 5 / 5 / 1 | Reading s2 and Output modes lab | `recordings/local`, `recordings/claude` |
| 3 | Route x case heatmap with click-through to request, reply, retry, result | 4 / 5 / 2 | Output modes lab tab | same |
| 4 | Same function, four schemas, with a "what the model is told about `count`" comparison | 4 / 5 / 1 | Reading s1 | `recordings/demo/schemas.json` (each library's own schema code, no model call) |
| 5 | Executor probe table (allowed / refused, with the interpreter's own message) | 4 / 5 / 1 | Reading s5 | `recordings/demo/smol_exec.json` |
| 6 | Request-by-request stepper for handoff, guardrail, session, tracing, ADK transfer and ADK runs | 4 / 5 / 2 | Mechanisms tab | `recordings/demo/wire_*.jsonl` |
| 7 | Parallel vs blocking guardrail side by side (before/after) | 4 / 5 / 1 | Mechanisms tab | same |
| 8 | Validator retries table | 3 / 5 / 1 | Output modes lab | `recordings/local/pai_validator_*.jsonl` |

Inspiration: the DeepSeek MLA explainer (one input, a toggle for the method it replaced, step controls), the parent root's structured-output before/after (`afread-so-card`), the Same agent tab's request viewer.

## Rejected
- **Token-by-token constrained decoding animation** (which tokens the grammar masks at each step): would teach the mechanism well, but outlines does not expose the mask per step without patching its processor; reproducing it by hand would be illustrative, not recorded. The route animation's caption states the mechanism instead.
- **Wall-time chart per route**: the local server was shared with three other agents through a lock, so times measure queueing; not shown, and said so under the table.
- **Library architecture diagrams** (four boxes-and-arrows): the comparison table and the code excerpts say the same with less ink.
- **Re-running the parent's six-framework comparison**: owned by the root's Same agent tab; only the missing ADK run was added.
- **CrewAI and Microsoft Agent Framework runs**: the page's scope is the four typed libraries; the role-based school is one paragraph and a link.

## What the methodology lacked
A rule for **"the server is part of the experiment"**: the biggest effect measured here (native output failing on every case) is a property of the inference server, not of the library or the model. Worth adding: when a feature is negotiated between client and server (response formats, tool choice, stop sequences), record which fields the server actually reads before comparing clients.

## 2026-10-24 rebuild to the teaching contract
Nine SVG figures added inline in Reading (`src/parts/24_js_rd_figs.js`, all drawn at the measured width, static, nothing moves):
| Figure | Kind | Section | Data |
|---|---|---|---|
| Hero: your types to request (three routes) to server to validation and retry | static annotated diagram | top | structure from the source reads |
| Schema matrix: four libraries by four parameters (required, default, nullable, no description) | drawn from data | 1 | `FT.schemas` |
| Validity and right category per route, grouped by where the schema travelled | bar chart | 2 | `FT.so` |
| Pydantic AI retry loop | static annotated diagram | 3 | source (`messages.py`, `agent/__init__.py`) |
| Four loops, four stopping rules, default caps | static annotated diagram | 4 | source reads |
| Handoff and ADK transfer on the wire (speaker, tools, one square per message) | drawn from recorded requests, toggle | 5 | `FT.mech` |
| Guardrail parallel against blocking (before/after, bars to scale of prompt tokens) | before/after from recorded requests | 6 (moved from the Mechanisms tab) | `FT.mech` |
| ADK state scopes and an event's state_delta | static annotated diagram | 6 | ADK state docs |
| Choosing ladder | static decision diagram | 8 | the page's judgement plus the parent's measured outcomes |
The route stepper (built 1) no longer starts playing on a route switch. Rejected: a real image (the page is about libraries, no physical object; a vendor trace-dashboard screenshot has no clear licence).
