# 2026-09-21: reference repairs, and the mirror rebuilt

⏱ 3 min read

Two reference defects fixed here, and the GitHub mirror rebuilt around them.

## Reference repairs

**26 markdown links wrapping Notion URLs, across 9 pages, converted to native mentions.** The pattern is `[Topic: protocols](https://app.notion.com/p/...)`. It resolves, which is why it spread and why review kept passing it, but it renders as an external link, carries no page icon, does not follow a rename and produces no backlink. Fixed on [Topic: data-curation-and-datasets](../topics/data-curation-and-datasets/summary.md), [Topic: llms](../topics/llms/summary.md), four of the September papers, and four Updates entries.

**One dangling mention repaired**, on [Topic: databases](../topics/databases/summary.md). It pointed at a page id one character group away from the real one, which is what an id written from memory rather than inserted looks like. Notion renders a broken mention as ordinary text, so nothing about the page looked wrong. It now points at [AI Engineering Skills Map: software engineering fundamentals (Andrew Ng, 2026)](../topics/swe-and-system-design/ai-engineering-skills-map.md), and since the sentence already said the name aloud, the duplicated name and its brackets are gone.

## The mirror

The GitHub repository had drifted a long way behind and has been rebuilt rather than patched. It now does two things and nothing else: mirror this knowledge base, and produce the explainer videos derived from it. The conventions it used to restate in its own files are gone, because they live here.

The mirror is now derived from this workspace's current state rather than from a diff of recent edits, which means it deletes files whose page no longer exists. It also reports any mention pointing at a page that no longer exists, so the defect repaired above cannot hide again.

## Video

Produce technical explainer video now carries the whole method rather than just the pipeline: the spine, the transition rules, how narration is written for the ear, how the voice is made to sound human, and the decision that the news edition is one narrator plus a listener rather than two hosts. Khalid reviewed the draft and asked for it to be merged into the existing skill rather than kept separate.

Three conventions were added from his review of the first cut: an edition opens by saying what it is and giving the date; stories are separated plainly and each opens with its headline, why it matters and the context before any mechanism; and the narration points at what is on screen rather than running alongside it.
