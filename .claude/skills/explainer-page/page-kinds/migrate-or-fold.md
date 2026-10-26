# Migrate or fold: when the input is an existing Notion page

What to do when a page already exists in Notion in its old written form (or as an older embed from before 2026-10-23): save it, carry everything that holds up, and decide what happens to every old page, including pages folded in, reused, split or retired.

## Save the old page first
- **Fetch read-only** with the Notion connector (load it with ToolSearch).
- **Save the full fetched text verbatim**:
  - to `src/live.md`; for a root and its children, to `src/read/old/` (one file each);
  - copy a large fetch (which the tool saves to a file) with a script, never retyped.
- **Record what stays on the page**: child pages (`<page>` tags), databases, a video (`<video>` and its "# Video" heading and blurb, sometimes an italic note), with their exact tags. They stay on the Notion page under the HTML, which links them rather than replacing them.
- **An old out-of-repo interactive embed**: save it to `src/inputs/old_embed_<name>.html` before it is replaced. Its knowledge counts toward coverage.
- **Notion disconnected**: write `coverage.md` as a TODO ("old page not yet compared, Notion disconnected") with the steps, and compare before publishing. Never publish a migrated page whose old text was never read.
- **Text someone added in Notion** since the last sync: stop and show Khalid. It is knowledge that belongs in the repository first.

## The coverage floor
The old page is the floor of what the new page carries, not its scope, and not its truth ([../understand/research.md](../understand/research.md)). For a page already built in this repo, the floor is the knowledge ledger ([../teaching/teaching-contract.md](../teaching/teaching-contract.md)): only units labelled fat are dropped. For an old Notion page:
- every distinct fact, number, mechanism step, caveat and source link is listed in `src/coverage.json`, with where the new page carries it;
- dropped only as a genuine duplicate, or as a stale claim with its correction and source;
- every claim checked against a primary source; corrections in visible boxes;
- the list written first, so it sets the outline, and checked by script.

## Decide the fate of every old page
Map every old page of the topic (the root and every old child) to the new plan before building. Each one gets exactly one fate:

| Fate | When | What to do |
|---|---|---|
| **Rebuild in place** | the old page matches a planned page | build the new HTML for it; it keeps its Notion id |
| **Reuse for a new child** | an old child page fits a new child, perhaps renamed | the new child uses the old Notion id and is retitled at publish to its `pages.json` title; it has no children, so `replace_content` is fine |
| **Split** | one old page becomes several children (Deep RL became value-based deep RL, policy gradients, model-based RL) | carry every fact into one of them; retitle the old page "TO DELETE: ..." after all of them publish |
| **Fold into the root** | it explains a concept the root's comparison needs (MoE, reasoning models, release history into Topic: llms, now Topic: llm-landscape, whose MoE tab later became the Mixture of experts child of Topic: llm-architecture; RL foundations into Topic: rl; Debugging training into ml-fundamentals' Debug tab) | rewrite it into the root: Khalid, "integrated in even if this means a full re-write of the main page". Not a bolt-on tab, except as an "Optional deeper dives" tab for a folded mechanism |
| **Merge into a live page** | another live page already covers it (old "RAG evaluation" into the evaluation topic's RAG and retrieval evaluation child: 41 of 43 items covered, 2 dropped, coverage table committed) | write the coverage table; add what is missing to the live page; retitle the old one "TO DELETE: ..." |
| **Retire** | after a coverage check, Khalid chooses to delete it | retitle "TO DELETE: <old title>" with one line saying where its content went or that it was not carried |

- **Unmatched old pages**: when an old page matches nothing in the plan, never leave it silently. Grep the new pages for its key terms, report what is and is not covered, and ask Khalid: rebuild, fold, or TO DELETE. The 2026-10-17 lesson: "Terraform and the AWS ML Stack" and "Text Diffusion and World Models" were left as they were, uncovered, until he asked why.
- **Pages linking a folded page**: repoint every sibling that linked to it (to the root, naming the tab).
- **Its repo folder and manifest entry**: remove them, if it had them.

## Deletions are Khalid's
- **The agent never deletes Notion pages.** It retitles them "TO DELETE: ..." and Khalid deletes them.
- **Old narrated videos** describe the old page: leave the video block and its heading, and tell him it is his to delete (he has deleted them on every topic so far, but ask, do not assume).
- **After he deletes a video**, an orphan "# Video" heading may remain on the page: report it.

## A new topic with no Notion page
- **Where it goes**: ask Khalid which section the new `Topic: *` page belongs under and where among its siblings. Operating-systems went under Engineering foundations, after Topic: math.
- **Who creates it**: the lead creates the Notion page (and child placeholders) when the plan is approved. Placeholder pages hold no content, so `replace_content` is fine on them.
- **Registering it**: add it to `pages.json` with its folder and its strict `prereqs` (ids) ([../orchestration/topic-pipeline.md](../orchestration/topic-pipeline.md)); a folded page's id becomes an alias, so rewrite `prereqs` that named it to the survivor.

## Publishing migrated pages
Publishing is the `sync-kb-github` skill: commit and push; the old Notion page's body becomes the link line.
- **A page without children or databases**: one `replace_content` with the link line (and its video tag, if any).
- **A page with child pages or databases** (every root): never `replace_content`. Insert the link line at the start, then delete the old text in chunks (a run of consecutive blocks matched as one span), keeping every `<page>`, `<database>` and `<video>` tag and the video's heading. Fetch afterwards to confirm only the link line, video and child tags remain.
- **Retitle reused and retired pages** in the same pass.
- **Record** `"notion": "link"` in `pages.json`.

---
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 1d6d9d18, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)

Sources distilled: html_utils/BRIEF_page_agent.md (Step 0, the model); html_utils/methods/topic_pages.md Part A (folding, publishing a root with children); memory check-coverage-before-leaving-old, teach-dont-ask-scope and the rl, benchmarks, evaluation, ml-fundamentals, swe, rag, protocols, proglang, os, pytorch, jax, mi and gm topic logs; .claude/skills/sync-kb-github/SKILL.md; CLAUDE.md (Notion facts).
