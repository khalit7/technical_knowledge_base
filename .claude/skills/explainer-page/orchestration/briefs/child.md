# Brief template: one child page of a topic

Purpose: the fill-in template for `{{PREFIX}}_child_common.md`, written by the lead after the root's labs exist, read by every agent that builds one child page of the topic (together with the topic's [common.md](common.md)).

## How to fill it
- Write it after the labs, not before: children must reuse the labs' recordings, agree with their numbers and link their tabs. Update STATE OF THE PARENT and the known findings as more labs and children land, and append dated rules at the end when an incident happens (tell running agents once).
- Placeholders as in [common.md](common.md), plus `{{N}}` (number of children), `{{LABS}}` (each lab's name, `src/<key>/` folder and what it recorded), `{{KNOWN_FINDINGS}}`, `{{SIBLINGS}}` (slug and id each, or "ids pending"), `{{OLD_CHILDREN}}` (old pages reused, with ids and where their text is saved).
- One entry per child at the end, in the format given. The launcher prompt names the child's number, prefix and scratch key and any reuse specific to it.

---

## Template

{{TOPIC_SHORT}} CHILD PAGE BRIEF ({{DATE}}). You build ONE child page of {{TOPIC_TITLE}}.

READ FIRST: CLAUDE.md (no em-dashes anywhere); the explainer-page skill at `.claude/skills/explainer-page/` (SKILL.md, `teaching/teaching-contract.md`, `page-kinds/topic-child.md`, `teaching/page-quality.md`, `teaching/writing-style.md`, `evidence/sourcing.md`, `evidence/local-runs.md`, `evidence/resource-safety.md`, `visuals/choosing.md`, `visuals/animation-types.md`, `visuals/three-d.md`, `visuals/mechanics.md`, `build/scaffold.md`, `build/checks.md`). Then `{{SCRATCH}}/{{PREFIX}}_common.md` for THE READER, WORK IN SMALL STEPS AND RESOURCE SAFETY (it overrides everything), the machine-mode rules, RUNNING EXAMPLE AND EVIDENCE, PRIVACY and the live pages that own neighbouring subjects (link by id, never repeat). Where the common brief talks about root tabs and file ownership, this brief overrides: you own only your child folder. Skim `{{SCRATCH}}/{{PREFIX}}_tabs.md` so you know what the root's labs measured.

STATE OF THE PARENT: the root (folder `{{ROOT_FOLDER}}`, Notion {{ROOT_ID}}) has its Reading tab, map and labs committed (or finishing): {{LABS}}, `src/map/`, `src/read/`, and `src/data/` (the running example: README.md first). Each lab has README.md, facts.md and `out/` with recorded results; large outputs and checkpoints in `{{SCRATCH}}/{{PREFIX}}/`. Read what touches your subject and `{{SCRATCH}}/{{PREFIX}}/FACTS.md` before quoting any number; never contradict them; append your verified facts under your key there AND in your own `src/` notes. If a root lab measured the same thing, the numbers must agree: reuse its recordings, checkpoints and scripts; go deeper than the lab on your subject; do not rebuild its animations (link the lab tab by name, for example `{{Diffusion lab|n:{{ROOT_ID}}}}`, naming the tab).

KNOWN FINDINGS TO RESPECT (measured here or verified; never contradict, cite where relevant): {{KNOWN_FINDINGS}}. Real examples of the kind of line that belongs here (2026-10-17): "SD 1.5's VAE config has no scaling_factor (diffusers defaults to 0.18215)"; "in diffusers guidance_scale 0 is the plain conditional model and the topic's own w = guidance_scale - 1"; "FID needs large N (real vs real: 2.54 at 10k, about 15.6 at 1k)"; (2026-10-16) "resume is bit-exact with 2 ranks but not with 4 (DDP bucket rebuild)".

EXISTING PAGES: {{OLD_CHILDREN}}. If your page replaces an existing page, every non-fat unit of its `src/ledger.json` survives on your page or at its owner (`page-kinds/migrate-or-fold.md`); list corrections in your report.

SIBLINGS (folders under the root folder; link each other where they own a subject): {{SIBLINGS}}. If ids are pending, name siblings in plain text and list every such mention in your report so the lead can wire them.

SCAFFOLD: your folder holds only README.md (keep its title line; replace the rest at the end with what the page is, its tabs, how it is built). Create `src/` by copying the root's `src/build.sh` and parts `01_head.html` (set `<title>` to your page title), `05z_errbox*`, `21_js_rd_common.js`, `99_js_tabs.js` (change the storage key `{{PREFIX}}-tab` to a key of your own); write your own `10_header.html` (h1 = your title, `.sub` one-line subtitle with "Data as of {{MONTH_YEAR}}", tab bar). Reading parts `20_read_a.html` onward. Tabs: Reading (`t-read`), your labs, Further reading (`t-more`). Prefix ids and classes with your own short prefix. Scripts, notes and small recorded outputs in `src/` subfolders; large outputs and checkpoints in `{{SCRATCH}}/{{PREFIX}}/<your key>/`. Page under about 1 MB (images as small WebP files in `img/`), no file over about 1 MB.

PAGE QUALITY: follow `teaching/teaching-contract.md`, `teaching/page-quality.md` and `page-kinds/topic-child.md`. Measured results labelled as `evidence/local-runs.md` says; source quoted at pinned versions ({{PINNED_SOURCES}}) with file and line, located by pattern in a script so line numbers are checked.

CHECKS BEFORE REPORTING: everything in `build/checks.md` (`bash src/build.sh`, then `checkpage.sh <your folder>` from the repo root, your own control script, the data and prose-number script, screenshots, privacy grep, clean-up). Record visuals built and rejected in `src/viz_ideas.md`.

DO NOT: commit, write to Notion, touch `pages.json`, or edit the root's or siblings' files (suggest changes in your report).

REPORT (once, at the end): what you built (tabs, labs, animations), runs made and where they are recorded, sources, corrections to the existing page, check results, reading time, sibling mentions to wire, anything pending and how to run it, and suggestions for the root (corrections, card text, links), siblings and FACTS.md.

THE {{N}} CHILDREN (folder under the root folder; title exactly as given):

{{K}} {{SLUG}}: "{{EXACT_TITLE}}". {{Reuses old "<old title>" (id) | New}}. Deeper than the root's {{LAB}} (`src/{{KEY}}/`: reuse {{WHAT: checkpoints, recordings, scripts}}): {{SUBJECTS in teaching order, each concrete: mechanisms, variants, failure modes, what is published (labelled)}}. Measured here: {{CHEAP RUNS that add a lesson the lab did not}}. Labs: {{TWO OR THREE in-page labs: an explorer, a before/after, a calculator or drill}}.

(repeat per child)

DATED RULES (append as incidents happen, one line each with the date and the rule).

---

## Launcher prompt for a child
"You build ONE child page of the knowledge base. Read {{SCRATCH}}/{{PREFIX}}_child_common.md in full and follow it, including its last lines (dated rules). RESOURCE SAFETY in {{PREFIX}}_common.md overrides everything. Your page is child {{K}}, {{SLUG}}: "{{EXACT_TITLE}}" (folder {{ROOT_FOLDER}}{{SLUG}}/). Your prefix: {{P}}; scratch key {{P}}. Reuse: {{SPECIFIC REUSE: which lab and sibling recordings, checkpoints and facts}}. Link {{NEIGHBOUR PAGE}} by id. Measure: {{THE TWO OR THREE RUNS THAT MATTER}}. Never write the scratchpad path into the repo."
