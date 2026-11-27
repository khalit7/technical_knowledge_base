# Page kind: a weekly tech-news issue

**The design of 2026-11-27** (Khalid: "as simple as possible and suitable for a Monday morning reading"): one tab with a short paragraph on the week and a card per story, few stories; everything else in a Further reading tab. Every issue, old ones included, is built this way; the reference is `technical_knowledge_base/whats_new/tech_news/2026_11_23_tech_news/`.

## What the page is for
Khalid reads it on Monday morning, in six to eight minutes, to know what happened and what of it matters to someone who builds with LLMs. The knowledge lives on the pages the cards link to; the issue is the week's front page and its record.

## Shape
- **Header** (generated): "Tech news, <window>", the span, the number of stories, the reading time; two tabs, **This week** and **Further reading**. An issue always opens on This week.
- **This week**:
  1. **The week in brief**: one paragraph, about 100 words (at most 170): what the week was about and the one or two things worth remembering. Plain, no hype.
  2. **Top stories**: **5 to 7 cards, never more** (3 in a quiet week is fine). Each card: a kind label (Model, Paper, Article, Research, Industry, Chips, Tools, Security, Policy) and date; the headline, a sentence that states the news; two or three sentences with the key number; **Why it matters**, one sentence for someone who builds with LLMs; the links: the primary source (with a time), and **Our page** (the paper page, the article page, or the owner page this run updated).
  3. **New in the knowledge base**: one line per new paper page (its takeaway, short), per new article page (author and one line), and per page this run updated (what changed). This is where papers and articles get their short mention without each taking a story slot.
- **Further reading**: every other item of the week, one line each (bold lead, date and source in brackets, links with times), grouped by kind (Models, Research and papers, Industry, Compute and chips, Tools and agents, Security, Policy, Hacker News); then the previous and next issues and all issues (generated).
- **No custom visuals.** The diagrams belong on the pages the cards link to.

## Choosing the stories
The hardest editorial step. Rank every item of the window by what it changes for someone who builds with LLMs (capability and price at the frontier, a method that changes practice, a security lesson, a shift in who controls compute or models), then by how many people will talk about it. Keep the top 5 to 7. Merge items that are one story (two labs' launches that close the same gap). A paper or article that is among the week's biggest gets a card; the rest are in New in the knowledge base or Further reading. Hacker News size alone does not make a story.

## Content as data: `src/issue.md`
The whole issue in one Markdown file; the format is in `html_utils/issue_page.py` (its docstring), and `src/build.sh` is three lines that run it. The first line is the intro, "One week, YYYY-MM-DD to YYYY-MM-DD: <what the week was about>" ("Three weeks, ..." for a longer window): the home page's What's new card shows it with the story headlines (`html_utils/whats_new.py`). `python3 html_utils/issue_page.py --check <issue>` fails a missing brief, fewer than 3 or more than 7 stories, a story without kind, why or links, a story body over about 90 words, or an empty New in the knowledge base.

**The words are checked before publishing**, because they are the record: an item about a paper is written from the paper, or from its paper page when the run builds one (build that page first), never from the blog or abstract; it says which model and size, single runs or seeds, which metric, matched comparisons rather than each side's best, and the conditions a theorem needs; no "first", "proves", "beats" or "consistently" without support. It quotes the paper page's takeaway ([paper.md](paper.md)) or the article page's ([article.md](article.md)) rather than a new summary. A later correction is made in `issue.md` with a dated line under the story ("Corrected 2026-12-01: ..."), never silently.

## Rebuilding an issue published before 2026-11-27
Older issues kept their words in `src/issue.md` (from 2026-10-19) or `src/live.md` (a saved Notion fetch), with checks, corrections and follow-ups in `src/data/annotations.json`.
1. `git mv src/issue.md src/issue_original.md` (a `live.md` stays as it is).
2. Read the original and every note in `data/annotations.json` (Checked, Correction, Unconfirmed, follow-ups): a correction is folded into the new text, an unconfirmed claim is said to rest on its source, and a follow-up may go in a story as a dated line.
3. `python3 html_utils/issue_oneliners.py <original>` drafts Further reading; drop the items that became stories, and give a bare name a few words of what it is ("Inkling 2 Mini, Thinking Machines' 26B open model").
4. Write the brief, the 5 to 7 stories and New in the knowledge base (the paper pages, article pages and pages updated by that week's run: `git show --stat` of its commits, and the old Further reading tab), using only facts in the original and its annotations: nothing new is researched into an old issue.
5. Remove the old machinery (`parts/`, `data/`, `mk_*.py`, `check_stages.mjs`, `recompute.py`, `viz_ideas.md`; keep `inputs/` and the original source), copy `src/build.sh` from the reference issue, update `src/README.md` and the folder `README.md`, build, check.

## Checks before publishing
`python3 html_utils/issue_page.py --check <issue>`, `sh <issue>/src/build.sh`, `bash html_utils/checkpage.sh <issue>` (fail=0), `python3 html_utils/whats_new.py check`, the privacy grep ([../build/checks.md](../build/checks.md)), and a look at screenshots of both tabs at 1400 px light and 390 px dark (`node html_utils/tabshot.mjs`). An issue has no knowledge ledger and is not in `check_times.py`.

## Rules for the facts (kept from the earlier design)
- **Check every number** against the primary source.
- **When a source was rewritten** after publication, compare the Wayback capture nearest the issue date.
- **Launch-day superlatives** ("cheapest at its level"): check them against every model published the same day.
- **Counts that drift** (upvotes, stars, index readings) are dated readings ("read 23 November").
- **"Orders of magnitude" or "x times" claims**: find the two figures they divide.
- **A vendor's evaluation partner** is "with", not "independent"; a vendor's own figure is labelled as such.
- **"Nothing new shipped" claims**: verify them against the release APIs.
- **Never describe an escape or attack route** step by step.
- **Hosts that block automated reading** (Reuters, Bloomberg, openai.com): try the Wayback Machine, and say what stays unchecked.
- **Long dashes in saved source extracts**: replace them with `--`.
- **A narrated video**: its `<video>` block stays on the Notion page under the link line.

## History
Until 2026-11-27 an issue had a tab per section (At a glance, Top stories, Models, Research, Industry, Compute, Dev tools, Talk of the town, Further reading), a week strip, split visuals and boxes of checks beside verbatim text; the 2026-11-23 issue ran to 8 tabs, 50 items and about 4,000 words. Khalid found it too dense for a Monday read. Those sources are kept in each issue's `src/issue_original.md` or `src/live.md` and in git.
