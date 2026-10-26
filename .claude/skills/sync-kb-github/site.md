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
- **What it shows**: an overview of the topics in stages (a topic sits after every topic it borrows from; topics that need pages from each other share a stage in a dashed box), each topic's pages by stage on click, and "Path to": any page's full prerequisite closure in a valid study order with total reading minutes, stepped through only when the reader presses Step or Play. Below 640 px it becomes stage lists. The layout is computed at build time (layers, barycenter crossing reduction); the page carries one inline SVG and a small JSON.
- **Check before pushing**: `python3 html_utils/learning_map.py check`. An unknown id, a self-loop or a cycle fails the site build (and so the deploy); a page without `"prereqs"`, an old id (alias), a redundant edge, or a prereq the page's own "You need" line no longer links are warnings. After changing the map's code, run `node html_utils/check_learning_map.mjs <scratch>` (builds to scratch, checks links, layout, path order and that nothing moves before a click, saves screenshots).

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
