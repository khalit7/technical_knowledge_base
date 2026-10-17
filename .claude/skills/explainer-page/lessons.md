# Lessons that are not tied to one page kind

Purpose: dated lessons from building the knowledge base (machine safety, locks, agents, git, Notion, scratch, checks) that apply to any page or topic; lessons about one page kind live in that kind's file under `page-kinds/`.

Each lesson says what happened and the rule it produced. The rules are already folded into the briefs and the pipeline; this file keeps the reasons, so a rule is not dropped later as "fussy".

## Machine safety (16 GB Apple M1 Pro)
- **2026-10-15, kernel panic.** After hours of load 50 to 100 with swap full (MPS jobs, four CPU agents, Docker, Chrome), the Mac panicked and rebooted. Khalid (2026-10-16): "make sure to manage mac resources well so it doesn't crash". Rule: `guard.sh` before every heavy step, light work only while it prints HIGH; at most three agents doing heavy work at once (a GPU job counts as one); keep load under about 10. See [evidence/resource-safety.md](evidence/resource-safety.md).
- **2026-10-17, runaway MPS memory.** A sampling loop without `no_grad` grew to 20 GB of MPS memory and pushed swap to 15 GB before it was killed. Rule: every MPS process starts with `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45` (about 7 GB cap, an out-of-memory error instead of swapping) and samples under `torch.no_grad()` or `torch.inference_mode()`; never raise the ratio.
- **2026-10-17, fp32 peaks.** A VAE fp32 round trip on one image peaked at 9.9 GB, and SD 1.5 at 9.6 GB before the cap rule. Rule: check peak memory on one item before any sweep; fp16 or bf16 (or tiling and slicing) for anything that would pass 6 GB.
- **2026-10-15, fp32 thrash.** A float32 1.7B model thrashed swap for 75 minutes. Rule: float16 or bfloat16 for anything over about 300M parameters; kill your own PID and rerun smaller as soon as RSS collapses or progress stops.
- **2026-10-15, thread oversubscription.** One agent ran two scoring jobs with 22 and 20 threads at once; load hit about 100. Rule: at most 4 threads per job, `nice -n 15`, one heavy process per agent.
- **2026-10-14 and 2026-10-15, Docker Desktop.** Its VM held about 10 GB of RAM for days and broke MPS runs. The sandbox cannot change Docker's settings. Rule: Docker only on topics that need it, with every container memory-capped; ask Khalid to quit it (or shrink the VM to 4 to 5 GB) when it is not needed.
- **2026-10-15, not ours to kill.** Khalid's own browser had renderers at 100% CPU for 17 hours. Rule: never kill processes you did not start; tell Khalid.

## Locks and the GPU
- **2026-10-11, idle lock waits.** Four agents queued on one bench lock; every idle gap over five minutes expired the prompt cache, so each wake rewrote a context of hundreds of thousands of tokens. Per-page usage was 5 to 9 times earlier topics. Rule: one GPU-bound agent at a time; agents never wait on a lock (short acquires, do other work, or script the run as pending and hand back).
- **2026-10-14, holding the lock idle.** An agent held the bench lock for hours while doing CPU work. Rule: hold it only during a GPU run, touch it every 10 minutes while running, release the moment the run ends.
- **2026-10-16, release without owner check.** One lab released another lab's cluster lock. Fix: `lock.sh release` refuses unless the caller owns the lock.
- **2026-10-16, chaining after a timeout.** A timed-out acquire was followed by a stop script that killed another lab's Ray job. Rule: gate every guarded command on a successful acquire: `lock.sh acquire ... && { ...; lock.sh release ...; }`.
- **2026-10-17, lock starvation.** An owner that released and immediately re-acquired the bench lock kept winning against pollers. Fix in `scripts/lock.sh`: 1 s polling, and an owner that released in the last 20 s waits 20 s before acquiring again.
- **Machine-wide.** Several topics shared one machine (RAG and data curation on 2026-10-14, JAX CPU-only beside a GPU queue on 2026-10-15). Rule: one shared tools dir (`guard.sh`, `lock.sh`, `locks/`) for every topic; a topic without GPU work is told "CPU only, never take the bench lock".

## Agents and the lead
- **2026-10-03, the watchdog.** Agents with no progress for 600 s are killed, including one stuck writing one huge file. Rule: small steps, files written in pieces, long jobs detached with a pid file and a log.
- **2026-10-14 and 2026-10-15, kill by name.** Agents used `pkill -f` on their own processes. Even when only their process matches, it is a hazard on a shared machine. Rule: never `pkill`, `pkill -f` or `killall`; record PIDs and kill those.
- **2026-10-14, idling for a dependency.** A map agent waited about 20 minutes for the setup's READY despite its brief. Rule: never wait; script the dependent step as pending, hand back, and be resumed.
- **2026-10-17, re-reporting.** An agent waiting on a long run kept sending status reports, each waking the lead. Rule: the lead runs one watcher and tells the agent to stop its own wait loop, end its turn and report once when resumed.
- **2026-10-14 and 2026-10-17, outages and limits.** Network outages (API ENOTFOUND) stopped every agent twice in one evening; a usage limit stopped two agents mid-page. Rule: resume the same agents with SendMessage after recovery; they keep their context. A fresh agent repeats work.
- **2026-10-14, a silent fallback.** A tuning step crashed and the test runs silently used the default prompt; the flaw was found after a two-hour GPU run. Rule: scripted pipelines fail loudly (`set -e`, explicit checks that each stage wrote what the next one reads), and the agent spot-checks outputs before a long run.
- **2026-10-04, teach, don't ask scope.** Khalid: "you should be teaching me, i don't know what i dont know". Rule: decide the curriculum and children yourself and propose them with reasons; ask only goals, preferences and deletions.
- **2026-10-06, no usage caps.** Shrinking agent work because of subscription usage was wrong. Rule: never cut scope for usage; cut waste (idle waits, runs that teach little).
- **2026-10-15, cheap runs over expensive.** Khalid: "avoid expensive runs that are likely to teach little". Rule: before a run over about an hour, ask what the reader learns that the published number does not; if little, cite it and say "not run here".

## Git and publishing
- **2026-10-14, `git add -A` swept agent files.** A commit staged a whole topic while a map agent was mid-work and took its unfinished files. Rule: stage explicit, verified paths only.
- **2026-10-15, page_finalize sweeps children.** `page_finalize.py` on a root runs `git add` on the root folder, which contains the children, and committed a child's in-progress `src/`. Rule: finalize a root when its children are committed or not yet started, and check `git status` first.
- **2026-10-14, commit trailers.** Commits end with the Co-Authored-By line only.
- **2026-10-03, rebuild last.** A page built before the builder's final rerun shipped first-pass numbers. Rule: `build.sh` is the very last step before checks and the report.

## Notion and network
- **2026-10-15 to 2026-10-17, Notion disconnected.** The Notion connector dropped after the reboot and stayed down for a day; two topics were built without ids. Rule: build anyway, ids pending, siblings in plain text with a `links_todo.md`; register, wire and publish when it returns.
- **2026-10-17, unmatched old children.** Two old child pages were left untouched with no new equivalent; neither was covered by the rebuild. Rule: grep the new pages for each unmatched old page's key terms, report coverage, ask Khalid (rebuild, fold, or retitle "TO DELETE: ...").
- **Roots with children.** Never `replace_content` on a page with child pages or databases: insert the embed, then delete the old text in chunks, keeping the video, its note and every `<page>` tag (JAX and RAG roots, 2026-10-15).

## Scratch and disk
- **2026-10-15, reboot wiped the scratchpad.** Envs, models outside `~/.cache`, lock scripts and every uncommitted run output in scratch were lost; the repo survived, and the briefs survived only because copies lived outside the scratchpad. Rule: anything a page needs to rebuild goes in its `src/`; models in `~/.cache/huggingface`; briefs copied outside the scratchpad; check `last reboot` before trusting scratch after a gap.
- **2026-10-14, the /tmp cleaner.** macOS deletes files under `/private/tmp` not accessed for about 3 days (`lock.sh` and model files vanished). Rule: on long topics, touch the scratchpad's files periodically (`find ... -exec touch -a`) or keep durable things elsewhere.
- **2026-10-14, completeness over disk.** Khalid: "i need the info to be as complete as possible, cleanup regularly if needed". Rule: generous disk budgets (keep at least 15 GB free), widen trimmed experiments, delete finished scratch regularly instead.
- **2026-10-17, units.** A setup reported 2.43 "GB" that was MiB (2.55 GB). Rule: say GiB or GB explicitly and convert once.

## Building and checks
- **2026-10-03, headless shell.** Puppeteer's default headless mode timed out on screenshots. Rule: `headless: 'shell'`.
- **2026-10-03, glob order.** `20_read_b.html` sorted before `20_read.html` in this locale. Rule: first Reading part is `20_read_a.html`, or list parts explicitly.
- **2026-10-14, zsh loops.** A scaffold loop over `$list` in zsh did not split words and created one wrongly named file. Rule: scaffold loops in `sh` or with explicit names.
- **2026-10-17, page size.** Five labs with rich data pushed a root to 1.42 MB. Rule: set a per-lab data budget once the first labs land; keep fuller data in `src/<lab>/out/` for children to reuse.

## How to add a lesson
1. Decide where it belongs: one page kind (add it to that file under `page-kinds/`, dated) or cross-cutting (here).
2. Write it as: bold short name, date, what happened in one or two sentences with the real numbers, then "Rule:" and the rule. No em-dashes.
3. Put the rule where it acts: the brief templates in `orchestration/briefs/`, `evidence/resource-safety.md`, `build/checks.md` or `orchestration/topic-pipeline.md`. A lesson that lives only here is a lesson agents will not read.
4. If a running topic is affected, append the rule to its filled brief and message the running agents once.

## Sources distilled
Memory logs of the inference, RAG, data curation, JAX, ML infra and generative topics (2026-10-11 to 2026-10-17); feedback memories gpu-runs-one-agent, no-usage-caps, cheap-runs-over-expensive, manage-mac-resources, check-coverage-before-leaving-old, scratch-wiped-reboot, completeness-over-disk, teach-dont-ask-scope; the kb_briefs `lock.sh` and `guard.sh` headers; html_utils/BRIEF_page_agent.md "Rules learned on the training topic"; the papers method's Mamba lesson.
