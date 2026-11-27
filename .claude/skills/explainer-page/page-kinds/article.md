# Page kind: an article page (a page under Articles)

The article method: one strong piece of technical writing (a research blog post, a long explainer, an essay with evidence, a postmortem) taught as its own page, in the article's own order, anchored into the article, with its evidence judged, what others replied, and where it moves the knowledge base. Added 2026-11-27 at Khalid's request: the best articles of each window get a page like papers do; the tech-news issue mentions them in a line or two and links here.

It is the paper method ([paper.md](paper.md)) adapted to a web page. Read that first; this file says only what differs. **A suggestion, not a template**: departures go in `src/README.md`.

## What earns a page
Chosen by the `update-kb` pass (its "Articles" step and [../../update-kb/reading-sources.md](../../update-kb/reading-sources.md)), up to about 5 a window, or named by Khalid.
- **Yes**: an argument or result of its own (the weight-space programming post: a new idea with experiments and numbers); a careful explainer that teaches a subject better or more currently than anything the knowledge base links (Sebastian Raschka's long posts); a postmortem or measurement with real data; an essay whose claims are checkable and widely discussed.
- **No**: launch posts and vendor marketing (news items), rewrites of other articles, listicles, tutorials that only wrap an API, anything paywalled beyond its teaser, anything whose substance is a paper (the paper gets the page; the post goes in its Further reading).
- **An article that mainly explains a concept the knowledge base already owns** still gets a page when it earns one, but a short one: what its framing adds, where it disagrees with the owner, which figure or example is better than ours. The concept stays on its owner, which gains a Further reading entry for the article (and, when the article shows the owner is wrong or dated, the fix, as the editorial rules say).

## Inputs
- The article's URL, title, author(s), site, publication date (and the date of any later edit or addendum).
- Its responses: rebuttals, replications, the author's own replies, the Hacker News or Lobsters thread (points and comments as a dated reading). Search for them; a widely read post nearly always has some.
- Fetch the article itself and read it until you could teach it. Keep a plain-text extract in `src/inputs/article.txt` (`extract_article.py`: the main text, no navigation, author emails replaced by "[email removed]", long dashes by `--`), never the whole HTML page or files over about 1 MB. Record the fetch date: blog posts change without a version number.

## Copyright and the author's voice
An article is someone's prose, usually without an open licence.
- **Summarise and teach in our words**; quote only a sentence or two where the exact wording matters, marked as a quote and linked.
- **Figures**: embed the author's figure only when its licence allows (state it in `img/CREDITS.md` and under the figure); otherwise redraw what it shows as SVG from the numbers the article prints, credited ("redrawn from <article>, Figure 2").
- The page must send readers to the article, not replace it: the headline card's first link is "read it (N min)" to the original.

## Structure
Like a paper page, tabs only where they earn their place (most article pages are one Reading tab plus Further reading).
1. **The article** (Reading, open by default)
   - **Headline card**, generated from `article.json`: title, author(s) and affiliation, site, publication date (and "updated <date>" when it has an addendum), the article's own reading time, the one-line takeaway, up to three headline numbers each linked into the article, the one-line verdict, links: read it, its code or logs, the discussion thread.
   - **Top, after the card**, as on every page: the idea in one sentence; one hero visual; "You need" (links to owners); new terms.
   - **The argument in the article's own order.** Every section carries an "in the article" margin label and every claim an inline link into the article (below). An essay's structure is looser than a paper's: name each step of the argument by what it claims.
   - **How much of this to believe**: as in [paper.md](paper.md), with what blog evidence typically lacks: experiments without released code or seeds, cherry-picked examples, numbers without a baseline, a demo presented as a capability, claims of follow-ups or adoption that are the author's own. Fair both ways: an addendum that answers critics counts in the author's favour.
   - **What the responses said** (open, short): each rebuttal, replication or reply with who, when and what it found, linked; the discussion thread's size as a dated reading. Where a response is right, the verdict says so.
   - **Where it moves the knowledge base**: which pages it sharpens, contradicts or extends, each linked, one sentence each. The knowledge itself lands on those pages in the same run (the `update-kb` integration step), never only here.
2. **A live ingredient**, only when it teaches more than reading, chosen as on a paper page (a toy, a simulation, a recomputed figure); most explainers and essays have none, and that is fine.
3. **Further reading**, generated from `article.json`: the article, its code and logs, the responses, the papers it rests on (our paper pages first), connected topic pages, and the parent Articles page.

## Anchors into the article
Blog posts rarely have stable anchors. Link with text fragments, which Chrome and Safari both follow and highlight:
- `{{text|ar:exact words from the article}}` becomes `<url>#:~:text=exact%20words%20from%20the%20article`: four to eight consecutive words, copied exactly from `src/inputs/article.txt`, unique in the article.
- `[[ar:exact words|label]]` is the "in the article" margin label for a section; where the page has real heading ids (`<h2 id="...">`), `{{text|ah:<id>}}` links `<url>#<id>` instead.
- `build.sh` checks every fragment against `src/inputs/article.txt` and fails on one it cannot find, so an edited article shows up at the next rebuild.

## Data: `src/article.json`
The site's What's new block and Articles page read it (`html_utils/whats_new.py`; `python3 html_utils/whats_new.py check`, run by the site build, fails an article page without the required fields):
- required: `title`, `url`, `author` (people, comma-separated, affiliation in brackets), `site` (the blog or publication), `published` (`YYYY-MM-DD`), `takeaway`, `topics` (`{t, id, n}` with ids that are pages in `pages.json`);
- also: `short`, `notion_id`, `parent` (`{"title": "Articles", "id": "<Articles id>"}`), `updated`, `kind` (research post, explainer, essay, postmortem, tutorial), `read_time` (the article's own, measured at 230 words a minute from the extract), `fetched`, `verdict`, `headline` (`{v, u, k, d, at, l}`, `at` a text fragment), `code`, `discussion` (`[{t, u, points, comments, read}]`), `responses` (`[{t, by, u, date, time, n}]`), `resources`, `kb`.
- **Takeaway scoped to the article's own evidence**, under the same rule as a paper's ([paper.md](paper.md), Teaching contract on a paper page): what it was shown on, how many runs, which metric, no "first", "proves" or "beats" without support. One text in `article.json`, the card and the issue's mention.

## Build
Start from a paper page's `src/` (the reference folder in [paper.md](paper.md)) and change what the source needs: `mk_paper.py` becomes `mk_article.py` (card, Further reading and data from `article.json`), the `ax:` macro becomes `ar:`/`ah:` with the fragment check, `extract_paper.py` becomes `extract_article.py`. The first article page built becomes the reference folder for the rest: name it here when it lands.

Everything else is as on every page: the [teaching contract](../teaching/teaching-contract.md), split layout, a closed `<details>` for provenance and per-item lists, a dated closed block "Since the article (checked <date>)" for volatile follow-ups, the ledger (`ledger.py init`, article text `core`, provenance `depth`, mechanisms taught elsewhere `owned:<path>`), reading time in the header, the checks in [../build/checks.md](../build/checks.md).

## Registration (the lead, never the builder)
- Folder `technical_knowledge_base/whats_new/articles/<slug>/` (slug from the title, short).
- Notion: a child page of Articles titled with the article's title, its body the link line from the `sync-kb-github` skill.
- `pages.json`: `path`, exact `title`, `id`, `"parent": "Articles"`, `status` `html_only`; no `section`, no `prereqs` (articles are not on the learning map).
- Its line in `whats_new/articles/README.md`.

## Many at once
One subagent per article with [../orchestration/briefs/article-agent.md](../orchestration/briefs/article-agent.md), at most three pages at once; the lead checks and publishes each.

## Time budget
About 1.5 to 2.5 hours for an explainer or essay with nothing to run; 3 to 4 hours with a live ingredient or recomputed figures.

## Lessons (dated)
None yet.
