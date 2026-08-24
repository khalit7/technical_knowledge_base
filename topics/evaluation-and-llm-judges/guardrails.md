# Guardrails: staged runtime safety for LLM systems

*Last updated: 2026-08-24*

## Best resources

- [NeMo Guardrails (NVIDIA)](https://github.com/NVIDIA/NeMo-Guardrails): the reference orchestration framework; docs cover the five rail types and Colang.
- [Llama Guard model cards (Meta)](https://huggingface.co/meta-llama/Llama-Guard-3-8B): the canonical open guard-model family; MLCommons hazard taxonomy.
- [Turing Post: Guardian models overview (Llama Guard, ShieldGemma, DynaGuard)](https://www.turingpost.com/p/guardianmodels): good current survey of the guard-model landscape.
- [Granite Guardian (IBM)](https://github.com/ibm-granite/granite-guardian): strongest open models on prompt-injection and hallucination detection.
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/): the threat taxonomy guardrails are defending against.

## The three-stage guardrail pattern

(Seeded from Khalid's GDM project notes; generalised.) Guardrails are runtime evals: classifiers and policies in the request path, trading latency and refusal rate against risk. The staged design exists because one checkpoint cannot balance that trade-off for all risk classes; severity determines where you pay the cost.

1. **Pre-call (input rails)**: screen user input before it reaches the model. Catches the severe, cheap-to-detect classes: jailbreak/injection attempts, toxic prompts, out-of-scope requests, PII in input. Blocking here is the cheapest outcome: no generation cost, no model exposure to the attack. Fast small classifiers (86M-2B) fit here since they run on every request in the latency path.
2. **During-call (dialog/execution rails)**: a second threshold for inputs that passed the first gate but are borderline (e.g. potential misinformation topics), plus control of what the model may do mid-flight: which tools an agent may call, topical rails keeping the conversation in scope, streamed-output monitoring that can abort a generation partway. In agentic systems this stage has become the critical one: tool-call approval, parameter validation, and injection checks on retrieved/tool-returned content (which is attacker-controlled input arriving mid-call).
3. **Post-call (output rails)**: assess the generated output before the user sees it: hallucination/groundedness checks (claim-vs-source for RAG), policy violations that only manifest in the output, bias, PII/secret leakage. Most expensive stage (a second model pass over full output) but the only one that can catch generation-side failures. Outcomes: block, regenerate, redact, or annotate.

Design consequences: each stage has its own precision/recall target (pre-call optimises precision to avoid refusing benign traffic; post-call optimises recall on the harms that matter), its own latency budget, and its own eval set. Guardrails need the same regression machinery as any eval surface: attack corpora and benign-traffic false-positive sets in CI ([production-eval-engineering.md](production-eval-engineering.md)); red-teaming tools (promptfoo's scanner, garak, PyRIT) generate the attack side.

## Orchestration frameworks

- **NeMo Guardrails (NVIDIA)**: the most complete open orchestration layer; defines five programmable rail types (input, dialog, retrieval, execution, output) configured in YAML plus **Colang**, a DSL for dialog flows that reads like a flowchart and doubles as a reviewable policy artifact. Runs fully self-hosted, integrates external guard models as actions (the typical production stack routes through NeMo to a fast first-pass classifier and a larger guard model), and has LangChain integration. The trade-off is real complexity: Colang is another language to maintain, and the dialog-rails machinery is overkill for simple input/output filtering.
- **Guardrails AI (guardrails-ai/guardrails)**: Python-native validator framework: a hub of composable validators (toxicity, PII, regex/schema, groundedness) applied to inputs/outputs, with structured-output enforcement. Lighter-weight than NeMo; the usual choice when you want output validation without dialog management.
- **LLM Guard (Protect AI)**: batteries-included scanner set (prompt injection, PII, toxicity, secrets) as pure input/output filters; simple to bolt on.
- **Cloud-managed**: AWS Bedrock Guardrails, Azure AI Content Safety, Vertex safety filters: configurable hosted classifiers (content categories, denied topics, PII, and increasingly groundedness checks). Trade control and cost at scale for zero-maintenance; the common enterprise pattern is a cloud baseline plus self-hosted rails for domain-specific policies.

## Guard models (the classifiers behind the rails)

Small fine-tuned classifiers that label prompt/response against a hazard taxonomy; the current open landscape:

| Model | Size | Strength |
|---|---|---|
| Llama Guard 3 / 4 (Meta) | 1B / 8B; Guard 4 12B multimodal | Strongest general multi-category moderation; MLCommons-aligned taxonomy; the default baseline |
| Llama Prompt Guard 2 (Meta) | 86M / 22M | Injection/jailbreak-only; small enough for every request in the latency path |
| Granite Guardian (IBM) | 5B / 8B | Leads on prompt injection and hallucination/groundedness categories; RAG-specific risk labels |
| Qwen3Guard (Alibaba) | 0.6B / 4B / 8B | 119 languages; the pick for non-English traffic; streaming variant classifies mid-generation |
| ShieldGemma (Google) | 2B (and 27B) | Latency play; policy-conditioned prompting |
| WildGuard (AI2) | 7B | Highest precision on benign sets (fewest false refusals) |
| NeMo/Aegis models (NVIDIA) | ~8B | Tuned for the NeMo stack |

Current best practice is ensemble, not single-model: the taxonomies and blind spots differ, so production stacks pair a fast first-pass gate (Prompt Guard 2-class) with a larger classifier (Llama Guard or Granite Guardian) on flagged or sampled traffic, sometimes a third for a specific risk (Granite for hallucination). No open model is reliably strong across all categories; benchmark on your own traffic taxonomy, and track false-refusal rate as a first-class metric since guard-model over-blocking is the main quality cost users feel.

## Evaluation of guardrails themselves

Guardrails are classifiers, so they get the full measurement treatment: per-category precision/recall on labelled attack + benign corpora; public benchmarks (AILuminate/MLCommons, HarmBench, JailbreakBench for jailbreak robustness; injection suites for indirect injection via RAG/tools); drift monitoring, since attack distributions shift faster than any other eval surface; and staged-system metrics (end-to-end leak rate through all three stages, not per-stage accuracy alone: attackers only need one path through). Post-call hallucination rails additionally inherit judge-calibration requirements from [llm-as-judge.md](llm-as-judge.md): a groundedness classifier is a judge and needs a human-agreement number before its block decisions are trusted.

## Failure modes

- **Guard-model injection**: guard models are LLMs; adversarial suffixes and multilingual/obfuscated payloads that fool the policy model can also fool the guard. Ensemble diversity and input normalisation (decode base64, strip homoglyphs) mitigate.
- **Over-blocking**: refusal cascades on benign traffic destroy product quality silently; without a benign regression set you will not notice until users churn.
- **Latency stacking**: three stages naively serialised can add 500ms+; production designs run pre-call rails in parallel with prefill, use streaming post-call checks, and reserve heavy checks for sampled/async scoring with kill switches.
- **Taxonomy mismatch**: guard-model categories rarely match your actual policy; measure against your policy labels, not the model card's benchmark.

## Deployment checklist

1. Write the policy first, as your own taxonomy with examples per category; pick guard models against it, not against model-card scores.
2. Stage placement: injection/toxicity pre-call; tool-call and topical rails during-call; groundedness, PII and policy checks post-call. Assign a latency budget per stage before choosing models.
3. Two guard models with non-overlapping strengths, fast gate first; normalise inputs (decode encodings, strip obfuscation) before classification.
4. Build both eval corpora on day one: attack set (red-team generated, refreshed) and benign set from real traffic for false-refusal tracking.
5. Wire guardrail metrics into the same regression gates as quality metrics; a guard-model version bump is a promotion event like any model swap.
6. Log every block/flag with the triggering stage and category; review samples weekly, since blocked-traffic drift is your earliest attack-trend signal.
7. Define fail-open vs fail-closed per stage explicitly (guard-model timeout on the pre-call path should not take down the product; post-call hallucination check on a medical surface should fail closed).
