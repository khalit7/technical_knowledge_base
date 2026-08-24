# Standing decisions

Binding. Do not re-ask these. Each entry is dated and states what it does and does not
license. Add new entries at the top.

## 2026-08-25: DIRECTION REVERSED: Notion is the source of truth, this repo is the mirror

Khalid: "I want the notion page to be the source of truth and the github repo to be
the mirror", because updates arrive via a weekly Claude cowork scheduled task (Mondays
07:00 UTC, Opus, routine "Weekly tech KB update"), which works against Notion. The
repo is synced FROM Notion on demand on his PC and pushed. This supersedes the
"GitHub is the source of truth" line below and the same-session repo-to-Notion sync
rule in the entry below it (content flows Notion to repo now; kb-add-paper and
kb-new-topic still write both sides in one session, Notion first). Paper PDFs remain
repo-only: Notion keeps summaries and arXiv links. The Notion-side manual and
decisions log is the root page's child "Operating guide (for Claude)".

## 2026-08-24: Notion mirror is live; topic changes always sync (SUPERSEDED 2026-08-25, see above)

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
