---
name: kb-add-paper
description: Add a research paper to the knowledge base end to end, Notion first (the source of truth) then this repo. Use when Khalid gives an arXiv id/URL or asks to add a paper.
---

# Add a paper

Notion is the source of truth; create the paper there first, then mirror it into this
repo in the same session. Read `GOAL.md` conventions first (no em-dashes; dated
entries). Notion root page id: `3c65c17b-0d0d-81c7-b646-e548e65d9446` (its child
"Operating guide (for Claude)" is the binding manual).

Input: an arXiv id/URL, a PDF URL, or a local PDF path. If only a title is given, find
it on arXiv first.

## Steps

1. **Read the paper** (download the PDF to the repo folder first, step 4a, then Read it
   with page ranges, max 20 pages per call): abstract, intro, method, key experiments,
   conclusion; skim the rest.
2. **Write the summary** with this structure:
   - Title, authors/lab, date, links (arXiv, project page/blog/code if any)
   - **Best resources**: 2-4 links to the best external explanations, found via web
     search (skip if none are good)
   - **Problem**, **Method** (enough detail to reconstruct the approach), **Results**,
     **Why it matters**, **Connections** (related papers and topics)
3. **Notion (source of truth)**: create a child page under the Papers page with that
   summary (no PDF upload; relative repo links flattened to text), add a row at the TOP
   of the Papers index table, and add an unchecked box at the top of the Tracker page's
   papers section.
4. **Repo mirror**, same session:
   a. Folder `papers/YYYY-MM_short-name/` (paper's first publication date, kebab-case
      handle, e.g. `2023-05_dpo`); download the PDF to `paper.pdf` (arXiv:
      `https://arxiv.org/pdf/<id>`), verify with `pdfinfo`. PDFs live ONLY in the repo.
   b. Write `summary.md`, add the row to `papers/INDEX.md` (newest first), cross-link
      from relevant topic `summary.md` files, add the `TRACKER.md` box.
5. **Commit** as `add paper: <short-name>`; push if a remote exists.
