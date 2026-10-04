Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d8181b351e1b8fc6a1546 as of 2026-09-23T08:01:56.833Z:
<page url="https://app.notion.com/p/3c65c17b0d0d8181b351e1b8fc6a1546" icon="⚖️">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-2-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Topic: evaluation-and-llm-judges"}
</properties>
<iconMetadata>{"type":"emoji","emoji":"⚖️"}</iconMetadata>
<content>
# Video
A narrated 7-minute explainer derived from this page. The page stays canonical: the video is a derived representation, and every figure it states comes from here.
<video src="https://prod-files-secure.s3.us-west-2.amazonaws.com/13e79c56-ebab-4528-83aa-967a204b1f04/70fb0de6-0acd-4a3e-91c9-af815e39fd5e/topic_evaluation_and_llm_judges_overview.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466RV4H2ANI%2F20261004%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20261004T133503Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEPn%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJIMEYCIQC9xxZm4oXZZhZJ7aZwZ2Akltqemx27O%2FgQM8ZWcqwvVgIhAKApcdDnwFImBG6YWcKQ0RxIQsuB5%2BqnpQkfD6bltToCKogECMH%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1IgzVYQjQPk1VXP9DvfUq3AOaqz1Uh5DnwSjv%2BceWy7L%2FfwPk4jPtuVVHwqwTGs3dkcToaK%2FFFdu7rV22d1lIddcGnvvGnZUnwLEzP1rowr0FBYafV8Su7nYgyshTdnNSClFn4rZz0O7DV2L4zBeRDHwQx5bYcYciKpy%2FVXd8ue1T8E8L3tPWRGUUE3KgavZDMPD%2BaSGuveKLjxh0%2BGRCZwclVwjj1y68RWEiBMc9hJvZF8rBjN6uLgRp4Ap8JozLhJbJfhYMm7W%2FhyTelhWf3FvWF8JtXnasCzmczo%2BuiD5P4jK0lYblAlteBUAW%2FtDP1MeQWiz0LkBKD0KhpKc0YGUi4aA9YuhD2K21fVgY7KFvjRUQoHAt7F%2BDWQ26hTPn6aHeeyx389ZSmfwecnba9pBmhjF8b5ujekPin%2BQbx%2Fe%2FtbVvtkALQnonPHcfVn2xUYYHI3ZFZOisVE6guUSjFdLJw2RYiBFP9Nq6AhnzAUDRTSQApXO7nWplnDG7s1RUs8UNtMIZJ54LGHBQGSETfX4rtId0aoffEsvHuRkXKjmCk7nz0Vl7z9AfYpmIf%2BoheA%2BWz7tIjxh5HOjwzy9bLBJDsCT81WxHge5h6vc8zQYfyKUUv7c%2FEk02ZrzwtVUWfa4Yk02klvfvYmrBkjCJmIjWBjqkAWi4WSKS%2FD6x6daqO0x1GFtA1jRK6uBLRwz%2BAHDJoUBMThKRbu4nq4ZEPx8Hs4HgmKmfP8nLyGy6NyXf1x9NWYjRRTuruBRONTRYZwA9vLahY2lQ1UYqR1A7kXEHknlEUrqBo89Zkn2%2B%2F7hNBRW0pxRYyHjq%2BjhG3sEhAb9MqC6v3F%2Fmiyt5bZJ98hCOSG578cXwblOFE5%2F%2BORQ5V7ZOBmixgFRa&X-Amz-Signature=a346365d45401277839ff0dc7d173b2241924f20b98e4c2c4d4466de866dd766&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject#notion_record=block.3e45c17b-0d0d-81b6-a414-f41c60641ff6.13e79c56-ebab-4528-83aa-967a204b1f04">Topic: evaluation-and-llm-judges: an eval is a measuring instrument, and nobody calibrates theirs</video>
⏱ 9 min read · +1h resources
Methodology and tooling for evaluating LLMs and LLM-powered systems: how to measure, with what harness, judged by whom, and gated how. The datasets themselves live in <mention-page url="https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a"/>; this topic is about how evaluation is done and where it breaks.
```mermaid
graph TD
    E[LLM Evaluation] --> T[Eval types]
    E --> H[Harnesses]
    E --> J[Judge patterns]
    E --> P[Production engineering]
    E --> G[Guardrails]
    E --> F[Failure modes]

    T --> T1[Static benchmarks<br/>loglikelihood / exact match]
    T --> T2[LLM-as-judge<br/>pointwise / pairwise / rubric]
    T --> T3[Human eval<br/>expert gold, Arena-style pref]
    T --> T4[Online A/B and<br/>shadow deployment]
    T --> T5[Regression gates<br/>golden sets in CI]

    H --> H1[lm-evaluation-harness<br/>academic standard]
    H --> H2[Inspect AISI<br/>agentic + sandboxed]
    H --> H3[lighteval HF]
    H --> H4[HELM maintenance mode]
    H --> H5[promptfoo / Braintrust<br/>app-level]

    J --> J1[Single judge + rubric]
    J --> J2[Juries / PoLL ensembles]
    J --> J3[Reward models]
    J --> J4[Agent-as-judge]
    J --> J5[Meta-evals:<br/>JudgeBench, RewardBench 2]

    P --> P1[Golden sets +<br/>promotion paths]
    P --> P2[Offline vs online metrics]
    P --> P3[Statistical rigour:<br/>paired tests, power analysis]
    P --> P4[Gold-label auditing]

    G --> G1[Pre-call input rails]
    G --> G2[During-call rails]
    G --> G3[Post-call output rails]

    F --> F1[Judge biases:<br/>position, verbosity, self-pref]
    F --> F2[Judge exploitation:<br/>null models, format tricks]
    F --> F3[Truncation and<br/>plumbing bugs]
    F --> F4[Contamination]
    F --> F5[Gold-label noise]
```
## Map of the space
- **Eval types.** Five layers, cheapest to most faithful: static benchmarks (deterministic scoring over fixed datasets), LLM-as-judge (scalable but biased proxy for human preference), human eval (the reference standard, expensive, itself noisy), regression gates (frozen golden sets wired into CI), and online measurement (shadow deploys, A/B tests, live metrics). Mature stacks run all five; each layer catches what the previous one cannot.
- **Harnesses.** All of them run a dataset through a model and score it, and differ in what they treat as the unit of work: a declarative task (**lm-evaluation-harness**, the reproducibility standard for model-card numbers), a program with a sandbox (**Inspect**, what the AISIs, METR and Apollo run, and the default for anything agentic or safety-facing), a pretraining loop (**lighteval**), seven metrics at once (**HELM**, in maintenance mode since June 2026: read it, do not build on it), or an application config (**promptfoo**, **Braintrust**). The dividing question is whether you are asking "is this checkpoint good" or "is this prompt, retrieval and tool configuration safe to ship". A second line runs underneath that one, and it is about how a harness scores at all: one family asks the model which of a fixed set of options it finds more likely, the other makes it generate text and parses the answer out of what comes back. That is why a score from one harness cannot be set beside a score from another, whatever the two of them call the benchmark. Choosing between them, and that loglikelihood-against-generative fault line in full: <mention-page url="https://app.notion.com/p/3c65c17b0d0d81ea9cd5eb65795ff5c9">Eval harnesses: lm-eval-harness, Inspect, HELM, lighteval, app-level tools</mention-page>.
- **Judge patterns.** An LLM judge is a measurement instrument that happens to be a model, and the grading mode fixes its bias profile: **pointwise** drifts, **pairwise** costs O(n\^2) to rank a field and carries position bias, **rubric or reference-guided** grading is the most reliable wherever references exist and the only mode that localises which criterion failed. **Juries (PoLL)** of several small judges from different families beat one large judge on both cost and human agreement, and **meta-evals** (JudgeBench, RewardBench 2) are how you choose among all of it. The design consequence: judge choice is an empirical per-task decision calibrated against a human gold slice, never a default. Mode by mode, with the mitigations: <mention-page url="https://app.notion.com/p/3c65c17b0d0d810ba2a2ecc08c4c233b">LLM-as-judge: design, biases, calibration, reliability</mention-page>.
- **Calibration.** No judge number means anything until it is checked against human labels, and the ceiling of that check is inter-annotator agreement, not 100%: on open-ended tasks two humans agree 75 to 85% of the time, so a judge agreeing 80% with your expert may be at ceiling rather than underperforming. Self-consistency certifies nothing on its own, because a judge can be highly reproducible and systematically wrong at once. The gold slice, Cohen's kappa and the true-positive/false-positive correction: <mention-page url="https://app.notion.com/p/3c65c17b0d0d810ba2a2ecc08c4c233b">LLM-as-judge: design, biases, calibration, reliability</mention-page>.
- **Failure modes.** Position, verbosity and self-preference biases; format exploitation; sycophancy toward confident phrasing; silent plumbing bugs, where a truncated completion fed to the judge scores as a content failure; contaminated or mislabelled gold data. The load-bearing consequence is that most "model regressions" turn out to be eval bugs first and model changes second, so an observed delta has to be attributed to the model, the judge or the gold labels before anyone acts on it. In agentic systems the object being scored slips as well: MOLE found that a model's stated refusal did not predict whether it actually declined a harmful task, so grading the response string measures the wrong variable once the harm lives in the tool calls (<mention-page url="https://app.notion.com/p/3c65c17b0d0d819bbfa5dffa9246c297">Guardrails: staged runtime safety for LLM systems</mention-page>). Contamination in particular is handled by contract rather than by mechanism, which is what the double-blind enclave pilot below attacks.
## Double-blind evaluation: contamination handled cryptographically
Google DeepMind ran what it calls the [first double-blind evaluation of a proprietary model](https://deepmind.google/blog/piloting-the-worlds-first-double-blind-ai-evaluations/) (\~15 min) (Aug 2026), with the Singapore AI Safety Institute, OpenMined, AVERI, and MLCommons. Both secrets go into the same hardware-encrypted enclave (Google Cloud Confidential Space): the lab's weights and the evaluator's benchmark prompts. The lab never sees the prompts, so they cannot enter a training set; the evaluator never sees the weights, so the lab does not have to hand over its model to be measured by an outsider. The pilot ran on Gemini Flash Lite, and the blog post publishes the mechanism rather than scores; methodology and findings are in the accompanying technical report.
The reason to care is structural, not the numbers. Contamination is currently handled by contract and by trust: an evaluator promises not to leak the set, a lab promises not to train on it, neither claim is verifiable after the fact, and so held-out sets decay into training data and every benchmark has a shelf life. This makes non-contamination a property of the execution environment instead of a promise, the first mechanism that could let one private benchmark be reused across labs and model generations without burning it. Caveats: a pilot on a small model; the enclave has to be trusted and is Google's own infrastructure, which is awkward when Google is also the evaluated party; and it does nothing about the *other* contamination path, the benchmark's questions leaking into the pretraining crawl from their original public source.
What it costs in exchange is debuggability, since neither party can read the transcripts that normally explain a bad score, and that side of it is in <mention-page url="https://app.notion.com/p/3c65c17b0d0d81ea9cd5eb65795ff5c9">Eval harnesses: lm-eval-harness, Inspect, HELM, lighteval, app-level tools</mention-page>. It stands with the SWE-Bench Pro audit in <mention-page url="https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a"/> as the two 2026 attempts to make benchmark integrity checkable rather than assumed.
## Checklist grading makes small judges viable
The judge-pattern bullet holds that juries of small diverse judges (PoLL) beat a single large judge on cost and human agreement. [RocketEval](https://arxiv.org/abs/2503.05142) (45 min) (ICLR 2025, in <mention-page url="https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f"/> as <mention-page url="https://app.notion.com/p/3cd5c17b0d0d81ffa8e5f8fa5a5806c8"/>) makes a stronger version of that claim with a single small judge, and its diagnosis is the part to keep: lightweight judges do not fail from a general reasoning deficit, they fail because they cannot hold a comprehensive analysis of a long response in one pass. So stop asking them to analyse. A frontier model compiles each query once into 5 to 10 binary checklist questions, and the small judge answers each one independently.
Two consequences land on this topic. It moves judge scoring from a quarterly sweep to a per-merge gate, which is the constraint <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b39ad9e96193d21adc">Production eval engineering: gates, golden sets, statistics, gold-label auditing</mention-page> keeps running into. And it debiases by construction rather than by correction: with no checklist item graded in sight of the others, position and anchoring bias have no channel to propagate, which is a different kind of fix from the post-hoc swapping and length-controlling catalogued in <mention-page url="https://app.notion.com/p/3c65c17b0d0d810ba2a2ecc08c4c233b">LLM-as-judge: design, biases, calibration, reliability</mention-page>.
The caveat belongs with the meta-eval scepticism already on this page: the correlation is *list-level*. Small checklist judges rank a field of models almost exactly right while remaining unreliable on any single response, which is consistent with JudgeBench and RewardBench 2 putting even frontier judges at 60-70% on hard comparisons. Use this shape for aggregate leaderboards, drift monitoring and regression gates that trip on a distribution; never to adjudicate one item, gate one pull request on one failing case, or generate preference labels. Note also the prerequisite, which cuts against the privacy argument for local judging: checklist creation still needs a frontier model to see every query, though never the responses. Costs, correlations and the instance-level ceiling are in <mention-page url="https://app.notion.com/p/3c65c17b0d0d810ba2a2ecc08c4c233b">LLM-as-judge: design, biases, calibration, reliability</mention-page>.
## Deep dives
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d810ba2a2ecc08c4c233b">LLM-as-judge: design, biases, calibration, reliability</mention-page> (11 min read · +9h 35m resources): judge design, biases, calibration against human gold, ensembles, meta-evals, known exploits.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81ea9cd5eb65795ff5c9">Eval harnesses: lm-eval-harness, Inspect, HELM, lighteval, app-level tools</mention-page> (12 min read · +5h 5m resources): when to use which; contribution entry points.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b39ad9e96193d21adc">Production eval engineering: gates, golden sets, statistics, gold-label auditing</mention-page> (11 min read · +4h 35m resources): regression gates, golden sets, shadow deploys, statistical rigour, gold-label auditing.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d819bbfa5dffa9246c297">Guardrails: staged runtime safety for LLM systems</mention-page> (10 min read · +2h 15m resources): pre/during/post-call guardrail stages, NeMo Guardrails, guard-model landscape (Llama Guard, Granite Guardian, Qwen3Guard).
## Related
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d811fb43fece56e40041a"/> for the datasets these harnesses run.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b6876ee72b7056793b"/> for reward models and reward hacking, the training-time mirror of judge exploitation.
<page url="https://app.notion.com/p/3c65c17b0d0d81ea9cd5eb65795ff5c9">Eval harnesses: lm-eval-harness, Inspect, HELM, lighteval, app-level tools</page>
<page url="https://app.notion.com/p/3c65c17b0d0d819bbfa5dffa9246c297">Guardrails: staged runtime safety for LLM systems</page>
<page url="https://app.notion.com/p/3c65c17b0d0d810ba2a2ecc08c4c233b">LLM-as-judge: design, biases, calibration, reliability</page>
<page url="https://app.notion.com/p/3c65c17b0d0d81b39ad9e96193d21adc">Production eval engineering: gates, golden sets, statistics, gold-label auditing</page>
</content>
</page>