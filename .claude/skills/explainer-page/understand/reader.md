# The reader: who Khalid is, what he knows, and what to ask him first

Every page in this knowledge base is written for one reader. Read this before planning any topic, paper or child page.

## Who he is
- An ML, AI and research engineer whose main interest is **training models**, who wants to be really good at his job. He reads the pages in Notion, on a laptop and on a phone.
- He learns best when he is **taught**, not briefed: define every term, give the intuition and a picture first, follow one running example, then the detail and the evidence. His words (2026-10-04): "you should be teaching me, I don't know what I don't know, so I can't make decisions about what to include".
- He distrusts unverified material: "don't trust the current content". Old Notion pages are notes to verify, not truth.
- He likes **animations**, above all before/after on the same input (his favourite is the DeepSeek MLA explainer: one input stepped through the new method and, with a toggle, through the method it replaced). See [../visuals/animation-types.md](../visuals/animation-types.md).
- He values completeness and solid evidence over speed, disk or usage (see "Standing preferences" below).

## Known baselines, by area (as he stated them; ask again if a topic is not listed)
| Area | Baseline he gave | Consequence for the page |
|---|---|---|
| Python | good working Python | Python is the reference column when teaching another language |
| PyTorch | uses it daily; asked for the PyTorch ecosystem internals from zero | map JAX and other frameworks to the PyTorch counterpart of every idea |
| C++ / Rust / JS / TS | C++ basics only; never used Rust or JS | teach "for Python people", with the false friends a Python programmer meets |
| Maths | "rusty, rebuild it": studied once, forgot most | start from vectors, derivatives, probability basics |
| Software engineering, system design | has served a model; has not built a backend API, used SQL in depth or run a service in production | start from what a server, a request, a database are |
| Databases | has not used SQL databases in depth | SQL from zero |
| Protocols, inference and serving | "use them, never studied" | from zero, starting from what he already runs |
| GPUs, CUDA | never written a kernel; no NVIDIA GPU access | simulators, published numbers, compiled output read on the Mac |
| Agents | uses Claude Code; agents taught from what an agent loop is | traces from his Claude subscription (`claude -p`), never an API key |
| RL, RAG, data curation, JAX, ML infra, generative and multimodal | from zero | from zero, all four goals |
| Operating systems | reads OSTEP; wants processes, memory, OS APIs, concurrency with an ML focus | systems-programmer depth plus ML practice, targeted Linux source reads |

His machine: an Apple M1 Pro laptop with 16 GB of memory (MPS GPU, shared by every agent), Docker Desktop when he approves it, no CUDA GPU. Resource rules: [../evidence/resource-safety.md](../evidence/resource-safety.md).

## The opening questions for every new topic
Ask these once, in one message, as short multiple-choice questions with a recommended default. Do not start building until they are answered. For a paper or a single child page under an existing root, the reader rules below already apply and usually no questions are needed.

1. **Starting level.** From zero / use it but never studied it / rusty / working knowledge. Ask what he has done hands-on (for example "served a model but never built an API").
2. **Goals.** Offer the four, phrased for the topic; he has picked all four on every topic so far:
   1. **Build** with it (run, write, train or deploy the real thing);
   2. understand the **internals** (what each component computes; the source read at pinned versions);
   3. **judge and debug** (read failures, logs and papers' ablations critically);
   4. **interviews and design** (design questions with trade-offs he can explain).
3. **Evidence allowed.** What may run, and where:
   - Mac, local only: open models, public data, no paid APIs or keys (the default);
   - Docker (he starts Docker Desktop and sizes its VM; the sandbox cannot);
   - the shared Mac GPU (MPS), one GPU job at a time;
   - his Claude subscription through `claude -p` for agent traces;
   - news: short, verified and in context only.
4. **Children.** How free you are with the old child pages: reuse, restructure, retitle, merge or retire (so far always "same freedom as before; propose with the root").
5. **Placement and overlap.** Which section the root goes under (for example Systems and performance), and, when live pages in *other* topics already cover part of it (search `technical_knowledge_base/pages.json` titles and folder names first), what happens to them: link them from the new root (the default), fold one in and retitle the old one "TO DELETE: ...", or deepen the existing page instead of making a new root. See [../page-kinds/migrate-or-fold.md](../page-kinds/migrate-or-fold.md).
6. **Review.** Review the root before it is published, or publish straight to Notion and review there; publish each child as it passes checks, or hold for review.

"Mac local only" means: anything that runs on this Mac (CPU, and MPS one GPU job at a time under the bench lock), open models and public data, no paid APIs or keys. Choose the machine-mode block in [../orchestration/briefs/common.md](../orchestration/briefs/common.md) from it: GPU if any lab needs MPS, CPU only otherwise, containers only if he allowed Docker.

Ask a topic-specific question only when the decision is genuinely his: a split into two roots (agentic harnesses and frameworks: "two roots, sharp split"), one page per language instead of eleven parts, whether Docker may run, which topic comes next.

## Teach, don't ask scope
- **Do not ask him** to pick the spine, the tabs, the labs or the child list on a topic he is learning. That pushes the expert's job onto the learner.
- **Decide** them yourself from research ([research.md](research.md)) and present them as a **teaching plan with reasons** ([curriculum.md](curriculum.md)): the spine, the running example, the sections, the labs and what each measures, the proposed children (titles, one line each, which old pages they reuse), and what you plan to retire.
- **Ask only** about genuine preferences: his goals, his starting point, his time budget, deletions, and anything irreversible.
- When a decision is his ("ask, don't assume", in CLAUDE.md): page deletions, old videos, a topic split, scope changes after approval. He deletes old videos and "TO DELETE" pages himself.

## Map every new idea to what he knows
- **Name the counterpart he already uses**: JAX's `grad` against `loss.backward()`, Flax NNX against `nn.Module`, Slurm's `srun` against `torchrun`, a Pallas kernel against a Triton kernel.
- **Reuse the domain he cares about**: a training job, an LLM request, a chat product, a tiny language model.
  - Spines that worked: "follow one training job through the OS"; "follow one LLM request on the wire"; "one app's data from a file to a fleet"; "follow one prediction through one training step".
- **Contrast with a reference column**: Python against C++, Rust and TypeScript, with the false friends a Python programmer meets in each (side-by-side comparison research: Rittle-Johnson and Star 2007; interference when learning another language: Shrestha et al., ICSE 2020).
- **Link the knowledge base pages he has already read** instead of re-teaching them. Search `technical_knowledge_base/pages.json` for neighbouring subjects.

## Standing preferences (apply without asking)
- **Roots are short.** A root is an intuitive overview plus definitions, about 15 to 30 minutes of Reading; depth lives on child pages. Flag a longer root to him ([../page-kinds/topic-root.md](../page-kinds/topic-root.md)).
- **No usage caps.** Never shrink agent work or runs to save his Claude subscription usage. Keep runs purposeful; waste (idle waits, sleep loops) is what to cut.
- **Completeness over disk.** Widen experiments rather than trim them for disk, raise the topic's disk budget, and clean finished scratch regularly.
- **Cheap runs over expensive ones.** Keep cheap runs that show a mechanism, a failure or a before/after. Before any run over about an hour, ask what he learns that the published number does not; if little, cite the published result and say "not run here" ([../evidence/local-runs.md](../evidence/local-runs.md)).
- **Do not crash the Mac.** A kernel panic on 2026-10-15 wiped the scratchpad ([../evidence/resource-safety.md](../evidence/resource-safety.md)).
- **Methods are suggestions.** The shapes in [../page-kinds/](../page-kinds/) record what he approved, not templates. Depart where the content needs it and say why in `src/README.md`.
- **Agents.** About four at a time. A multi-agent Workflow only with his explicit opt-in ([../orchestration/topic-pipeline.md](../orchestration/topic-pipeline.md)).

---
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 1d6d9d18, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)
