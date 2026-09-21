# Known gaps

⏱ 3 min read

Last updated: 2026-09-21.

What this knowledge base deliberately does not cover, and why. A gap here is a decision, not an oversight. Anything on this page has been looked at and either accepted as out of scope or resolved by folding the material somewhere else. The point of collecting them in one place is that a future reader who cannot find a subject should be able to tell in one lookup whether it is missing because nobody got to it or missing on purpose.

### Open gaps

#### Front-end proper

UI components, rendering, and accessibility are not covered anywhere. This is the one pillar of Andrew Ng's 2026 AI Engineering Skills Map that has no home here, and it is flagged as such on [AI Engineering Skills Map: software engineering fundamentals (Andrew Ng, 2026)](topics/swe-and-system-design/ai-engineering-skills-map.md). Adjacent material that does exist: API design in [API and Code Design](topics/swe-and-system-design/api-and-code-design.md), the wire protocols behind a browser client in [Topic: protocols](topics/protocols/summary.md), and browser-driving agents in [Topic: agentic-harnesses](topics/agentic-harnesses/summary.md). The gap is the front end itself.

#### Conventional application security

Supply-chain security, cloud posture, and dependency scanning have no home. This is a narrower gap than it looks, because the security this knowledge base does cover is the agent-shaped kind: prompt injection and the egress-control argument in [Harness engineering: the transferable layer](topics/agentic-harnesses/harness-engineering.md), standing authority and irreversible actions in [Personal agents: OpenClaw, Hermes Agent, and how they differ from coding harnesses](topics/agentic-harnesses/personal-agents.md), runtime guardrails in [Guardrails: staged runtime safety for LLM systems](topics/evaluation-and-llm-judges/guardrails.md), and the confused-deputy and token-passthrough rules in [Auth: OAuth2/OIDC, JWTs, API keys, service-to-service, and the agent era](topics/protocols/auth.md). What is absent is the ordinary application-security practice an engineer is also expected to hold. Also flagged on [AI Engineering Skills Map: software engineering fundamentals (Andrew Ng, 2026)](topics/swe-and-system-design/ai-engineering-skills-map.md).

### Resolved by decision

These were once recorded as gaps and are no longer. Each was closed by a decision rather than by writing a topic page, and each is listed here so the decision is findable instead of being rediscovered as a gap every few weeks.

| Subject | Decision | Where it lives now |
| --- | --- | --- |
| Time-series foundation models | 2026-09-21: no topic page. A time-series foundation model is a sequence foundation model over a non-text modality, which is what the modality axis of the generative topic already tracks, and one model does not justify a topic. | The taxonomy and modality map on [Topic: generative-and-multimodal](topics/generative-and-multimodal/summary.md), where TimesFM-3 is named as a non-generative modality |
| AI security as a topic | 2026-09-14, Khalid's decision: no topic page. Interesting security news belongs in the weekly news issue instead. | Tech news, plus the agent-security material listed under the application-security gap above |
| Document parsing | 2026-09-14: covered by the same decision. Two items (Cohere Parse 5, Reducto r-1) did not justify a topic. | Tech news |
| Orchestration as a product | 2026-09-21: no topic page. A learned orchestrator is a thing sold in place of a model, so it belongs in both places it touches rather than in a third. | Named as a non-family category on [Topic: llms](topics/llms/summary.md) and cross-filed on [Topic: agentic-harnesses](topics/agentic-harnesses/summary.md) |

### How to use this page

If a subject is missing and is not on this page, it is an oversight worth fixing. If it is here under Open gaps, the absence is known and a decision to close it has not been taken. If it is here under Resolved by decision, do not re-flag it in a weekly digest; follow the pointer instead.

### Related

- [AI Engineering Skills Map: software engineering fundamentals (Andrew Ng, 2026)](topics/swe-and-system-design/ai-engineering-skills-map.md): the self-audit against Andrew Ng's five software-fundamentals pillars, which is where the two open gaps were first named.
- Updates: the changelog, where each decision above was recorded on the date it was taken.
