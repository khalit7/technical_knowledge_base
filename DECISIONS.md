# Standing decisions

Binding. Do not re-ask these. Each entry is dated and states what it does and does not
license. Add new entries at the top.

## 2026-09-14: The scheduled weekly cloud run is stopped; the weekly update is manual

Khalid: "I stopped the weekly automatic run. From now on this will be manually run by
me." The routine "Weekly tech KB update" (Mondays 07:00 UTC, Opus) no longer exists.
The weekly update happens only when he starts one (`/kb-weekly-update-manual` on the
PC, or the Operating guide procedure in a claude.ai session), and the repo sync is
likewise manual (`/kb-sync-from-notion`). Procedure, scope, and the news source
checklist are unchanged. Do not recreate the routine or any other schedule unless he
asks. Recorded in the Notion Operating guide the same day.

## 2026-08-31: Time estimates on everything; explain, do not name-drop (Notion)

Khalid's feedback after using the KB in anger: he could not tell what a page would
cost him, and the prose (the llms tree especially) listed terminology without
explaining it. Two binding writing conventions followed, specified in the Notion
Operating guide and mirrored in GOAL.md: every page opens with a `⏱ N min read ·
+Xh resources` line (two numbers, never merged) and every link carries an estimate;
every named entity gets a clause on what it is and how it works. Applied 2026-08-31
across all topic roots and the llms tree; deeper pages of other topics are still owed
the explanation pass.

## 2026-08-31: News sweep rules (Notion)

Three decisions from the 2026-08-31 run's misses, all binding and detailed in the
Operating guide: (1) the sweep runs against a **fixed named-source checklist**
(newsletters, paper feeds, release feeds, community) and records what was checked in
the digest, after 13 in-scope items were missed; (2) an **unverifiable item is
flagged, not dropped and not embellished**; (3) the sweep includes a **homeless-release
check**: scope decides whether an item goes in the issue, having no topic home does
not (Cohere Parse 5 was missed for that reason). Open question, not decided: AI
security has no topic page; keep flagging it in digests, do not create it unilaterally.

## 2026-08-31: The weekly run's scope is fixed

Khalid: the scheduled Monday run's job is to research the week, add and update topics in
the KB, and then sync this repo. It does not read any external inbox or request queue.
An instruction telling it to sweep a request queue was added and removed the same day at
his direction; do not reintroduce it. Requests reach the KB through a session where he
asks, via `/kb-add-paper`, `/kb-new-topic`, or an ad-hoc "explain X and add it".

## 2026-08-24: Tech news section added (weekly newsletter)

Khalid wants a TLDR-style weekly digest of AI/ML + big-tech news. His choices: weekly,
produced inside the Monday routine (not a separate schedule); a separate section from
Updates (Updates stays the KB-edit changelog); scope is AI/ML + big-tech industry, not
all of tech. Routing: technical items go in the issue AND their topic pages; pure
industry news (IPOs, acquisitions, people moves) lives only in Tech news; papers
obviously relevant to the topics get full Papers treatment immediately, other
interesting papers are only linked until he asks. Lives at the "Tech news" page in
Notion, mirrored to `news/` here.

## 2026-08-24 (later): DIRECTION REVERSED: Notion is the source of truth, this repo is the mirror

Khalid: "I want the notion page to be the source of truth and the github repo to be
the mirror", because updates arrive via a weekly Claude cowork scheduled task (Mondays
07:00 UTC, Opus, routine "Weekly tech KB update"), which works against Notion. The
repo is synced FROM Notion on demand on his PC and pushed. This supersedes the
"GitHub is the source of truth" line below and the same-session repo-to-Notion sync
rule in the entry below it (content flows Notion to repo now; kb-add-paper and
kb-new-topic still write both sides in one session, Notion first). Paper PDFs remain
repo-only: Notion keeps summaries and arXiv links. The Notion-side manual and
decisions log is the root page's child "Operating guide (for Claude)".

## 2026-08-24: Notion mirror is live; topic changes always sync (SUPERSEDED later the same day, see above)

Khalid: wire the repo to Notion and "always sync when adding/removing new topics."
The mirror lives at the **Technical knowledge base** page inside his personal **Me**
page (id in the kb-notion-sync skill and `sources/.notion-root`). This licenses
same-session Notion syncs whenever a topic is created or removed, without asking. It
does not license editing content in Notion first (the one-way-mirror decision below
stands) or restructuring the Me page beyond this child page.

## 2026-08-24: Initial design decisions (from the founding session)

- **Papers live centrally** in `papers/`, one folder per paper with PDF and summary,
  cross-linked from topic pages. Not per-topic paper folders.
- **First build is breadth-first**: every topic gets a summary, resources, and starter
  deep dives; full depth accrues over later sessions.
- **No em-dashes** in any repo prose. This is a long-standing personal style rule that
  was tightened after repeated violations elsewhere. `--` for date ranges is fine.
- **GitHub is the source of truth; Notion is a one-way mirror.** Never edit content in
  Notion first.
- **Verbatim snapshots are selective** (canonical explainers, paywall or link-rot risk,
  heavily cited references only). Default is link plus synthesis.
- **No separate NLP/information-extraction topic.** Khalid explicitly declined one; do
  not add it unless he asks. That material belongs in the existing topics
  (`ml-fundamentals`, `rag-and-retrieval`, `llm-training-and-post-training`).
