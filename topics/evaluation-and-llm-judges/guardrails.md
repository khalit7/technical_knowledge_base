# Guardrails: staged runtime safety for LLM systems

⏱ 12 min read · +2h 25m resources

### Best resources

- [NeMo Guardrails (NVIDIA)](https://github.com/NVIDIA/NeMo-Guardrails) (docs, ~40 min for the core pages): the reference orchestration framework; docs cover the five rail types and Colang.
- [Llama Guard model cards (Meta)](https://huggingface.co/meta-llama/Llama-Guard-3-8B) (~15 min): the canonical open guard-model family; MLCommons hazard taxonomy.
- [Turing Post: Guardian models overview (Llama Guard, ShieldGemma, DynaGuard)](https://www.turingpost.com/p/guardianmodels) (~20 min): good current survey of the guard-model landscape.
- [Granite Guardian (IBM)](https://github.com/ibm-granite/granite-guardian) (repo, ~20 min for the entry path): strongest open models on prompt-injection and hallucination detection.
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/) (~40 min): the threat taxonomy guardrails are defending against.

### The three-stage guardrail pattern

(Seeded from Khalid's GDM project notes, generalised.) Guardrails are runtime evals: classifiers and policies in the request path, trading latency and refusal rate against risk. The staged design exists because one checkpoint cannot balance that trade-off for all risk classes; severity determines where you pay the cost.

1. **Pre-call (input rails)**: screen user input before it reaches the model. Catches the severe, cheap-to-detect classes: jailbreak/injection attempts, toxic prompts, out-of-scope requests, personally identifiable information (PII) in input. Blocking here is the cheapest outcome: no generation cost, no model exposure to the attack. Fast small classifiers (86M-2B) fit here since they run on every request in the latency path.
2. **During-call (dialog/execution rails)**: a second threshold for inputs that passed the first gate but are borderline (potential misinformation topics, say), plus control of what the model may do mid-flight: which tools an agent may call, topical rails keeping the conversation in scope, streamed-output monitoring that can abort a generation partway. In agentic systems this stage has become the critical one: tool-call approval, parameter validation, and injection checks on retrieved or tool-returned content, which is attacker-controlled input arriving mid-call.
3. **Post-call (output rails)**: assess the generated output before the user sees it: hallucination/groundedness checks (claim-against-source for retrieval-augmented generation, RAG), policy violations that only manifest in the output, bias, PII/secret leakage. The most expensive stage (a second model pass over the full output) and the only one that can catch generation-side failures. Outcomes: block, regenerate, redact, or annotate.
Design consequences: each stage has its own precision/recall target (pre-call optimises precision to avoid refusing benign traffic; post-call optimises recall on the harms that matter), its own latency budget, and its own eval set. Guardrails need the same regression machinery as any eval surface: attack corpora and benign-traffic false-positive sets in CI ([Production eval engineering: gates, golden sets, statistics, gold-label auditing](production-eval-engineering.md)); red-teaming tools (promptfoo's scanner, garak, PyRIT) generate the attack side.

**Where classification cannot reach, architecture has to.** The best-documented production answer so far to the lethal trifecta assumes the classifier will lose. Meta's Muse Spark 1.3 personal agent moves enforcement and credentials outside the sandbox the agent runs in: the agent never sees a credential, a service outside the runtime cell holds them, and a separate agent swaps in the real token as the request leaves the VM, so even a fully subverted agent has nothing to exfiltrate. Approvals arrive as operating-system dialogs rather than as messages in the conversation, so injected text cannot manufacture consent, and the browser sub-agent reads the accessibility tree instead of page code and cannot execute JavaScript. Meta pays up to $300,000 for a valid report and $130,000 for a successful prompt injection, and publishes no classifier accuracy figures, which is the tell: the design does not rest on any. Treat it as the complement to the staged rails rather than a replacement, on the principle that a capability the agent does not have is the only rail with no false-negative rate. The agent-side architecture is in [Topic: agentic-harnesses](../agentic-harnesses/summary.md).

### Orchestration frameworks

- **NeMo Guardrails (NVIDIA)**: the most complete open orchestration layer. Five programmable rail types (input, dialog, retrieval, execution, output) configured in YAML plus **Colang**, a domain-specific language (DSL) for dialog flows that reads like a flowchart and doubles as a reviewable policy artifact. Runs fully self-hosted, integrates external guard models as actions (the typical production stack routes through NeMo to a fast first-pass classifier and a larger guard model), and has LangChain integration. The trade-off is real complexity: Colang is another language to maintain, and the dialog-rails machinery is overkill for simple input/output filtering.
- **Guardrails AI (guardrails-ai/guardrails)**: Python-native validator framework: a hub of composable validators (toxicity, PII, regex/schema, groundedness) applied to inputs/outputs, with structured-output enforcement. Lighter-weight than NeMo; the usual choice when you want output validation without dialog management.
- **LLM Guard (Protect AI)**: batteries-included scanner set (prompt injection, PII, toxicity, secrets) as pure input/output filters; simple to bolt on.
- **Cloud-managed**: AWS Bedrock Guardrails, Azure AI Content Safety, Vertex safety filters: configurable hosted classifiers (content categories, denied topics, PII, and increasingly groundedness checks). Trade control and cost at scale for zero-maintenance; the common enterprise pattern is a cloud baseline plus self-hosted rails for domain-specific policies.

### Guard models (the classifiers behind the rails)

Small fine-tuned classifiers that label prompt/response against a hazard taxonomy; the current open landscape:

| Model | Size | Strength |
| --- | --- | --- |
| Llama Guard 3 / 4 (Meta) | 1B / 8B; Guard 4 12B multimodal | Strongest general multi-category moderation; MLCommons-aligned taxonomy; the default baseline |
| Llama Prompt Guard 2 (Meta) | 86M / 22M | Injection/jailbreak-only; small enough for every request in the latency path |
| Granite Guardian (IBM) | 5B / 8B | Leads on prompt injection and hallucination/groundedness categories; RAG-specific risk labels |
| Qwen3Guard (Alibaba) | 0.6B / 4B / 8B | 119 languages; the pick for non-English traffic; streaming variant classifies mid-generation |
| ShieldGemma (Google) | 2B (and 27B) | Latency play; policy-conditioned prompting |
| WildGuard (AI2) | 7B | Highest precision on benign sets (fewest false refusals) |
| NeMo/Aegis models (NVIDIA) | ~8B | Tuned for the NeMo stack |

Current best practice is ensemble, not single-model: the taxonomies and blind spots differ, so production stacks pair a fast first-pass gate (Prompt Guard 2-class) with a larger classifier (Llama Guard or Granite Guardian) on flagged or sampled traffic, sometimes a third for a specific risk (Granite for hallucination). No open model is reliably strong across all categories, so benchmark on your own traffic taxonomy and track false-refusal rate as a first-class metric.

### Evaluation of guardrails themselves

Guardrails are classifiers, so they get the full measurement treatment: per-category precision/recall on labelled attack + benign corpora; public benchmarks (AILuminate/MLCommons, HarmBench, JailbreakBench for jailbreak robustness; injection suites for indirect injection via RAG/tools); drift monitoring, since attack distributions shift faster than any other eval surface; and staged-system metrics (end-to-end leak rate through all three stages, not per-stage accuracy alone: attackers only need one path through). Post-call hallucination rails additionally inherit judge-calibration requirements from [LLM-as-judge: design, biases, calibration, reliability](llm-as-judge.md): a groundedness classifier is a judge and needs a human-agreement number before its block decisions are trusted.

None of that says where to put the threshold, which is the decision a precision/recall curve leaves open and the one that fixes the block rate in production. Conformal risk control is the principled answer: the CRC Monitor work (Schirmer, Jazbec et al., 2026) reduces a safety monitor to a single score and calibrates a threshold on held-out data carrying a distribution-free bound on the risk being controlled, so the guarantee is a property of the calibration procedure rather than of the classifier being good. It is the one result in this area with a guarantee attached, and the catch is the usual one: the bound holds while live traffic resembles the calibration set, and attack distributions drift faster than any other input these rails see, which turns recalibration frequency into the real operating parameter.

### Failure modes

- **A stated refusal is not a refusal**: [MOLE: Detecting Insider Threats in AI Agents](../../papers/2026-09_mole/summary.md), which scores the monitor rather than the agent over 150 AI-operated accounts sharing nine stateful services across 30 simulated workdays, found that a model's stated refusal did not predict whether it actually declined, and that 72% of 39 agent models completed most assigned harmful objectives. In an agentic system a post-call rail reading the response string is therefore measuring the wrong variable: what needs classifying is the tool calls and the state they changed, which is during-call work. The same evaluation found the best monitors missing close to half of completed harm in a single-day audit, so budget for recall well below what a per-category benchmark suggests; the constructive half is that benchmark-guided search improved a mid-tier monitor by 49 to 64%.
- **Guard-model injection**: guard models are LLMs; adversarial suffixes and multilingual/obfuscated payloads that fool the policy model can also fool the guard. Ensemble diversity and input normalisation (decode base64, strip homoglyphs) mitigate, but only where the payload is decodable at the gate. Adversa AI's cryptographic context injection against Grok is the case that breaks that assumption: a page carries an AES-encrypted payload no static filter can read, the model decrypts it in its own Python runtime and then follows it, appending the user's chat history, name, coarse location and subscription tier to an attacker-controlled URL, at roughly a 40% success rate over 20 attempts and triggered by nothing more than a request to summarise the page. The technique generalises to any agent holding a code interpreter, because the interpreter is a decoder the input rails cannot see through, which puts this class of attack out of reach of pre-call classification entirely and into the during-call and architectural stages. It went 11 weeks from disclosure without a patch, which is the other half of the lesson. [Adversa AI](https://adversa.ai/blog/cryptographic-context-injection-grok-data-theft/) (~10 min)
- **Over-blocking**: guard-model over-blocking is the main quality cost users feel, and refusal cascades on benign traffic destroy product quality silently; without a benign regression set you will not notice until users churn.
- **Latency stacking**: three stages naively serialised can add 500ms+. Production designs run pre-call rails in parallel with prefill, use streaming post-call checks, and reserve heavy checks for sampled or async scoring with kill switches.
- **Taxonomy mismatch**: guard-model categories rarely match your actual policy; measure against your policy labels, not the model card's benchmark.

### Deployment checklist

1. Write the policy first, as your own taxonomy with examples per category; pick guard models against it, not against model-card scores.
2. Stage placement: injection/toxicity pre-call; tool-call and topical rails during-call; groundedness, PII and policy checks post-call. Assign a latency budget per stage before choosing models.
3. Two guard models with non-overlapping strengths, fast gate first; normalise inputs (decode encodings, strip obfuscation) before classification.
4. Build both eval corpora on day one: attack set (red-team generated, refreshed) and benign set from real traffic for false-refusal tracking.
5. Wire guardrail metrics into the same regression gates as quality metrics; a guard-model version bump is a promotion event like any model swap.
6. Log every block/flag with the triggering stage and category; review samples weekly, since blocked-traffic drift is your earliest attack-trend signal.
7. Define fail-open vs fail-closed per stage explicitly (guard-model timeout on the pre-call path should not take down the product; post-call hallucination check on a medical surface should fail closed).
8. Assume at least one path through the rails will be found, and make it worthless: hold credentials outside the agent's runtime, take approvals through a channel the model cannot write into, and withhold capabilities the task does not need, so a successful injection has nothing to spend.
