# Visual mechanics

The technical rules every chart, lab and animation follows so it renders correctly on the reading site, opened straight from disk, on a phone and in both themes. The checks in [../build/checks.md](../build/checks.md) enforce most of them.

## Self-contained: everything inline except images
- Pages are read on the public static site built from this repo (GitHub Pages) (Notion keeps an index linking to it). A page is still **one self-contained `index.html`** that works opened straight from disk: no CDN, no web fonts, no fetch, no external scripts or stylesheets; hand-written HTML, SVG and Canvas.
- **Images** are WebP files in the page's `img/` folder, referenced by relative path (`img/h100_die.webp`), each under about 200 KB, with alt text and a credit line ([../teaching/teaching-contract.md](../teaching/teaching-contract.md)). Model weights for live toys are quantised and base64-encoded (6 bits per weight as one character, or int8 with per-row scales).
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
- Every tab is checked at 390 px (dark), 920 px (light) and 1400 px (light; the split layout shows at 1100 px and wider). The page never scrolls sideways; wide tables sit in a scroll box (`.tw`, `.hmwrap`), long formulas in their own `overflow-x:auto` box.
- No text may be cut off: `clipcheck.mjs` finds text running past an ancestor that hides overflow or past the viewport, which no scrollbar reveals. Grids use `minmax(min(100%,Npx),1fr)` and `min-width:0` on children.
- Below about 520 px, charts switch to fewer ticks, shorter labels, wrapped legends, smaller row heights; comparison tables can become cards (the generative root's `rd-cmp` tables do).
- **Text at least 11 px** on screen, SVG labels included (the paper pages' `check_page.mjs` enforces it). Tick labels 10.5 to 11 px are the floor, not the norm.

## How a visual should look (2026-10-29, the Attention variants look trial)
Correct is not enough; a visual that looks good is easier to read. Before reporting, look at each visual at its first step, mid-step and last step.
- **Fill the frame from the first step.** A stepper whose content grows (a cache filling, tokens arriving) draws the empty slots still to come (dashed outlines in `var(--line)`), and a pipeline draws its later boxes faintly (opacity about .14), so the reader sees the whole layout from the first step, and the card never sits mostly empty.
- **Size to the card.** Marks and squares grow to use the measured width (cap the cell size generously, not at a tiny value); a drawing in one corner of a wide card is a bug.
- **Labels 12 px or more** in SVG (`RD.t` defaults to 12); 11 px is the floor for tick labels only.
- **A calm palette.** Few colours, each with a meaning; when a series needs many categorical colours (one per head), use a muted, evenly weighted set such as Tableau 10 (`#4e79a7 #f28e2b #59a14f #b07aa1 #d4a72c #76b7b2 #e15759 #9c755f`), not full-saturation hues around the wheel.
- **Ease every forward step.** `RD.anim` adds `rd-fwd` to the card when the reader steps or plays forward: give the marks that appear at that step `class="rd-new"` (they slide and fade in) and marks that leave `class="rd-gone"`, and the `.an-cap` caption fades in by itself. A custom `requestAnimationFrame` animation plays a step's motion once whenever a step advances (autoplay or the forward button), instead of jumping to the step's end (the MLA explainer, `24_js_rd_mlx.js` on Attention variants: `st.stop`). Back and the scrubber jump; reduced motion jumps.
- **No decorative ambient motion** (drifting, twinkling, a model spinning on its own). Motion is the steps of an explained animation, plus flows: dots streaming along the path data takes in a 3D stage ([three-d.md](three-d.md)), which run continuously while the stage is at least half in view (Khalid, 2026-11-06) and stop off screen and under reduced motion.

## Captions in HTML, not SVG
Step captions, explanations, legends with more than a word or two, and long axis notes go in HTML beside or under the SVG, where they wrap. SVG text does not wrap and clips at phone width. Keep SVG text to short labels and numbers.

## Light and dark through CSS variables
- Colours are CSS variables defined on `:root` and redefined under `@media (prefers-color-scheme: dark)` ([../build/templates/01_head.html](../build/templates/01_head.html): `--bg --card --ink --mute --line --soft --acc --acc2 --good --bad --dim --hl --shadow` and series colours `--c1` to `--c6`). Cards use `--card` on the tinted `--bg`.
- SVG uses `fill="var(--ink)"`, `stroke="var(--line)"`; never a hard-coded black or white. Canvas reads the computed variables at draw time and redraws when the scheme changes.
- Status colours carry meaning consistently: measured, published by the vendor, independent, derived, unconfirmed (the generative root uses classes `.meas`, `.vend`, `.indep`, `.der`, `.unc`).

## Motion manners
- **Reduced motion:** read `matchMedia('(prefers-reduced-motion: reduce)')`; nothing moves by itself, start paused and move one step at a time without tweening; particles show their end state with a step control.
- **Pause off screen:** an `IntersectionObserver` on the card plus `document.hidden` plus `card.offsetParent!==null` (hidden tab) gate every timer and `requestAnimationFrame` loop.
- **Autoplay on view** (Khalid, 2026-11-06; replaces the 2026-10-23 never-autoplay rule): an animation or 3D stage plays its steps by itself once at least half of it is on screen in the visible tab, about 3.5 to 5.5 s per step so the step's explanation can be read; the step list on the left highlights along. Leaving the screen pauses it and coming back resumes it. It stops for good when the reader takes any control (a step in the list, back, forward, the scrubber, play or pause) or reaches its last step. `RD.anim` and `S3.stage` in the templates do this.
- **Controls** on every animation: play and pause, step back and forward, scrubber, speed. `RD.anim` in [../build/templates/21_js_rd_common.js](../build/templates/21_js_rd_common.js) does all of this; reuse it or copy it into a tab's own core file.
- Mode toggles reset the animation to step 0 with the new step count (`anim.reset(n)`, `S3.stage(...).list(id)`) and replay it: the one exception to "stops for good on a reader control", since the reader asked to see the other mode.

## The split layout (standing rule, 2026-11-06)
Every section that has a visual is two columns; a section without one is full width ([../teaching/teaching-contract.md](../teaching/teaching-contract.md)). Copy [../build/templates/02_split.html](../build/templates/02_split.html) into `src/parts/` (it is CSS only) and wrap each such section:
```html
<div class="s3sp"><div class="s3R"><div id="stg-x"></div></div><div class="s3L">      <!-- an animated or 3D stage: the stage first, so on a phone it sits at the top and stays under the nav -->
<section id="s-x"><h2>...</h2><p>...</p><ol class="sx" id="sx-x"><li><b>Step.</b> What it shows.</li>...</ol>...</section>
</div></div>

<div class="s3sp"><div class="s3L"><section id="s-y">...</section></div>             <!-- a static figure or chart: text first, so on a phone the figure follows the text -->
<div class="s3R"><div class="s3side"><div class="card">...figure...</div></div></div></div>
```
- At 1100 px and wider `.s3sp` is a grid (left `minmax(0,1fr)`, right `minmax(0,1.15fr)`), the page widens to 1380 px while the open tab holds a split, and the right column's content is sticky under the section nav (`top:58px`; the stage's height follows the scene's shape, capped by the window).
- **A 2D animation in a split** uses `RD.anim({..., list:'sx-x'})`: the `ol.sx` on the left gets the same marking, clicks and `aria-current` as a 3D stage's list; `reset(n,'sx-other')` swaps the list on a mode toggle and replays. Put the card first in `.s3R` (so on a phone it sits at the top of its section) and, when it is compact (about 320 px tall or less at 390 px), give it the class `s3stick` so it stays under the nav while its steps are read.
- Sticky offsets are 50 px on phones and 58 px from 1100 px up (under the section nav, which is about 48 px tall).
- Several sections can share one split when one visual serves them (Problem and Idea share the recurrence-against-attention stage on the trial page); a section with two visuals stacks them in the right column or splits into two sections.
- Size charts in the right column from its measured width as usual; they redraw when the tab opens.
- **Class collisions (2026-11-06 lesson):** older pages already define `.sp`, `.split`, `.kv`, `.chips` and similar (so the template's are `.s3chips`, `.s3q`, `.s3k`, `.s3v`); the `s3` prefix exists because the trial page's `.sp` picked up 13.5 px prose and a border and its `.split` became a two-column grid at 390 px. Before adding a class, grep the page's CSS for it.

## Scope everything with a prefix
- Each tab (and each agent) has a short prefix (`df`, `fw`, `vl`, `sc`). Element ids, classes, data attributes and global names carry it: `#df-cfg`, `.fw-box`, `window.FW`, `window.FWD`.
- Tab CSS lives in the tab's own part inside `<style>` and is scoped under the tab id (`#t-diff .meas{...}`), so tabs built in parallel cannot collide.
- Each JS part is wrapped in an IIFE that returns early when its card is absent (`if(!$('df-cfg'))return;`), so a missing or failing part never takes others down.
- Script-written HTML with tab links needs `RD.tabLinks(el)`: `99_js_tabs.js` binds only the links present at load.

## Size budgets
| What | Budget |
|---|---|
| Root page (`index.html`) | about 1.5 MB |
| Child or paper page | about 1 MB |
| Images in `img/` | under about 200 KB each |
| Each data part (`3x_js_<p>_0data.js`) | small: hundreds of KB at most; ask whether every field is shown |
| Any single committed file | under 1 MB (never MP4s, PDFs or large downloads) |
The old 300 KB limit is retired. Going over a budget is acceptable when the content needs it: say so in the report; trim encodings (quantise, thumbnail, round to the printed precision) before cutting knowledge. When several tabs share a page, give each a share early (the generative root asked two labs to trim from 360 to 250 KB and 270 to 180 KB).
