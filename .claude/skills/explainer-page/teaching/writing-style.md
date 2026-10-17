# Writing style: how page text, captions and notes are written

Rules for every word that ends up on a page, in `src/` notes, in a README or in a commit message.

## No em-dashes, anywhere
- **Where**: prose, HTML, SVG labels, captions, alt text, data files, code comments, READMEs, commit messages.
- **Instead**: commas, colons, semicolons or parentheses; `--` for ranges where a compact form is needed, "15 to 30" in running prose.
- **Saved source extracts** are no exception: replace their long dashes with `--` when saving them (a tech-news issue did this).
- **Real data that contains one** (a model's reply shown verbatim): store it escaped so the source has none, and flag it to Khalid. Two MRCR replies on the benchmarks pages raised this.
- **The checks enforce it**: `checkpage.sh` must report `emdash 0` ([../build/checks.md](../build/checks.md)).

## Plain, concrete prose
- **Concrete over abstract.** Short sentences, concrete nouns, the running example named. "The scheduler held job 7 for 14 minutes because node 3 was reserved", not "scheduling can introduce delays".
- **Say what happens and why**, in that order. One idea per paragraph.
- **No marketing words** ("revolutionary", "blazing"), no filler ("it is worth noting that"), and no hedging fog. When unsure, say exactly what is unconfirmed.
- **Define terms inline** at first use, in plain words, before any symbol ([page-quality.md](page-quality.md)).
- **Spelling**: British, as the knowledge base uses it (visualisation, optimiser, colour).
- **Titles**: page titles exactly as in `pages.json`. Tab names say what the reader does ("Run a tiny CLIP", "Simulate the scheduler", "Sampler workbench").

## Numbers carry their qualifiers
- **Every number has a unit and a qualifier**: the date ("Data as of October 2026" in the header subtitle; "checked 2026-10-16" in a box), who measured it, the version (index v4.3, torch 2.14.1), and where it ran ("measured on Apple M1 Pro (CPU), 4 threads, low priority").
- **Precision**: keep the printed precision of published numbers; do not add digits by recomputing.
- **Name the unit exactly**: MiB is not MB (a peak memory recorded in MiB was printed as "2.43 GB"; it is 2.55 GB).
- **Vendor or independent**: say which, beside the number, not in a footnote.
- **Derived numbers** show their formula or link the script; **calculations** from published specs are called calculations, not measurements.
- **Counts that drift** (stars, upvotes) are dated readings.

## Fixed phrases with fixed meanings
| Phrase | Meaning |
|---|---|
| "not run here" plus the reason | quoted from a source, deliberately not reproduced |
| "defaults reproduce X (source), independently" | the tool lands on X from its own inputs |
| "... by construction" | one input was set from X, so matching X proves nothing |
| "does not reproduce" | our run disagrees with the source; both shown |
| "read from figure" | a value transcribed from a figure's printed labels or vector paths, with the stated precision; curves are never read by eye |
| "illustrative" | an input chosen for teaching, not measured |
| "unconfirmed" | no source found; not filled from memory |
| "Being built" | a sibling page not yet published; replaced by a link at wiring time |

## Quoting
- **Quote word for word** and recheck quotes against the source before publishing (the ML system design page was held for a word-for-word recheck of summarised quotes).
- **Mark paraphrases** as paraphrases.
- **Weekly issue text stays verbatim**: tech-news issues are never edited; checks sit in boxes beside them ([../page-kinds/tech-news.md](../page-kinds/tech-news.md)).

## Reading time
- **Measure it, do not guess**: use the build's word count or the check script, and state it in the page header.
- **Closed `<details>` blocks** are counted and reported apart ("22 minutes, plus 7 in closed details").
- **Budgets**: about 15 to 30 minutes for a root; children about 25 to 45 minutes. Flag a root over 30 or a child over 45 ([../page-kinds/topic-root.md](../page-kinds/topic-root.md)).
- **Keep cross-references current**: when a page's time changes, the times quoted for it in its siblings' and root's Further reading are updated at the wiring pass. Stale "19 min" mentions were left on the benchmarks children.

## Privacy in text
- **Never write**: the home path, the scratchpad path (it contains the login name), hostnames, network addresses, account details, git identity, emails or tokens.
- **Scrub before embedding**: logs, tracebacks, HLO dumps and `kubectl` output carry absolute paths and hostnames; strip them to repo-relative or package-relative paths.
- **Grep everything you commit** ([../build/checks.md](../build/checks.md)).
- **Real people**: short excerpts of web text only, PII-scrubbed. Never a private individual's details or images.

---
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 9ee6d1ea, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)

Sources distilled: CLAUDE.md (Writing); html_utils/BRIEF_page_agent.md (sourcing, labels); html_utils/interactive-html-ideas.md section 2 (independently vs by construction, read from figure, dated readings); html_utils/methods/papers.md (closed details reading time); html_utils/methods/tech_news.md; kb_briefs gm/mi/jx/dc (labels, PRIVACY); memory benchmarks, swe, gm and os topic logs.
