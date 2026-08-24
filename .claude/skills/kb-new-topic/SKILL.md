---
name: kb-new-topic
description: Scaffold and populate a new topic folder following the knowledge-base page spec. Use when Khalid asks to add a new topic area to the KB.
---

# New topic

Read `GOAL.md` and `DECISIONS.md` first (binding conventions; note the topic list is a
standing decision, so a genuinely new topic should come from Khalid's request).

## Steps

1. Create `topics/<kebab-case-name>/`.
2. Research the space (web search): the taxonomy of the area, the canonical resources,
   the current state of the art, what practitioners argue about.
3. Write `summary.md`: mermaid taxonomy diagram, a brief skimmable map of the space,
   links to deep dives, papers, and best resources.
4. Write 3-6 starter deep-dive files, each opening with a **Best resources** links block
   followed by a synthesis of those resources. Audience: MSc-level AI engineer;
   summarise fundamentals, go deep on frontier material.
5. Add the topic to the table in `GOAL.md` and a new section in `TRACKER.md` with one
   unchecked box per file created.
6. Cross-link related existing topics both ways.
7. Commit as `new topic: <name>`.
