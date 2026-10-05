<!-- title: Auth: OAuth2/OIDC, JWTs, API keys, service-to-service, and the agent era | url: https://app.notion.com/p/3c65c17b0d0d817692dcc8ebd59b5c2b?pvs=204 | page_last_edited_at: 2026-09-22T00:02:16.363Z | fetched read-only 2026-10-05 -->
Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d817692dcc8ebd59b5c2b as of 2026-09-22T00:02:16.363Z:
<page url="https://app.notion.com/p/3c65c17b0d0d817692dcc8ebd59b5c2b">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81ec9355f4eecd6eed02" title="Topic: protocols"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Auth: OAuth2/OIDC, JWTs, API keys, service-to-service, and the agent era"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 10 min read · +9h resources
## Best resources
- [OAuth 2.1 draft](https://oauth.net/2.1/) (2h 30m) (draft-ietf-oauth-v2-1, still Standards Track draft as of 2026 but the de facto profile): consolidates RFC 6749 + PKCE + Security BCP; read this instead of OAuth 2.0.
- [Aaron Parecki, "OAuth 2 Simplified"](https://aaronparecki.com/oauth-2-simplified/) (30 min) and his [oauth.net](https://oauth.net/) materials (\~45 min for the flow guides): clearest flow-by-flow explanations (Parecki also co-designed MCP's auth).
- [RFC 8725 JWT Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725) (40 min): the pitfalls list, from the horse's mouth.
- [OIDC Core spec](https://openid.net/specs/openid-connect-core-1_0.html) (2h 15m) plus [Auth0 docs](https://auth0.com/docs/get-started/authentication-and-authorization-flow) (docs, \~45 min for the flow pages): pragmatic flow selection.
- [MCP authorization spec](https://modelcontextprotocol.io/specification/latest/basic/authorization) (35 min) and [security best practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices) (20 min): the agent-era twist, including why token passthrough is banned.
- [AWS SigV4 docs](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html) (docs, \~40 min for the signing pages): request signing as an alternative model to bearer tokens.
## OAuth 2.0/2.1: delegated authorization
OAuth is authorization delegation: a **client** gets scoped, time-limited access to a **resource server** on behalf of a **resource owner**, via tokens from an **authorization server** (AS). It is not authentication; that is OIDC's job. OAuth 2.1 (draft, but treat as current) locks in the security consensus: PKCE (Proof Key for Code Exchange) always, no implicit flow, no password grant, exact redirect URI matching, sender-constrained or rotated refresh tokens.
Flows that survive in 2026:
- **Authorization code + PKCE**: the flow for anything user-facing (web, mobile, single-page app, CLI). Client generates `code_verifier`, sends hashed `code_challenge` with the browser redirect to the AS; user authenticates and consents; AS redirects back with a one-time code; client exchanges code + verifier for access (and maybe refresh) token. PKCE kills code interception; it is mandatory even for confidential clients. CLIs (like `claude` login) run this with a `localhost` loopback redirect.
- **Client credentials**: machine-to-machine, no user; client authenticates with its own secret (or better, a private-key JWT / mTLS) and gets a token representing itself. The standard for backend service-to-service where OAuth is used at all.
- **Device authorization grant** (RFC 8628): input-constrained devices; device shows a user code + URL, user approves on their phone, device polls the token endpoint. TVs, IoT, and headless CLI logins.
- Removed/dead: implicit (tokens in URL fragments), resource owner password credentials.
Also worth knowing: refresh tokens (rotate them; detect reuse), scopes (coarse permissions; keep few and meaningful), token introspection (RFC 7662) vs self-contained JWTs, dynamic client registration (RFC 7591), pushed authorization requests (PAR), `resource` indicators (RFC 8707) to audience-bind tokens, AS metadata discovery (RFC 8414).
## OIDC: authentication on top
OpenID Connect = OAuth 2 + an **ID token** (a JWT about who authenticated: `iss`, `sub`, `aud`, `exp`, `nonce`) + a `/userinfo` endpoint + discovery (`/.well-known/openid-configuration`). "Sign in with Google/GitHub" is OIDC. Rules: ID tokens are for the client to learn identity, never send them as API credentials; access tokens are for APIs. Validate `iss`, `aud`, `exp`, signature (via the JSON Web Key Set, JWKS), and `nonce`.
## JWTs and their pitfalls
A JWT is a signed (JWS) base64url triplet `header.payload.signature`; claims are readable by anyone (signing is not encryption; use JWE if you need secrecy). Great as short-lived, self-contained access tokens: resource servers validate offline against the AS's published JWKS.
Pitfalls (RFC 8725 distilled):
- `alg: none` and algorithm-confusion attacks (RS256 public key reused as HS256 secret): pin the expected algorithm server-side; never take it from the token header.
- Validate everything: signature, `iss`, `aud` (audience confusion lets a token for service A replay against service B), `exp`/`nbf` with small clock skew, and the key via `kid` lookup in a trusted JWKS (never fetch keys from URLs the token itself supplies via `jku`/`x5u`).
- **Revocation does not exist** for self-contained tokens: keep lifetimes short (minutes), pair with refresh tokens, or accept an introspection/denylist round-trip for high-value operations.
- Do not stuff PII or secrets in claims; do not use JWTs as sessions (a session store revokes; a JWT does not).
## API keys
Static bearer secrets (`x-api-key`, `Authorization: Bearer sk-...`). Fine for server-to-server calls to a provider (every LLM API works this way) when handled properly: per-environment and per-service keys, scoped if the provider allows, stored in a secrets manager (not env-committed), rotated, prefixed (`sk_live_`) for scanability, hashed at rest server-side, and never shipped to browsers or mobile apps. Weaknesses vs OAuth: no user context, no consent, no expiry by default, coarse revocation. Gateway pattern: API Gateway usage plans / provider dashboards give per-key rate limits and metering.
## Service-to-service auth
- **mTLS**: both sides present certificates; strongest transport-level identity; painful cert lifecycle unless automated, which is exactly what service meshes (Istio, Linkerd, App Mesh) and SPIFFE/SPIRE do (short-lived SVID certs as workload identity). Mechanics, workload identity, and the February 2027 end of public-CA client certificates: <mention-page url="https://app.notion.com/p/3c65c17b0d0d8105a37ff2d2f602a421"/> (22 min read · +17h 30m resources).
- **IAM + SigV4 (AWS)**: no bearer token at all; each request is HMAC-signed with rotating credentials from the instance/Lambda role, and IAM policies authorize. Calling SageMaker/Bedrock/S3 from Lambda is this, for free via the SDK. Prefer IAM auth between your own AWS services over hand-rolled keys; for cross-cloud/GitHub Actions, use OIDC federation (workload presents an OIDC token, AWS Security Token Service (STS) exchanges it for temporary credentials: no long-lived secrets).
- **OAuth client credentials with private-key JWT** where you need standards-based machine-to-machine auth across organizations.
## The agent-era twist
Agents change the threat model: the "user" of a credential is now a model that can be prompt-injected, and credentials chain across host -\> MCP server -\> upstream API.
- **MCP OAuth**: remote MCP servers are OAuth 2.1 resource servers holding audience-bound tokens (RFC 8707). The discovery chain, RFC 9207 issuer validation, and **Client ID Metadata Documents** (the client identified by an HTTPS URL hosting its metadata, so no AS must accept unknown clients) replacing dynamic client registration in 2026-07-28: <mention-page url="https://app.notion.com/p/3c65c17b0d0d813f9695dc4175c44cbb"/>.
- **Token passthrough is forbidden**: an MCP server must not forward its inbound token upstream, and must not accept tokens minted for other audiences. Passthrough breaks audience binding, hides the real caller from the upstream's controls, and enables **confused deputy** attacks. Correct pattern: the server is its own OAuth client to the upstream, performs token exchange (RFC 8693) or its own flow, and maintains per-user upstream credentials.
- **Least privilege gets sharper**: an injected agent will use whatever scopes its tokens carry; grant read-only where possible, separate destructive scopes, require human-in-the-loop approval for irreversible actions, and log per-tool-call identity for audit. Fine-grained, task-scoped agent credentials are emerging work, but scoping plus short lifetimes plus audience binding is the durable 80%.
## Choosing, quickly
- User signs into your app: OIDC (auth code + PKCE) against a managed identity provider (Cognito, Auth0, Entra).
- Your backend calls an LLM provider: API key from a secrets manager.
- Service A calls service B inside AWS: IAM/SigV4; inside a mesh: mTLS; across orgs: client credentials.
- CLI/desktop tool: auth code + PKCE with loopback redirect; headless box: device grant.
- Remote MCP server: OAuth 2.1 per the MCP spec; never passthrough; audience-bind.
See also: <mention-page url="https://app.notion.com/p/3c65c17b0d0d813f9695dc4175c44cbb"/>, <mention-page url="https://app.notion.com/p/3c65c17b0d0d811bb035fa3f158b0889"/> (TLS), <mention-page url="https://app.notion.com/p/3c65c17b0d0d81cb88a3f1f63e85f27b"/>.
</content>
</page>