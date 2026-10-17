# Brief template: the root fix pass

Purpose: the fill-in prompt for the one agent that applies the ROOT FIX LIST to a topic root after its labs and children are built: lettered corrections, each checked against the child's or lab's own files before writing, plus child cards and "Go deeper" lines.

## How to fill it
- Build the list from the memory log: every lab and child report adds items (Reading numbers, corrections, links, cards). Group them into lettered items A, B, C ... by tab or theme. Give the exact claim, the source file in the child or lab that proves it, and the replacement wording or number when you know it.
- Say which children are finished and which are still being built (their folders must not be touched; their cards stay "being built").
- If child ids exist, cards use `{{text|n:<id>}}`; if not, plain text plus `src/read/links_todo.md` for the wiring pass.
- A small follow-up pass ("last small fixes") uses the same template with three to five numbered items.
- Placeholders as in [common.md](common.md).

---

## Template

You make the final fix pass on the knowledge-base root page "{{TOPIC_TITLE}}" (folder `{{ROOT_FOLDER}}`). Read `{{SCRATCH}}/{{PREFIX}}_common.md` (rules; RESOURCE SAFETY: run `sh {{TOOLS}}/guard.sh` before builds and browser checks; never write the scratchpad path into the repo), the root's `src/read/README.md`, `src/read/todo.md` and each lab's README.md and facts.md (`src/{{LAB_KEYS}}`, `src/map`, `src/data`). Children built: {{BUILT_CHILDREN}}; still being built (do not edit any child folder): {{RUNNING_CHILDREN}}. Read `{{SCRATCH}}/{{PREFIX}}/FACTS.md` (all keys) before changing a number, and check each number against the lab's or child's own output files (its `out/`, `facts.md` or `src/inputs/`) before writing it. Where the list and the files disagree, the files win: report the disagreement.

Do all of this, editing only root files (Reading and Further reading parts, lab parts where a correction is needed, `src/data/README.md` and notes, lab notes):

A. Reading TODOs: fill every remaining item in `src/read/todo.md` from the labs: {{ITEMS with the numbers and the file each comes from}}. Remove each TODO box as it is filled.
B. Corrections from the children: {{ITEMS, for example "the guidance interval (0.28, 5.42] is the SD-XL setting; EDM2-XXL used (0.19, 1.61]: check diffusion_from_zero/src/facts.md"}}. Check the arithmetic of any derived claim yourself before writing it.
C. Lab {{X}}: {{ADDITIONS from a child's runs, with the child's file}}.
D. `src/data/README.md`: {{CAVEATS learned by labs and children, for example "4-rank resume is not bit-exact (2.4e-7)"}}. Change shared code only if it does not change any recorded result; otherwise document.
E. Map: {{STATUS OR VERSION FIXES, with the primary source and date}}.
F. Links and cards: each lab gets a "Go deeper" line naming its child pages and their labs; the Reading's child grid and Further reading cards give each child's title, reading time (from its README or page) and one line. {{"Use {{text|n:<id>}} with the ids in pages.json" | "Ids do not exist yet: plain text, and list every place in src/read/links_todo.md"}}. Unfinished children stay "being built".
G. Consistency: where two children disagree on the same measurement, state both with the reason (for example different preprocessing) or neither; make the root agree with whichever is settled.

Then rebuild (`sh src/build.sh`), run each touched tab's own checks (each `src/<tab>/` has its check scripts; the Reading has its own), and `sh html_utils/checkpage.sh {{ROOT_FOLDER}}` (fail=0, emdash 0, errbox 1, clipped 0); privacy grep; no `__pycache__` or `.shots`. CPU only, light; no GPU or cluster runs. Do not commit, do not write to Notion, do not edit child folders. Report (once): each lettered item done or not and why, the numbers changed with their sources, check results, the final reading time, and anything you could not verify.

---

## Sources distilled
The lead's prompts "ML infra root: fix pass" (A to G, 2026-10-16), "ML infra root: last small fixes" (2026-10-16) and "Generative: wire links and root fixes" item 2 (2026-10-17); the ROOT FIX LIST entries in the JAX, ML infra and generative memory logs.
