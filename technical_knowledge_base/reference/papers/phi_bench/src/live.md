Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3db5c17b0d0d81029236da6c38f5891f as of 2026-09-20T17:33:24.024Z:
<page url="https://app.notion.com/p/3db5c17b0d0d81029236da6c38f5891f">
<ancestor-path>
<parent-data-source url="collection://d440058d-ec1c-4b72-b141-046d5d969389" name="papers"/>
<ancestor-2-database url="https://app.notion.com/p/97163af7655541438b224f753fef6f6f" title="papers"/>
<ancestor-3-page url="https://app.notion.com/p/3c65c17b0d0d81549dbedb27e8f2a26f" title="Papers"/>
<ancestor-4-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-5-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"Paper":"Φ-Bench: Can Large Language Models Engineer the Infrastructure That Powers Them?","Takeaway":"85 open-ended infrastructure tasks in nine categories and three escalating formats (55 single-file kernel completions, 20 multi-file repository implementations, 10 end-to-end optimisations where the model must find the bottleneck itself), built from 2,260 papers and 1,852 engineering artifacts; the best model, Claude Opus 5, resolves 36.53%, Kimi K3 28.12% and Qwen3.8-Max 27.73%, with Hardware and Edge collapsing to 5.4%, repository-scale work far harder than kernels, longer reasoning budgets not reliably helping, and the behaviours that separate the top of the table being cheap pre-submission validation plus deliberate variable isolation.","Topics":["benchmarks","inference-and-serving","cuda-and-gpu-programming","ml-infra-and-orchestration"],"Year":"2026","url":"https://app.notion.com/p/3db5c17b0d0d81029236da6c38f5891f"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
⏱ 5 min read · +1h resources
September 2026. Authors and exact submission date not recovered; the arXiv listing page should be checked when the page is next edited.
[arXiv 2609.10226](https://arxiv.org/abs/2609.10226) (1h, 30+ pages)
## Best resources
- [The paper](https://arxiv.org/abs/2609.10226) (1h).
## Problem
Every existing code benchmark for infrastructure work measures isolated kernels: write this CUDA kernel, optimise this loop. Real infrastructure engineering is long-horizon and open-ended: find the bottleneck across a repository, change several files, and verify that the system got faster without getting wrong. Nobody had measured that, which matters because it is precisely the capability that would let models accelerate their own serving and training stacks.
## Method
85 tasks across nine categories: training systems, inference and serving, compression, kernel optimisation, I/O efficiency, hardware adaptation, data infrastructure, system optimisation, and system assurance. Three escalating formats:
- **Kernel Function Completion (KFC)**, 55 tasks: an optimised implementation inside a single file.
- **Long-Horizon Implementation (LHI)**, 20 tasks: multi-file, repository-scale development.
- **End-to-End Optimisation (E2EO)**, 10 tasks: the model must identify the system-level bottleneck itself before optimising it.
Construction used three routes, which is worth noting as benchmark methodology: reconstruction from public repository pull requests and issues, agent-assisted mining with automated test generation, and expert curation of problems too new to have a PR history. Tasks are grounded in 2,260 papers and 1,852 engineering artifacts, organised by a hierarchical taxonomy.
## Results
Eight frontier models tested. **Claude Opus 5 leads at 36.53%**, Kimi K3 at 28.12%, Qwen3.8-Max at 27.73%. Performance varies enormously by domain, with **Hardware and Edge the hardest at 5.4% for the best model**. Repository-level implementation is substantially harder than kernel completion, which is the expected direction but the size of the drop is the useful number. Two behavioural findings generalise beyond the benchmark: strong models establish cheap validation mechanisms before submitting anything, and they isolate variables and control noise when measuring, which is what separates the top of the table from the middle. Extended reasoning budgets do not reliably improve scores.
## Why it matters
It puts a number on a claim the industry has started making loudly. OpenAI reported 3.1 agent-workdays of research effort per human workday in August 2026, and AMD now ships ROCm optimisation knowledge as agent skills. Φ-Bench says that on open-ended infrastructure engineering the best model resolves roughly a third of tasks, and on hardware adaptation roughly one in twenty. It is also the first benchmark whose task categories map almost exactly onto this KB's systems topics, which makes it a direct measure of how much of `Topic: inference-and-serving`, `Topic: cuda-and-gpu-programming` and `Topic: ml-infra-and-orchestration` a model can currently do.
## Connections
- `Topic: benchmarks`: sits with HarnessDev and MOLE as the third benchmark this month whose subject is the system rather than the task.
- `Topic: inference-and-serving` and `Topic: cuda-and-gpu-programming`: the category breakdown is a usable capability map for exactly the work these pages describe. Cohere's megakernel serving write-up, added to the serving page this week, is a worked example of an E2EO-shaped task done by humans, and a useful reference point for what a 36.53% score is a third of.
- `Repo-To-Skill`: its operational-knowledge thesis predicts that the categories where Φ-Bench models fail worst are those where the knowledge lives in configs and issue threads rather than in papers, which the Hardware and Edge result is consistent with.
- `NeoHorse-1`: the loop NeoHorse-1 runs is the loop Φ-Bench says models cannot yet close on real infrastructure.
</content>
</page>
