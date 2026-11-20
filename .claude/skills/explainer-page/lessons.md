# Lessons that are not tied to one page kind

Purpose: dated lessons from building the knowledge base (agents, git, checks, the cloud sandbox) that apply to any page or topic; lessons about one page kind live in that kind's file under `page-kinds/`.

Each lesson says what happened and the rule it produced. The rules are already folded into the briefs and the pipeline; this file keeps the reasons, so a rule is not dropped later as "fussy".

## How pages look
- **2026-10-29, the General knowledge base page looked better.** Khalid compared the Greek mythology page in `~/general_knowledge_base` with the tech pages and preferred it; the gap was all in looks: the template still carried Notion's palette and type from when pages lived inside Notion (15 px body, 19 px section headings, flat white cards), visuals sat small in one corner of wide cards, steps jumped with no easing, eight saturated head colours, and section 1 of Attention variants had only a sentence where a photo of the HBM stacks shows where the cache lives. Khalid: "a page that looks visually good is easier to read". Rule: the template theme and `RD.anim` now carry the look (see `build/templates/README.md`); every visual follows "How a visual should look" in [visuals/mechanics.md](visuals/mechanics.md); real images are never forced but always included when they add something new ([teaching/teaching-contract.md](teaching/teaching-contract.md), Images).

## Agents and the lead
- **2026-10-14 and 2026-10-17, outages and limits.** Network outages (API ENOTFOUND) stopped every agent twice in one evening; a usage limit stopped two agents mid-page. Rule: resume the same agents with SendMessage after recovery; they keep their context. A fresh agent repeats work.
- **2026-10-14, a silent fallback.** A tuning step crashed and the test runs silently used the default prompt; the flaw was found after a two-hour GPU run. Rule: scripted pipelines fail loudly (`set -e`, explicit checks that each stage wrote what the next one reads), and the agent spot-checks outputs before a long run.

## Git and publishing
- **2026-10-14, commit trailers.** Commits end with the Co-Authored-By line only.

## Building and checks
- **2026-11-06, ledger keys holding a quoted reading time.** After the databases rebuilds, `check_times.py --fix` rewrote "Child page, about 39 minutes" lines on ten pages, and 48 ledger units keyed on the number read as LOST (six pages failed `ledger.py check`). Rule: a unit for a quoted reading time keys on the words before the number ("Child page, about"), never on the minutes.
- **2026-11-06, renderer v2 after comparing with every-joule.** Khalid judged the every-joule lesson 3 animation better than ours. The gap was three things: continuous motion showing data moving (dots streaming through the matrices), the look (glass plates, fading floor, soft shading), and above all composition (one word and five large objects against our 7 words by 4 vectors). Rule: renderer v2 (`R.flow`, `R.glass`, contact shadows, `view` per step) and the composition rule in [visuals/three-d.md](visuals/three-d.md): a few large objects per step, the camera in close when a step is about one item, flows wherever data moves.
- **2026-10-26, cloud sandbox with several agents.** Every agent re-sourced `html_utils/cloud_setup.sh`, whose `npm ci` deletes `node_modules`, so other agents' checks failed with "Cannot find package puppeteer" or a bare "Node.js v22" line. `cloud_setup.sh` now skips `npm ci` when `node_modules` is current. The sandbox also lacks `en_US.UTF-8`, so a build in the C locale can glob parts in another order; compare against HEAD before trusting a rebuilt page whose parts are globbed. Some page privacy checks fail only because the sandbox login is `root`: run them with a neutral `USER`/`HOME`. Never chain `checkpage.sh ... | tail -1 && commit`: the pipe hides the exit status, and one broken issue went live for two minutes that way (the 2026-10-26 issue, an unescaped quote in a script part; fixed in 8ecc48e4).
- **2026-10-26, clip checks in the cloud sandbox.** 22 pages failed `clipped` only in the sandbox, so their quoted reading times were left stale and the run still said Current. The likely cause is the fallback font (no Helvetica or Arial, so a wider DejaVu). Rule: `cloud_setup.sh` installs metric-compatible Liberation fonts, and update-kb treats a clip already present on main as pre-existing (commit when the count does not rise, report it), not as a failure.

## How to add a lesson
1. Decide where it belongs: one page kind (add it to that file under `page-kinds/`, dated) or cross-cutting (here).
2. Write it as: bold short name, date, what happened in one or two sentences with the real numbers, then "Rule:" and the rule. No em-dashes.
3. Put the rule where it acts: the brief templates in `orchestration/briefs/`, `evidence/resource-safety.md`, `build/checks.md` or `orchestration/topic-pipeline.md`. A lesson that lives only here is a lesson agents will not read.
4. If a running topic is affected, append the rule to its filled brief and message the running agents once.
