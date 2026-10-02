# Method: root Topic pages

Approved on Topic: llms (rebuilt 2026-10-01; reference folder `technical_knowledge_base/models_and_training/topic_llms/`). A suggestion, not a template: read `README.md` in this folder first.

## What the page is for

A root `Topic: *` page is a **high-level comparison along a few axes**, plus the definitions needed to follow it. Its child pages are **in-depth dives into specific things** (on Topic: llms, one lab or model family each). The reader's question is "how do these compare, and on what?"

## Who owns what

- **The root owns:** the comparison; every cross-cutting concept needed to read an axis; data that spans all the children (benchmarks, releases, prices).
- **A child page owns:** one specific thing in depth (a lab, a family, a system).
- **A concept that explains an axis is not a child page.** It lives in the root. Khalid folded three child pages into Topic: llms for this reason: Mixture-of-Experts, Reasoning models and test-time compute, and LLM release history. Before a child page is created, ask whether it is a "specific thing" or a concept the comparison needs.
- **Folding a page in:**
  - Rewrite it into the root; do not add it as a tab. Khalid: "integrated in even if this means a full re-write of the main page".
  - Repoint every sibling page that linked to it (to the root, naming the tab), remove its folder and manifest entry, and mark its Notion page "TO DELETE: ..." with a line saying where its content went. Khalid deletes it.

## Shape that worked

- **Reading tab, organised by the axes**: the comparison in one screen, then the labs or things compared, then one section per axis (Topic: llms: where the thinking goes, what it costs to serve, how open it is), then history ("How we got here"), cost, reading the numbers, common mistakes, choosing.
  - **Each axis section** carries the comparison-level part of every concept it needs: what differs between labs, trade-offs, which one when. It ends with a "Go deeper (optional)" note (`.deepnote`) naming what the deeper tab adds.
- **Data tabs that compare everything:**
  - **Benchmarks**, the one Khalid stressed: a dense grid of the current models on a fixed set of benchmarks, on independent runs first (Artificial Analysis, ARC Prize, Epoch, LMArena), lab-reported figures shown only where no independent run exists and visibly flagged. Every cell has its version, its date and who ran it; never splice benchmark versions. Sortable, filterable, with a "compare 2 or 3 side by side" mode. Conflicting independent and lab figures sit side by side in the cell detail.
  - **Capability against price**, and **Release history** (timeline, sourced table, sizes, firsts, cadence, one shared filter set).
- **Optional deeper dives**: a tab per folded-in mechanism ("Deeper: test-time compute", "Deeper: inside an MoE"), set apart in the tab bar under an "Optional deeper dives" label. Each opens with a note saying which Reading section it extends, with a link back. It holds the maths, the mechanism animations, the simulators, and the parameter recounts from config files.
- **Further reading** last: deeper-dive tabs, child pages, neighbouring topics, papers, best resources, each with a time estimate.

## Things to keep

- **Animations:** at least one before/after animation per axis where a mechanism replaced another (dense against MoE at equal compute; one long chain against many short ones).
- **Each fact said once:** say a fact once in the place that owns it, and link to it from elsewhere (in-page tab links, `data-tab`).
- **Size:** Khalid accepted going over the 300 KB guideline when folding pages in (Topic: llms is about 544 KB). Say so when it happens; do not cut knowledge to meet it.
- **The narrated video:** it may describe the old page. Leave it, and ask Khalid when the page is done.

## Lessons

- 2026-10-01: build the folded-in tabs in parallel (one subagent per tab, each owning only its own part files, CSS scoped under its tab id, element ids prefixed), with the root's Reading tab written last by one hand from their drafts. Give the build script per-tab slots so parallel work does not collide.
- 2026-10-02: chart labels drawn in SVG at a fixed width clip at phone width. Lay charts out by the measured container width and put long captions in HTML (`clipcheck.mjs` now catches this).
