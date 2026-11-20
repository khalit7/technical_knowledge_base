# html_utils

Runtime tools the knowledge base pages are checked and published with. How pages are built (and why) lives in the `explainer-page` skill (`.claude/skills/explainer-page/`); videos in `explainer-video`; publishing in `sync-kb-github`.

| File | What it does |
|---|---|
| `checkpage.sh <page folder>` | Checks a built page (run `bash <page>/src/build.sh` first): every tab in light at 920 and 1400 px and dark at 390 px, errors, sideways scroll, clipping, em-dashes; screenshots in `<page>/.shots/`. Must end `fail=0`, `emdash 0`, `errbox 1`, `buddy 1` (the AI buddy loader, exactly once), `clipped 0`. |
| `verify_layout.mjs <page folder> <shots dir>` | The lead's check of the 2026-11-06 layout rules: visuals inside splits, two columns at 1400 px, every 3D stage autoplays once in view and never under reduced motion, step lists as long as their stages. Ends `problems N` (must be 0); "(check autoplay)" lines are information. Shots go outside the repo. |
| `tabshot.mjs`, `clipcheck.mjs` | Screenshots per tab and the clipping check, used by `checkpage.sh`. |
| `tex2mathml.mjs` | Converts LaTeX to MathML at build time for maths pages. |
| `sync_status.py` | What is left to publish: failed builds, uncommitted pages, unpushed commits. `--no-build` is safe while agents edit. |
| `audit_pages.mjs`, `audit_pages.py` | Measure every page from the rendered DOM: core and closed-detail minutes, visuals inline and in tabs; `--concepts` flags concepts taught on several pages. |
| `ledger.py` | The knowledge ledger: `init` drafts a page's units, `check` proves no non-fat unit was lost in a rebuild. |
| `check_times.py` | Lists reading times quoted for other pages that no longer match those pages' headers (`--page` for one page; `--fix` rewrites the unambiguous ones). |
| `build_site.py` | Builds the reading site (GitHub Pages) from every page, with links rewritten and `p/<id>/` redirects. |
| `learning_map.py`, `check_learning_map.mjs` | The home page's learning map from the strict `prereqs` in `pages.json`: `learning_map.py check` validates the graph (the build fails on an error); the `.mjs` builds to a scratch folder and checks the map in a browser. |
| `whats_new.py` | The home page's first block, What's new (the latest tech-news issue and the newest papers), and the Tech news and Papers index pages; `whats_new.py check` validates the data each card needs (the build fails on a problem). |
| `kb_buddy.js`, `kb_buddy_loader.js`, `apply_buddy.py` | The AI buddy, on every page. Pages carry only the small loader (the marked `kb-buddy` block, written by `apply_buddy.py`: `<page>...`, `--all`, `--check`); it fetches the shared `kb_buddy.js` (published at the site root by `build_site.py`) when a Claude key is saved or the reader taps "AI buddy", so editing `kb_buddy.js` needs no page rebuild. What it is: a toolbar over the page (pens, highlighter, lasso, text) whose marks stay pinned to the page; sticky-note chats beside them that cite the page's sentences and can search the knowledge base and the web; a Conversations overview; a handwritten notebook with the Tom Riddle diary; page edits on request (rewrite a block, add a visual as a split section), each kept or discarded. Everything syncs across devices through the private repo `khalit7/kb-notes` with a GitHub token from Settings; the Claude key stays in the browser. |
| `kb_changes.py` | The page changes Khalid marked Keep in the AI buddy, read from the private notes repo `khalit7/kb-notes` (through `gh api`, or `--notes <clone>`), as a Markdown bundle per page (or `--json`): what each change replaced, what was asked, and the version shown, with how to fold it into the page's `src/parts` (in the page's own style) and the `data-kb-edit="<id>"` attribute to put on the element that carries it, after which the buddy clears the record. `--page <part of path>`, `--all` (also changes not kept), `--out <file>`. Run only when Khalid asks. |
| `cloud_setup.sh` | Sets up a cloud sandbox (the weekly routine) to build and check pages. |

Setup: `cd html_utils && NPM_CONFIG_USERCONFIG= npm ci` (puppeteer with its own Chrome).
