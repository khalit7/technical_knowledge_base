# Editorial rules for an update

How new material enters a page so the knowledge base reads like a reference, not a mailing-list archive. Distilled from the Notion update-KB skill (deleted 2026-10-19), whose rules came from full audits of the knowledge base; the Notion-only parts (page text shape, mentions, the Visuals, Updates and Tracker databases) are gone because pages are now built here.

## Three layers: intake, knowledge, history
- **Tech news is intake.** Dated releases and industry news land in the issue first.
- **Topic and child pages describe the current state of knowledge**, not how it arrived.
- **History** is the issue, git, and the freshness row's notes. Nothing else.

## Integrate, never append
**A page must read as though its current state had always been true.** A first-time reader should not be able to tell which sentence was written this week.
- No dated additions: not "Added 2026-09-21", not "Update:", not a section at the bottom holding this week's news, not a dated bullet on a list. If the page discusses the thing, revise the passage; if not, write it where it belongs.
- **A volatile fact is a dated reading, not an addition.** A version, price, availability, leaderboard reading or incident goes in the provider page's dated lineup table, or in a closed `<details>` whose summary carries its read date ("as of 26 October 2026"; on a paper page "Since the paper (checked <date>)"), rewritten in place each run; or only in the issue. Never as present-tense core prose ("now", "the latest", "currently"). Core keeps the durable lesson the reading illustrates (teaching contract, `volatile` label).
- When new material supersedes something, rewrite the old passage. Never leave both accounts.
- A date inside a sentence is fine when it is part of the fact ("shipped in September 2026"); "added September 2026" is bookkeeping.
- No notes to a future editor in page prose. Do the work now.
- The test: read the paragraph with the date removed. If it stops making sense, you appended.

## When something new arrives, the map moves too
The commonest defect: a child page knows about something its root has never heard of, or the reverse. For every addition ask: **which sentence elsewhere in the knowledge base is now untrue?** Then fix:
- the root's map or taxonomy (a new family or category may rename or move others);
- summary and "state of play" claims ("the frontier is close", "everything at scale is sparse MoE");
- every table or list that enumerates things: adding the row is part of the edit;
- pages that compare ("X is the fastest") if the newcomer changes the answer;
- links both ways (`{{text|n:<id>}}` up to the root and down to the child).

## Say a thing once, on the page that owns it
- A root is not a second copy of its children: one orienting sentence per child, the distinctions only visible across all children, and a link. The depth lives on the child.
- One page owns a mechanism; others name it and link. Generic mechanism above, provider- or lab-specific detail below.
- Two roots must not map the same ground; decide which through-line each carries.
- **Move, then cut.** Before deleting a duplicate passage, check the owner carries every clause of it, caveats included.
- Owners are listed in [../../../technical_knowledge_base/OWNERS.md](../../../technical_knowledge_base/OWNERS.md); look there before writing.
- **A paper's method, numbers and evidence belong to its paper page** (OWNERS.md, Reference). A concept page states the result in a sentence or two, with the paper's scope (model, size, runs), and links the paper rather than retelling its numbers.

## The rule that explains most staleness
**A fact on the root but not on the child that owns the subject is a staleness bug on the child.** Updates land on the root because it is the page being edited, and nobody goes back down. Every edit has a second half: open the owner and make it true there. Past examples: a root covered a new model generation while the provider page still called the old one current; a root had a new benchmark version while the benchmark's own page called the old one current.

## Dates: content or bookkeeping
- **Keep**: a date that qualifies a volatile fact ("last verified 2026-08-24 on PyTorch 2.13"), a source attribution.
- **Delete**: a date describing the page's own editing.
- **Never put a month in a heading** ("What to use in Aug 2026"): the heading dates the whole section silently. Data cards say "Data as of <month year>" in the header only.

## A number travels with its harness
A score moves with its harness, split, date and reporter, or not at all (the same model on the same benchmark was 37 points apart through two harnesses).
- A benchmark name without a version becomes a false claim at the next version; when a version resets the scale, say so at the first stale figure.
- Cite what a number measures, with its denominator and definition in the same sentence.
- When a vendor claims a record, record which quantity it won (smallest active parameters is not highest sparsity ratio).

## Claims that rot without anyone editing them
- **A superlative is a dated statement wearing no date.** Give it its scope in the same sentence ("the top open-weight model on the aggregate indices").
- **Close the window on present-tense claims**: "left through the summer of 2026 with no patch", not "still unpatched".
- **No forward-looking dates** ("scheduled for 26 August", "weights promised by 4 November"), in core or in a dated block: prefer "the current line is X" plus a fact that dates itself.
- **Adoption as evidence, not trajectory**: "used in Kimi K2 and shipped in optax", not "landing in mainstream frameworks".
- **A mitigation names what defeats it.**
- **A saturation claim names the population** that saturated.
- **A diagram ages like prose**: anything a page enumerates is reviewed when the prose moves.

## What a currency pass must sweep
Release-driven intake is blind to everything without a product name. The largest gaps ever found were of that shape: an acquisition, a hardware generation becoming purchasable, a licence change. Sweep **ownership, price, licence and availability** as their own category. Two cheap checks:
- Does each child name the same latest version its root does?
- Does the root's pointer (gloss, reading time) still describe the child?
A "current as of version X" line names the changelog that would falsify it.

## Two rulings
- **Interview rehearsal** is optional and lives only in a closed block (teaching contract, 2026-10-23); an update never adds a summary section that restates the core.
- **Do not expand acronyms the reader owns** (LLM, GPU, API, NLP, RAG); expand what a specialist in a neighbouring field would not know.

## Writing for the reader
The page shape, length judgement and choice of visuals are in [../explainer-page/teaching/teaching-contract.md](../explainer-page/teaching/teaching-contract.md); an update follows it like any other edit (a new mechanism gets its visual on the page that owns it, inline).

An MSc-level AI engineer with production LLM experience; most fat comes from writing below that.
- Define a shared concept once, on the page that owns it.
- Keep a superseded model only for the idea it introduced, never as a chronicle.
- State a trade-off compactly: "it buys X and costs Y".
- Cut wind-ups: "It is worth noting that", "The intuition is that", "One key thing to understand is".
- No em-dashes; the rest of the house style is [../explainer-page/teaching/writing-style.md](../explainer-page/teaching/writing-style.md).

## Checks before publishing an update
- Durable knowledge went into its owning page (OWNERS.md), not only into the issue; other pages carry one sentence and a link. Volatile facts sit in the provider page's dated table or a dated closed block, never in core prose; no forward-looking dates anywhere.
- Paper claims (issue items, concept pages, takeaways) carry the paper's scope: model and size, runs, metric, matched comparisons, a theorem's conditions.
- No bookkeeping dates; no month in a heading.
- The root's map, tables and summary claims still tell the truth; children name the same latest versions as their roots.
- A page with a video says what the video now misses.
- Every changed page: header "Reading: N min, plus M in closed details." measured with `audit_pages.mjs` (230 words a minute); `ledger.py check` problems 0 where it has a ledger; `checkpage.sh` `fail=0`. Then `check_times.py --fix`, the pages it touched rebuilt, its AMBIGUOUS lines reported.
- Every new link resolves to a page in `pages.json` that is not retired.
