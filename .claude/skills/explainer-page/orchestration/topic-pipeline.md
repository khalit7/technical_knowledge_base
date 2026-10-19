# Topic pipeline: building a root and its children with a team of subagents

Purpose: the end-to-end sequence the lead session follows for a new topic (or a full rebuild of an old one) built by subagents, plus the rules that kept ten topics safe, cheap and correct, and a short path for a single page.

The lead plans, briefs, verifies, commits, publishes and keeps the log. Agents research, run, build and check one unit of work each (one tab of the root, or one child page). Everything here was learned on the topics built between 2026-10-03 and 2026-10-17 (training, RAG, data curation, JAX, ML infra, generative and multimodal, and others).

## 0. Before anything: is this a team job?
- A root with labs and several children: yes, follow this file.
- One child page, one paper, one tech-news issue, one rebuild: see "Single page" at the end.
- A batch of papers: one agent per paper with [briefs/paper-agent.md](briefs/paper-agent.md), about four at a time (end of this file).
- Never launch the Workflow tool without Khalid's explicit opt-in. Plain subagents (the Agent tool) are fine.

## 1. Opening questions and the teaching plan
1. Ask the opening questions in [../understand/reader.md](../understand/reader.md): which topic, his level (usually "from zero"), which of the four goals (build, internals, judge and debug, interviews and design), what evidence is allowed (Mac local only, GPU or CPU only, Docker or not, paid APIs or not), how free you are with the old children (reuse, restructure, retitle, merge, retire), where the root goes and what happens to overlapping live pages in other topics, and how he wants to review. Ask only goals and preferences; decide the curriculum yourself ([../understand/reader.md](../understand/reader.md), "teach, don't ask scope").
2. If an old Notion root exists, read it and its children read-only and plan the coverage check ([../page-kinds/migrate-or-fold.md](../page-kinds/migrate-or-fold.md)). The old text is unverified notes: a floor of facts to carry or correct, never the scope.
3. Research until you can teach the spine yourself ([../understand/research.md](../understand/research.md)), then write the plan ([../understand/curriculum.md](../understand/curriculum.md)): the spine of the Reading tab, one running example, the labs (one per tab, usually five) plus a tool or model map, and the proposed children with one reason each. Present it; Khalid approves, rewords or drops children. He has often answered "All approved".
4. Map every old child to a new one. For an old child with no new equivalent, grep the planned pages for its key terms, report what is and is not covered, and ask: rebuild, fold into a new page, or retitle "TO DELETE: ..." (2026-10-17: leaving two unmatched old children untouched looked like a judgment that they were fine; they were not).

## 2. Scaffold commit
Create the root's `src/` from [../build/templates/](../build/templates/) as [../build/scaffold.md](../build/scaffold.md) describes: `build.sh`, `parts/01_head.html` (shared CSS), `parts/10_header.html` (title, subtitle with "Data as of <month year>", the tab bar), `21_js_rd_common.js`, the error box, `99_js_tabs.js` with a storage key `{{PREFIX}}-tab`, one placeholder part per tab (`31_tab_<key>.html` ...), Reading placeholders and `39_tab_more.html`. One child folder per approved child with a README (title line, "Notion: pending" or the id, one-line status). Build it once and run `checkpage.sh` on the empty shell. Commit: "Topic: <name> root scaffold and N child folders".
- Write scaffold loops in `sh`, not zsh, or list names explicitly: zsh does not split words in `for x in $list` and once created one wrongly named placeholder file (2026-10-14).

## 3. Register the children
- When Notion is connected: create the new child pages under the root with `notion-create-pages` (parent `page_id` = root id, `allow_async` false, content "Being built in the technical_knowledge_base repository."); reuse an old child's page id where the new child replaces it (it is retitled at publish). Add one `pages.json` entry per child (`path`, exact `title`, `id`, `parent` = root title, `section`, `status` `not_migrated`) and write the id into its README. Commit: "Register the N children of Topic: <name>".
- When Notion is disconnected: keep "Notion: pending" in the READMEs, tell agents to name siblings in plain text and list those mentions in their reports, and wire links later (step 10). Two topics (ML infra, generative) were built entirely this way on 2026-10-16/17 and registered in one commit when Notion came back.

## 4. Scratch, scripts and briefs
- Choose the topic's scratch dir `{{SCRATCH}}/{{PREFIX}}` inside the session scratchpad. Copy [../scripts/guard.sh](../scripts/guard.sh) and [../scripts/lock.sh](../scripts/lock.sh) into one shared tools dir of the scratchpad (the briefs call it `{{TOOLS}}`) so every topic running on the machine shares the same locks. Optionally start a background resource log (load, swap, memory free every minute, with a pid file).
- Fill the templates: [briefs/common.md](briefs/common.md) (rules every agent on the topic follows), [briefs/tabs.md](briefs/tabs.md) (one entry per root agent: setup, labs, map, read). Save them as `{{SCRATCH}}/{{PREFIX}}_common.md` and `{{PREFIX}}_tabs.md`, and keep a durable copy outside the scratchpad and outside the repo (a reboot wiped the scratchpad on 2026-10-15; the briefs survived only because copies existed elsewhere). The filled briefs contain the scratch path, so they never go in the repo.
- Launcher prompts stay short: who the agent is, the two files to read in full, which section is theirs, their prefix, what to report. The rules live in the brief, once.

## 5. Wave 1: setup, Reading and map in parallel
- **Setup agent** (heavy): builds the shared env (`{{SCRATCH}}/{{PREFIX}}/venv`, Python via uv, `UV_CACHE_DIR` shared), downloads data and models (Hugging Face models in `~/.cache/huggingface`, durable), defines the running example and shared code in the root's `src/data/` (README.md, manifest.json, loaders, tiny models), smoke-tests each model under the bench lock, records versions and licences in `FACTS.md`, and writes `{{SCRATCH}}/{{PREFIX}}/SETUP.md` whose last line is `READY`.
- **Reading agent** (light): saves the old root and children verbatim (if Notion is up), writes the Reading and Further reading tabs from research, leaves numbered TODOs for lab numbers in `src/read/todo.md`.
- **Map agent** (light): the tool or model map tab (status, licence, dates, verified live). If it needs the env for small checks, it scripts them as pending and is resumed after READY; it must never idle waiting for READY (2026-10-14: a map agent idled about 20 minutes).
- When SETUP.md says READY: verify (privacy grep, file sizes, README reads well), commit `src/data/` with explicit paths.

## 6. Labs after READY
- One agent per lab, briefed by its `tabs` entry. At most about four agents at once, at most three doing heavy work (a GPU job counts as one), and only one GPU-bound agent at a time on a GPU topic ([lessons.md](../lessons.md), 2026-10-11 and 2026-10-16). Start CPU or light labs beside the single GPU lab.
- Order labs so the ones whose recordings others reuse go first (for example the diffusion lab before the flow lab, which compared against its checkpoints).
- Each lab's report goes into the memory log: the Reading numbers it produced, corrections to other tabs, fixes for `src/data/README.md`. These become the Reading agent's TODO fill and the **ROOT FIX LIST**.
- Watch the page size as labs land: the root should stay under about 1.5 MB. When it nears the limit, give the remaining labs a data budget (2026-10-17: "each lab at most 120 KB of data") and ask earlier labs to trim.
- When all labs are in, resume the Reading agent (same agent, SendMessage) to fill its TODOs from the labs' `out/` files and apply the Reading corrections. Commit.

## 7. The child brief, after the labs
Write [briefs/child.md](briefs/child.md) once the labs exist, because children must reuse and agree with them: STATE OF THE PARENT (which labs, where their recordings and checkpoints are), known findings to respect (the surprising measured facts every child must not contradict), SIBLINGS with ids, and one entry per child (title, depth beyond the lab, labs to build, what to measure, what to reuse). Append new dated rules to the end of the brief as incidents happen and tell running agents.

## 8. Children
- About four at a time, at most three heavy, one GPU. Launch children whose parent lab is finished first.
- Each child's report adds to the ROOT FIX LIST (corrections to the root, cards and reading times, links to add) and lists sibling mentions to wire. Settle disagreements between children (two children measured different positions for the same effect on 2026-10-17: state both with the reason, or neither).
- Commit each finished child with explicit paths after verification (section "Verify before committing"). If Notion ids exist and Khalid is happy for pages to go live, publish each child as it finishes; otherwise publish all at the end.

## 9. Root fix pass
One agent with [briefs/fix-pass.md](briefs/fix-pass.md): the ROOT FIX LIST as lettered items, each checked against the child's or lab's own files before writing, plus the child cards (title, reading time, one line). Edits only root files. Commit.

## 10. Link wiring
When all child ids exist, one agent with [briefs/link-wiring.md](briefs/link-wiring.md) turns every plain-text sibling or child mention (root `src/read/links_todo.md`, children's notes and parts, "being built" cards) into `{{text|n:<id>}}`, rebuilds and checks every page. Commit.

## 11. Publish
One agent (or the lead) with [briefs/publish.md](briefs/publish.md), strictly one page at a time: children first (upload, `replace_content` with the two-line block, retitle reused pages, `page_finalize.py`, push), then the root (it has children and often a video: insert the embed at the start, delete the old text in chunks keeping the video and every `<page>` tag, `page_finalize.py`, push), then `sync_status.py --no-build`. The procedure itself is the `sync-kb-github` skill.

## 12. Close
- Final memory-log line: what is live, commits, reading times (flag a root over 30 minutes or a child over about 45), what Khalid must do (delete an old video, delete "TO DELETE: ..." pages), open items.
- Delete scratch of finished, published work (venvs, large intermediates, `uv cache prune`), keeping what an open fix still needs. Stop containers you started.

## Lead rules
- **Never idle.** While agents run, review landed work, write the next brief, verify reports, update the log. Idle gaps over about five minutes expire the prompt cache; on the inference topic this made pages 5 to 9 times more expensive (2026-10-11).
- **Watch, don't poll.** For a long background job, start one watcher (one background command that exits when a marker such as `ALLDONE` appears in a log, or the Monitor tool with an until-condition) and get on with other work. Never let an agent sit in a sleep loop waiting for a job; let it hand back and resume it with SendMessage when the marker appears.
- **Stop re-reports.** An agent waiting on a long run tends to send status report after status report, each waking the lead. Tell it: "no more status reports; stop your own watcher (kill only PIDs you started; leave the run going) and end your turn; I will message you at ALLDONE; report once after that" (2026-10-17).
- **Stage explicit paths.** Never `git add -A` (or `git add` of a whole topic) while agents are working: it sweeps their unfinished files into your commit (2026-10-14). Add only the folders or files you verified.
- **page_finalize on a root commits its children's folders** (it runs `git add <root folder>`, which contains the children). Publish the root when children are finished or between their edits, or check `git status` first and accept what it sweeps (2026-10-15).
- **Agents never** commit, publish, write to Notion, edit `pages.json`, or edit folders they do not own; they suggest changes in their reports. The only exception is the publish agent, which commits through `page_finalize.py`.
- **Git one at a time.** Only one process (you or the publish agent) does git operations at any moment; `git pull` before the first commit of a session.
- **Keep the brief the source of rules.** When an incident teaches a rule, append it (dated) to the common or child brief, message every running agent once, and add it to [../lessons.md](../lessons.md) if it is not topic-specific.
- **Resource first.** Run `guard.sh` before launching a heavy agent; if it prints HIGH, launch only light work. Check `uptime`, swap and other topics' GPU queues; one GPU job machine-wide across topics.

## Verify before committing an agent's work
1. `git status --short` limited to the agent's folder: nothing outside its ownership changed.
2. Privacy grep on everything to be committed: `grep -rIl -e '/Users/' -e 'Users-' -e '<login name>' -e 'claude-' -e 'glpat' -e 'sk-ant' -e '@' <paths>` and read every hit (emails, scratch paths, hostnames).
3. `sh html_utils/checkpage.sh <folder>` ends `fail=0`, `emdash 0`, `errbox 1`, `clipped 0`; look at the screenshots of the tabs it touched.
4. No `__pycache__`, `.shots`, MP4s, PDFs or files over about 1 MB; page size within budget.
5. The report's numbers match the files (spot-check two), and the reading time is stated.
6. Commit with explicit paths, then note the commit in the memory log.

## Interruptions
- **Network outage** (API errors such as ENOTFOUND): agents stop. When the network is back, resume each with SendMessage ("the network dropped; continue from where you were; check what your last step finished"). Never start a fresh agent for half-done work: the old one has the context (2026-10-14).
- **Usage limit**: agents stop mid-turn. After the reset, resume each with SendMessage the same way (2026-10-17).
- **Notion disconnected**: keep building; ids pending, plain-text sibling mentions, `coverage.md` as "old page not yet compared (Notion disconnected)"; register, wire and publish when it returns.
- **Reboot**: the scratchpad is gone (envs, models outside `~/.cache`, run outputs, locks). Check `last reboot` before trusting scratch after any gap; rebuild tools and envs from the briefs; re-run only what a page cannot rebuild from its `src/`.
- **An agent hands back mid-run** (watchdog or its own choice): keep its run going, set one watcher, resume the same agent with its finishing list when the run ends.

## The memory log
Keep one memory file per topic in Claude's project memory folder (`<prefix>-topic-in-progress.md`, frontmatter type project) and one line in its MEMORY.md index. Add a timestamped line at every event: answers to the opening questions, scaffold and register commits, each agent launched (key and agent id, so it can be resumed), each report's findings, numbers for the Reading and the ROOT FIX LIST items, incidents and the rule they produced, what runs and what is left. A new session must be able to resume the topic from this file alone.

## Single page (no team)
- **One child under an existing root:** read the root and siblings, fill [briefs/child.md](briefs/child.md) for one child (or work directly with [../page-kinds/topic-child.md](../page-kinds/topic-child.md)), register the Notion page if new, build, verify as above, publish with `sync-kb-github`, `page_finalize.py`, then add a card and a link on the root and republish it.
- **One paper:** [../page-kinds/paper.md](../page-kinds/paper.md) directly, or one agent with [briefs/paper-agent.md](briefs/paper-agent.md); publish with `replace_content` (a paper row has no children), `paper_finalize.py`.
- **Many papers:** one agent per paper with [briefs/paper-agent.md](briefs/paper-agent.md), about four at a time; for each finished page re-run `checkpage.sh` and look at the screenshots, publish it, finalize it, commit. A paper whose `pages.json` status is `not_migrated` but whose folder has an `index.html` was built and not published; one with only a README has not started.

## Sources distilled
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 9ee6d1ea, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)

Memory logs of the generative, ML infra, JAX, RAG and data curation topics (2026-10-13 to 2026-10-17); feedback memories gpu-runs-one-agent, no-usage-caps, cheap-runs-over-expensive, manage-mac-resources, check-coverage-before-leaving-old, scratch-wiped-reboot, completeness-over-disk, teach-dont-ask-scope; the lead's agent prompts of 2026-10-16 and 2026-10-17 (fix pass, wiring, publish); html_utils/methods/papers.md "Running it for many papers"; CLAUDE.md; the sync-kb-github skill; html_utils/page_finalize.py.
