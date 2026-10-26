
Cut material: `src/for_children/` (the material moved out of this root for its children) was deleted on 2026-10-19 after every child had absorbed it; comments and coverage files that cite it refer to git history before that date.

## The 2026-10-24 close: Reading rebuilt as a map (teaching contract)
After the ten children were rebuilt to `.claude/skills/explainer-page/teaching/teaching-contract.md`, the Reading tab was rebuilt with `orchestration/briefs/rebuild-page.md`'s method as a root (`page-kinds/topic-root.md`). No new runs.

- **Top**: the core sentence, the existing three-moment hero (`23_js_rd_one.js`) with each store's owner in the caption, "You need" (nothing), eight new terms, the three tools.
- **The map** (new): one table of eleven families: what each keeps together, what that makes cheap, what it makes hard and its price, the chat product's use, the owner. Decisions: the old Turbopuffer row (from Distributed systems fundamentals) became part of the Vector row (a product, not a family; Search and vector databases compares it by design), with the old row's uses (RAG retrieval, semantic cache, deduplication). Cache and object storage are named as roles, not families. Two split subjects are stated: pools (Query planning section 8, Running Postgres section 7, Capacity planning) and the lock queue (SQL and data modelling section 11, Running Postgres section 8).
- **One write through the stack** (new, `25_js_rd_write.js`): a stepper over a static 11-step list, each step naming the owning child and sections; it never autoplays; the prediction's answer is closed.
- **Sections 1 to 8 kept as the spine** (children cite root sections 2, 3, 4, 5, 6 and 7 by number), each cut to its definitions, the comparison and the root's own measured numbers (`read/measure_read.py`), with a Go deeper line naming the owner's sections. Section 4 became one table of the four engine pieces; section 6 three measured prices of reaching for a family too early; section 7 keeps the five questions, the chat-product table, the two one-way doors and the "Postgres + S3 + Redis" rule of thumb, labelled opinion (the root decides to keep it; Distributed systems keeps the same line); section 8 one table of four ideas and owners.
- **Retired** (moved to `read/retired/parts/`): the SQL clause, lost-update, WAL, index, rows-and-columns and cache animations (SQL and data modelling, Transactions, Storage engines, Analytics and Caching own those visuals; their numbers stay in the prose, still checked by `read/recompute.py`), the glossary (each term is defined inline and the top lists the new terms), "How a pro chooses" became "Habits that span the children" with an owner per habit.
- **Tabs kept**: SQL playground (lessons run from SQL to the credit transfer Transactions reuses; SQL and data modelling reuses its engine), Query plans (eight cases across Storage, Query planning and Analytics; case 4 now names Query planning section 5 as the owner of join algorithms), Database atlas. **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `db-tab`; the old copy wrote `bench-tab`), the Query plans animation shows the whole run still on a new case, and the playground's JOIN mode switch no longer plays.
- **Further reading**: the child list is titles and header times; neighbouring times from their headers; Service APIs added for idempotency keys.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 39 min (9,073 words) | 27 min (6,278 words) |
| Reading, closed details | 0 | 0.5 min |
| SQL playground, Query plans | 4 + 5 min | unchanged |
| Further reading | 6 min | 5 min |
| Visuals in Reading (audit count) | 5 animations plus the hero | hero, write stepper (plus the schema explorer and four tables) |

Why about 27 minutes: the topic starts from zero and its children run 27 to 43 minutes each; the root is the only page that puts the eleven families side by side with their prices, follows one write across all ten children, and gives the definitions a from-zero reader needs before any child (the SQL child's "You need" points at section 2, Transactions at sections 3 and 4). Every mechanism is now one sentence or one table row plus the owner; what remains in sections 4 and 5 is the root's own measured comparison on 1,000,000 messages, which no child carries in full.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
486 units drafted by `ledger.py init` from the page before the close: core 346, owned 46 (Query planning 12, Transactions 11, SQL and data modelling 7, Storage engines 5, Search 4, NoSQL 2, Analytics 2, Scaling 1, Running Postgres 1, Caching 1), fat 94 (48 glossary entries restating inline definitions, old section-preview cards, navigation, widget instructions of the retired animations, wind-ups and headings; each has a `note`). Three units no child carried were kept here instead of cut: the SQLite deployment count (map, Embedded row), "business rules beyond constraints stay your code's job" and "serializable also catches anomalies you did not think of" (section 3).

## 2026-10-26 ownership sweep
Families table: the vector row is now "Vector stores (pgvector, Qdrant, Milvus, Pinecone, Turbopuffer)" and its owner cell links Search and vector databases (sections 7 to 12; Turbopuffer and the dedicated stores in section 12).
