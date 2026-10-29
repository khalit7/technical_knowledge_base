# Page quality: the from-zero teaching checklist

What every page must do to teach, whatever its kind, and the questions to ask of a draft before reporting it. [teaching-contract.md](teaching-contract.md) comes first: the page shape (core idea, hero figure, core, depth), length judged per page with the knowledge ledger, and the visual decision rule. Where this file and the contract disagree, the contract wins.

## The checklist
- **Define every term at first use.** No term appears before it is explained. A glossary does not replace the definition at the point of use.
- **Intuition and a picture before detail.** One sentence of "why this exists", a picture or animation, then the mechanism, then the formula, then the evidence.
- **One running example throughout.** The same model, dataset, request or job in every section ([../understand/curriculum.md](../understand/curriculum.md)). Prefer the example to a list of cases.
- **For each idea, the questions that matter for it**, not all of them by rote: the **problem** it solves, **how** it works, what it **costs**, **when** it matters, **how to check** it (a command, a metric, a log line, a test).
- **Predict-then-reveal drills** where intuition usually fails ("will this recompile?", "which sampler wins at 4 steps?"). Give options, a skip link, and a reveal that runs or shows the real result. Two or three per page or tab is typical.
- **Common mistakes, real ones, only when they teach** something the core does not already show. Real error messages, real bad outputs and real misconfigurations from the runs, not invented ones. Examples: SD 1.5's VAE without its scaling factor; a sampling loop without `no_grad` reaching 20 GB; `sbatch --export` killing `slurmd`.
- **Interview questions are optional**, in a closed `<details>` block when they add a design angle the page lacks ("shard a 70B model on a v5p pod: what mesh and why").
- **A picture for every core idea, chosen by what the concept is** ([teaching-contract.md](teaching-contract.md)): a static diagram for structure, a stepper for a process, an animation only when the change is the point, a before/after when a method replaced another ([../visuals/animation-types.md](../visuals/animation-types.md)). Visuals sit inline, beside the claim they prove.
- **Real code that ran.** Code shown on the page is the script that produced the numbers (kept in `src/`), with its real output pasted and scrubbed.
- **Map to what he knows**: the PyTorch counterpart, the Python reference, the training job ([../understand/reader.md](../understand/reader.md)).

## Evidence on the page
- **Every specific fact is sourced inline** and dated; derived numbers show their formula; illustrative inputs are labelled ([../evidence/sourcing.md](../evidence/sourcing.md)).
- **Measured results say where** ("measured on Apple M1 Pro (MPS)", "Docker Desktop VM, shared machine") and **what transfers** to a datacenter GPU or a real cluster, and what does not.
- **"Not run here"**, with the reason, for anything quoted but not run (cost, hardware, time).
- **Corrections in visible boxes** (Correction, Checked, Unconfirmed), never silently rewritten. A page that corrects its own lab or an old claim says so.
- **"Defaults reproduce X (source), independently or by construction"** beside any tool whose defaults land on a published figure, and a plain "does not reproduce" box where they do not.

## Shape on the page
- **Open with the answer.** The core idea in one sentence and the hero figure, then the "in one screen" summary or comparison table; a paper page with a headline card and verdict; a root with its map and the comparison in one screen. Where the subject is taught from zero, the opening still states where it ends up; the from-zero order starts after it.
- **Each fact said once**, in the place that owns it. Elsewhere, link to it: a tab link `{{text|#t-tab}}`, or a Notion link to the page and tab that owns it.
- **Nothing important is lost**: an existing page is condensed with the knowledge ledger ([teaching-contract.md](teaching-contract.md)); only units labelled fat are deleted.
- **Secondary material** (long derivations, per-item tables, appendix detail) goes into closed `<details>` blocks; their reading time is reported separately.
- **Further reading last**:
  - the parent root and its tabs, siblings, paper pages, neighbouring topics and the best outside resources;
  - each a working link (`target="_blank" rel="noopener noreferrer"`; Notion pages as `https://app.notion.com/p/<id>`) with a time estimate;
  - dated, with vendor and independent labelled.

## What to avoid
- A list of facts where an example would teach.
- Illustrative data where real data exists: real logits, real configs, real weights, real logs.
- A toy that does not show the mechanism. Toys are welcome when they show a mechanism, complete a published experiment, or give a known answer ([../evidence/local-runs.md](../evidence/local-runs.md)).
- A chart with nothing to move, a visual that repeats another page's, or one whose data exists only in images ([../visuals/choosing.md](../visuals/choosing.md)).
- Price-history, business-ledger, training-bill or compute-across-generations tabs, unless the page truly centres on them (Khalid removed them from DeepSeek).
- Rebuilding what a sibling, the root or a paper page already animates: link it and build what is missing.
- Long idle prose on history. A lineage stays only when the order explains the design, and then short.
- Writing below the reader: re-teaching what he already knows, wind-ups, recaps of the section just read.

## Before reporting a page, ask
1. Could Khalid, starting at his stated level, follow every section without looking anything up?
2. Does the top give the core idea and a hero figure within two minutes, and does every core idea have a picture beside it?
3. Could any paragraph be cut, collapsed or replaced by a caption without losing understanding? Does every number have a source and a date?
4. Does `html_utils/ledger.py check` pass (an existing page), and is every correction visible?
5. Do the numbers agree with the root's labs, the siblings and the topic's `FACTS.md`, and is each concept drawn only on the page that owns it?
6. Is the reading time measured and stated, with the per-page length judgement in `src/README.md`?
7. Do the checks pass ([../build/checks.md](../build/checks.md)), and have you looked at the screenshots?

---
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 1d6d9d18, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)
