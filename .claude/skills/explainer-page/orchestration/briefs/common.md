# Brief template: rules shared by every agent on one topic

Purpose: the fill-in template for `{{PREFIX}}_common.md`, the one file every agent of a topic (setup, labs, map, Reading, children, fix and wiring passes) reads in full before working.

## How to fill it
- Placeholders are ALL-CAPS in double braces: `{{TOPIC_TITLE}}` (exact Notion title, for example "Topic: generative-and-multimodal"), `{{ROOT_FOLDER}}` (repo-relative, `technical_knowledge_base/<section>/<topic>/`), `{{ROOT_ID}}` (32 hex, no dashes), `{{PREFIX}}` (two or three letters for the topic, for example `gm`), `{{SCRATCH}}` (the session scratchpad; the topic works in `{{SCRATCH}}/{{PREFIX}}`), `{{TOOLS}}` (the scratchpad's shared tools dir holding `guard.sh`, `lock.sh` and `locks/`, copied from this skill's `scripts/` at topic start), `{{CHILDREN}}` (slug list), `{{NEIGHBOURS}}` (live pages that own nearby subjects, with ids), `{{TABS}}` (tab keys, part numbers and names), `{{READER_GOALS}}`, `{{BEFORE_AFTER_EXAMPLES}}` (three or four same-input animations this topic needs), `{{RUNNING_EXAMPLE}}`, `{{PINNED_SOURCES}}` (libraries and versions to quote), `{{ROOT_SCOPE}}`, `{{OLD_CONTENT}}`, `{{REFERENCE_BUILDS}}` (one or two recent root folders to copy look and checks from, for example `technical_knowledge_base/models_and_training/topic_generative_and_multimodal/src`), `{{MACHINE_MODE}}`, `{{DISK_GB}}`, `{{LAB_DATA_KB}}`, `{{DATE}}`.
- `{{text|n:<id>}}` and `{{text|#t-tab}}` (lower case, with a pipe) are the page link syntax: keep them literally.
- Pick ONE machine-mode block below (GPU topic, CPU only, or containers) and delete the others. Delete any section that does not apply rather than leaving it vague.
- The filled file contains the scratch path: it lives in the scratchpad plus a durable copy outside the repo, never in the repo.
- Keep it to what agents need. The skill files hold the method; this brief holds the topic's facts and the rules that must not be missed.

---

## Template

Repo: the technical_knowledge_base repository (your working directory's repo root). Topic: {{TOPIC_TITLE}}. Date: {{DATE}}.

READ FIRST: CLAUDE.md (no em-dashes anywhere: prose, HTML, captions, comments shown on the page); the explainer-page skill at `.claude/skills/explainer-page/`: SKILL.md, `teaching/page-quality.md`, `teaching/writing-style.md`, `evidence/sourcing.md` (every number sourced and dated; vendor claims and independent measurements kept apart), `evidence/local-runs.md`, `evidence/resource-safety.md`, `visuals/choosing.md`, `visuals/animation-types.md`, `visuals/mechanics.md`, `build/scaffold.md`, `build/checks.md`, and the page-kind file for your page (`page-kinds/topic-root.md` for root tabs, `page-kinds/topic-child.md` for a child). The page-kind shapes are suggestions: depart where the content needs it and say why in `src/README.md`.

WORK IN SMALL STEPS: a 600 s no-progress watchdog kills agents.
- Never read a file over about 40 KB in one call (read in ranges). Write big files in pieces of a few KB.
- Never `uv run` inside the repo without `--no-project`. Never create temporary files inside `html_utils/`.
- Never `pkill`, `pkill -f <pattern>` or `killall`, even when you believe only your own process matches. Record the PID when you start a process (`$!` or a pid file) and `kill <PID>`.
- Never write outside the scratchpad and the repo (no files in `/tmp` outside the scratchpad). Your scratch: `{{SCRATCH}}/{{PREFIX}}/<your key>/`.
- Hugging Face models go in `~/.cache/huggingface` (durable; leave HF_HOME unset or pointing there).
- The user's `~/.npmrc` holds a token: run npm with `NPM_CONFIG_USERCONFIG` pointing at an empty file.

USAGE DISCIPLINE (Khalid, 2026-10-11; idle waits once made a topic 5 to 9 times more expensive):
- Never sit idle more than a few minutes; no sleep loops. Run anything under about 5 minutes in the foreground; longer jobs detached with a pid file and a progress log, and do other work meanwhile.
- Depth is not capped (Khalid: "i need the info to be as complete as possible"); waste is.
- Expensive runs that teach little are skipped in favour of published numbers (Khalid, 2026-10-15): before a run over about an hour, ask what the reader learns that the published number or a cheap toy does not. Keep cheap runs that show a mechanism, a failure or a before/after.
- If you must wait for a long run, script the rest of your work as a finishing list, hand back with that list, and stop: the lead watches the run and resumes you. Do not keep sending status reports.

RESOURCE SAFETY (overrides everything; full rules in `evidence/resource-safety.md`). The Mac (16 GB, Apple M1 Pro) kernel-panicked on 2026-10-15 after hours of overload:
- Before every heavy step (training, model load, generation, compile, container or cluster start, large download, browser check) run `sh {{TOOLS}}/guard.sh`. If it prints HIGH, do only light work (reading, writing, small edits) and check again in a few minutes.
- At most 4 threads per job (`OMP_NUM_THREADS=4`, `MKL_NUM_THREADS=4`, `torch.set_num_threads(4)`, `RAYON_NUM_THREADS=4`, `-j 4`), `nice -n 15`, one heavy process of yours at a time.
- Memory: one model loaded at a time; float16 or bfloat16 for anything over about 300M parameters; batch sizes that keep the process under about 6 GB; check peak memory on one item before a sweep and stop if it passes 6 GB. If a run thrashes (RSS collapsing, no progress, swap climbing), kill your own PID and rerun smaller.
- Puppeteer: one browser at a time, closed at the end of every script.
- The scratchpad is NOT durable (a reboot wiped it): anything the page needs to rebuild (recorded outputs, small inputs, thumbnails) goes in the page's `src/`.

{{MACHINE_MODE}}: keep one of these three blocks.

(a) GPU TOPIC (MPS work allowed):
- GPU work only while holding the shared bench lock, gated on a successful acquire: `sh {{TOOLS}}/lock.sh acquire bench <your prefix> 60 && { <one GPU run>; sh {{TOOLS}}/lock.sh release bench <your prefix>; }`. If the acquire times out, do other work and try again later; never sit in a wait. A detached run script may wait longer for the lock, because no agent is waiting with it.
- Touch the lock (`lock.sh touch bench <prefix>`) at least every 10 minutes while a run holds it; release the moment GPU work ends; never hold it while idle or doing CPU work. One GPU job at a time, machine-wide, across topics.
- HARD MEMORY CAP: every process that uses MPS starts with `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45` in its environment (PyTorch then refuses allocations beyond about 7 GB instead of swapping the machine), and every sampling or evaluation loop runs under `torch.no_grad()` or `torch.inference_mode()`. If the cap is hit, make the run smaller; never raise the ratio (2026-10-17: a sampling loop without no_grad reached 20 GB and pushed swap to 15 GB). `torch.mps.empty_cache()` between stages.

(b) CPU ONLY (another topic owns the GPU):
- Never take the bench lock; never use MPS (or jax-metal). Check `uptime` first; if the 1-minute load is above 8, do lighter work and come back.
- Timings are rough on a shared machine: label them "measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority", repeat them (median of several), record CPU time as well as wall time. Deterministic results (graphs, counts, configs, logs, numerical equality, fixed-seed curves) need no caveat and should be the bulk of the evidence.
- GPU-only steps are scripted as pending (`src/scripts/run_pending.sh`) and join the GPU queue later; the page says what is pending.

(c) CONTAINERS (Docker approved by Khalid for this topic):
- Every container, cluster, network and volume you create is named with your prefix; `--rm` where it fits; every container gets `--memory` (2 GB or less unless stated) and `--cpus 2` or fewer; kind node containers get the same caps with `docker update` right after creation. The whole topic stays under about 6 GB of container memory.
- Never `--privileged` unless a component truly needs it, and say why in your report (kind nodes run privileged by design: acceptable, state it). Never stop, remove or prune anything you did not create.
- Shared clusters: take the cluster's lock before any workload (`lock.sh acquire <cluster> <prefix> 60 && { ...; lock.sh release <cluster> <prefix>; }`); never hold two cluster locks at once; never chain a stop or reset after an acquire that may have timed out (2026-10-16: a timed-out acquire followed by a stop script killed another lab's job). Restore any config you change before releasing.

DISK: the topic may use up to about {{DISK_GB}} GB in `{{SCRATCH}}/{{PREFIX}}`; keep at least 15 GB of the disk free (`df -h /` before any download). Downloads under the download lock (`lock.sh acquire download <prefix> 60`; release right after), recorded in SETUP.md (URL, version or revision, sha256). Delete your own intermediates when done.

THE READER (most important; see `understand/reader.md`): Khalid is an ML/AI/research engineer interested in training models who wants to be really good at his job. For this topic he asked to be TAUGHT FROM ZERO. Goals: {{READER_GOALS}} (fill the four goals concretely for this topic: (1) build with it: ...; (2) understand the internals: ... read the source at pinned versions, quoted with file and line; (3) judge and debug: ... the real failure modes; (4) interviews and design: ... trade-offs he can explain). "Don't trust the current content": the old Notion pages are unverified notes. Define every term at first use; intuition and a picture before detail; one running example; for each idea the problem, how it works, the cost, when it matters, and how to check it; predict-then-reveal drills; common mistakes with real error messages or real bad outputs; interview questions with short answers, including design questions. Animations often, especially before/after on the same input ({{BEFORE_AFTER_EXAMPLES}}).

RUNNING EXAMPLE AND EVIDENCE (Mac, local only: no paid APIs, no API keys; public data and open models):
- Shared env `{{SCRATCH}}/{{PREFIX}}/venv` (Python 3.12 via uv; `UV_CACHE_DIR={{TOOLS}}/uvcache`), built by the setup agent; `{{SCRATCH}}/{{PREFIX}}/SETUP.md` ends with READY when usable.
- The running example, defined by the setup agent in the root's `src/data/README.md` (read it before writing): {{RUNNING_EXAMPLE}}. Every tab and child uses it, so comparisons share one input.
- Source read at pinned versions ({{PINNED_SOURCES}}), quoted with file and line located by pattern in a script. Shallow clones in `{{SCRATCH}}/{{PREFIX}}/src` under the download lock.
- Published numbers kept apart, labelled (vendor vs independent), dated, checked against the source's own tables (say when its text and tables disagree). Calculations from them are labelled as calculations. Anything not run here says "not run here" and why. Measured results say "measured on Apple M1 Pro (MPS or CPU)" and what transfers to a datacenter GPU and what does not.
- Code shown on the page is real code that ran (keep the script in `src/<key>/`), with its output pasted from the run.

PRIVACY: never write the user's home path, the scratchpad path (it contains the user's name), hostnames, addresses, account details, git identity, emails or tokens into the repo or a page. Logs, tracebacks, HLO dumps and kubectl output contain paths and hostnames: scrub them before embedding. Before reporting, grep everything you will commit for `/Users/`, `Users-`, the login name, `claude-`, `glpat`, `sk-ant` and email addresses. Never use images of real private individuals; prefer synthetic, public-domain or clearly licensed dataset images.

THE ROOT: {{TOPIC_TITLE}} (Notion {{ROOT_ID}}; folder `{{ROOT_FOLDER}}`). It owns {{ROOT_SCOPE}} at overview depth. Root pages are comparisons plus definitions; depth lives on the approved child pages (folders exist with READMEs; ids in `technical_knowledge_base/pages.json` or pending): {{CHILDREN}}.
Live pages that OWN neighbouring subjects (link by id, never repeat them): {{NEIGHBOURS}}. Search `pages.json` for any others before writing.
Old Notion content: {{OLD_CONTENT}} (for example "old root with a 7-minute video (leave it), text and 4 children, saved by the Reading agent in src/read/old/", or "Notion is disconnected: note as TODO").

SHARED FACTS: `{{SCRATCH}}/{{PREFIX}}/FACTS.md`. Whoever first verifies a version, licence, default, API status, published number or date appends it with source URL and date under their key; everyone reads it before quoting and never contradicts it. Also copy your verified facts into your own `src/` notes (scratch is not durable).

SCAFFOLD AND FILE OWNERSHIP: the scaffold exists in the root's `src/`: `build.sh`, `parts/01_head.html` (shared CSS), `10_header.html` (tab bar), `21_js_rd_common.js` (Reading helpers; it registers redraws on t-read only, other tabs register their own `window.TAB_RENDER` hooks), placeholder tab parts {{TABS}}, `20_read.html`, `20_read_z.html`, `39_tab_more.html`; storage key `{{PREFIX}}-tab`. Reference builds for look and structure (read in ranges): {{REFERENCE_BUILDS}}. Link syntax: `{{text|n:<notion id>}}` and `{{text|#t-tab}}`. The page is a sandboxed iframe with no network: everything inline, images as small data URIs. Prefix ids, classes and data attributes with your own prefix.
- Touch only your own files. Reading and Further reading: `parts/20_read*.html`, `2x_js_*.js` (not `21_js_rd_common.js`), `39_tab_more.html`; notes `src/read/`. Each lab: `parts/3N_*` and `src/<key>/`. `src/data/` is written by the setup agent and read-only for everyone else. Suggest changes to other files in your report.
- Replace your placeholder part (delete it) when you add your own parts; close every div you open. Name the first Reading part `20_read_a.html`, never `20_read.html` beside `20_read_b.html` (the shell glob sorts them wrongly in this locale).
- Keep each tab's wrapper div; CSS scoped under the tab id; render on `window.TAB_RENDER['<tab id>']`; size charts from measured width; no clipping at 390 px; respect `prefers-reduced-motion`; animations pause off screen and in hidden tabs. At least one before/after animation on the same input per tab where it fits.
- Size: the whole root under about 1.5 MB, images included (lab data budget {{LAB_DATA_KB}} KB each if the lead sets one); no file over about 1 MB in the repo.

CHECKS BEFORE REPORTING (details in `build/checks.md`):
- `sh src/build.sh`; from the repo root `sh html_utils/checkpage.sh {{ROOT_FOLDER}}` ends `fail=0`, `emdash 0`, `errbox 1`, `clipped 0` (failures in other agents' unfinished tabs may be reported as theirs).
- Your own puppeteer script (`headless: 'shell'`, puppeteer via `createRequire` from `html_utils/node_modules`, one browser, closed at the end) clicking every control at 390 px dark and 920 px light: no errors, NaN or undefined, no sideways scroll.
- A script confirming the page embeds exactly your recorded data and that numbers in prose match the data.
- Look at the screenshots and fix what looks wrong.
- Privacy grep; delete `__pycache__` and `.shots`; no file over about 1 MB.
- Record visuals built and rejected in `src/<key>/viz_ideas.md`.

REPORT (your final message; once, not repeated while you wait): what you built (tabs, labs, animations), runs made and where their recordings are, sources, check results, reading time, what is pending and how to run it, and suggestions for other tabs, `src/data/`, the Reading tab and FACTS.md. Do not commit, do not write to Notion, do not touch `pages.json`.

---

## Sources distilled
`gm_common`, `mi_common`, `jx_common`, `dc_common`, `rag_common`, `inf_common` and `pt_common` briefs (2026-10-11 to 2026-10-17), including the RESOURCE SAFETY, HARD MEMORY CAP, CONTAINERS and CLUSTER SHARING sections; html_utils/BRIEF_page_agent.md "Rules learned on the training topic"; feedback memories no-usage-caps, cheap-runs-over-expensive, manage-mac-resources, gpu-runs-one-agent, scratch-wiped-reboot, completeness-over-disk.
