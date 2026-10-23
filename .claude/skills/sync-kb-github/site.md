# The reading site

Since 2026-10-23 the knowledge base is read on a public static site built from this repo: https://khalit7.github.io/technical_knowledge_base/ (GitHub Pages). Khalid chose public: anyone may read it; only he can change it, because only he can push to the repo. Notion keeps an index that links to the site, plus the videos.

`html_utils/build_site.py` writes the site (a build output, gitignored), Pagefind adds full-text search, and `.github/workflows/site.yml` builds and deploys it on every push to main that touches a page. Publishing a page is therefore: build it, check it, commit, push.

## What the build does
- Copies every page's `index.html` (and its `img/` folder) to `<out>/<path under technical_knowledge_base>/index.html`.
- Adds a small bar at the top of each page: home, breadcrumb, search.
- Rewrites links to Notion pages that are in `pages.json` into site links (same tab). Notion URLs left inside script data go through `p/<id>/`, a redirect page; ids not in `pages.json` redirect back to Notion.
- Writes the home page: the search box and the whole tree by section.
- The second argument is the base path: `/technical_knowledge_base/` on GitHub Pages.

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

## Notion after the move
The Notion tree stays as the index: each page keeps its title and child pages, and its embed is replaced by one line linking to its site URL (plus the video block where there is one). That migration is one pass by the lead after the first deploy, approved by Khalid. Until it runs, Notion embeds still work as before and `SKILL.md` publishing still applies.
