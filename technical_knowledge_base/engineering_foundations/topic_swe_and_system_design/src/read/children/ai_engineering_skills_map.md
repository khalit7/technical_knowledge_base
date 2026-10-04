Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3cd5c17b0d0d81b99dd3d1eb12ed5fe0 as of 2026-09-22T02:23:53.901Z:
<page url="https://app.notion.com/p/3cd5c17b0d0d81b99dd3d1eb12ed5fe0">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81048ae0dd14ac399b4d" title="Topic: swe-and-system-design"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"AI Engineering Skills Map: software engineering fundamentals (Andrew Ng, 2026)"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 5 min read · +10 min resources
- Source: [Andrew Ng on X](https://x.com/AndrewYNg/status/2093388974194872781) (\~10 min), part of a series on the AI Engineering Skills Map. This page records the argument and maps each of its five pillars onto where this KB covers it.
## The argument
The claim is not that software fundamentals survived agentic coding, but that they became **steering knowledge**. Even when an agent writes every line, you need the fundamentals to direct the tradeoffs it makes, and to know *which tradeoffs exist at all*.
Ng's framing of the failure mode: a novice who vibe-codes without fundamentals can ship simple applications, but the agent quietly makes bad calls on latency, availability, consistency, reliability, maintainability, simplicity, and cost, and *"the developer didn't know such tradeoffs even existed and therefore did not steer the agent"*. The gap is not producing code, it is recognising a decision as a decision.
The AI core of an application is usually wrapped in a broader software system you will also have to build or shape; there is no role where you only do the model part.
## The five pillars, and where the KB covers them
<table fit-page-width="true" header-row="true">
<tr>
<td>Pillar</td>
<td>What Ng says it requires</td>
<td>Where it lives here</td>
</tr>
<tr>
<td>**Full-stack applications**</td>
<td>Agentic coding pushes specialists into full-stack roles. Know UI components, caching, page rendering, API choice and design, authentication, state and session management, async processing, persistence, testing, security, accessibility</td>
<td>API design in <mention-page url="https://app.notion.com/p/3c65c17b0d0d8190ade6c34e8f653e79"/>; auth, REST/GraphQL/gRPC, websockets and SSE in <mention-page url="https://app.notion.com/p/3c65c17b0d0d81ec9355f4eecd6eed02"/>; caching and session state in <mention-page url="https://app.notion.com/p/3cd5c17b0d0d815d8841ec845f5f3324"/>; testing in <mention-page url="https://app.notion.com/p/3c65c17b0d0d81548848e2ebdd2f63ee"/>. **Gap: front-end proper** (UI components, rendering, accessibility) is not covered in this KB</td>
</tr>
<tr>
<td>**Managing data**</td>
<td>The foundation that is hardest to change later. Reason from access patterns to what you store and for how long; pick data models and storage types (relational, document, key-value, graph); understand transactions, concurrency, cleanliness, freshness; privacy, governance, compliance; evolve the architecture as the app evolves</td>
<td><mention-page url="https://app.notion.com/p/3cd5c17b0d0d815d8841ec845f5f3324"/> and its <mention-page url="https://app.notion.com/p/3cd5c17b0d0d817ebd6ccadd4750c23a"/> child; vector stores in <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b89145c37dfe8a3b0b"/>; pipelines in <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b5925bfd1d8665dd4b"/></td>
</tr>
<tr>
<td>**Designing system architectures**</td>
<td>Application platform, front-end/back-end boundary, system decomposition, where application state lives, monolith versus microservices, choosing the stack (sometimes by experiment). And: the right architecture is a moving target across prototype, first production system, and scale</td>
<td><mention-page url="https://app.notion.com/p/3c65c17b0d0d8117b057dc2586836ec8"/>, <mention-page url="https://app.notion.com/p/3c65c17b0d0d8115bc45c31d915b4d33"/></td>
</tr>
<tr>
<td>**Secure and reliable**</td>
<td>Testing strategy (unit/integration mix, frameworks, coverage), designing around failure (rate limits, graceful degradation, blast radius), and "shift left" security: every developer is now partly a security engineer, with AI tools for vulnerability scanning, dependency and supply-chain checks, and cloud configuration review</td>
<td><mention-page url="https://app.notion.com/p/3c65c17b0d0d81548848e2ebdd2f63ee"/>; prompt-injection and agent security in <mention-page url="https://app.notion.com/p/3c65c17b0d0d817ca14fc32338707c2f"/> and <mention-page url="https://app.notion.com/p/3c75c17b0d0d81bf9462fbeb09593e1c"/>; guardrails in <mention-page url="https://app.notion.com/p/3c65c17b0d0d819bbfa5dffa9246c297"/>. **Gap: conventional application security** (supply chain, cloud posture, dependency scanning) has no home here</td>
</tr>
<tr>
<td>**Scaling and operating in production**</td>
<td>The full SDLC: deployment environments, release strategy, CI/CD, IaaS. Then observability, alerting, incident management. Then scaling: load balancing, sharding, indexing, replication, or architectural change. Plus version control, code review, dependency maintenance, technical debt</td>
<td><mention-page url="https://app.notion.com/p/3c65c17b0d0d81b5925bfd1d8665dd4b"/> (Kubernetes, Terraform, monitoring, SLURM); sharding, indexing and replication in <mention-page url="https://app.notion.com/p/3cd5c17b0d0d815d8841ec845f5f3324"/></td>
</tr>
</table>
## The part worth arguing with, and the part worth keeping
The sharp observation is **data architecture as the binding constraint on AI systems**: *"Your AI systems will get their own input context from your data source, so if data architecture is chosen poorly, the AI doesn't know what it doesn't know."* That is a better argument for caring about storage design than the usual ones, and the reason the databases topic exists here. RAG quality, agent memory and eval data all inherit whatever the data layer permits, and none of those failures announce themselves as data-layer failures. Ng also flags, fairly, that building data infrastructure *for agents* rather than for humans or traditional software is an open, fast-moving area.
The part to hold loosely is the implicit skills-list framing: "know all five pillars deeply" describes a staff engineer, not an entry point, and the post does not prioritise. The ordering that matters here: **data modelling first** (hardest to reverse), **failure design second** (cheapest to retrofit badly), and the rest as the system demands it.
One claim cuts against the usual advice: memorising syntax is obsolete, but *"developers who deeply understand how software works vastly outperform those who vibe code without understanding"*. The leverage moved from production to judgment, where the harness-scaling research lands from the other direction: the scarce resource is knowing what good looks like and being able to check it.
Sean Goedecke's [You have to beat the models at something](https://www.seangoedecke.com/you-have-to-beat-the-models-at-something/) narrows that to a testable edge: the models write cheap code but hold weak system context and over-build, so what stays scarce in a person is deep codebase and system knowledge plus technical communication, particularly translating model output for the people who have to live with it. That is a sharper answer than Ng gives to the question of which part of the steering knowledge actually pays.
The open question under all five pillars is whether steering knowledge survives not being exercised. The claim that automating incident response erodes the operational familiarity that made engineers good at incident response is the sharpest version of it, and specific enough to be testable: these pillars are learned by operating systems, so an engineer who only ever supervises may never acquire what supervising requires.
## Cross-links
- Parent: <mention-page url="https://app.notion.com/p/3c65c17b0d0d81048ae0dd14ac399b4d">Topic: swe-and-system-design</mention-page>.
- <mention-page url="https://app.notion.com/p/3cd5c17b0d0d815d8841ec845f5f3324"/> and <mention-page url="https://app.notion.com/p/3cd5c17b0d0d817ebd6ccadd4750c23a"/>: the "managing data" pillar.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81ec9355f4eecd6eed02"/>: API choice and design, auth, real-time delivery.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b5925bfd1d8665dd4b"/>: the deploy-and-operate pillar.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb"/>: the other half of the picture, what the coding agent itself is doing while you steer it.
</content>
</page>