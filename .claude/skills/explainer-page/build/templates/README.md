# templates

Files to copy into a new page's `src/` (scripts and `01_head.html` into `src/parts/`, `build.sh` into `src/`). How they fit together is in [../scaffold.md](../scaffold.md).

| File | Goes to | What it is | What to change |
|---|---|---|---|
| `build.sh` | `src/build.sh` | The fail-safe build: head, header, Reading parts, tab parts, the `#jsErr` box, one `<script>` per JS part, tabs last; expands `{{text\|n:<id>}}` and `{{text\|#t-tab}}`; warns on unexpanded links and em-dashes; prints the size. Reproduces the generative root's `index.html` byte for byte from its parts. | Nothing for the standard layout. Uncomment the `tex2mathml` line for a page with LaTeX. |
| `01_head.html` | `src/parts/` | Doctype, viewport, `<title>`, the theme CSS (colour tokens for light and dark, cards, stats, controls, tables, bars, tabs, the 520 px rules) and the opening `<div class="w">`. | Replace `PAGE_TITLE` with the exact Notion title. Add page-wide classes here; tab-specific CSS goes in the tab's own part, scoped under its id. |
| `05z_errbox.js.html` | `src/parts/` | The global error handler that shows any script error in the hidden `#jsErr` box (the box itself is emitted by `build.sh`). | Nothing. |
| `10_js_common.js` | `src/parts/` (optional) | Older shared helpers from the Topic: llms pages: `TAB_RENDER` hook `onTab`, number and byte formatting, seeded random `mulberry32`, SVG boxes and arrows, a log-log frame, end labels pushed apart. | Use when the page needs these; it defines globals (`$`, `fmt`), so a page with many tab agents usually prefers each tab's own namespaced core file. |
| `21_js_rd_common.js` | `src/parts/` | `window.RD`: the step-animation controller `RD.anim` (play, pause, step back and forward, scrubber, speed; animates only on screen in the visible tab, autoplays once when first seen, never under reduced motion), `RD.width` (measured width), `RD.onRender`, `RD.onResize`, `RD.svg`, `RD.t`, `RD.seg`, `RD.tabLinks` for links in script-written HTML, and the section-nav highlight. | Nothing. Tab agents may copy it into their own `3x_js_<p>_1core.js` under their own namespace. |
| `99_js_tabs.js` | `src/parts/` | Tab wiring: `aria-selected`, hides other tabs, runs `TAB_RENDER[id]` when a tab opens, arrow keys, `data-tab` links, remembers the last tab in `localStorage` inside try/catch. | Replace `STORAGE_KEY` with the page prefix plus `-tab` (for example `gm-tab`). |

Not templated (write per page, shapes in [../scaffold.md](../scaffold.md)): `10_header.html` (h1, subtitle, tab bar), `20_read_a.html` ... `20_read_z.html`, `3x_tab_<name>_a.html` ..., `39_tab_more.html`.
