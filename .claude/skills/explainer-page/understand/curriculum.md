# Curriculum: from understanding to a teaching plan

How to turn what you learned into a plan Khalid approves: the spine, one running example, what the root compares and what children own, which labs to build, what to measure, and how to propose children.

## The spine
Pick one sentence that the whole topic hangs on, usually a journey or a single object followed through the system. Spines that worked:

| Topic | Spine |
|---|---|
| swe-and-system-design | follow one request as the system grows from 1 user to 10M (an LLM product) |
| databases | one app's data from a file to a fleet (a chat product: users, chats, messages) |
| math | follow one prediction through one training step of a tiny next-token model |
| operating-systems | follow one training job through the OS |
| protocols | follow one LLM request on the wire (DNS, TCP, TLS, HTTP, SSE, auth, MCP) |
| rl | one target, many estimators |
| evaluation | eval as an instrument (layers, who grades, calibration, statistics, failure modes) |
| programming-languages | one program, four languages; philosophy-first design space with Python as the reference column |
| generative-and-multimodal | the topic's own order from zero (families, latents, diffusion and flow, the text-to-image system, encoders, VLMs, native multimodal, video and audio, evaluation, choosing), with the comparison axes in section 0's table |

When the topic is new to him, order the sections from zero (each term before it is used); use comparison axes as the organiser only when the things compared are already known. Two spines can combine (benchmarks: how to read a benchmark number, plus the families in brief).

## One running example
One small, concrete object every section, lab and child page uses, so before/after comparisons share an input and numbers line up across pages.
- **Small and runnable**: it trains or runs on the Mac in minutes (CPU, or MPS under the bench lock).
- **Public and licensed**: dataset URL, licence and sha256 recorded; open models with revision and licence.
- **Deterministic**: fixed seeds, splits and batch order, so a rerun reproduces it bit for bit where possible.
- **It exercises every lab**: its queueing, launch, failure and checkpoint I/O (ML infra); its functions for jit, grad and vmap, and its weights for sharding (JAX).
- **Defined once** by a setup agent in the root's `src/data/README.md` (shared code, manifest, smoke-test times); every lab and child reads it first.

Examples that worked:
- **JAX**: a tiny decoder LM written twice (PyTorch and Flax NNX) with identical weights, equal to float rounding over 500 steps.
- **Generative**: Fashion-MNIST for the tiny models, plus 16 fixed colour test images run through SD 1.5, CLIP, SigLIP 2 and SmolVLM.
- **ML infra**: a tiny GPT under DDP on gloo, submitted the same way to Slurm, kind and Ray, with identical loss on all three.
- **Others**: a Common Crawl slice with the same URLs in FineWeb and DCLM (data curation); SciFact (RAG); a small repo with two planted bugs (agent harnesses).

## Root breadth, child depth
- **The root owns** the comparison, every cross-cutting concept needed to read it, and data that spans all children: atlases, maps, benchmarks, prices.
- **A child owns** one specific thing in depth: a lab, a family, a stage, a technique, a tool.
- **A concept that explains an axis is not a child page**; it lives in the root. Khalid folded Mixture-of-Experts, reasoning models and release history into Topic: llms (now Topic: llm-landscape) for this reason. When a mechanism grows into a subject of its own it can move again: on 2026-10-18 the MoE tab became the Mixture of experts child of the new Topic: llm-architecture. When the children are stages or techniques, keep them as children and compare them on the root.
- **Neighbouring topics own their subjects**: list the live pages that own them (from `pages.json`) in the plan and in every brief, and link instead of repeating. Draw the line when two topics touch; for evaluation and benchmarks the line was "how do I measure my system" against "what is measured and how to read a score".
- **Prerequisites**: for the root and each child, list its strict prerequisites (live pages, or siblings, a reader cannot understand it without; transitively reduced) in the plan. They become each page's "You need" line and its `prereqs` in `pages.json`, which place it on the learning map.

## Labs: what to build and measure
A root usually gets three to six lab tabs plus one map tab (Tool map, Model map, Protocol atlas, Chip atlas): a filterable, dated table with status (alive, deprecated, archived), licence and a one-line verdict, plus a "which tool for which job" picker.

Each lab is one subject of the spine, run on the running example, with:
- **at least one before/after animation on the same input** where it fits: the same queue before and after backfill; the same noise through 1, 4, 20 and 50 sampler steps; the same weight matrix before and after sharding on a 2x4 mesh;
- **deterministic results first**: counts, compiled HLO, configs, logs, which job ran where, numerical equality. They need no caveat and are the bulk of a lab;
- **timings labelled rough** and repeated (shared laptop, threads, priority);
- **published numbers kept apart**: labelled, dated, checked against their tables; calculations from them labelled as calculations;
- **real code that ran**, its script kept in `src/<lab>/`, its output pasted from the run.

Before planning a run, ask what the reader learns that the published number or a cheap toy does not ([../evidence/local-runs.md](../evidence/local-runs.md)). Good reasons to measure:
- **see inside**: a jaxpr, a query plan, an attention map;
- **reproduce a failure**: a retry storm, a NaN, a scheduler stuck pending;
- **compare on one input**: DDPM against DDIM;
- **catch a published number that does not hold**: Mochi's 128x compression came out at 96.

Size each lab's embedded data from the start (whole root under about 1.5 MB; on the generative root each remaining lab was given 120 KB).

## Proposing children
Present the child list with the root plan or right after the root, as Khalid prefers (ask once).
- **Titles**: exact and descriptive, often "Subject: a, b and c" ("Slurm from zero: allocation, gang scheduling, fairshare and preemption"). The title in the folder README and `pages.json` is the one published.
- **One line each**: what it owns, how it goes deeper than the root's lab, its labs.
- **Reuse old pages**: name the old Notion page each new child reuses (retitled at publish). Name which old pages split ("Deep RL" became value-based and policy-gradient children), merge, fold into the root, or become "TO DELETE" after a coverage check ([research.md](research.md)).
- **Count**: six to twelve so far; what the subject needs, not a target.
- **Neighbours**: say where a child stops and a neighbouring topic's page starts.
- **Handoffs**: when a child depends on another's results, say so, so the order can be planned (Distributed systems wrote handoff notes for Queues and Reliability).

## The teaching plan you present
Keep it to one screen:
1. **Reader**: his answers (level, goals, evidence allowed).
2. **Spine**, in one sentence, and the running example.
3. **Reading sections** in order, one line each, with the target reading time (root: 15 to 30 minutes).
4. **Lab and data tabs**: what each shows and measures, and the before/after it animates.
5. **Children**: titles, one line each, reused or new, plus folds and deletions.
6. **Evidence plan**: what runs where (CPU, MPS one job at a time, Docker), what stays published only, and disk.
7. **Reasons**: one or two lines on why this spine and this split.

Then build the root first. Children are built after he approves the root unless he says otherwise ([../orchestration/topic-pipeline.md](../orchestration/topic-pipeline.md)).

---
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 1d6d9d18, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)

Sources distilled: html_utils/methods/topic_pages.md (who owns what, folding, shapes); html_utils/interactive-html-ideas.md section 2 (central question, placement); memory teach-dont-ask-scope, cheap-runs-over-expensive and the rl, swe, databases, math, os, protocols, proglang, evaluation, benchmarks, rag, dc, jax, mi, gm, gpu and agents topic logs; kb_briefs gm/mi/jx/dc common, tabs and child briefs (running example, labs, child lists).
