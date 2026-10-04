Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d81ea9cd5eb65795ff5c9 as of 2026-09-22T02:21:41.449Z:
<page url="https://app.notion.com/p/3c65c17b0d0d81ea9cd5eb65795ff5c9">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d8181b351e1b8fc6a1546" title="Topic: evaluation-and-llm-judges"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Eval harnesses: lm-eval-harness, Inspect, HELM, lighteval, app-level tools"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 13 min read · +5h 20m resources
## Best resources
- [lm-evaluation-harness repo](https://github.com/EleutherAI/lm-evaluation-harness) (repo, \~40 min for the entry path) and its [task_guide.md](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/docs/task_guide.md) (\~30 min) / [interface.md](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/docs/interface.md) (\~20 min): the canonical docs for YAML task configs and the model API.
- [Inspect documentation](https://inspect.aisi.org.uk/) (docs, \~90 min for the core pages): excellent official docs; start with Tasks, Solvers, Scorers, then Sandboxing and Agents.
- [Hamel Husain's notes on Inspect](https://hamel.dev/notes/llm/evals/inspect.html) (\~20 min): practitioner walkthrough of why Inspect's design works.
- [inspect_evals CONTRIBUTING.md](https://github.com/UKGovernmentBEIS/inspect_evals/blob/main/CONTRIBUTING.md) (\~15 min): the concrete contribution entry point for Inspect.
- [HELM repo](https://github.com/stanford-crfm/helm) (repo, \~15 min for the entry path) and [docs](https://crfm-helm.readthedocs.io/) (docs, \~40 min for the core pages): in maintenance mode since 2026-06, still the reference for multi-metric methodology.
- [lighteval repo](https://github.com/huggingface/lighteval) (repo, \~20 min for the entry path): Hugging Face's harness, 1000+ tasks, multi-backend.
## lm-evaluation-harness (EleutherAI)
The reproducibility standard for base-model benchmarking; backend of the (now archived v1/v2) Open LLM Leaderboard and the default for "numbers in a model card".
- **Architecture**: `TaskManager` discovers tasks from YAML files and instantiates `ConfigurableTask` objects; a registry maps model names to `LM` subclasses (hf, vllm, sglang, openai-completions, anthropic, mamba, gguf, and 25+ more). The `LM` interface is tiny: implement `loglikelihood`, `loglikelihood_rolling`, and `generate_until` and any backend works. Requests are batched, cached, and distributed automatically.
- **Task YAMLs** declare dataset (HF hub path), `doc_to_text` / `doc_to_target` (Jinja templates or Python callables via `!function`), `output_type`, metrics, and filters (regex extraction, majority voting for self-consistency). Variants (fewshot counts, chain-of-thought (CoT) versions, translations) are YAML overrides via `include:`. Groups and tags aggregate tasks (`mmlu` is a group of 57 subtasks).
- **`loglikelihood`**** vs ****`generate_until`** is the key methodological split. Loglikelihood tasks score P(choice\|context) for each option and pick the argmax (optionally byte-length-normalised `acc_norm`): no sampling, cheap, deterministic, works on base models, but only measures ranking of given options, not generation, and API models without logprobs cannot run them. `generate_until` samples a completion to stop sequences and post-processes with filters: what chat/instruct models need, but every scoring regex is now a potential bug (answer-extraction failures silently score as wrong; the classic source of "model X suddenly dropped 20 points"). Modern reasoning-heavy tasks are nearly all generative; the field has been migrating multiple-choice question answering (MCQA) tasks from loglikelihood to generative CoT formats, which changes absolute numbers, so never compare scores across the two formats.
- **Gotchas**: fewshot formatting and chat-template application (`--apply_chat_template`) materially change scores; `trust_remote_code`; results depend on filter chains as much as the model. Always log the exact task version hash.
- **Contributing**: genuinely accessible. Port or add tasks in the YAML format (the task_guide walks through it; PRs are expected to show parity with reference implementations), fix answer-extraction filters for reasoning models, or add backend support. Task PRs are the low-friction on-ramp; maintainers triage `good first issue` and task-request issues actively.
## Inspect (UK AI Security Institute)
The frontier-safety and agentic-eval standard; used by UK/other AISIs, METR, Apollo Research, and labs for pre-deployment testing. Where lm-eval-harness models "prompt in, string out", Inspect models an eval as a program.
- **Core abstractions**: a `Task` = dataset + solver + scorer. A **solver** is a composable step (or chain) that transforms `TaskState`: `system_message()`, `prompt_template()`, `generate()`, `self_critique()`, or a full agent loop (`react()`, `basic_agent()`) with tool calls. A **scorer** grades the final state: `exact()`, `match()`, `model_graded_qa()`, `model_graded_fact()`, or custom Python (including judge batteries). Metrics aggregate scores; `Epochs` reruns with reducers for pass@k.
- **Sandboxing**: first-class sandbox abstraction (Docker default; k8s and Proxmox adapters) so agentic tasks can execute untrusted model-written code, run web/CTF/SWE environments, and be isolated per-sample. This is the feature that made it the agentic-eval default; nothing in lm-eval-harness compares.
- **Tooling**: `inspect view` log viewer plus VS Code extension render full transcripts (every model call, tool call, score) from structured `.eval` logs: the best debugging experience of any harness, and the logs are a stable format other tools consume.
- **Model support**: all major APIs plus local (vllm, hf); `--model` flag switches provider without task changes.
- **Contributing**: two repos. `inspect_ai` (framework; harder bar) and [`inspect_evals`](https://github.com/UKGovernmentBEIS/inspect_evals) (repo, \~15 min for the entry path) (community benchmark implementations; the designed on-ramp). For inspect_evals: pick a published, credibly-sourced benchmark not yet implemented (check open issues/PRs first, propose in an issue), start with Q&A-style before agentic tasks, and ship an end-to-end test plus reported-score parity check; untested evals are rejected. Their `docs/methodology.md` describes the validation bar. Given Khalid's judge-battery background, model-graded scorers and judge-reliability tooling inside inspect_evals are a natural niche.
## HELM (Stanford CRFM)
Multi-metric methodology reference: every scenario scored on accuracy, calibration, robustness, fairness, bias, toxicity and efficiency, with transparent per-instance dumps. Spawned domain variants (MedHELM and others). **Entered maintenance mode 2026-06-01**: read it for methodology (its "coverage beats headline score" stance predated the field by two years), do not build new pipelines on it.
## lighteval (Hugging Face)
Harness-inspired, HF-native: 1000+ tasks, backends for transformers/accelerate, vllm, TGI, endpoints and nanotron (evaluation during pretraining). Tight hub integration (push results and details to the hub), fast custom-task authoring in Python, multilingual coverage, and it powers HF's leaderboards. Weaker than lm-eval-harness on community-verified task parity, weaker than Inspect on agentic. Choose it when you live in the HF stack or need in-training-loop evals of nanotron/FSDP checkpoints.
## App-level: promptfoo and Braintrust
Different job: evaluating your application (prompt + model + RAG + tools), not the model.
- **promptfoo**: OSS, CLI/YAML-first, local-first. Declarative test matrices (prompts x providers x test cases), assertion types from regex to model-graded, diff view, CI-friendly, plus a serious red-teaming/scanner mode. Choose it for repo-local prompt regression tests and multi-model comparisons, with the fastest setup.
- **Braintrust**: commercial platform: `Eval()` SDK (TS/Python), dataset versioning, autoevals scorer library, production trace logging, online scoring on live traffic, CI quality gates, human-review queues. Choose when you need the offline-eval-to-production-observability loop in one place and are willing to pay/host. (Alternatives in this niche: Langfuse, Arize Phoenix, W&B Weave; see <mention-page url="https://app.notion.com/p/3c65c17b0d0d81ab8432c54d65b7f8c7"/> for observability.)
## The shape of a task in each framework
lm-eval-harness task YAML (declarative; one file per variant):
```yaml
task: my_qa_task
dataset_path: org/my-dataset
output_type: generate_until
doc_to_text: "Q: {{question}}\nA:"
doc_to_target: "{{answer}}"
generation_kwargs:
  until: ["\n\n"]
  max_gen_toks: 512
filter_list:
  - name: extract
    filter:
      - function: regex
        regex_pattern: "answer is (\\S+)"
      - function: take_first
metric_list:
  - metric: exact_match
```
Inspect task (imperative; solvers compose, scorer can be a judge):
```python
from inspect_ai import Task, task
from inspect_ai.dataset import hf_dataset
from inspect_ai.solver import system_message, generate
from inspect_ai.scorer import model_graded_qa

@task
def my_qa_task():
    return Task(
        dataset=hf_dataset("org/my-dataset", split="test"),
        solver=[system_message("Answer concisely."), generate()],
        scorer=model_graded_qa(model="openai/gpt-5-mini"),
    )
```
The contrast is the point: the harness optimises for reproducible standardisation of hundreds of fixed tasks; Inspect optimises for expressing arbitrary eval logic (multi-turn, tools, sandbox commands, custom judge batteries) as ordinary Python with full transcripts.
## Enclave evaluation: the harness as a trust boundary
Every harness above assumes one party holds both the model and the questions. The [first double-blind evaluation of a proprietary model](https://deepmind.google/blog/piloting-the-worlds-first-double-blind-ai-evaluations/) (\~15 min), run in Aug 2026 by Google DeepMind with the Singapore AI Safety Institute, OpenMined, AVERI and MLCommons, drops that assumption. Weights and benchmark prompts are loaded into the same hardware-encrypted enclave (Google Cloud Confidential Space), the evaluation runs inside it, and only the scores come out. The lab never sees the prompts, so they cannot reach a training set; the evaluator never sees the weights, so the lab does not have to hand its model to an outsider.
What that buys is a harness property nothing else on this page has: non-contamination becomes a fact about where the code ran rather than a clause in a contract, which is the first mechanism that would let one private benchmark be reused across labs and model generations without burning it. What it costs is the thing Inspect's log viewer exists for. If the evaluator cannot see the model and the lab cannot see the items, neither party can read the transcripts, so a bad score inside an enclave cannot be attributed between a genuine capability gap, a broken answer-extraction filter and a truncated completion, which are the three explanations any harness operator checks first. Enclave results will therefore need a separate, non-blind debugging channel before they can gate anything. It is a pilot at this stage, on one small model, in an enclave operated by the evaluated party's own cloud, and it does nothing about the other contamination path, the benchmark's questions leaking into the pretraining crawl from wherever they were originally published. The framing this sits in is on <mention-page url="https://app.notion.com/p/3c65c17b0d0d8181b351e1b8fc6a1546">Topic: evaluation-and-llm-judges</mention-page>.
## Which to use when
<table fit-page-width="true" header-row="true">
<tr>
<td>Situation</td>
<td>Tool</td>
</tr>
<tr>
<td>Standard academic benchmark numbers for a model/checkpoint</td>
<td>lm-evaluation-harness</td>
</tr>
<tr>
<td>Agentic, tool-use, sandboxed, or safety evals; rich transcripts</td>
<td>Inspect</td>
</tr>
<tr>
<td>Evals inside an HF training loop; multilingual leaderboard-style</td>
<td>lighteval</td>
</tr>
<tr>
<td>Prompt/config regression tests for an app, in CI</td>
<td>promptfoo (OSS) or Braintrust (platform)</td>
</tr>
<tr>
<td>Production tracing + online scores + gates</td>
<td>Braintrust / Langfuse / Phoenix</td>
</tr>
<tr>
<td>Methodology inspiration, multi-metric reporting</td>
<td>HELM (read, don't adopt)</td>
</tr>
<tr>
<td>Evaluating a proprietary model when neither side may see the other's secret</td>
<td>Confidential-compute enclave (pilot stage, not yet something to build on)</td>
</tr>
</table>
Boundary rule: model-level harnesses answer "is this checkpoint good"; app-level tools answer "is this system change safe to ship". Khalid's regression-gate work is the second category even when the trigger is a model swap; the pattern that works is harness for the swap candidate's general capabilities, app-level golden sets for the product surface (<mention-page url="https://app.notion.com/p/3c65c17b0d0d81b39ad9e96193d21adc"/>).
</content>
</page>