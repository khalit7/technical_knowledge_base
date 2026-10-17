# Sourcing published numbers

How every fact and number on a page is sourced, labelled and checked, so the page can be trusted as the only copy of the knowledge. For numbers produced on the Mac see [local-runs.md](local-runs.md).

## The rule
Every specific fact carries its source inline as a link, at the point it is used, with a date where the fact can change. Derived numbers show their formula. Illustrative or fitted inputs are labelled. Nothing is invented; a claim that cannot be sourced is marked **unconfirmed**, not filled in from memory.

## Labels every number gets
| Label | Meaning | Example wording |
|---|---|---|
| published | stated by a source, linked | "FID 3.17 on CIFAR-10 (DDPM, Table 1, arXiv 2006.11239, read 2026-10-17)" |
| vendor / independent | who measured it | vendor figures shaded or tagged; independent runs (Artificial Analysis, Epoch, LMArena, ARC Prize) preferred where they exist |
| derived | computed here from sourced inputs | the formula shown beside it, inputs linked |
| measured | run on this machine | see [local-runs.md](local-runs.md) |
| illustrative | an input chosen to show a mechanism | "illustrative workload" beside the control |
| unconfirmed | could not be traced to a source | the claim kept only if useful, visibly marked |
| not run here | a result the page could have measured but did not | the reason given (cost, hardware, licence) and the published number used instead |

## Order of sources
Primary papers and technical reports (arXiv HTML pages, `/html/` rather than `/abs/`, so tables can be read), then model cards and `config.json` files (a config describes the checkpoint; when config and paper disagree, the config wins for that checkpoint), official code at a pinned version quoted by file and line, documentation and changelogs, pricing pages, then analysts and trackers, then explainers, then videos.

## Checks before a number goes on the page
- **Read the table, not the prose.** Several papers' text disagrees with their own tables: quote the table and say so. Check a table's internal arithmetic (Llama 3's Table 5 has a misprint). When a paper compares against "the predecessor", the table header says which model that is.
- **Check the rounding** before calling two figures a contradiction.
- **Two primary figures disagree:** show both, each with its arithmetic and where it appears (the Transformer's 41.0 against 41.8 BLEU). Do not pick silently.
- **A vendor table quoting a rival:** check it against the rival's own figure.
- **Versions and dates:** an index or benchmark score carries its version and date; never splice versions; launch-day and current readings are separate.
- **Superseded sources:** a model card replaced by a technical report is the older source; say what changed. A live page that differs from its archived copy: use the archived raw HTML nearest the date and mark the live reading.
- **Accounting:** for "effective" or "active" parameter claims, sum the parameter table every way and show which sum reproduces the headline; for a headline ratio, say which accounting (per layer, whole model) reproduces it.
- **Figures only as images:** use values printed as labels (labelled "read from figure"), or decode vector SVG or PDF figures calibrated on their gridlines; never read a curve by eye.
- Extract saved PDFs with `pdftotext -layout`, which keeps tables intact.

## "Defaults reproduce X"
Where a visual's defaults land on a published figure, the card says so in one line with the source, and whether **independently** (computed from inputs that do not contain the answer) or **by construction** (one input was back-solved from the figure). Where it does not reproduce, a plain box says so with both numbers and the likely reason; never tune an input to hide the gap.

## Recording
- Keep the source URL and access date in the page's notes as you read (`src/` notes, the topic's shared `FACTS.md` while a team works: whoever verifies a version, licence, default or number first appends it with URL and date; everyone reads it before quoting and never contradicts it).
- Small fetched inputs (configs, table extracts) go in `src/inputs/`; nothing over about 1 MB, no PDFs.
- Further reading entries are marked maker (written by the lab or company that builds it) or third-party, with an approximate time, links checked on a stated date.

## Sources distilled
`html_utils/interactive-html-ideas.md` section 2 (numbers treated with care, the Google and child-page rules, source order and search tactics), `html_utils/BRIEF_page_agent.md` (sourcing model), `html_utils/methods/papers.md` (tables rebuilt, does-not-reproduce box, figure decoding lessons), the gm, dc and jx briefs (published kept apart, "not run here", FACTS.md), and the generative root's Further reading part.
