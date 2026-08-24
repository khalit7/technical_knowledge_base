---
name: kb-add-paper
description: Add a research paper to the knowledge base end to end. Downloads the PDF, reads it, writes a structured summary, indexes it, tracks it, and cross-links it from topic pages. Use when Khalid gives an arXiv id/URL or asks to add a paper.
---

# Add a paper

Read `GOAL.md` conventions first (no em-dashes; dated entries).

Input: an arXiv id/URL, a PDF URL, or a local PDF path. If only a title is given, find it
on arXiv first.

## Steps

1. **Folder**: `papers/YYYY-MM_short-name/` where YYYY-MM is the paper's first
   publication date and short-name is a kebab-case handle (e.g. `2023-05_dpo`).
2. **Download** the PDF to `paper.pdf` (arXiv: `https://arxiv.org/pdf/<id>`). Verify
   with `pdfinfo` that it is a valid, non-trivial PDF.
3. **Read the paper** (the Read tool handles PDFs; use page ranges, max 20 pages per
   call). Read enough to actually understand it: abstract, intro, method, key
   experiments, conclusion; skim the rest.
4. **Write `summary.md`** with this structure:
   - Title, authors/lab, date, links (arXiv, project page/blog/code if any)
   - **Best resources**: 2-4 links to the best external explanations, found via web
     search (skip if none are good)
   - **Problem**: what gap it addresses
   - **Method**: the core idea, in enough detail to reconstruct the approach
   - **Results**: headline numbers and what they mean
   - **Why it matters**: significance, influence, what it changed
   - **Connections**: links to related papers in `papers/` and the KB topics it belongs to
5. **Index**: add a row to `papers/INDEX.md` (paper, year, topics, one-line takeaway),
   keeping the table sorted newest first.
6. **Cross-link**: add the paper to the Papers section of each relevant topic
   `summary.md`.
7. **Tracker**: unchecked box at the top of the Papers section of `TRACKER.md`.
8. **Commit** as `add paper: <short-name>`.
