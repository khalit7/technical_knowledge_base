# Page kind: a child page of a topic

The depth on one specific thing (a lab or model family, a stage, a technique, a tool, a language), going deeper than the root without repeating it. A suggestion, not a template: say any departure and why in `src/README.md`.

Reference children:
- `technical_knowledge_base/models_and_training/topic_generative_and_multimodal/diffusion_from_zero/`: reuses the root lab's checkpoint, adds three labs;
- `.../topic_llms/deepseek/`: the MLA before/after explainer;
- `.../topic_llm_training_and_post_training/distributed_training/`: one training step under nine parallelism schemes.

## What it is for
The reader's question: **"how does this work, exactly, and what is the evidence?"** A child owns every detail of its subject: mechanisms, formulas, configs, numbers, history, common mistakes. Nothing is cut; each fact is said once and clearly.

## Read before you write
1. **The parent root**: its `index.html` and `src/`, especially:
   - the shared running example in `src/data/README.md`;
   - each lab's `README.md`, `facts.md` and recorded `out/`;
   - the Reading notes.
2. **The topic's shared `FACTS.md`** and the known findings in your brief. Never contradict them; append what you verify, and copy it into your own `src/facts.md`.
3. **The siblings already built**, and the paper pages in `technical_knowledge_base/reference/papers/` on the same mechanism. Where a live toy or animation exists (DPO, GRPO, LoRA, NF4, ZeRO, pipeline, RoPE, DDPM, CLIP), link it and build what is missing.
4. **The paper pages' verified facts**, not the old page's: they carry corrections.
5. **The old Notion page this child reuses**, if any, saved verbatim: unverified notes, the floor of what to carry ([migrate-or-fold.md](migrate-or-fold.md)).

## Who owns what
- **Do not repeat the root.** Link its grid, axis sections and lab tabs by name: a Notion link to the root, naming the tab ("see the root's Diffusion lab").
- **Do not rebuild the root's animations.** Go deeper than the lab on your subject.
- **Reuse the lab's recordings, checkpoints, seeds and scripts.** When you measure what a root lab measured, the numbers must agree. Reproduce one or two of the lab's numbers first to prove it.
- **Do not repeat siblings or neighbouring topics.** Link them by id. Until a sibling has a Notion id, name it in plain text and list those mentions in your report for the wiring pass.
- **Do not edit the root's or siblings' files.** Put what they should change in your report (it feeds the root fix list), with the evidence.

## Shape that worked
- **Reading tab** organised by the subject's own logic:
  - an "in one screen" summary or comparison table first;
  - the mechanisms in order, from zero for this subject;
  - what is in production now (real configs and recipes);
  - common mistakes with real errors;
  - interview questions including a design one.
- **One tab per standalone visual that deserves room**, named for what the reader does:
  - a calculator (Layout calculator, Trainable parameters);
  - a lab or workbench (Sampler workbench, Sampler lab, Alert lab);
  - a dataset view (Twelve decoders, One real layer, Case gallery);
  - a tree (Method family tree);
  - a toy run (Anneal a toy);
  - an explorer or decoder (Pending-reason decoder, Divergence hunter).
- **Further reading** last: the parent root and its tabs, siblings, paper pages, neighbouring topics, the best resources, each timed.
- **Variation (programming-languages, 2026-10-05)**: one page per language holding several parts, with a part bar ("Start here" plus parts) and per-part tabs, because Khalid wanted one Notion page per language with all parts' content kept.

## What makes a child page good
- **Research beyond the old page.** The old page is the floor (every fact carried, in `src/coverage.json`). Each claim is checked against primary sources: papers, model cards, `config.json` files, library code at pinned versions with `file:line`, vendor docs. Corrections go in visible boxes; what cannot be sourced is marked unconfirmed.
- **Real data over illustrative data**: real logits from a small open model, a real layer's weights, a real chat template on real conversations, real configs from many families, real `slurmctld` logs, real `EXPLAIN ANALYZE` plans. Small extracts go in `src/inputs/` (under 1 MB each); large downloads stay in scratch.
- **Toys when they show a mechanism.** A toy is welcome when:
  - it makes a mechanism visible;
  - it fills a missing cell of a published ablation (the Pretraining page's anneal toy, with several seeds and its departures said plainly);
  - it has a known answer to compare against.
  
  Say what the toy cannot test.
- **Reproduce published numbers** from the page's formulas, independently or by construction, and say plainly where they do not reproduce (Llama 3.1's rope scaling; Gao et al.'s RL fit). The page's JavaScript is checked against a Python recompute script.
- **Animations of the mechanism on one input, before/after**:
  - one training step under nine parallelism schemes;
  - one block of real weights through five quantisation scopes;
  - one preference pair through eight losses;
  - top-p against min-p on a real distribution;
  - the same noise through each sampler.

## Size and time
- **Page size**: about **1 MB**, images as small WebP data URIs; say why if more.
- **Reading time**: usually 25 to 55 minutes, because a child owns its details. Measure it and state it; flag a very long one to Khalid in the report (jax_core: 55 min). Fold secondary material into closed `<details>` blocks counted apart.
- **Children of one topic** run several at once ([../orchestration/topic-pipeline.md](../orchestration/topic-pipeline.md)). A child that depends on a sibling's results reads that sibling's handoff note (`handoff_<sibling>.md`), or waits for it.

## Scaffold notes
- **Copy from the root's `src/`**: `build.sh`, `01_head.html` (set `<title>` to the page title), the error box, `21_js_rd_common.js` and `99_js_tabs.js` (change the storage key to the page's own).
- **Write your own** `10_header.html`: h1 is the title; `.sub` is a one-line subtitle with "Data as of <month year>"; then the tab bar.
- **Prefix** every id, class and data attribute with the page's short prefix.
- **Reading parts** start at `20_read_a.html` ([../build/scaffold.md](../build/scaffold.md)).

## Report back
- What you built and the runs made.
- Sources, check results and reading time.
- Old-page corrections and coverage counts.
- Sibling mentions to wire.
- Suggested changes for the root (the root fix list), for siblings and for `FACTS.md`.
- Runs still pending, with their commands and time estimates.

## Lessons (dated)
- **2026-10-03**: judge periodic angles modulo a turn (RoPE "unseen pairs" were overcounted without it).
- **2026-10-03**: when a figure gives fitted coefficients only as plotted dots, reading the dots with a stated precision is acceptable if labelled "read from figure"; curves are still never read.
- **2026-10-03**: with generated model text (GPT-2 at high temperature), filter what is displayed, keep it in the measures, and say so on the page.
- **2026-10-04** (swe): hold a page whose quotes were summarised until they are rechecked word for word. When one child finds a bug in another's lab code (a stuck idempotency key after a crash), report it for the fix pass.
- **2026-10-04** (benchmarks): reading times quoted in siblings go stale; update them at the wiring pass.
- **2026-10-14** (rag): when an upstream lab's run is found flawed (a prompt silently replaced by the default), every child that used it recomputes its dependent comparisons after the rerun.
- **2026-10-15** (jax): a child can find an error in the root's lab ("steps as large as lr" was 2.3e-10 against 2.0e-5). Measure it and send it to the root fix list rather than repeating the root's claim.
- **2026-10-17** (generative): check peak memory on one item before looping a pretrained model; an fp32 VAE round trip peaked at 9.9 GB. Run long GPU work as a queued script with a finish list, so the page can be completed after the runs ([../evidence/resource-safety.md](../evidence/resource-safety.md)).
- **2026-10-17** (generative): two children measuring the same thing differently (SigLIP 2 outlier token positions) must reconcile before publishing; preprocessing is the usual cause.

---
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 9ee6d1ea, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)

Sources distilled: html_utils/methods/topic_pages.md Part B (ownership, shape, what makes a child good, lessons); html_utils/BRIEF_page_agent.md (Rules learned on the training topic); kb_briefs gm/mi/jx/dc/rag child briefs (state of the parent, siblings, scaffold, page quality, report); memory swe, benchmarks, rag, jax, gm, proglang and training topic logs; the diffusion_from_zero src/README.md.
