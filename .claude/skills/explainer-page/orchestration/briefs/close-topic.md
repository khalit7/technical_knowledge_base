# Brief: close a topic after its pages were rebuilt

Fill in the `{{...}}` slots. One agent per topic, after every child has been rebuilt with [rebuild-page.md](rebuild-page.md) and committed. It finishes the root and makes the topic consistent.

---

You are closing the topic `{{ROOT_PATH}}` of Khalid's technical knowledge base (repo root: the current git checkout). Its children have just been rebuilt to the teaching contract; each child's `src/README.md` says what changed. Your job: finish the root and make every page of the topic agree with every other.

READ FIRST: `.claude/skills/explainer-page/teaching/teaching-contract.md`, `page-kinds/topic-root.md`, `technical_knowledge_base/OWNERS.md`, the root's `src/README.md`, and every child's `src/README.md`. Then the follow-ups the lead collected from the children's reports:
{{FOLLOWUPS}}

DO
1. **The root.** Apply the follow-ups that concern it: where a child now carries a unit the root still teaches, label it `owned:<child path>` in the root's `src/ledger.json` (the key must be on the child) and replace the passage with the one orienting sentence and a link. Retire root sections or tabs that now duplicate a child; a retired section's knowledge units are labelled `owned:<child path>` with a key found on that child, never `fat` because the section was removed (fat is only a wind-up, heading, widget instruction, question stem or restatement; 2026-10-24: a close-out labelled 328 substantive units fat). A unit no child carries goes to the child first, as a closed depth block if needed. Fix the root's child cards: each child's current title, one line on what it covers, and its reading time exactly as its header states. The root keeps only the map, the comparisons, the definitions they need and the tools that span several children. If the root was never rebuilt to the contract, rebuild it with [rebuild-page.md](rebuild-page.md)'s method.
2. **Every page of the topic** (root and children): find stale references (`grep` the built `index.html` and `src/parts` for old tab names, removed tab ids such as `#t-...`, old section numbers, and reading times quoted for siblings) and fix them in `src/parts`. Every quoted reading time matches the target page's header (`python3 html_utils/check_times.py --page <page>` lists candidates for each page; it can flag a nearby time that belongs to something else, so judge each hit). Every link to a tab names a tab that exists (check the target's `data-t` ids).
3. **Pages outside the topic** that link into it with a stale tab id or a removed section: list them in your report (do not edit them).
4. Rebuild every page you changed; `sh html_utils/checkpage.sh <page>` ends `fail=0, emdash 0, errbox 1, clipped 0`; `python3 html_utils/ledger.py check <page>` prints problems 0; the page's own checks pass.

HARD RULES: do the work yourself; do not spawn subagents (the lead counts every running agent against the concurrency cap). Never run a git command that changes the index or history (no `git add`, `git mv`, `git rm`, `git commit`, `git stash`); use plain `rm` and `mv`. No em-dashes anywhere. British spelling. No home or scratchpad paths, hostnames, emails or tokens in the repo. Do not touch Notion, `pages.json` or `OWNERS.md` (propose changes). Edit only folders under `{{ROOT_PATH}}`. Do not invent numbers. Never pkill or killall. Scratch: `{{SCRATCH}}`.

REPORT (under 400 words): root minutes before and after; sections or tabs retired; every stale reference fixed (page, what); outside pages with stale links; OWNERS.md changes proposed; check results.
