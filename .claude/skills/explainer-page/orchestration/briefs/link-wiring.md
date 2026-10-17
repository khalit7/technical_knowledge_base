# Brief template: the link-wiring pass

Purpose: the fill-in prompt for the agent that, once every child of a topic has a Notion id, turns each plain-text mention of a sibling or child page (and every "being built" card) into a real link across the root and all its children, then rebuilds and checks every page.

## How to fill it
- Run it after the children are registered (ids in `pages.json` and the READMEs). Give the agent the id list from `pages.json` (or a scratch file listing slug, exact title and id per child).
- It can carry a few small root corrections too (as on 2026-10-17); keep those as a short numbered list and make the agent check each against the child's files, as in [fix-pass.md](fix-pass.md).
- Placeholders as in [common.md](common.md); `{{IDS_SOURCE}}` is where the ids are listed.

---

## Template

Link-wiring pass for the knowledge-base topic "{{TOPIC_TITLE}}" (folder `{{ROOT_FOLDER}}`: the root `src/` and its {{N}} child folders). The child pages now have Notion ids: read {{IDS_SOURCE}} (`technical_knowledge_base/pages.json` entries whose parent is "{{TOPIC_TITLE}}", or the topic section of a scratch id list). Never write the scratchpad path into the repo. Rules: no em-dashes; CPU only, light; run `sh {{TOOLS}}/guard.sh` before browser checks; one browser at a time.

1. Everywhere a sibling or child page is named in plain text or marked "being built" (the root's `src/read/links_todo.md` lists its places; also the root Reading child cards, "Go deeper" notes in the Reading and labs, Further reading cards; each child's sibling mentions in its parts and notes), turn the mention into `{{visible text|n:<id>}}` (32-hex id, no dashes), keeping the visible wording; bold or italic markup stays around the link. Where a card says "being built" for a page that now exists, give its title, reading time (from its README, or measured with that page's own rule) and one line from its README.
2. Do not link mentions that mean a model, method or tool rather than the page (for example "diffusion" as a method is not the "Diffusion from zero" page).
3. Mentions inside generated data or escaped strings: change the generator script if that is simple and rerun it; otherwise leave them and list them.
4. Do not change anything else.

Then for the root and each child: `sh src/build.sh`; its quick data and UI checks (each page's `src/` has them; skip any that need clusters, GPUs or scratch data that no longer exists, and say which); `sh html_utils/checkpage.sh <folder>` (fail=0, emdash 0, errbox 1, clipped 0). Grep each built `index.html` for leftover "being built" and for unexpanded `{{` `}}`. Privacy grep (`/Users/`, `Users-`, `claude-`, `glpat`, `sk-ant`, emails). Delete `__pycache__` and `.shots`. Mark the root's `src/read/links_todo.md` done. Do not commit and do not write to Notion. Report (once), per page: links wired, checks, anything left in plain text and why.

---

## Sources distilled
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 9ee6d1ea, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)

The lead's prompts "ML infra: wire child-page links" and "Generative: wire links and root fixes" (2026-10-17); `links_todo.md` from the ML infra root fix pass (2026-10-16, 36 plain-text mentions).
