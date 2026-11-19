# Checks before a page is reported or published

The checks every page passes before an agent reports it done and before the lead publishes it, with the expected results. Run them from the repository root after `sh <page folder>/src/build.sh`.

## 1. checkpage.sh: every tab, both themes, both widths
```sh
sh html_utils/checkpage.sh <page folder>
```
It opens every tab in light at 920 and 1400 px and dark at 390 px (`tabshot.mjs`), screenshots each into `<page folder>/.shots/`, reports script errors, a visible error box or sideways scroll, then runs `clipcheck.mjs` at 390 px dark for text cut off without a scrollbar. The last line must read:
```
<folder>: tabs N, bytes ..., emdash 0, errbox 1, ask 0, buddy 1, scripts ..., clipped 0, fail=0
```
- `fail=0`: no tab had errors or sideways scroll, nothing clipped.
- `emdash 0`: no em-dash anywhere in the built page.
- `errbox 1`: exactly one `#jsErr` box (the fail-safe build is in place).
- `ask 0`, `buddy 1`: no Ask Claude block (retired 2026-11-19) and exactly one AI buddy loader (`<script id="kb-buddy">`, from `html_utils/kb_buddy_loader.js`); checkpage fails the page otherwise. A page made from the templates has the loader in `01_head.html`; a page copied or rebuilt from an older page has it in whatever part closes its head. If it is missing or an Ask Claude block remains, run `python3 html_utils/apply_buddy.py <page>` and rebuild. `python3 html_utils/apply_buddy.py --check` checks every built page at once.
- `clipped 0`: no text cut off at phone width.
On a root built by a team, failures in another agent's unfinished tab may be reported as theirs; your own tabs must be clean.

Setup once per machine: `cd html_utils && npm ci`, run with an empty user config so a personal `.npmrc` (registry tokens) is never read or echoed: `: > "$KB_SCRATCH/empty.npmrc"; NPM_CONFIG_USERCONFIG="$KB_SCRATCH/empty.npmrc" npm ci`. Chrome comes with puppeteer and launches with `headless: 'shell'` (the default mode times out on screenshots); if needed set `CHROME_PATH` to the `chrome-headless-shell` binary under the puppeteer cache.

## 2. Your own puppeteer script: every control
`checkpage.sh` only opens tabs. Write a script (kept in `src/<tab>/` or `src/`) that clicks every button, moves every slider and select, steps every animation to its last step, in **390 px dark** and **920 px light**, and fails on any page error, console error, visible `#jsErr`, sideways scroll, or the words `NaN`, `undefined` or `Infinity` in the tab text (a prose mention such as "no NaNs" is fine; whitelist it if it trips). One browser at a time, closed at the end; run the guard first ([../evidence/resource-safety.md](../evidence/resource-safety.md)). Load puppeteer from `html_utils`' node_modules:
```js
// node src/check_controls.mjs <page index.html>
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['dark', 390], ['light', 920], ['light', 1400]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`button[data-t=${t}]`);
    // click every button, set every range and select inside #t ... then:
    const bad = await p.$eval('#' + t, el => /\bNaN\b|\bundefined\b|\bInfinity\b/.test(el.innerText));
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (bad || side) errs.push(`${t} ${scheme} ${width}: ${bad ? 'NaN/undefined' : ''} ${side ? 'sideways' : ''}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); await p.close();
}
await b.close();
```
Animations and 3D stages (Khalid, 2026-11-06): scroll each into view and confirm it plays by itself (within about 2 s its play button reads Pause for `RD.anim`, or its `data-frames` rises for `S3.stage`; `data-draws` counts every redraw, including flows, which must stop off screen and under reduced motion); emulate `prefers-reduced-motion: reduce` once and confirm none moves by itself; step each to its last step and confirm its step list has one item per step. Check the split layout at 1400 px (two columns where a section has a visual, full width where it has none) as well as 920 and 390 px. The Attention Is All You Need paper page's `src/check_page.mjs` has code to copy. Pages rebuilt in the 2026-11-06 layout rollout keep these motion and split checks in a script under `src/` (usually `check_stages.mjs`; rerun it after any change to the page). The lead then runs `node html_utils/verify_layout.mjs <page folder> <shots dir outside the repo>`, which must end `problems 0`.

A page check script takes its shots folder as an argument, creates it (`fs.mkdirSync(dir, {recursive: true})`) and has no default inside the repo or `/tmp`.

## 3. Data and prose numbers
- A script proves the page embeds exactly the recorded data: parse the built `index.html`'s data globals and compare them with `src/<tab>/out/*.json` (or the recompute script's output), field by field.
- Every number written in prose that comes from data or a run is checked against that data by the same script (the generative and data-curation agents caught stale prose numbers this way after reruns).
- The page's JavaScript calculators agree with `recompute.py` on the presets.
- Pending facts left unfilled are listed, not hidden ([../evidence/local-runs.md](../evidence/local-runs.md)).
- For a migrated page, `src/coverage.json` accounts for every fact of `src/live.md` (carried where, or dropped with the reason).

## 4. Look at the screenshots
Open the PNGs in `.shots/` (every tab, both themes) and a few mid-animation frames, and fix what a reader would see: overlapping labels, unreadable contrast in dark mode, empty charts in a hidden tab, a caption that wraps badly at 390 px, text under 11 px. A check passing is not the same as the page looking right. Look at every stage mid-step at 920 px as well as 1400 and 390 (a stage's `aspect` sizes its card only at 1100 px and wider), and check that nothing in view beside a prediction prompt (step list, caption, visual) already shows its answer.

## 5. Privacy grep
Grep everything you will commit (the built page and all of `src/`) and fix every hit:
```sh
grep -rnI -e '/Users/' -e 'Users-' -e "$(whoami)" -e 'glpat' -e 'sk-ant' -e '[A-Za-z0-9._%+-]\+@[A-Za-z0-9.-]\+\.[a-z]\{2,\}' <page folder>
```
Never write the home path, the scratch path (it contains the login name), hostnames, LAN or router addresses, account details, git identity, emails or tokens. Logs, tracebacks and `kubectl` output carry hostnames and paths: scrub them. Public datasets can contain email addresses (redact to `example.com` or drop the file). Never use images of real private individuals.

## 6. Clean up
- Delete `__pycache__/` folders and `.shots/` before committing (both are build by-products).
- No committed file over about 1 MB; `du -sh` the page folder and `find <page folder> -size +900k`.
- Record visuals built and rejected in `src/viz_ideas.md`.
- Agents do not commit, publish, or edit `pages.json`; the lead does, staging explicit paths only (never `git add -A` while other agents work).
