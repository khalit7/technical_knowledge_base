# Choosing the visuals

How to decide which visuals a page gets, where each goes, and how their numbers are made trustworthy. First apply the decision rule in [../teaching/teaching-contract.md](../teaching/teaching-contract.md) (what kind of concept is this: structure, process, change over time, parameter, replacement, real object, or plain text?); this file then picks among candidates of the right kind. Read it after the teaching plan exists ([../understand/curriculum.md](../understand/curriculum.md)) and before any part file is written.

## 1. Start from the content, not from a catalogue
- Read the page's subject and everything it leans on until you could teach it. A chart chosen before that is decoration.
- Write down, in one sentence, the question the subject keeps returning to (for Topic: llm-landscape: where the test-time budget goes and what a model costs to serve; for DeepSeek: what it costs to train and serve). A visual is worth building when it makes that question measurable.
- List the page's existing visuals and outbound links first (and the root's, the siblings' and the paper pages' when building a child), so new ideas do not repeat what exists and the page's own sources become the first places to look.
- Only then open [animation-types.md](animation-types.md) to pick a form.

## 2. The two most valuable kinds
1. **Recompute a published figure with one movable parameter.** Rebuild a number the source reports from its formula and configuration, let the reader move one input, and land the defaults on the published value (DeepSeek's Cache tab rebuilds KV memory for every attention design; the Compute tab does FLOPs per token).
2. **Lay the whole subject on one axis,** usually time (Lineage, release timelines, a model map's year sweep).

Both teach what prose cannot: a crossover where one cost overtakes another, a dominant term that changes as a parameter moves, a shape (a funnel, a pipeline bubble), a trajectory over years. And for mechanisms: **a before/after animation on the same input** ([animation-types.md](animation-types.md) type 1), which Khalid asks for often.

## 3. Score the candidates
Score each candidate 0 to 2 on:
1. Is there a quantity that changes with a parameter the reader controls?
2. Do the defaults reproduce a figure a source states? (counts double)
3. Can every input be computed from public data (papers, configs, code, pricing pages) rather than read off an image or guessed? (counts double)
4. Does it show something a sentence cannot?
5. Does it correct a known misconception (the $5.6M figure read as the whole cost of DeepSeek-V3; "one million tokens means an hour of anything")?
6. Does it measure the page's central question?
7. Is it absent from this page, its neighbours and the main existing explainers?
8. Does its form fit the kind of concept (a stepper for a process, an animation only when the change itself is the point, a before/after against the method it replaced)?

Subtract build cost. Ties go to the visual that links to more of the page's other tabs.

**Reject** a visual when it decorates, when a sentence says the same thing completely, when it shows a single number with nothing to move, when its data exists only in images, when it repeats something already shown on this page or a neighbour (link that instead), or when its subject belongs to another page. Record every candidate, its score, and every rejection with its reason in `src/viz_ideas.md`.

Pages that are not about mechanisms fit the scoring poorly: categorical facts (licences per checkpoint) become a checker or matrix read verbatim; on a data page the table is the main visual and keeps every field; a breadth page puts many small subjects on the same axes with an evidence column; a news issue earns one index visual (the week strip) plus a visual only where a headline hides a mechanism.

## 4. Placement follows scope
Every page has the same frame: **Reading** first (the explanation interleaved with the visuals needed to follow it), **one tab per visual that deserves room**, **Further reading** last. **The default is inline**: a visual that proves a claim sits beside that claim. The audit of 2026-10-23 found the strongest animations of most pages one click away in lab tabs while the Reading tab described them in words.
- **Own tab** when the visual answers "across all of X, how does Y change" (every model, every release, every config), or is a lab with several sections and controls.
- **Inside Reading** when it explains one mechanism at the moment the text introduces it.
- **Inside an existing tab** when it shares that tab's axis (the DeepSeek config diff shares the Lineage tab's set of models).
- **On a root** the Reading tab stays as short as it can while self-sufficient: one visual per idea at most, a "Go deeper" link per section; hands-on depth goes to the children. **On a child** the core carries what is needed to understand and the remaining detail sits in closed blocks.
- **One owner per concept**: before building, grep the knowledge base for the concept (`python3 html_utils/audit_pages.py <audit.jsonl> --concepts`). If another page owns it and already draws it, link to that page's tab instead of drawing it again; if this page should own it, say so in the report so the others can link here.
- Each fact is said once, where it is owned, and linked from elsewhere (`{{text|#t-tab}}` between tabs, `{{text|n:<id>}}` to other pages).

## 5. Numbers traced, not trusted
The HTML is the only content of the page, so every number in a visual is treated like a citation.
- Trace each figure to the source that first states it and record the link when you read it.
- **Recompute every proposed visual in a short script before proposing it** (`src/recompute.py` or the tab's own script). That is how DeepSeek V4-Flash's compute came out at 12% against the stated 10%; the tab shows the gap as an exposed assumption instead of hiding it.
- Label every number: published, measured (with the machine), derived (with the formula), illustrative, or unconfirmed.
- Say whether a default reproduces a figure **independently or by construction** (a split that matches because one input was back-solved from it is by construction).
- When two primary figures disagree, show both with the arithmetic behind each rather than picking silently. Check a source's rounding before calling a mismatch a contradiction; check a paper's tables for internal arithmetic; when text and table disagree, quote the table and say so.
- Headline ratios with unstated accounting (per layer against whole model) are shown under each accounting, naming the one that reproduces the headline.
- The page's JavaScript is checked against the script (same inputs, same outputs) as part of [../build/checks.md](../build/checks.md).

## 6. Never mix figure kinds on one axis
- Never join two metrics a source reports one after the other (monthly tokens across surfaces, then API tokens per minute): separate series, saying when each stops.
- Never splice benchmark or index versions; record the version and date beside every score; launch-day and current figures are separate panels.
- Measured-here results and published results sit apart and are labelled; vendor figures and independent measurements are visibly distinguished.
- Compare compute only at matched precision, stating dense or sparse on both sides; dollars, GPU-hours and FLOPs stay on separate axes unless a stated rate converts them.
- Speeds and latencies are dated measurements, not facts; a leaderboard re-run in place is two dated readings.
- Read values printed as labels on a figure (labelled "read from figure"), or decode vector figures calibrated on their gridlines; never read curves by eye.

## Where ideas come from (in this order)
Primary papers and reports (arXiv HTML, their tables and figures: the quantity the authors chose to plot is a hint); model cards and config files; official code repositories (diagrams of system behaviour, formula tables, small algorithms that port exactly); changelogs and pricing pages; visual explainers (to avoid copying them and to see which ideas readers find hard); interactive explainers and playbooks (interaction patterns that work: calculators, schedule tables, transformer explainers); analysts and trackers for independent series (Epoch AI, Artificial Analysis, METR, LMArena); videos last, for metaphors. Always search for critiques of the topic's best-known claims: a widespread misconception makes a good visual.

## Sources distilled
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 1d6d9d18, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)

`html_utils/interactive-html-ideas.md` section 2 (Methodology, all its rules) and section 1 rejection reasons; `html_utils/methods/topic_pages.md` (root against child scope, axis sections, Go deeper); `html_utils/methods/papers.md`; `html_utils/BRIEF_page_agent.md` (Steps, viz_ideas.md).
