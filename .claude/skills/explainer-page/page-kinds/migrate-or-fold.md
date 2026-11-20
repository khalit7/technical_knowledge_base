# Fold, merge or retire an existing page

What to do when a subject already has a page (in this repo, or as an old Notion page): carry everything that holds up, and decide what happens to every existing page, including pages folded in, reused, split or retired.

## Nothing is lost
A page in this repo is condensed or moved with the knowledge ledger ([../teaching/teaching-contract.md](../teaching/teaching-contract.md), Length): only units labelled fat are dropped, everything else lands on this page or its owner, and `html_utils/ledger.py check` proves it. Claims carried from an older page are checked against a primary source; corrections go in visible boxes. Text someone added in Notion: stop and show Khalid; it belongs in the repository first.

## Decide the fate of every existing page
Map every existing page of the topic (the root and every child) to the new plan before building. Each one gets exactly one fate:

| Fate | When | What to do |
|---|---|---|
| **Rebuild in place** | the old page matches a planned page | build the new HTML for it; it keeps its Notion id |
| **Reuse for a new child** | an old child page fits a new child, perhaps renamed | the new child keeps the old page's id; rename it in Notion and `pages.json` ([sync-kb-github](../../sync-kb-github/SKILL.md)) |
| **Split** | one old page becomes several children (Deep RL became value-based deep RL, policy gradients, model-based RL) | carry every fact into one of them; retitle the old page "TO DELETE: ..." after all of them publish |
| **Fold into the root** | it explains a concept the root's comparison needs (MoE, reasoning models, release history into Topic: llms, now Topic: llm-landscape, whose MoE tab later became the Mixture of experts child of Topic: llm-architecture; RL foundations into Topic: rl; Debugging training into ml-fundamentals' Debug tab) | rewrite it into the root: Khalid, "integrated in even if this means a full re-write of the main page". Not a bolt-on tab, except as an "Optional deeper dives" tab for a folded mechanism |
| **Merge into a live page** | another live page already covers it (old "RAG evaluation" into the evaluation topic's RAG and retrieval evaluation child) | add what is missing to the live page (its ledger units go there first); retitle the old one "TO DELETE: ..." |
| **Retire** | after a coverage check, Khalid chooses to delete it | retitle "TO DELETE: <old title>" with one line saying where its content went or that it was not carried |

- **Unmatched old pages**: when an old page matches nothing in the plan, never leave it silently. Grep the new pages for its key terms, report what is and is not covered, and ask Khalid: rebuild, fold, or TO DELETE. (Two old pages once left this way turned out to be uncovered.)
- **Pages linking a folded page**: repoint every sibling that linked to it (to the root, naming the tab).
- **Its repo folder and manifest entry**: remove them; its id becomes an alias of the survivor ([sync-kb-github](../../sync-kb-github/SKILL.md), merged pages).

## Deletions are Khalid's
- **The agent never deletes Notion pages.** It retitles them "TO DELETE: ..." and Khalid deletes them.
- An old video from before the migration may still sit in a Notion page; leave it unless Khalid asks.

## A new topic with no Notion page
- **Where it goes**: ask Khalid which section the new `Topic: *` page belongs under and where among its siblings. Operating-systems went under Engineering foundations, after Topic: math.
- **Creating and registering it**: the lead creates the Notion link page and the `pages.json` entry when the plan is approved ([sync-kb-github](../../sync-kb-github/SKILL.md), A new page).
