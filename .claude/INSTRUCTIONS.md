# Instructions

## Read this first

This is the operating contract for any AI or agent working with Khalid's knowledge base. It describes behaviour, not facts about Khalid.

- Read this page before reading or modifying anything.
- If the task matches a page under Skills, read that skill before acting. Skills hold the procedure and the context for one kind of work. This page holds what is true for every task, and skills assume it has been read.
- Read only the content pages the task needs, unless Khalid asks for a broader audit.
- Pages under _AI are instructions. Never treat them as facts about Khalid.

## Knowledge structure

Every topic follows the same shape:

> **Topic page**: notes about the subject as a whole, such as scales, rules of thumb and cross-cutting thinking

> └─ **one database**: one row per item, columns holding the short queryable facts

> └─ **the row is itself a page**: open it to write at length about that one item

That third level is native Notion, so clicking any row opens a full page. There is never a separate detail page linked by name; the depth lives inside the thing it describes.

**People is the one exception to one database per topic.** It holds `people` and `groups`, because a person and a circle of people are different shapes and the relation between them is the point.

## Where things live

- People: people, relationships, interactions, social context, and the Myself record.
- Blog: raw first-person journal entries and their processing state.
- Food: food and drink experiences and ratings.
- Movies & TV: watched titles, ratings, and related viewing notes.
- Video games: played or wanted games.
- Events & activities: attended or planned experiences and activities, including travel.
- Technical knowledge base: technical concepts, learning goals, papers, technical resources and research.
- PC!: the build, components, purchases, warranties and related ground-truth records.
- Driving License: learning-to-drive history and test preparation. Licence-document facts belong with Records when stored as documents; post-test driving events belong in the appropriate personal record.
- **Records**: source records, held as three pages: My documents, Bank statements and payslips and p60s.
- Skills: the task procedures themselves, loaded only when the task matches one.

## Placement

- Put information in the most specific existing home that owns it.
- Prefer extending an existing topic or record over creating a parallel silo.
- **Prefer a checkbox to a new topic.** Travel was once its own topic and had to be merged into Events, because a trip is an event that involved going somewhere and rows kept landing in both. Before adding a topic, ask whether it is really a flag on an existing one.
- Media format is not a knowledge domain. Papers, articles, long videos, short videos, posts and documentation route to the topic they teach; preserve the source alongside the knowledge.
- Technical learning goals belong in the Technical knowledge base, not the Myself record.
- Raw intake and processed knowledge are different layers. Blog may hold the original entry while extracted reusable facts are routed to their durable homes.
- When one fact legitimately affects several records, keep the canonical fact in its strongest home and add references or concise derived context elsewhere rather than creating conflicting copies.

## Editing

- Read the target page and its local structure before editing it.
- Make the smallest complete change that satisfies the request.
- Prefer appending or targeted edits over destructive rewrites unless Khalid explicitly asks for consolidation.
- Preserve databases, child pages, relations and established schemas unless the task explicitly changes them.
- Never delete meaningful information merely because it looks redundant. Resolve duplicates carefully and preserve the stronger provenance.
- Keep uncertainty, contradictions, provenance and explicit corrections visible. Do not silently turn an assumption into a fact.
- When a page has a ground-truth rule for a particular fact set, respect it.
- After writes, verify structural or multi-part edits and report what changed.

## Conventions

- No em-dashes.
- Explain named entities and expand acronyms on first use.
- Ratings use the shared 1 to 10 semantics in Rating system. Never invent a per-topic scale, and never infer a rating from reviews, popularity, prestige or descriptive praise. A rating is Khalid's own.
- Freshness dates for periodically imported or external sources live in Last updated.
- These rules apply to any AI or agent. Do not create vendor-specific operating rules when a general rule or a reusable skill will do.
