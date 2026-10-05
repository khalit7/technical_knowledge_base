# Part 3 (tl): visualisation ideas

Ranked by how much they teach that a static view cannot (1 to 5), all built from recorded runs.

1. **Agent loop stepper (tab, built, 5).** The same task under four scenarios (happy, tool error, slow tool, runaway); frames: request (whole messages array resent), reply (stop_reason, blocks), tools run (ms bars, Promise.all wall time), end. Counters: model calls, messages, tokens, cost. Before/after: the guards acting (is_error recovery, timeout, maxSteps). Data: `outputs/c1_agent_loop.json`.
2. **MCP message flow (tab, built, 5).** Client/server sequence with every JSON-RPC message pretty-printed; toggle stdio vs Streamable HTTP (same conversation, different envelope: POST/GET/DELETE, session and protocol headers). Data: `g2_mcp_client.json`, `g3_mcp_http.json`.
3. **Stream inspector (Reading, built, 4).** The same answer as Anthropic SSE frames vs OpenAI Responses frames, plus a tool call's partial JSON; each frame raw, with the assembled text or arguments computed live. Before/after: two wire formats of one answer. Data: `b1_stream.json`, `b2_stream_openai.json`.
4. **Cancellation before/after (Reading, built, 4).** Browser, server, model lanes plus 114 cells (read, wasted, never generated); toggle abort propagation on/off. Data: `h1_serve.txt` (one step in the "without" run is an estimated midpoint, said on the page).
5. Backpressure (rejected as an animation, 2): two numbers (2,070 KiB vs 64 KiB) say it; kept as a predict-then-reveal.
6. Token growth per turn chart (rejected, 2): six numbers in the e1 output and one sentence (quadratic) are enough.
7. Live in-page agent against a JS mock (rejected): would duplicate the stepper with invented answers; the page's rule is recorded outputs.

Methodology gap: the methodology assumes real data; here the model is a scripted mock by necessity (no API key, no paid calls). Each visual says which parts are real (SDK frames, tool outputs, timings) and which are synthetic (model text, token estimates).
