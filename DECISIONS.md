# Standing decisions

Binding. Do not re-ask these. Each entry is dated and states what it does and does not
license. Add new entries at the top.

## 2026-08-31: Blog entries can request KB additions; the weekly run must sweep them

Khalid, entry of 2026-08-27: "I want to be able to add topics to my technical knowledge
base by writing these blogs and asking you to add them." Requests live as rows in the
`entries` database under his Notion **Blog** page
(`collection://0fbbc243-d165-40e0-aeee-eea032f950e9`). Sweeping unprocessed rows is step 0
of every weekly run and of any session asked what is outstanding: query
`processed = '__NO__'`, fetch each row's body (the title is never enough), and act only on
rows that explicitly ask for a KB addition. Tick `processed` to `__YES__` only once the KB
edit is actually made; leave it unticked and say why otherwise. Where the request's content
sits in an embedded tweet or bookmark that the API returns blank, leave it unprocessed and
ask Khalid to paste the text; never reconstruct it or attribute invented claims to a named
author. Added after the 2026-08-31 run missed five such entries, some nine days old. This
does not license acting on his personal journal entries, or editing the Blog database
beyond ticking `processed` on rows completed.

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
