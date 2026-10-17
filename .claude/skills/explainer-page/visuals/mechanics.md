# Visual mechanics

The technical rules every chart, lab and animation follows so it renders correctly in Notion's sandboxed iframe, on a phone and in both themes. The checks in [../build/checks.md](../build/checks.md) enforce most of them.

## The sandbox: everything inline
- Notion's HTML block is a **sandboxed iframe with no network of any kind**: no CDN, no web fonts, no images by URL, no fetch, no external scripts or stylesheets. One self-contained file: hand-written HTML, SVG and Canvas.
- Images are small data URIs (WebP or PNG thumbnails, a few KB each). Model weights for live toys are quantised and base64-encoded (6 bits per weight as one character, or int8 with per-row scales).
- Maths: LaTeX converted to MathML at build time (`html_utils/tex2mathml.mjs`), or HTML with Unicode; no runtime library.
- `localStorage` and `sessionStorage` only inside try/catch; the page works without them.
- Links to the outside world open in a new tab (`target="_blank" rel="noopener noreferrer"`); `build.sh` writes these from `{{text|url}}`.

## Draw when the tab opens, at the measured width
- A hidden tab has no width. Register every chart's render function for its tab and draw it when the tab is shown:
  ```js
  (window.TAB_RENDER=window.TAB_RENDER||{});
  (window.TAB_RENDER['t-lab']=window.TAB_RENDER['t-lab']||[]).push(draw);
  ```
  `99_js_tabs.js` runs `TAB_RENDER[id]` each time tab `id` opens and fires a resize. Reading-tab code uses `RD.onRender(f)`.
- Size every SVG from the container's measured width (`RD.width(el)`, `el.clientWidth` with a fallback for hidden tabs), in CSS pixels, so a font size in code is the size on screen. Redraw on resize (`RD.onResize`), only when the tab is visible.
- Never draw at a fixed width and scale down: labels shrink below legibility and clip at phone width (lesson of 2026-10-02).

## Phone width: 390 px, nothing clipped, no sideways scroll
- Every tab is checked at 390 px (dark) and 920 px (light). The page never scrolls sideways; wide tables sit in a scroll box (`.tw`, `.hmwrap`), long formulas in their own `overflow-x:auto` box.
- No text may be cut off: `clipcheck.mjs` finds text running past an ancestor that hides overflow or past the viewport, which no scrollbar reveals. Grids use `minmax(min(100%,Npx),1fr)` and `min-width:0` on children.
- Below about 520 px, charts switch to fewer ticks, shorter labels, wrapped legends, smaller row heights; comparison tables can become cards (the generative root's `rd-cmp` tables do).
- **Text at least 11 px** on screen, SVG labels included (the paper pages' `check_page.mjs` enforces it). Tick labels 10.5 to 11 px are the floor, not the norm.

## Captions in HTML, not SVG
Step captions, explanations, legends with more than a word or two, and long axis notes go in HTML beside or under the SVG, where they wrap. SVG text does not wrap and clips at phone width. Keep SVG text to short labels and numbers.

## Light and dark through CSS variables
- Colours are CSS variables defined on `:root` and redefined under `@media (prefers-color-scheme: dark)` ([../build/templates/01_head.html](../build/templates/01_head.html): `--bg --ink --mute --line --soft --acc --acc2 --good --bad --dim --hl` and series colours `--c1` to `--c6`).
- SVG uses `fill="var(--ink)"`, `stroke="var(--line)"`; never a hard-coded black or white. Canvas reads the computed variables at draw time and redraws when the scheme changes.
- Status colours carry meaning consistently: measured, published by the vendor, independent, derived, unconfirmed (the generative root uses classes `.meas`, `.vend`, `.indep`, `.der`, `.unc`).

## Motion manners
- **Reduced motion:** read `matchMedia('(prefers-reduced-motion: reduce)')`; never autoplay, start paused and move one step at a time without tweening; particles show their end state with a step control.
- **Pause off screen:** an `IntersectionObserver` on the card plus `document.hidden` plus `card.offsetParent!==null` (hidden tab) gate every timer and `requestAnimationFrame` loop. An animation may play once when first scrolled into view.
- **Controls** on every animation: play and pause, step back and forward, scrubber, speed. `RD.anim` in [../build/templates/21_js_rd_common.js](../build/templates/21_js_rd_common.js) does all of this; reuse it or copy it into a tab's own core file.
- Mode toggles reset the animation to step 0 with the new step count (`anim.reset(n)`).

## Scope everything with a prefix
- Each tab (and each agent) has a short prefix (`df`, `fw`, `vl`, `sc`). Element ids, classes, data attributes and global names carry it: `#df-cfg`, `.fw-box`, `window.FW`, `window.FWD`.
- Tab CSS lives in the tab's own part inside `<style>` and is scoped under the tab id (`#t-diff .meas{...}`), so tabs built in parallel cannot collide.
- Each JS part is wrapped in an IIFE that returns early when its card is absent (`if(!$('df-cfg'))return;`), so a missing or failing part never takes others down.
- Script-written HTML with tab links needs `RD.tabLinks(el)`: `99_js_tabs.js` binds only the links present at load.

## Size budgets
| What | Budget |
|---|---|
| Root page (`index.html`) | about 1.5 MB, images included |
| Child or paper page | about 1 MB |
| Each data part (`3x_js_<p>_0data.js`) | small: hundreds of KB at most; ask whether every field is shown |
| Any single committed file | under 1 MB (never MP4s, PDFs or large downloads) |
The old 300 KB limit is retired. Going over a budget is acceptable when the content needs it: say so in the report; trim encodings (quantise, thumbnail, round to the printed precision) before cutting knowledge. When several tabs share a page, give each a share early (the generative root asked two labs to trim from 360 to 250 KB and 270 to 180 KB).

## Sources distilled
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 9ee6d1ea, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)

`.claude/skills/create-interactive-html/SKILL.md` (constraints), `html_utils/BRIEF_page_agent.md` (fail-safe build, animation manners), `html_utils/methods/topic_pages.md` (2026-10-02 lesson, in-parallel tab rules), `html_utils/methods/papers.md` (measured-width charts, 11 px check), `html_utils/checkpage.sh` and `clipcheck.mjs`, the gm, mi and dc briefs (prefixes, TAB_RENDER, size budgets), the gm-topic memory (page size trims), and `models_and_training/topic_generative_and_multimodal/src/parts/` (01_head.html, 21_js_rd_common.js, 99_js_tabs.js).
