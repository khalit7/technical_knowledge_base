# Reasoning models and test-time compute (HTML-only page)

Page: https://app.notion.com/p/3c65c17b0d0d8190b9b4cd0acbcb66df

- `live.md`, `live_before_delete.md`: verbatim Notion fetch of 2026-10-01 (page_last_edited_at 10:57:43Z), extracted by script from the fetch result.
- `parts/`: page source. `build.sh` assembles `visual.html` (each JS part in its own `<script>`, error box, tabs wiring last; `{{text|@alias}}` links expand to target=_blank links; checks for em dashes and unexpanded links; computes reading time).
- `recompute.py`: every default the page reproduces (pass@k, Chen, majority and exact plurality with a brute-force check, Gao best-of-n, GRPO, KV, Brown fits).
- `check.mjs`: exercises every control in 4 tabs at 920 and 390 px, light and dark; checks NaN/undefined, sideways scroll, animation frames, error box. `tabshot.mjs TAB SCHEME WIDTH OUT [click]` (SEL env for an element) screenshots.
- `coverage.py` writes `coverage.json` (every live fact, where the HTML carries it, and an automatic presence check).
- `viz_ideas.md`: ranked ideas, data, rejected ones.
- `src/`: fetched sources (papers as PDF + pdftotext, docs, posts).

Tabs: Reading, Sampling lab, Published curves, Further reading.
