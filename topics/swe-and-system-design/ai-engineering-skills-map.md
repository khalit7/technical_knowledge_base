# AI Engineering Skills Map: software engineering fundamentals (Andrew Ng, 2026)

*Added 2026-08-31.* Source: [Andrew Ng on X](https://x.com/AndrewYNg/status/2093388974194872781), part of a series on the AI Engineering Skills Map. This page records the argument and, more usefully, maps each of its five pillars onto where this KB covers it, so it doubles as a self-audit.

## The argument

The claim is not that software fundamentals survived agentic coding, but that they became **steering knowledge**. Even when an agent writes every line, you need the fundamentals to direct the tradeoffs it makes, and more importantly to know *which tradeoffs exist at all*.

Ng's framing of the failure mode is precise and worth keeping: a novice who vibe-codes without fundamentals can ship simple applications, but the agent quietly makes bad calls on latency, availability, consistency, reliability, maintainability, simplicity, and cost, and *"the developer didn't know such tradeoffs even existed and therefore did not steer the agent"*. The gap is not the ability to produce code, it is the ability to recognise a decision as a decision.

A second point, aimed at us specifically: the AI core of an application is usually wrapped in a broader software system that you will also have to build or shape. There is no role where you only do the model part.

## The five pillars, and where the KB covers them

| Pillar | What Ng says it requires | Where it lives here |
|---|---|---|
| **Full-stack applications** | Agentic coding pushes specialists into full-stack roles. Know UI components, caching, page rendering, API choice and design, authentication, state and session management, async processing, persistence, testing, security, accessibility | API design in [api-and-code-design.md](api-and-code-design.md); auth, REST/GraphQL/gRPC, websockets and SSE in [../protocols/](../protocols/summary.md); caching and session state in [../databases/](../databases/summary.md); testing in [testing-and-quality.md](testing-and-quality.md). **Gap: front-end proper** (UI components, rendering, accessibility) is not covered anywhere in this KB |
| **Managing data** | The foundation that is hardest to change later. Reason from access patterns to what you store and for how long; pick data models and storage types (relational, document, key-value, graph); understand transactions, concurrency, cleanliness, freshness; privacy, governance, compliance; evolve the architecture as the app evolves | [../databases/](../databases/summary.md) and its [caching.md](../databases/caching.md) child, both created 2026-08-31 in the same batch as this page; vector stores in [../rag-and-retrieval/](../rag-and-retrieval/summary.md); pipelines in [../ml-infra-and-orchestration/](../ml-infra-and-orchestration/summary.md) |
| **Designing system architectures** | Application platform, front-end/back-end boundary, system decomposition, where application state lives, monolith versus microservices, choosing the stack (sometimes by experiment). And: the right architecture is a moving target across prototype, first production system, and scale | [ml-system-design.md](ml-system-design.md), [distributed-systems-basics.md](distributed-systems-basics.md) |
| **Secure and reliable** | Testing strategy (unit/integration mix, frameworks, coverage), designing around failure (rate limits, graceful degradation, blast radius), and "shift left" security: every developer is now partly a security engineer, with AI tools for vulnerability scanning, dependency and supply-chain checks, and cloud configuration review | [testing-and-quality.md](testing-and-quality.md); prompt-injection and agent security in [../agentic-harnesses/harness-engineering.md](../agentic-harnesses/harness-engineering.md) and [../agentic-harnesses/personal-agents.md](../agentic-harnesses/personal-agents.md); guardrails in [../evaluation-and-llm-judges/guardrails.md](../evaluation-and-llm-judges/guardrails.md). **Gap: conventional application security** (supply chain, cloud posture, dependency scanning) has no home here |
| **Scaling and operating in production** | The full SDLC: deployment environments, release strategy, CI/CD, IaaS. Then observability, alerting, incident management. Then scaling: load balancing, sharding, indexing, replication, or architectural change. Plus version control, code review, dependency maintenance, technical debt | [../ml-infra-and-orchestration/](../ml-infra-and-orchestration/summary.md) (Kubernetes, Terraform, monitoring, SLURM); sharding, indexing and replication in [../databases/](../databases/summary.md) |

## The part worth arguing with, and the part worth keeping

The genuinely sharp observation is about **data architecture as the binding constraint on AI systems**: *"Your AI systems will get their own input context from your data source, so if data architecture is chosen poorly, the AI doesn't know what it doesn't know."* That is a better argument for caring about storage design than any of the usual ones, and it is the reason the databases topic exists here at all. RAG quality, agent memory, and eval data all inherit whatever the data layer permits, and none of those failures announce themselves as data-layer failures. Ng also flags that building data infrastructure *for agents* rather than for humans or traditional software is an open, fast-moving area, which is a fair characterisation.

The part to hold loosely is the implicit skills-list framing. "Know all five pillars deeply" describes a staff engineer, not an entry point, and the post does not prioritise. For our purposes the ordering that matters is: **data modelling first** (hardest to reverse), **failure design second** (cheapest to retrofit badly), and the rest as the system demands it.

One claim ages well and is worth stating plainly because it cuts against the usual advice: memorising syntax is obsolete, but *"developers who deeply understand how software works vastly outperform those who vibe code without understanding"*. The leverage moved from production to judgment, which is the same conclusion the harness-scaling research reaches from the other direction: the scarce resource is knowing what good looks like and being able to check it.

## Cross-links

- Parent: [summary.md](summary.md).
- [../databases/](../databases/summary.md) and [../databases/caching.md](../databases/caching.md): the "managing data" pillar, created from the same batch of requests.
- [../protocols/](../protocols/summary.md): API choice and design, auth, real-time delivery.
- [../ml-infra-and-orchestration/](../ml-infra-and-orchestration/summary.md): the deploy-and-operate pillar.
- [../agentic-harnesses/](../agentic-harnesses/summary.md): the other half of the picture, what the coding agent itself is doing while you steer it.
