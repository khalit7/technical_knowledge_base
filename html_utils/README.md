# html_utils

Runtime tools the knowledge base pages are checked and published with. How pages are built (and why) lives in the `explainer-page` skill (`.claude/skills/explainer-page/`); videos in `explainer-video`; publishing in `sync-KB-github`.

| File | What it does |
|---|---|
| `checkpage.sh <page folder>` | Builds and checks a page: puppeteer at phone and desktop width, light and dark, errors, clipping, em-dashes. Must end `fail=0`, `emdash 0`, `errbox 1`, `clipped 0`. |
| `tabshot.mjs`, `clipcheck.mjs` | Screenshots per tab and the clipping check, used by `checkpage.sh`. |
| `tex2mathml.mjs` | Converts LaTeX to MathML at build time for maths pages. |
| `sync_status.py` | Rebuilds every page and lists those whose `index.html` differs from what Notion holds; `--record <folder>` records the published hash. |
| `page_finalize.py`, `paper_finalize.py` | After publishing: mark `html_only`, record the hash, commit. |

Setup: `cd html_utils && NPM_CONFIG_USERCONFIG= npm ci` (puppeteer with its own Chrome).
