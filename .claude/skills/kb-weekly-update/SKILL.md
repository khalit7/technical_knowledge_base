---
name: kb-weekly-update
description: Periodic knowledge-base pull. Researches every topic for news, releases, and papers since the last update, writes a dated digest, patches topic files, adds papers, and updates the tracker. Use when Khalid asks to check for new things, run the weekly update, or bring the KB up to date.
---

# Weekly knowledge-base update

Read `GOAL.md` and `DECISIONS.md` first; their conventions are binding (especially: no
em-dashes, date every change, tracker discipline).

## Steps

1. **Establish the window.** Find the newest file in `updates/` and use its date as the
   start of the window (fall back to 14 days if none). Today's digest will be
   `updates/YYYY-MM-DD.md`.
2. **Research per topic.** For each topic in `GOAL.md`, web-search for developments in
   the window: model releases, major library versions, notable papers, important blog
   posts and community discussion. Fan out parallel research subagents (one per topic or
   per topic group) when the session's tools allow; otherwise search sequentially.
   Prioritise: llms, llm-training-and-post-training, inference-and-serving,
   agentic-harnesses, cuda-and-gpu-programming, pytorch-ecosystem, rl.
3. **Dedupe.** Before adding anything, grep the repo for it. Skip what is already
   covered; update entries that changed (move superseded text into a `<details>` block
   with the old date).
4. **Write the digest** `updates/YYYY-MM-DD.md`: grouped by topic, each item one to three
   sentences with links, marked **[new]** or **[update]**. Lead with the 3-5 items that
   matter most.
5. **Patch topic files.** Fold each item into the relevant `summary.md` or deep-dive
   file, dated. New subtopics get new deep-dive files following the page spec (Best
   resources block first). If a taxonomy's mermaid source changes, re-render its
   `taxonomy.svg` (command in GOAL.md) so the image stays in sync.
6. **Papers.** For each significant new paper, follow the `kb-add-paper` skill
   (typically 0-3 per week; more only if the week warrants it).
7. **Tracker.** Add an unchecked box at the top of the relevant `TRACKER.md` section for
   the digest and every new or materially updated artifact.
8. **Commit** with message `weekly update YYYY-MM-DD`.

## Output to Khalid

End with the digest's headline items and counts: topics touched, files added/updated,
papers added.
