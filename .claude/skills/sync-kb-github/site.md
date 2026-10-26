# The reading site

Since 2026-10-23 the knowledge base is read on a public static site built from this repo: https://khalit7.github.io/technical_knowledge_base/ (GitHub Pages). Khalid chose public: anyone may read it; only he can change it, because only he can push to the repo. Notion keeps an index that links to the site, plus the videos.

`html_utils/build_site.py` writes the site (a build output, gitignored), Pagefind adds full-text search, and `.github/workflows/site.yml` builds and deploys it on every push to main that touches a page. Publishing a page is therefore: build it, check it, commit, push.

## What the build does
- Copies every page's `index.html` (and its `img/` folder) to `<out>/<path under technical_knowledge_base>/index.html`.
- Adds a small bar at the top of each page: home, breadcrumb, search.
- Rewrites links to Notion pages that are in `pages.json` into site links (same tab). Notion URLs left inside script data go through `p/<id>/`, a redirect page; ids not in `pages.json` redirect back to Notion.
- Writes the home page: the search box, the learning map, and the whole tree by section in a closed block "All pages by section".
- The second argument is the base path: `/technical_knowledge_base/` on GitHub Pages.

## The learning map
The home page opens with a map of the order to study in, built by `html_utils/learning_map.py` from the `"prereqs"` field of `technical_knowledge_base/pages.json`.
- **Data**: every topic page (status `html_only`, not Papers or Tech news) has `"prereqs"`: the ids of the pages a reader cannot understand its core without (strict; a subset of its "You need" line, never every link). A new page must get a `"prereqs"` entry when it is registered (`[]` when it needs nothing).
- **What it shows**: the overview is a layered graph of the topics, in study order from top to bottom. Topic A sits in a layer below topic B when at least a third of A's pages build on B (a page of B is in the page's prerequisite closure; the share is the constant `STRONG` in `learning_map.py`), and a solid line joins them, thicker when a larger share of A's pages do (tooltip "x of n pages build on it"); weaker links (some pages, under a third) are not drawn until a topic is focused, then dotted, with the card's "Some pages also use" list. Topics with no such strong link either way sit after the layers in a band "Start anytime". Each card gives pages and hours, its pages per stage (a page's stage is its longest prerequisite chain) and how many of its pages need no other topic; hovering or tapping a card lights it, what it builds on and what builds on it. Clicking a topic grows the card into its pages by stage (pages from other topics it needs as a dashed first column); "Path to" gives any page's prerequisite closure in a valid study order with total and per-topic minutes, stepped only when the reader presses Step or Play. Below 900 px the same layers and band are rows of cards with "Builds on" text. Everything is laid out at build time (layers, barycenter and exhaustive crossing reduction); the page carries one inline SVG and a small JSON, no library.
- **Check before pushing**: `python3 html_utils/learning_map.py check`. An unknown id, a self-loop or a cycle fails the site build (and so the deploy); a page without `"prereqs"`, an old id (alias), a redundant edge, or a prereq the page's own "You need" line no longer links are warnings. After changing the map's code, run `node html_utils/check_learning_map.mjs <scratch>` (builds to scratch, checks every card's layer and numbers against the rule recomputed from pages.json, that every strong link is drawn and no weak one before a focus, the focus sets, links, path order and topic strip, reduced motion, and that nothing moves before a click; saves screenshots).

Preview locally exactly as deployed:
```
python3 html_utils/build_site.py <scratch>/site/technical_knowledge_base /technical_knowledge_base/
(cd html_utils && NPM_CONFIG_USERCONFIG= npx -y pagefind@1.3.0 --site <scratch>/site/technical_knowledge_base)
(cd <scratch>/site && python3 -m http.server 8732 --bind 127.0.0.1)   then open http://127.0.0.1:8732/technical_knowledge_base/
```

## One-time setup (Khalid)
1. On GitHub: the repo, Settings, Pages, "Build and deployment", Source: **GitHub Actions**.
2. Actions, workflow "site", Run workflow (or push any page change).
3. Settings, Collaborators: nobody else listed, so only he can push.

## Notion
Notion keeps the same tree; each page is one link line to `p/<id>/` on the site, plus its video and child pages ([SKILL.md](SKILL.md)). The `p/<id>/` redirect pages are written by the build for every page in `pages.json`, so a Notion link never breaks when a page moves in the repo.
