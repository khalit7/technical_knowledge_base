# Model Context Protocol (MCP)

Updated 2026-08-24. Current spec revision: **2026-07-28**.

## Best resources

- [Official spec](https://modelcontextprotocol.io/specification/latest) and [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog): read the actual spec; it is short and well written.
- [MCP blog: The 2026-07-28 Specification](https://blog.modelcontextprotocol.io/posts/2026-07-28/): the authors' own summary of the stateless redesign.
- [Security best practices page of the spec](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices): confused deputy, token passthrough, session hijacking.
- [Simon Willison's MCP/prompt-injection posts](https://simonwillison.net/tags/model-context-protocol/): the clearest thinking on the "lethal trifecta" (private data + untrusted content + exfiltration channel).
- [MCP spec version timeline](https://hidekazu-konishi.com/entry/mcp_specification_version_timeline.html): concise version-by-version history.
- SDKs: [TypeScript](https://github.com/modelcontextprotocol/typescript-sdk), [Python](https://github.com/modelcontextprotocol/python-sdk) (FastMCP-style decorators built in), Go, C# are Tier 1; Rust is beta.

## What it is

MCP (Anthropic, Nov 2024; now a broadly adopted open standard) standardizes how LLM applications connect to external context and tools: "USB-C for AI". JSON-RPC 2.0 messages between a **host** (the LLM app: Claude Code, Claude Desktop, IDEs), which runs one **client** per connection, and **servers** that expose capabilities. The host owns the model loop and user consent; clients are 1:1 connection handles; servers are small, focused capability providers (filesystem, GitHub, Postgres, your internal APIs).

## Primitives

Server-exposed (the big three):
- **Tools**: model-controlled functions. JSON Schema input (and, since 2025-06-18, optional `outputSchema` + structured content). Discovery via `tools/list`, invocation via `tools/call`. Annotations hint read-only vs destructive.
- **Resources**: application-controlled data (URI-addressed documents, files, table schemas) for the host to inject as context; support subscriptions for change notifications.
- **Prompts**: user-controlled templates (slash-command-like), parameterized, discoverable.

Client-exposed (server asks the host):
- **Sampling**: server requests an LLM completion through the host, so servers can be "agentic" without holding API keys. **Deprecated in 2026-07-28** (12-month window); its role is largely replaced by host-side agent loops.
- **Elicitation** (added 2025-06-18): server requests structured user input mid-operation (confirmation, form fill). In 2026-07-28 this is realized statelessly via Multi Round-Trip Requests.
- **Roots**: client tells the server which filesystem/URI boundaries it may operate in. Also **deprecated in 2026-07-28**.

Plus: logging (deprecated 2026-07-28), progress notifications, argument completion, pagination, cancellation.

## Transports

- **stdio**: host spawns the server as a subprocess, JSON-RPC over stdin/stdout, one line per message. Zero network surface; the default for local dev tools and what most Claude Code MCP configs use.
- **Streamable HTTP** (since 2025-03-26): a single endpoint; client POSTs JSON-RPC, server replies with `application/json` or upgrades that response to an SSE stream for progress/streamed results. Replaced the original HTTP+SSE dual-endpoint transport (which is now in a year-long phase-out). Stateless-friendly: since 2026-07-28 there is no `Mcp-Session-Id`; each request self-describes via `_meta` and new `Mcp-Method`/`Mcp-Name` headers let gateways route without parsing bodies.

## Spec revision history (to Aug 2026)

| Revision | Highlights |
|---|---|
| **2024-11-05** | Initial: JSON-RPC 2.0, tools/resources/prompts, sampling, stdio + HTTP+SSE transports. |
| **2025-03-26** | OAuth 2.1 authorization framework; **Streamable HTTP** replaces HTTP+SSE; tool annotations, audio content, completions, JSON-RPC batching. |
| **2025-06-18** | Structured tool output; **elicitation**; resource links in results; batching removed; servers become OAuth **Resource Servers** with RFC 8707 resource indicators (audience-bound tokens); security best practices doc. |
| **2025-11-25** | Auth discovery via OIDC Discovery, incremental scope consent; icons, standard enums, JSON Schema 2020-12; experimental Tasks. |
| **2026-07-28** | Largest revision yet: **stateless core** (no initialize handshake, no sessions; version/identity/capabilities travel per-request in `_meta`), **Multi Round-Trip Requests** (`resultType: "input_required"` + retry with `inputResponses` replaces server-initiated requests over open streams), header-based routing, cacheable list results (`ttlMs`, `cacheScope`), auth hardening (RFC 9207 issuer validation; **Client ID Metadata Documents** replace Dynamic Client Registration; issuer-bound credentials), formal **extensions framework** (Tasks graduates to `io.modelcontextprotocol/tasks`; **MCP Apps** for interactive UI), deprecation policy (roots, sampling, logging deprecated with 12-month support). |

Design direction: away from a chatty stateful session protocol toward a cacheable, load-balancer-friendly, gateway-routable request protocol, which is what enterprise remote-server deployment demanded.

## Authorization

For HTTP transports only (stdio inherits process credentials/env vars):
- Servers are OAuth 2.1 **resource servers**. On 401 they return `WWW-Authenticate` pointing to protected resource metadata (RFC 9728), which points to the authorization server; client discovers AS metadata (RFC 8414 / OIDC Discovery), runs **authorization code + PKCE**, and sends `Authorization: Bearer` on every request.
- Tokens must be audience-bound to the specific server (RFC 8707 `resource` parameter); servers MUST reject tokens not issued for them, and MUST NOT pass their inbound token to upstream APIs (token passthrough is explicitly forbidden).
- 2026-07-28 replaced Dynamic Client Registration with **Client ID Metadata Documents** (client identity = HTTPS URL serving its own metadata) and added RFC 9207 `iss` validation against mix-up attacks.
- Details and the agent-era risks in [auth.md](auth.md).

## Security concerns

- **Prompt injection via tool results**: any tool output (web page, file, issue comment) is untrusted content entering the context. With private-data access plus an exfiltration channel (a tool that can make requests), injection becomes data theft: the lethal trifecta. Mitigations: least-privilege servers, output sanitization, human approval for destructive/exfiltrating actions, egress restrictions; none are complete.
- **Tool poisoning / rug pulls**: malicious instructions hidden in tool descriptions, or a server changing its descriptions after install. Clients should pin/diff tool definitions and surface changes.
- **Confused deputy**: an MCP server proxying a third-party API can be tricked into using its own (privileged) client identity/consent cookie on behalf of an attacker, e.g. skipping consent on a forged authorization flow. Fix: per-client consent, exact redirect URI validation, audience-bound tokens, no token passthrough.
- **Session hijacking** (pre-2026 stateful transports): guessable session IDs let attackers inject events; statelessness in 2026-07-28 removes much of this class.
- **Supply chain**: thousands of community servers of unknown quality; treat installing an MCP server like installing an npm package with shell access. Prefer official/registry-verified servers, containerize, scope credentials.

## Ecosystem state (Aug 2026)

- Adopted by all major hosts: Claude (Code/Desktop/API MCP connector), OpenAI, Google/Gemini, Microsoft (Windows, Copilot Studio), Cursor, VS Code, JetBrains.
- **Official registry** at registry.modelcontextprotocol.io (launched Sept 2025, still preview): ~2k servers; aggregators list far more (PulseMCP 15k+, Smithery ~7k). Quality is a long tail; the registry adds namespacing and provenance, not vetting.
- Governance moved to community working groups with an SEP (spec enhancement proposal) process; Tier 1 SDKs track spec releases.
- Gateways/middleware are a real category now (auth, routing, metering, tool filtering in front of fleets of servers); header-based routing in 2026-07-28 exists for them.

## Building servers well

- Start from the Python or TypeScript SDK; decorate functions as tools; run stdio first, add Streamable HTTP when you need remote.
- **Design tools for the model, not for your API**: few, high-level, task-shaped tools beat a 1:1 REST mirror; write descriptions like docs for a junior engineer; return concise, structured results (token cost is real); paginate/truncate large outputs.
- Use `outputSchema` + structured content; mark read-only vs destructive via annotations; make destructive tools idempotent where possible.
- Log to stderr (stdio transport reserves stdout for JSON-RPC); never print to stdout.
- For remote servers: statelessness is now the grain of the protocol, so keep no per-session state server-side; set `ttlMs` on stable lists; validate tokens properly (audience, issuer); rate-limit per client.
- Test with MCP Inspector; evaluate tools with real agent transcripts (do models pick the right tool with the right args?).

See also: [auth.md](auth.md), [realtime-and-events.md](realtime-and-events.md) (SSE mechanics), [summary.md](summary.md) for MCP vs A2A positioning.
