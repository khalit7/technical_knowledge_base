# html_utils

Runtime tools the knowledge base pages are checked and published with. How pages are built (and why) lives in the `explainer-page` skill (`.claude/skills/explainer-page/`); videos in `explainer-video`; publishing in `sync-kb-github`.

| File | What it does |
|---|---|
| `checkpage.sh <page folder>` | Builds and checks a page: puppeteer at phone and desktop width, light and dark, errors, clipping, em-dashes. Must end `fail=0`, `emdash 0`, `errbox 1`, `clipped 0`. |
| `tabshot.mjs`, `clipcheck.mjs` | Screenshots per tab and the clipping check, used by `checkpage.sh`. |
| `tex2mathml.mjs` | Converts LaTeX to MathML at build time for maths pages. |
| `sync_status.py` | What is left to publish: failed builds, uncommitted pages, unpushed commits, Notion pages not yet link pages. `--no-build` is safe while agents edit. |
| `page_finalize.py`, `paper_finalize.py` | Publish: mark `html_only` and commit each page's own files with `pages.json` (then push). |
| `audit_pages.mjs`, `audit_pages.py` | Measure every page from the rendered DOM: core and closed-detail minutes, visuals inline and in tabs; `--concepts` flags concepts taught on several pages. |
| `ledger.py` | The knowledge ledger: `init` drafts a page's units, `check` proves no non-fat unit was lost in a rebuild. |
| `check_times.py` | Lists reading times quoted for other pages that no longer match those pages' headers (`--page` for one page). |
| `build_site.py` | Builds the reading site (GitHub Pages) from every page, with links rewritten and `p/<id>/` redirects. |
| `learning_map.py`, `check_learning_map.mjs` | The home page's learning map from the strict `prereqs` in `pages.json`: `learning_map.py check` validates the graph (the build fails on an error); the `.mjs` builds to a scratch folder and checks the map in a browser. |
| `cloud_setup.sh` | Sets up a cloud sandbox (the weekly routine) to build and check pages. |

Setup: `cd html_utils && NPM_CONFIG_USERCONFIG= npm ci` (puppeteer with its own Chrome).
