# Choosing the visuals

How to decide which visuals a page gets, where each goes, and how their numbers are made trustworthy. First apply the decision rule in [../teaching/teaching-contract.md](../teaching/teaching-contract.md) (what kind of concept is this: structure, process, change over time, parameter, replacement, real object, or plain text?); this file then picks among candidates of the right kind. Read it after the teaching plan exists ([../understand/curriculum.md](../understand/curriculum.md)) and before any part file is written.

## 1. Start from the content, not from a catalogue
- Read the page's subject and everything it leans on until you could teach it. A chart chosen before that is decoration.
- Write down, in one sentence, the question the subject keeps returning to (for Topic: llm-landscape: where the test-time budget goes and what a model costs to serve; for DeepSeek: what it costs to train and serve). A visual is worth building when it makes that question measurable.
- List the page's existing visuals and outbound links first (and the root's, the siblings' and the paper pages' when building a child), so new ideas do not repeat what exists and the page's own sources become the first places to look.
- Only then open [animation-types.md](animation-types.md) to pick a form.
- 2D or 3D, and where it sits (the split layout): [../teaching/teaching-contract.md](../teaching/teaching-contract.md) is the rule.

## 2. The two most valuable kinds
1. **Recompute a published figure with one movable parameter.** Rebuild a number the source reports from its formula and configuration, let the reader move one input, and land the defaults on the published value (Long context's KV-cache calculator tab rebuilds KV memory for any config; the LLM architecture root's Config calculator does parameters and FLOPs per token).
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

**Reject (and on a rebuild, remove) a visual whose every fact is already stated in the step list or prose beside it, and never draw a figure another page owns** (link to the owner, `technical_knowledge_base/OWNERS.md`). Before removing one, move any number that appears only in it into the caption. Keep: real or recorded data, a reproduced or contradicted published figure, labs with more than one control, predict-then-reveal, to-scale structure or a crossover, the page hero, and the concept owner's visual. The score above orders candidates; it is never a removal criterion on its own. The AI buddy can draw an extra picture for one reader on demand, so an authored visual must teach something the page needs for every reader; authored visuals stay the record (sourced, checked, real data).

Pages that are not about mechanisms fit the scoring poorly: categorical facts (licences per checkpoint) become a checker or matrix read verbatim; on a data page the table is the main visual and keeps every field; a breadth page puts many small subjects on the same axes with an evidence column; a news issue earns one index visual (the week strip) plus a visual only where a headline hides a mechanism.

## 4. Placement follows scope
Every page has the same frame: **Reading** first (the explanation interleaved with the visuals needed to follow it), **one tab per visual that deserves room**, **Further reading** last. **The default is the Reading flow**: a visual that proves a claim sits beside that claim, in the right column of its section (split layout).
- **Own tab** when the visual answers "across all of X, how does Y change" (every model, every release, every config), or is a lab with several sections and controls.
- **Inside Reading** when it explains one mechanism at the moment the text introduces it.
- **Inside an existing tab** when it shares that tab's axis.
- **On a root** the Reading tab stays as short as it can while self-sufficient: one visual per idea at most, a "Go deeper" link per section; hands-on depth goes to the children. **On a child** the core carries what is needed to understand and the remaining detail sits in closed blocks.
- **One owner per concept**: before building, grep the knowledge base for the concept (`python3 html_utils/audit_pages.py <audit.jsonl> --concepts`). If another page owns it and already draws it, link to that page's tab instead of drawing it again; if this page should own it, say so in the report so the others can link here.
- Each fact is said once, where it is owned, and linked from elsewhere (`{{text|#t-tab}}` between tabs, `{{text|n:<id>}}` to other pages).

## 5. Numbers traced, not trusted
Every number in a visual is sourced and labelled as [../evidence/sourcing.md](../evidence/sourcing.md) says (independently or by construction, disagreements shown, tables over prose).
- **Recompute every proposed visual in a short script before proposing it** (`src/recompute.py` or the tab's own script). That is how DeepSeek V4-Flash's compute came out at 12% against the stated 10%; the tab shows the gap as an exposed assumption instead of hiding it.
- The page's JavaScript is checked against the script (same inputs, same outputs) as part of [../build/checks.md](../build/checks.md).

## 6. Never mix figure kinds on one axis
- Never join two metrics a source reports one after the other (monthly tokens across surfaces, then API tokens per minute): separate series, saying when each stops.
- Launch-day and current figures are separate panels; a leaderboard re-run in place is two dated readings; speeds and latencies are dated measurements, not facts.
- Measured-here results and published results sit apart and are labelled; vendor figures and independent measurements are visibly distinguished.

## Where ideas come from (in this order)
Primary papers and reports (arXiv HTML, their tables and figures: the quantity the authors chose to plot is a hint); model cards and config files; official code repositories (diagrams of system behaviour, formula tables, small algorithms that port exactly); changelogs and pricing pages; visual explainers (to avoid copying them and to see which ideas readers find hard); interactive explainers and playbooks (interaction patterns that work: calculators, schedule tables, transformer explainers); analysts and trackers for independent series (Epoch AI, Artificial Analysis, METR, LMArena); videos last, for metaphors. Always search for critiques of the topic's best-known claims: a widespread misconception makes a good visual.
