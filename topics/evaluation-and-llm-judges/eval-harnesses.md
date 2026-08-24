# Eval harnesses: lm-eval-harness, Inspect, HELM, lighteval, app-level tools

*Last updated: 2026-08-24*

## Best resources

- [lm-evaluation-harness repo](https://github.com/EleutherAI/lm-evaluation-harness) and its [task_guide.md](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/docs/task_guide.md) / [interface.md](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/docs/interface.md): the canonical docs for YAML task configs and the model API.
- [Inspect documentation](https://inspect.aisi.org.uk/): excellent official docs; start with Tasks, Solvers, Scorers, then Sandboxing and Agents.
- [Hamel Husain's notes on Inspect](https://hamel.dev/notes/llm/evals/inspect.html): practitioner walkthrough of why Inspect's design works.
- [inspect_evals CONTRIBUTING.md](https://github.com/UKGovernmentBEIS/inspect_evals/blob/main/CONTRIBUTING.md): the concrete contribution entry point for Inspect.
- [HELM repo](https://github.com/stanford-crfm/helm) and [docs](https://crfm-helm.readthedocs.io/): in maintenance mode since 2026-06, still the reference for multi-metric methodology.
- [lighteval repo](https://github.com/huggingface/lighteval): HF's harness, 1000+ tasks, multi-backend.

## lm-evaluation-harness (EleutherAI)

The reproducibility standard for base-model benchmarking; backend of the (now archived v1/v2) Open LLM Leaderboard and the default for "numbers in a model card".

- **Architecture**: `TaskManager` discovers tasks from YAML files and instantiates `ConfigurableTask` objects; a registry maps model names to `LM` subclasses (hf, vllm, sglang, openai-completions, anthropic, mamba, gguf, and 25+ more). The `LM` interface is tiny: implement `loglikelihood`, `loglikelihood_rolling`, and `generate_until` and any backend works. Requests are batched, cached, and distributed automatically.
- **Task YAMLs** declare dataset (HF hub path), `doc_to_text` / `doc_to_target` (Jinja templates or Python callables via `!function`), the `output_type`, metrics, and filters (regex extraction, majority voting for self-consistency). Variants (fewshot counts, CoT versions, translations) are YAML overrides via `include:`. Groups and tags aggregate tasks (e.g. `mmlu` is a group of 57 subtasks).
- **`loglikelihood` vs `generate_until`** is the key methodological split. Loglikelihood tasks score P(choice|context) for each option and pick the argmax (optionally byte-length-normalised `acc_norm`): no sampling, cheap, deterministic, works on base models, but only measures ranking of given options, not generation, and API models without logprobs cannot run them. `generate_until` samples a completion to stop sequences and post-processes with filters: what chat/instruct models need, but every scoring regex is now a potential bug (answer-extraction failures silently score as wrong; the classic source of "model X suddenly dropped 20 points"). Modern reasoning-heavy tasks are nearly all generative; the field has been migrating MCQA tasks from loglikelihood to generative CoT formats, which changes absolute numbers, so never compare scores across the two formats.
- **Gotchas**: fewshot formatting and chat-template application (`--apply_chat_template`) materially change scores; `trust_remote_code`; results depend on filter chains as much as the model. Always log the exact task version hash.
- **Contributing**: genuinely accessible. Entry points: port or add tasks in the YAML format (the task_guide walks through it; PRs are expected to show parity with reference implementations), fix answer-extraction filters for reasoning models, or add backend support. Task PRs are the low-friction on-ramp; the maintainers triage `good first issue` and task-request issues actively.

## Inspect (UK AI Security Institute)

The frontier-safety and agentic-eval standard; used by UK/other AISIs, METR, Apollo Research, and labs for pre-deployment testing. Where lm-eval-harness models "prompt in, string out", Inspect models an eval as a program.

- **Core abstractions**: a `Task` = dataset + solver + scorer. A **solver** is a composable step (or chain) that transforms `TaskState`: `system_message()`, `prompt_template()`, `generate()`, `self_critique()`, or a full agent loop (`react()`, `basic_agent()`) with tool calls. A **scorer** grades the final state: `exact()`, `match()`, `model_graded_qa()`, `model_graded_fact()`, or custom Python (including judge batteries). Metrics aggregate scores; `Epochs` reruns with reducers for pass@k.
- **Sandboxing**: first-class sandbox abstraction (Docker default; k8s and Proxmox adapters) so agentic tasks can execute untrusted model-written code, run web/CTF/SWE environments, and be isolated per-sample. This is the feature that made it the agentic-eval default; nothing in lm-eval-harness compares.
- **Tooling**: `inspect view` log viewer + VS Code extension render full transcripts (every model call, tool call, score) from structured `.eval` logs: the debugging experience is the best of any harness, and eval logs are a stable format other tools consume.
- **Model support**: all major APIs plus local (vllm, hf); `--model` flag switches provider without task changes.
- **Contributing**: two repos. `inspect_ai` (framework; harder bar) and [`inspect_evals`](https://github.com/UKGovernmentBEIS/inspect_evals) (community benchmark implementations; the designed on-ramp). For inspect_evals: pick a published, credibly-sourced benchmark not yet implemented (check open issues/PRs first, propose in an issue), start with Q&A-style before agentic tasks, and ship an end-to-end test plus reported-score parity check; untested evals are rejected. Their docs/methodology.md describes the validation bar. Given Khalid's judge-battery background, model-graded scorers and judge-reliability tooling inside inspect_evals are a natural niche.

## HELM (Stanford CRFM)

Multi-metric methodology reference: every scenario scored on accuracy, calibration, robustness, fairness, bias, toxicity, efficiency; transparent per-instance dumps. Spawned domain variants (MedHELM, etc.). **Entered maintenance mode 2026-06-01**: read it for methodology (its "coverage beats headline score" stance predated the field by two years), do not build new pipelines on it.

## lighteval (Hugging Face)

Harness-inspired, HF-native: 1000+ tasks, backends for transformers/accelerate, vllm, TGI, endpoints, nanotron (evaluation during pretraining). Strengths: tight hub integration (push results/details to hub), fast custom-task authoring in Python, multilingual task coverage, and it powers HF's leaderboards. Weaker than lm-eval-harness on community-verified task parity, weaker than Inspect on agentic. Choose it when you live in the HF stack or need in-training-loop evals of nanotron/FSDP checkpoints.

## App-level: promptfoo and Braintrust

Different job: evaluating your application (prompt + model + RAG + tools), not the model.

- **promptfoo**: OSS, CLI/YAML-first, local-first. Declarative test matrices (prompts x providers x test cases), assertion types from regex to model-graded, diff view, CI-friendly, plus a serious red-teaming/scanner mode. Choose for repo-local prompt regression tests and multi-model comparisons with fastest setup.
- **Braintrust**: commercial platform: `Eval()` SDK (TS/Python), dataset versioning, autoevals scorer library, production trace logging, online scoring on live traffic, CI quality gates, human-review queues. Choose when you need the offline-eval-to-production-observability loop in one place and are willing to pay/host. (Alternatives in this niche: Langfuse, Arize Phoenix, W&B Weave; see ../agentic-frameworks/ for observability.)

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

## Which to use when

| Situation | Tool |
|---|---|
| Standard academic benchmark numbers for a model/checkpoint | lm-evaluation-harness |
| Agentic, tool-use, sandboxed, or safety evals; rich transcripts | Inspect |
| Evals inside an HF training loop; multilingual leaderboard-style | lighteval |
| Prompt/config regression tests for an app, in CI | promptfoo (OSS) or Braintrust (platform) |
| Production tracing + online scores + gates | Braintrust / Langfuse / Phoenix |
| Methodology inspiration, multi-metric reporting | HELM (read, don't adopt) |

Boundary rule: model-level harnesses answer "is this checkpoint good"; app-level tools answer "is this system change safe to ship". Khalid's regression-gate work is the second category even when the trigger is a model swap; the pattern that works is harness for the swap candidate's general capabilities, app-level golden sets for the product surface ([production-eval-engineering.md](production-eval-engineering.md)).
