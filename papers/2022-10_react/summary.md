# ReAct: Synergizing Reasoning and Acting in Language Models

⏱ 10 min read · +~2h 25m resources

- **Authors**: Shunyu Yao, Jeffrey Zhao, Dian Yu, Nan Du, Izhak Shafran, Karthik Narasimhan, Yuan Cao (Princeton NLP, Google Brain)
- **Date**: October 2022 (arXiv 2210.03629; ICLR 2023)
- **Links**: [arXiv](https://arxiv.org/abs/2210.03629) (~45 min) | [project page + code](https://react-lm.github.io/) (~20 min)

### Best resources

- [Google Research blog: ReAct](https://research.google/blog/react-synergizing-reasoning-and-acting-in-language-models/) (~10 min): the authors' own short-form summary with the key figures.
- [Prompting Guide: ReAct](https://www.promptingguide.ai/techniques/react) (~15 min): concise walkthrough of the prompt format with worked HotpotQA examples and a LangChain reproduction.
- [Simon Willison: a Python ReAct pattern](https://til.simonwillison.net/llms/python-react-pattern) (~10 min): the whole agent loop implemented from scratch in ~40 lines; the fastest way to internalise that ReAct is just a parse-act-append loop around a prompt.
- [Lilian Weng: LLM Powered Autonomous Agents](https://lilianweng.github.io/posts/2023-06-23-agent/) (~45 min): places ReAct within the broader 2023 agent design space (planning, memory, tool use) alongside Reflexion and friends.

### Problem

By late 2022 two lines of LLM work had matured separately. Chain-of-thought prompting showed LLMs can reason step by step, but CoT is a static black box: the model reasons purely over its own internal representations, cannot look anything up, and so hallucinates facts and propagates early errors through the whole chain. Meanwhile action-generation work (WebGPT, SayCan, Inner Monologue) showed LLMs can emit actions in interactive environments, but these systems either did not reason at all or restricted "reasoning" to restating environment observations, and WebGPT-style approaches needed expensive imitation or RL training. Nobody had shown that free-form reasoning and environment actions could be interleaved in one loop, with each improving the other, using nothing but few-shot prompting.

### Method

The core idea fits in one sentence: augment the agent's action space A to A U L, where L is the space of language. An action from L is a *thought* (reasoning trace); it does not touch the environment and returns no observation, it only appends to the context to condition future reasoning and actions. Regular actions hit the environment and return observations. The trajectory becomes an interleaved sequence of thought -> action -> observation steps, and the model decides itself when to think and when to act.

Concretely, a frozen PaLM-540B is prompted with a handful of human-written exemplar trajectories (no training, no ad-hoc format engineering):

- **Knowledge-intensive tasks (HotpotQA, FEVER)**: dense thoughts, alternating thought/action every step. The action space is a deliberately minimal Wikipedia API: `search[entity]` (first 5 sentences of the page, or top-5 similar titles if missing), `lookup[string]` (Ctrl-F for the next matching sentence), `finish[answer]`. Thoughts decompose the question, extract facts from observations, do commonsense/arithmetic steps, reformulate searches, and synthesise the answer. 6 exemplars for HotpotQA, 3 for FEVER; question-only setting, no gold paragraphs.
- **Decision-making tasks (ALFWorld, WebShop)**: sparse thoughts, injected only where useful (goal decomposition, subgoal tracking, commonsense about where objects live, deciding what to buy), because trajectories are long (50+ steps) and most steps need no deliberation.
**Ablation baselines** are built by deleting parts of the ReAct trajectory: `Standard` (no thoughts, actions, or observations), `CoT` (thoughts only, no environment; plus `CoT-SC` self-consistency over 21 samples), and `Act` (actions and observations, no thoughts). Because all prompts derive from the same trajectories, the comparisons isolate exactly what interleaved thinking adds.

**ReAct + CoT-SC combination**: since ReAct is factual but structurally constrained and CoT is flexible but hallucination-prone, the paper backs off between them: ReAct -> CoT-SC (fall back to CoT-SC if ReAct does not finish within 7/5 steps) and CoT-SC -> ReAct (fall back to ReAct when the CoT-SC majority vote is weak, i.e. internal knowledge is insufficient).

**Finetuning preview**: 3,000 correct ReAct trajectories bootstrapped from PaLM-540B (STaR-style) are used to finetune PaLM-8B/62B, testing whether the format works better learned than prompted.

### Results

- **HotpotQA (EM)**: ReAct 27.4 vs Act 25.7, CoT 29.4, CoT-SC 33.4. ReAct alone slightly trails CoT, but the combinations win: ReAct -> CoT-SC hits 35.1 (best prompting result). **FEVER (acc)**: ReAct 60.9 clearly beats CoT 56.3; CoT-SC -> ReAct reaches 64.6.
- **The failure-mode analysis is the most cited part**: on 200 hand-labelled HotpotQA trajectories, hallucination causes 56% of CoT failures (and 14% of its "successes" are false positives, vs 6% for ReAct), while ReAct's failures are dominated by reasoning loops (47%, repetitively regenerating prior steps) and uninformative search results (23%). Grounding buys factuality at the cost of reasoning flexibility.
- **Finetuning flips the ranking**: prompted ReAct is the worst of four methods on PaLM-8B (the format is hard to learn from examples alone), but finetuned ReAct becomes the best, with finetuned PaLM-62B beating all 540B prompting baselines. Acting is a generalisable skill worth training; memorising facts (Standard/CoT finetuning) is not.
- **ALFWorld (success rate)**: best-of-6 ReAct 71% vs best Act 45% and BUTLER (imitation learning on 10^5 expert trajectories per task) 37%; even the worst ReAct trial (48%) beats the best of both baselines. A dense IM-style ablation (ReAct-IM, thoughts restricted to restating observations) gets 53%, showing free-form reasoning, not just self-talk, is what matters.
- **WebShop (500 test instructions)**: one-shot ReAct reaches 40.0% success vs Act 30.1%, imitation learning 29.1%, IL+RL 28.7%; a 10% absolute gain over the trained prior best from a single in-context example (human experts: 59.6%).
- Headline framing from the abstract: +34% absolute over imitation/RL methods on ALFWorld and +10% on WebShop, with one or two in-context examples. All prompting results remain far below supervised task-specific SoTA (HotpotQA 67.5, FEVER 89.5), which the authors flag as the case for finetuning at scale.

### Why it matters

- **It is the ancestor of every modern agent loop.** Thought -> tool call -> observation, appended to context, repeated until a finish action: that is LangChain's original AgentExecutor (which literally parsed `Thought:/Action:/Action Input:` ReAct text), AutoGPT, and structurally the inner loop of Claude Code, OpenHands, Deep Research systems, and the Claude/OpenAI agent SDKs today. The paper also named the two directions of the synergy that still define agent design: reason-to-act (plans, decomposition, exception handling steer tool use) and act-to-reason (retrieved observations ground the reasoning).
- **How the field evolved past prompted ReAct.** The 2022 recipe (few-shot exemplars, actions as free text, regex parsing, one big prompt) was brittle: parse failures, the repetitive-loop failure mode the paper itself documents, and heavy token overhead. Each piece was subsequently replaced by training. Structured function calling (OpenAI June 2023, then every provider) moved action emission from parsed text into schema-constrained, RLHF-trained decoding, eliminating the parsing layer. Native tool-use training and multi-turn agentic post-training (Toolformer as early sketch, then frontier-lab agent RL) baked the loop into the policy, so no exemplar trajectories are needed. Reasoning models with interleaved/extended thinking (o1/o3, DeepSeek-R1, Claude extended thinking with tool use) turned the "thought" channel from prompted imitation of human annotations into RL-optimised reasoning tokens emitted between tool calls, which is ReAct's dense-thought mode learned end to end. The paper anticipated this arc: its own finetuning section shows the format works far better trained than prompted, and its conclusion calls for scaling with multi-task training and RL, which is roughly what RLVR-era agent training does.
- **It reframed retrieval**: instead of a fixed retrieve-then-read pipeline (classic RAG), the model decides what to retrieve next based on reasoning over what it has seen, i.e. agentic/iterative retrieval, now standard for multi-hop and deep-research workloads.
- **The evaluation style stuck**: hand-labelled success/failure taxonomies (hallucination vs reasoning error vs bad search) and the factuality-vs-flexibility trade-off remain the standard vocabulary for debugging agent trajectories.

### Connections

- GPT-3 (2020-05): the few-shot in-context learning paradigm ReAct pushes to interactive tasks.
- RAG (2020-05): fixed retrieve-then-generate; ReAct is the model-directed, iterative alternative that agentic RAG descends from.
- InstructGPT (2022-03): the RLHF machinery that later trained tool use natively, replacing ReAct-style prompting.
- DeepSeek-R1 (2025-01): RL-trained reasoning tokens; interleaved thinking + tool calls is the trained descendant of ReAct's thought channel.
- Topics: agentic-frameworks, agentic-harnesses, rag-and-retrieval.
