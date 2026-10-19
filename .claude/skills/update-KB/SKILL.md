---
name: update-KB
description: Run the periodic update of the Technical knowledge base from this repository. Read the last-updated date from Notion's Source freshness row "Technical KB", research everything that happened since (releases, papers, results, industry moves, newsletters), write that window's tech-news issue, integrate the durable knowledge into the pages that own it, add the papers that earn a page, publish, and move the freshness date forward. Use when Khalid asks to update the knowledge base, run the weekly or periodic KB pass, or catch it up.
---

# update-KB

The repository is the source of truth; Notion only displays it. This skill is the periodic pass that keeps the knowledge base current. It replaces the old Notion skills (update-KB, the knowledge-base half of "Run the weekly Monday update", create-interactive-html, create-explainer-video and the Notion-to-GitHub mirror), which were deleted on 2026-10-19. Everything they knew that still applies is in this folder.

Every page is still built with the `explainer-page` skill and published with `sync-KB-github`; this skill decides **what** changes, and in what order. The editorial rules that decide **how** an update reads are in [editorial-rules.md](editorial-rules.md): read them before writing anything.

## The window always comes from Notion
1. Query the Notion data source `collection://99887928-0063-4df2-a9e8-7260a099e423` (database "Source freshness" on Me / _AI / Last updated) for the row whose `Source` is `Technical KB` (row id `3e15c17b-0d0d-8127-97b5-e5229f7d5682`). Its **Through date** is the last day already covered.
2. The window runs from that Through date (inclusive, so nothing on the boundary day is missed; drop items the previous issue already carries) to today. Never infer the start from a schedule, from git history or from memory: only from that row.
3. Cross-check: the newest folder in `technical_knowledge_base/reference/tech_news/` should be dated the Through date. If they disagree, say so in the report and use the Notion row anyway.
4. If the window is longer than about two weeks, still do one pass and one issue covering the whole window (name the issue by the window's end date, and say in its At a glance that it covers several weeks).

## Steps
1. **Set up.** `git pull`; the tree must be clean. `python3 html_utils/sync_status.py --no-build` should say Notion is up to date; if not, publish what is pending first (`sync-KB-github`), so this run's diff is only this run's work.
2. **Research the window** (read only, nothing written yet):
   - **Releases and results** relevant to the existing topic map: models and tools, papers, benchmark results, chips and compute, developer tooling and agents. Search per topic root (titles in `pages.json`), and separately for important releases that topic searches miss.
   - **The currency sweep** that release tracking is blind to: who owns it, what it costs, what licence it is under, can you buy it (acquisitions, price and licence changes, commercial availability). See [editorial-rules.md](editorial-rules.md).
   - **Newsletters**: with the Gmail connector, read-only, open every technical newsletter issue received in the window (rules in "Newsletters" below).
   - **Scope**: AI/ML and major big-tech developments, and significant technical community discussion (Hacker News points and comments recorded as dated readings). Skip general startups, consumer gadgets and crypto unless genuinely major.
   - Every item gets a primary source link, its date and who reported it; vendor claims are labelled as such.
3. **Triage into a plan**, written to the scratchpad, before any page changes. Each item gets exactly one route:
   - **News issue only** (industry news, a release with no durable lesson).
   - **News issue and a page edit**: name the page that owns the subject (one owner per subject; find it in `pages.json` and the topic roots), what passage changes, and which sentences elsewhere it makes untrue (the root's map, tables, summary claims, comparisons, sibling pages).
   - **Paper page**: a paper central to a topic gets a row in the Papers database and its own page; a less central one is only linked in the issue.
   - **New topic or child page**: only when no existing page fits and the body of durable knowledge justifies it, never because one or two items lack a home. Propose it to Khalid in the report rather than building it in this run.
   - **Dropped**, with the reason.
4. **Write the tech-news issue** as a new page: folder `technical_knowledge_base/reference/tech_news/YYYY_MM_DD_tech_news/` (the window's end date), built with the `explainer-page` skill, page kind [tech-news](../explainer-page/page-kinds/tech-news.md). The issue text is written fresh into `src/issue.md` (it plays the role `live.md` plays for an older issue: the issue's own words, which later re-checks never overwrite). Copy the machinery from the newest issue. Shape: the 3 to 5 most important stories first, then sections as warranted; concise, factual, linked, no hype. Each item names the knowledge-base page it feeds.
5. **Integrate the durable knowledge** into the owning pages' `src/parts`, following [editorial-rules.md](editorial-rules.md): rewrite the passage so the page reads as if it had always been true, then walk up and fix what the change invalidates (root map and tables, summary claims, comparisons, reading times, Further reading). Rebuild each changed page and run `sh html_utils/checkpage.sh <folder>` (must end `fail=0, emdash 0, errbox 1, clipped 0`). If the page has a video, the video now lags the page: add one line beside the header line that names the video, saying what the video does not cover and the date the page moved past it; remove it when the video is remade. Never remake videos in this run.
6. **Papers.** For each paper routed to a page: create its row in the Papers database (`collection://d440058d-ec1c-4b72-b141-046d5d969389`, properties `Paper`, `Year` with venue where relevant, `Topics` from the existing options, `Takeaway` in one sentence that agrees with the page) with the body "Being built in the technical_knowledge_base repository.", add its `pages.json` entry (`path` under `reference/papers/`, exact `title`, `id`, `parent` "Papers", `section` "Reference", `status` `not_migrated`) and its line in `reference/papers/README.md`, then build it with page kind [paper](../explainer-page/page-kinds/paper.md).
7. **Register the issue page.** Create the Notion child page under Tech news (`3c65c17b-0d0d-8172-97b0-f28491701516`) titled `YYYY-MM-DD: tech news`, add its `pages.json` entry (`parent` "Tech news", `section` "Reference", `status` `not_migrated`) and its line in `reference/tech_news/README.md`. Link the previous issue's Further reading to the new one (a page edit like any other).
8. **Publish** every changed and new page with the `sync-KB-github` skill, one page at a time, until `sync_status.py --no-build` says Notion is up to date; push.
9. **Move the date forward, last**, so it only ever reflects completed work: update the `Technical KB` row: `Through date` = the window's end, `Last processed` = today, `Status` `Current` (or `Partial` with the reason if something was left out), and `Notes`: the window, the issue page, the pages changed, the papers added, open provenance questions. Notes replace the previous notes; history is in git and in the issues.
10. **Report** to Khalid (see the end).

## Newsletters
Read with the Gmail connector only; never send, label, archive or draft anything. Search the window for recurring editorial publications about software, AI/ML, data or the tech industry (TLDR, Medium digests, Towards Data Science and similar are examples, not a closed list): a dated issue, a masthead, a run of linked stories with short blurbs, sent by a publication rather than a person.
- **Keep**: anything matching a topic; significant releases, results and papers with the **primary** source link (never the newsletter's tracking redirect); big-tech moves worth a line in the issue; an article only when it has real technical substance (a method, a benchmark, a postmortem, a non-obvious result).
- **Drop**: sponsored items, job ads, course promotions, listicles, career advice, shallow rehashes, anything you cannot pin down beyond the blurb, marketing mail wrapped as a newsletter.
- Collapse each story to one candidate across issues and publications, keeping the best link. Then route it with everything else in step 3. List the newsletters opened in the report so Khalid can prune the set.
- Nothing from mail ever enters the repository except the public story and its primary link: no addresses, names of senders who are people, or account mail.

## Short videos and other source media
A short video, post or thread is a source type, not a knowledge silo: route its durable content to the owning page. Record source, creator, URL, duration and capture date; keep the creator's claim separate from verified fact; never promote an unsupported claim into a page. A video that is mainly a good explanation goes to the page's Further reading instead.

## Orchestration
Research can be split across subagents (for example one per section of topics, plus one for newsletters), and the issue, page edits and papers can be built by agents with the `explainer-page` briefs. Follow Khalid's current rule on how many agents run at once and the lead rules in [../explainer-page/orchestration/topic-pipeline.md](../explainer-page/orchestration/topic-pipeline.md): agents never commit, publish, write to Notion or edit `pages.json`; the lead merges the plan, so two items that touch the same page become one coherent edit. No Workflow tool without Khalid's opt-in.

## Hard rules
- Never write to Notion except: the new Tech news child page, new Papers rows, the publish steps of `sync-KB-github`, and the freshness row at the end.
- Never edit knowledge in Notion directly: a page edit made there is overwritten by the next publish. If a Notion page holds text that is not in the repository, stop and show Khalid.
- There is no Updates changelog, Tracker or Visuals database any more (retired 2026-10-19): do not recreate them. The record of a run is its tech-news issue, its git commits and the freshness row's notes.
- No em-dashes anywhere. Privacy grep before every commit (the pattern list is in `agents_and_retrieval/topic_protocols/src/.private_patterns`).
- Never delete a Notion page; retitle "TO DELETE: ..." and tell Khalid.

## Report
One tight summary, leading with anything that failed: the window and where it came from; sources and newsletters read; the issue page (link); every page changed and why; papers added; items dropped and why; proposed new topics or children; pages left unpublished and why; open provenance questions; the freshness row as written.
