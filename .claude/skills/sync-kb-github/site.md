# The reading site

Since 2026-10-23 the knowledge base is read on a private static site built from this repo; Notion keeps an index that links to it, plus the videos. The site is a build output: `html_utils/build_site.py` writes `site/` (gitignored), Pagefind adds full-text search, and the GitHub workflow `.github/workflows/site.yml` deploys it to Cloudflare Pages on every push to main that touches a page.

## What the build does
- Copies every page's `index.html` (and its `img/` folder) to `site/<path under technical_knowledge_base>/index.html`.
- Adds a small bar at the top of each page: home, breadcrumb, search.
- Rewrites links to Notion pages that are in `pages.json` into site links (same tab). Notion URLs left inside script data go through `/p/<id>/`, a redirect page; ids not in `pages.json` redirect back to Notion.
- Writes the home page: the search box and the whole tree by section.
- Preview locally: `python3 html_utils/build_site.py <scratch>/site`, then `(cd html_utils && NPM_CONFIG_USERCONFIG= npx -y pagefind@1.3.0 --site <scratch>/site)`, then serve the folder with `python3 -m http.server` bound to 127.0.0.1.

## One-time setup (Khalid's steps, in this order, so the site is never public)
1. **Cloudflare account** (free plan).
2. **Create the Pages project** named `technical-kb` (Workers & Pages, Create, Pages, Upload assets; upload any placeholder file). Its address is `technical-kb.pages.dev`.
3. **Lock it with Access** (Zero Trust, free up to 50 users): Access, Applications, Add an application, Self-hosted. Add two hostnames: `technical-kb.pages.dev` and `*.technical-kb.pages.dev` (the wildcard covers preview deployments). Policy: Allow, include Emails, your own address. Login method: one-time PIN (or Google).
4. **Test** in a private browser window: both `https://technical-kb.pages.dev` and any preview URL must show the Cloudflare login, not the placeholder.
5. **API token**: My Profile, API Tokens, Create token, template "Edit Cloudflare Workers" (or a custom token with Account, Cloudflare Pages, Edit). Note the Account ID from the dashboard sidebar.
6. **GitHub secrets** on the repo: Settings, Secrets and variables, Actions: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Until both exist, the workflow builds and skips the deploy.
7. **First deploy**: Actions, site, Run workflow. Then open the site, log in, check a few pages and the search.

## Notion after the move
The Notion tree stays as the index: each page keeps its title and child pages, and its embed is replaced by one line linking to its site URL (plus the video block where there is one). That migration is one pass by the lead after the first deploy, approved by Khalid. Until it runs, Notion embeds still work as before and `SKILL.md` publishing still applies.
