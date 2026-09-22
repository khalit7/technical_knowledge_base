---
name: kb-update
description: Add to, edit or reorganise the technical knowledge base, including the weekly research pass: placement, page shape, integrating rather than appending, and what else has to move when something new arrives.
---

# Update technical knowledge base

*Mirrored from Notion, where it is the source of truth. Edit it there:*
*Me -> _AI -> Skills -> Update technical knowledge base. Changes here are overwritten by the next sync.*
*This copy is the page as Notion last edited it, 2026-09-22 07:39:00 UTC. A procedure*
*that has moved on since then has moved on in Notion first, so if anything here*
*contradicts what the tools actually do, re-run the sync before trusting this file.*
*The copy your skill loader served you can also be behind this file: if you were told*
*something is true of this run and cannot find it here, read the file on disk and*
*`git log` it before concluding it is not so.*

Add to, edit or reorganise the Technical knowledge base, including the weekly research pass: where material goes, what shape a page takes, how an update is integrated rather than appended, and what else has to move when something new arrives.

## Use when

Anything changes in the Technical knowledge base: a weekly research pass, an ad-hoc "explain this and add it", a new paper, a correction, or a reorganisation. One skill, because a weekly sweep and a one-off addition do exactly the same work and have to obey exactly the same rules.

## Read first

[Instructions](../../INSTRUCTIONS.md), which holds what is true for every task.

## Source of truth and scope

This workspace is the source of truth. A GitHub mirror exists and [Sync the knowledge base mirror](../kb-sync-from-notion/SKILL.md) manages it; that is never this skill's responsibility, and paper PDFs may live only there.

## The model

Keep the hierarchy shallow. Category names on the knowledge base root are headings, not container pages.

- **Topic pages** hold the current taxonomy, mental map, synthesis and links to deep dives.
- **Deep dives** hold focused explanations and resources.
- Papers holds one row per paper; the row opens to the full summary.
- Tech news holds weekly news. Updates is the only changelog. Tracker holds structured reading state.
Put new material into the most relevant existing topic whenever possible. Create a new topic only when no existing topic fits, and only when the body of durable knowledge justifies it rather than because one or two news items lack a home.

## Three layers: intake, knowledge, history

Material sits in exactly one layer.

- **Tech news is intake.** Dated releases and industry news land there first.
- **Topic and deep-dive pages describe the current state of knowledge**, not the history of how it arrived.
- **Updates is the changelog.** Records of what was edited belong there.

## Integrate, never append

This is the rule that decides whether the knowledge base reads like a reference or like a mailing list archive, and it is the one most often broken under time pressure.

**A knowledge page must read as though its current state had always been true.** Somebody arriving for the first time should not be able to tell which sentence was written this week. That means:

- **No dated additions on knowledge pages.** Not "Added 2026-09-21", not "Update:", not a new section at the bottom holding this week's news, not a bullet appended to a list with a date on it. If the page already discusses the thing, revise the passage. If it does not, write it into the place where it belongs.
- **When new material supersedes something, rewrite the old passage.** Do not leave both accounts and let the reader work out which is current.
- **The date lives in **Updates, in the page's own "last updated" line, and in Tech news. Those three places carry all the history anyone needs.
- **A date inside a sentence is fine when it is part of the fact.** "Shipped in September 2026" is content. "Added September 2026" is bookkeeping, and bookkeeping does not go on knowledge pages.
- **Do not leave notes for a future editor** in page prose, such as "add a row when this is next revised". Do the work now, or record it in Updates.
The test: read the paragraph you just wrote with the date removed. If it stops making sense, you appended instead of integrating.

## When something new arrives, the map moves too

A new model, tool, technique or result almost never touches only one paragraph. The commonest defect in this knowledge base is a detail page that knows about something the topic page above it has never heard of.

So whenever material is added, walk up and fix what it invalidates:

- **The topic page's taxonomy diagram.** If a new family, layer or category appeared, it belongs in the diagram, and something else may need to move or be renamed.
- **The topic page's summary or "state of play".** These are written as claims about the present ("the frontier is crowded and close", "everything at scale is sparse mixture of experts"). A new arrival can make one of those claims false, and a false summary is worse than an out-of-date one.
- **Any table or index that enumerates things.** A families table, a comparison table, a list of providers or tools is a promise to be complete. Adding a row is part of the edit that adds the thing, not a later cleanup.
- **The pages that compare.** If a page argues X is the fastest, the cheapest, the only one doing something, and the new arrival changes that, the comparison is now wrong.
- **Cross-links both ways.** The new material links up to its topic, and the topic links down to it.
Ask, for every addition: which sentence elsewhere in this knowledge base is now untrue? That question is most of the work.

## When a page has a video

Some pages carry a derived explainer video, made under [Produce technical explainer video](../kb-make-video/SKILL.md). The video is a snapshot; the page keeps moving.

**If you add or change material on a page that has a video, say so next to the video.** A short italic note directly under it, naming what the video does not know and the date the page moved past it: *"This video was made on 21 September 2026 and does not cover Step 5 Preview or the encoder-decoder turn."*

That note is the one dated marker allowed on a knowledge page, because it is a statement about an artifact rather than about the subject, and a viewer has no other way to know the video is behind. Remove it when the video is remade. If the gap grows past a couple of notes, the video wants remaking rather than another line of caveats.

## Page shape

For readable deep dives, prefer this order when applicable:

1. Reading-time estimate.
2. Explanation and mental model.
3. Practical implications.
4. **Best resources**: ideally 1 to 3 genuinely recommended resources.
5. **Further reading**: useful additional material.
6. Cross-links to related pages.
Not every page needs every section.

### A page carries one version of itself

This is the rule a full pass over the knowledge base found broken on nearly every page, and it was the single largest source of duplicated text.

- **No collapsed copy of the page's former self.** A `<details>` block titled "previous version of this page (superseded)" or "original map, kept for reference" is a second page inside the page. It ran to between 380 and 620 words on every provider page. History lives in Notion's own page history and in Updates, and the reader needs neither.
- **No "Last updated: <date> (what this pass changed)" line.** Every rewrite adds another one, and it is the changelog leaking onto the knowledge page.
- **A page does not narrate its own editing.** "Rewritten: every named technique now carries a mechanism" is metadata about the page, not about the subject.
- **Dated bookkeeping migrates upward** into headings and even into page titles, where a rule about body text misses it: "## Current debates and refinements (as of Aug 2026)", a page titled "... (state as of 2026-08-24)", a table headed "Current models (Aug 2026)". A heading that hedges with a date is how a page stops being current without anybody noticing. Either the content is still true and the date comes out, or it is not and the content is the thing to fix.

### Say a thing once, on the page that owns it

The commonest structural defect is the same material written out in full in two or three places. Resolving it is worth more than any amount of sentence-level tightening.

- **A topic page is not a second copy of its own deep dives.** A band of the topic page's map gets one orienting sentence, whatever distinction only makes sense when you can see all the children at once, its own unique material, and a mention. The depth lives on the child.
- **One page owns a mechanism; every other page names it and points.** Shared vocabulary is where this hides, because two subtrees can both legitimately touch the same algorithm: RLHF, GRPO and RLVR were explained in four places. Decide the owner, then everywhere else keeps the one claim it needs.
- **Generic mechanism belongs above, lab-specific detail below.** Near-identical explanations of linear attention sat on three provider pages and of expert sparsity on four. The provider page keeps what its own variant does differently.
- **Two topic pages must not map the same ground.** Where they overlap, decide which through-line each one carries.
- **One index per topic page.** A prose map and a deep-dive table covering the same children is two indexes. The table keeps the enumeration; the map keeps the claims.
- **Move, then cut.** Before deleting a duplicate passage from the parent, check that the owning child actually carries every clause of it. A caveat that exists only on the summarising page is silently destroyed otherwise, and that happened twice in one pass before anybody noticed.

### The rule that explains most staleness

**If a fact is on the topic page but not on the child that owns the subject, that is a staleness bug on the child, not depth on the parent.**

This is the single most useful thing learned from auditing the whole knowledge base at once. Updates land on the parent, because the parent is the page being edited during a weekly pass, and nobody goes back down. The result is a knowledge base whose summary pages are excellent and whose child pages are a month or a generation behind, which is the worst possible arrangement: the page that looks authoritative on a subject is the one that is wrong about it.

Worked examples from one audit: the topic page covered GPT-6 Astra in depth while the OpenAI page still called GPT-5.6 "the current family"; the topic page had Terminal-Bench 4.0 while the page that owns Terminal-Bench still said 2.1 was current; the topic page carried the whole encoder-decoder turn while the DeepSeek page had never heard of V4.1-Flash.

So every edit has a second half: after writing something on a topic page, open the child that owns the subject and make it true there too. If the child is the owner, the child gets the depth and the topic page gets the claim.

### Dates: which ones are content

The anti-bookkeeping rule and the never-lose-a-date rule collide, and the distinction has to be written down or an agent will destroy real information following one of them.

- **Content, keep:** a date that qualifies a volatile fact. "Shipped in September 2026". "Last verified: 2026-08-24 (PyTorch 2.13; FSDP1 deprecated since 2.11)". A source attribution for a claim with no URL.
- **Bookkeeping, delete:** a date describing the page's own editing. "Last updated: 2026-09-21 (dated sections folded in)". "Created 2026-08-31." "Added 2026-09-07."
- **Never put a month in a heading.** "What to actually use in Aug 2026" is a heading and a staleness trap at once, and it silently dated two pages whose bodies were already current.

### A number travels with its harness

On any page carrying scores, a number moves together with the harness, the split, the date and who reported it, or it does not move at all. The most valuable passage in the benchmarks subtree exists only because somebody wrote the harness down: the same model, on the same benchmark, thirty-seven points apart through two different harnesses, and the higher score is the cheaper run.

Three more ways a number goes wrong, each found more than once in a single audit:

- **A benchmark name without a version is a future false claim.** Terminal-Bench 2.x against 4.0, OSWorld-Verified against OSWorld 2.0. The figure stays true and the comparison silently becomes false. When a new version resets the scale, say so at the first stale figure on the page rather than trusting the reader to know.
- **Cite what a number measures, not only its value.** "6.49% of MMLU questions contain an error of any type" became "roughly 9% of items are erroneous" on another page, citing the same paper. The scope was dropped first and the figure drifted after. Every percentage taken from a paper carries its denominator and its definition in the same sentence.
- **When a vendor claims a record, record which quantity it won.** One news line about the smallest active-parameter count became a *sparsity ratio* claim on three separate pages, and the ratio leader is a different model.

### Claims that rot without anybody editing them

These are the sentences that go stale silently, which makes them worse than the ones that go stale loudly.

- **A superlative is a dated statement wearing no date.** "The only lab", "the cheapest", "the strongest", "the most aggressive". Three had rotted together in one subtree and no grep for a release name would ever have surfaced them. Every superlative carries its scope in the same sentence ("the top open-weight model *on the aggregate indices*"), which makes it falsifiable on sight and survives the next release.
- **Close the window on a present-tense claim.** "Still unpatched as of late August", "no tagged release after Aug 2025", "watch this boundary". Write the window closed ("left through the summer of 2026 with no patch") so the sentence stays true as it ages.
- **A forward-looking date is a landmine with a timer.** "3.8 is scheduled for 26 August" was true when written and false by default a month later, with nothing to trigger a re-read. Prefer "the current line is X" plus a fact that dates itself.
- **Write an adoption claim as evidence, not as trajectory.** "Landing in mainstream frameworks" has no truth condition, so nothing ever triggers an update. "Used in Kimi K2 and shipped in optax" is checkable, and visibly wrong the moment it stops being the strongest example.
- **When a mitigation is stated, name what defeats it.** A mitigation asserted without its failure boundary is exactly this shape, and in one case the knowledge base already held the counterexample.
- **A saturation claim needs its scope.** "Saturated at 95%" beside a sibling page's "the best model resolves 38.8%" reads as a contradiction until one of them says which population saturated.
- **A diagram ages like prose.** One taxonomy sat two generations behind a paragraph two screens above it. Anything a page enumerates, diagram or table or list, is a claim to be complete, and is reviewed whenever the prose moves.

### What a currency pass must sweep

The weekly intake tracks releases, papers and results, so a pass driven by it is structurally blind to everything without a product name. Three of the largest gaps ever found here were exactly that shape: an acquisition (the largest accelerator vendor buying the model distribution hub, absent from every topic page), a commercial-availability change (an accelerator generation becoming purchasable by other companies), and a licence change.

So sweep **who owns it, what does it cost, what licence is it under, and can you buy it** as its own category, separately from what shipped.

Two cheap checks nobody runs, both of which found real defects in seconds:

- **Does this child name the same latest version its parent does?** Two child pages were exactly one release behind parents that had already integrated the newer one.
- **Does the parent's pointer still describe the child?** The read time and the one-line gloss in a deep-dives table are assertions about the child, duplicated in up to three places, and nothing checks them.
A line saying "current as of version X" is a maintenance obligation the weekly pass does not discharge, because the intake does not track library versions. Either it names the changelog that would falsify it, or version sweeps are a separately scheduled job.

### Two rulings, so they stop being re-litigated

- **An "interview-ready summary" section stays.** Several pages end with one, and by the no-restating rule it looks like duplication. It is not: it is a rehearsal device for spoken recall, which is a different job from the page's explanation. It is the one place where restating the page is the point.
- **Do not expand an acronym the audience already owns.** The rule says expand on first use "at the depth appropriate for an experienced AI research engineer", and a pass over-applied it into "have a large language model (LLM) extract entities" and "natural language processing (NLP)". Expand what a specialist in a neighbouring field would not know. Never LLM, GPU, API, NLP, RAG.

### Writing for the stated audience

The audience is an MSc-level AI engineer with production LLM experience, and the commonest source of fat is writing below it.

- **Expand an acronym, do not teach it.** The expansion is a fact. The tutorial sentence after it usually is not.
- **Define a shared concept once**, on the topic page, and mention it after. One benchmark index was defined on three pages in three different phrasings.
- **Keep a superseded model or version only for the idea it introduced**, never as a chronicle. In-context learning, the post-training stack, the Chinchilla overtraining bet: each earns its entry. "Then in June they released X" does not.
- **State a trade-off compactly**: "it buys X, and costs Y", not "What it buys is X. What it costs is Y."
- **On a list page, cut the per-entry verdict** that restates the page's own framing.
- Wind-ups that always delete cleanly: "It is worth noting that", "The thing worth understanding is", "The reason X exists is that", "The intuition is that", "One key thing to understand is".

### Section-level reading estimates

A page carrying `(1 min)` and `(13 min)` markers per heading has to have them rescaled whenever the page is rewritten, along with the page total. They go stale silently, because nothing reads them back. If they are not going to be maintained, do not use them.

## Reading-time convention

Keep the page-level `⏱ N min read · +Xh Ym resources` estimate where useful. External recommended resources should carry time estimates. Do not maintain a whole-knowledge-base aggregate or cascade calculated totals through all ancestors. Topic-level roll-ups are optional when genuinely useful.

## Notion-native language

Write for Notion. Every internal reference is a native page mention, never a filename.

**Never write these.** They are the pattern that took a full cleanup pass to remove once it had spread:

- `[some-page.md](http://some-page.md)`, or any filename rendered as a link. Notion turns a bare `x.md` into a fake external link automatically, so type the mention instead of the name.
- `../topic-name/`, `topics/topic-name`, `_comparisons/`, `papers/`, "this folder", "this repo", "subfolders".
- A page name in backticks, such as `Topic: llms`, where a mention would resolve.
- A table column headed **File**. Head it **Page**.
- A section headed **Files** or **Map of the files**. Head it **Deep dives**.
- A **markdown link wrapping a real Notion URL**, such as `[Some page](https://app.notion.com/p/...)`. This one resolves, so it looks fine, which is why it spreads. It is still wrong: it renders as an external link, it does not carry the page icon, it does not follow a rename, and it produces no backlink. Use the mention.
- **A page name in bold standing in for a link**. This reads as deliberate typography rather than as something broken, so it survives review. If the bold text names a page, it should be a mention.
- A page named in plain prose with no link at all ("see the hardware topic's interconnects page"). Name it with a mention instead.
**The one exception.** Real configuration filenames that exist in other people's tools, such as `CLAUDE.md`, `AGENTS.md`, `SKILL.md` or `SOUL.md`, are legitimate content. Write them as inline code so they read as filenames and cannot become links. Never link them.

**When a reference has no page behind it**, do not invent a filename as a placeholder. Either create the page, or rewrite the sentence to say the thing in prose.

## Writing conventions

- Explain named entities and expand acronyms on first use, at the depth appropriate for an experienced AI research engineer.
- Lead with the outcome and keep main pages skimmable; use child pages for depth.
- Preserve relevant historical context inside explanations, but keep maintenance history in Updates.
- No em-dashes.

## The weekly pass

The same rules, run over a whole week at once.

1. Establish the research window from the newest Updates entry.
2. Research developments relevant to the existing topic map, and check important releases that may not surface through topic searches.
3. **Integrate durable technical knowledge into the topic or deep-dive page it belongs on**, under the rules above: rewrite the passage, fix the taxonomy, fix the table, fix the summary sentence the news makes false, and add the note under any video the change leaves behind.
4. Give clearly relevant papers the normal Papers treatment: one row per paper with Year, Topics and Takeaway, and the full summary in the row. Less central papers can remain links in Tech news until deeper treatment is requested.
5. Write the dated Tech news issue. The 3 to 5 most important stories first, then sections as warranted. Concise, factual, linked, no hype.
6. Write the dated Updates digest: the changelog of what was actually edited. This is where the week's history lives, and it is why the topic pages do not need any.
7. Update Tracker for newly readable artifacts, without altering existing read state.
8. Apply the writing conventions and the page-level estimates.
9. Update the **Technical KB** row in Last updated: Through date, Last processed and Status.

### Research and news scope

Relevant AI/ML and major big-tech developments: model and tool releases, research, papers, chips and compute, developer tooling and agents, material company moves, and significant technical community discussion. Skip general startups, consumer gadgets and crypto unless genuinely major.

### Routing

- Technical developments appear in Tech news **and** are integrated into durable topic pages when worth retaining.
- General industry news can live only in Tech news.
- Do not create a topic merely because one or two news items lack a home.

## Short videos and other source media

Treat a short video as a **source type**, not as its own knowledge silo. Route its durable technical content into the most relevant existing topic or deep dive.

- Capture source, creator, URL, duration and capture date where available.
- Separate the creator's **claim** from verified fact and from the knowledge actually integrated.
- When the video is primarily a good explanation rather than a source of new knowledge, add it under **Best resources** or **Further reading** instead of creating a standalone page.
- Do not promote an unsupported creator claim into knowledge base fact.

## Reading tracker

New readable artifacts should be represented in Tracker. Preserve existing read state. Use page names.

## Related skills

- [Produce technical explainer video](../kb-make-video/SKILL.md) for derived explainer videos.
- [Sync the knowledge base mirror](../kb-sync-from-notion/SKILL.md) for the GitHub mirror.

## Validation

After any edit, check all of these:

- Durable knowledge was **integrated into a page**, not left only in a digest, and not appended as a dated block.
- Nothing you wrote carries a date that is bookkeeping rather than content.
- The taxonomy, the tables and the summary claims on the topic page above still tell the truth.
- Any video on a page you changed carries a note saying what it now misses.
- The Updates entry matches the edits actually made.
- New readable artifacts appear in the Tracker, and no existing read state changed.
- **Search every page you touched for ****`.md`****, ****`../`****, ****`topics/`**** and ****`app.notion.com`****.** Any hit that is not a real configuration filename in inline code is a defect introduced by this run, and fixing it is part of the edit rather than a later cleanup.
