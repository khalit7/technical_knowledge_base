---
name: kb-new-topic
description: Add a new topic to the knowledge base, Notion first (the source of truth) then this repo. Use when Khalid asks to add a new topic area.
---

# New topic

Notion is the source of truth; create the topic there first, then mirror it into this
repo in the same session. Read `GOAL.md` and `DECISIONS.md` first (binding; a genuinely
new topic should come from Khalid's request). Notion root page id:
`3c65c17b-0d0d-81c7-b646-e548e65d9446`; follow its "Operating guide (for Claude)"
child page.

## Steps

1. Research the space (web search): the taxonomy of the area, canonical resources,
   current state of the art, what practitioners argue about.
2. **Notion (source of truth)**: create `Topic: <kebab-case-name>` under the root page
   (taxonomy as a mermaid code block + skimmable map), one child page per starter deep
   dive (3-6, each opening with **Best resources** then synthesis), a new Tracker
   section with unchecked boxes, and a note in the next Updates digest.
3. **Repo mirror**, same session: `topics/<name>/` with `summary.md` (mermaid source in
   a `<details>` block below an embedded `taxonomy.svg`, rendered via
   `npx -y @mermaid-js/mermaid-cli -i <src>.mmd -o taxonomy.svg -b white`), the
   deep-dive files, the `GOAL.md` topic-table row, and the `TRACKER.md` section.
4. Cross-link related existing topics both ways (repo side; in Notion, mention related
   topics as plain text).
5. Commit as `new topic: <name>`; push if a remote exists.

Removing a topic follows the same order: archive in Notion first (rename with a clear
marker, never hard-delete; strike through its Tracker section), then mirror the removal
here.
