# Methods: how each kind of page has been built

One file per kind of page, each recording the shape Khalid reviewed and approved for that kind, why it works, and the folder that implements it.

**These are suggestions, not templates.** They record what worked on the pages built so far. A page should take the shape its content needs:
- Use a method's ideas where they fit, change them where they do not, and drop them where they would force the content into a shape it does not have.
- A page that is unlike any method here gets a new shape of its own.
- Departing from a method is expected whenever the content argues for it. Say why in the page's `src/README.md` (one or two sentences).
- If the new shape works and Khalid approves it, record it: update the method it came from, or add a new file here.

What does **not** vary, whatever the shape: the page model and constraints in `.claude/skills/create-interactive-html/SKILL.md` and `html_utils/BRIEF_page_agent.md`, and the visualisation Methodology in `html_utils/interactive-html-ideas.md` section 2. That means one self-contained file with no network, every fact sourced, nothing from the old page lost, phone width checked (`checkpage.sh`, including `clipcheck.mjs`), and no em-dashes.

## The methods so far

| File | For | Reference page |
|---|---|---|
| `topic_pages.md` | A topic, in two separate parts. **Part A, the root `Topic: *` page:** a high-level comparison on a few axes, with data tabs that compare everything. **Part B, a child page:** the depth on one lab, family, stage or technique, linking the root and its siblings instead of repeating them | Root: `technical_knowledge_base/models_and_training/topic_llms/` and `.../topic_llm_training_and_post_training/`. Children: `.../topic_llms/deepseek/`, `.../topic_llm_training_and_post_training/distributed_training/` |
| `tech_news.md` | Weekly tech news issues: one tab per section, items verbatim with dated checks and follow-ups | `technical_knowledge_base/reference/tech_news/2026_08_24_tech_news/` |
| `papers.md` | Rows of the Papers database: the paper's argument in its own order, anchored into the paper, with one live ingredient chosen by kind of paper | `technical_knowledge_base/reference/papers/attention_is_all_you_need_transformer/` |


## Choosing

Read the page first, then ask which method's reader questions match this page's:
- "How do these things compare?" points to topic pages, Part A (the root).
- "How does this one thing work, exactly?" points to topic pages, Part B (a child).
- "What happened this week, and did it hold?" points to tech news.
- "What does this paper argue, and does the evidence hold?" points to papers.

When none matches, or two match equally, build from the brief and the Methodology, and borrow pieces (a live toy model, a dated-check box, an optional deeper-dive tab) from whichever method has them.

## Keeping these current

- **When Khalid changes his mind about a kind of page:** change its method file in the same commit as the pages it affects.
- **When a build teaches something general:** add it to the method's "Lessons" section (one line, dated).
- **Where the details live:** visualisation ideas go in the ideas log (`interactive-html-ideas.md` section 1), not here. These files say how a kind of page is shaped, not which charts it has.
