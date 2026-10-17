# Scaffold: folders, parts and the build

How a page's source is laid out, how parts are named and assembled, and the fail-safe rules for its JavaScript. Copy the files in [templates/](templates/) to start; checks are in [checks.md](checks.md).

## Folder layout
A page folder sits where the Notion tree puts it: `technical_knowledge_base/<section>/<topic>/` for a root, a child's folder inside its parent's, names as snake_case slugs of the Notion titles (exact title and Notion id in `pages.json` and the folder's `README.md`).
```
<page folder>/
  index.html            built; the whole Notion page (never edited by hand)
  README.md             title, Notion id, what the page is
  src/
    build.sh            writes ../index.html from parts/
    parts/              the page, in numbered parts (below)
    README.md           how the page was built, departures from the page-kind shape and why
    viz_ideas.md        visuals built and rejected, with scores and reasons
    inputs/             small fetched inputs (configs, table extracts), each under about 1 MB
    recompute.py ...    scripts that recompute every published number a visual reproduces
    data/               (a root) the running example's definition, shared by labs: read-only after setup
    <tab>/              (a root built by a team) one folder per tab agent: scripts, out/, notes
    scripts/run_pending.sh   runs still to do, with time estimates (see ../evidence/local-runs.md)
  <child folder>/ ...   child pages, same layout
  video/                optional HyperFrames project (renders not committed)
```
Never commit `__pycache__`, `.shots/` (screenshots), MP4s, PDFs or files over about 1 MB.

## Parts and their order
`build.sh` concatenates by file name, so the number decides the place:
| Part | What |
|---|---|
| `01_head.html` | doctype, `<title>` (exact Notion title), theme CSS, opens `<body><div class="w">` |
| `10_header.html` | `<h1>`, the subtitle (`.sub`), the tab bar |
| `20_read.html` (optional) or `20_read_a.html` | opens the Reading tab `<div class="tab" id="t-read" role="tabpanel">`, its `<style>` scoped under `#t-read` |
| `20_read_b.html` ... | Reading sections in order |
| `20_read_z.html` | closes the Reading tab `</div>` |
| `21_js_rd_common.js` | `window.RD` helpers and the step-animation controller |
| `22_js_rd_<name>.js` ... | Reading tab scripts (data part first, for example `22_js_rd_data.js`) |
| `3N_tab_<name>_a.html` ... | one group per tab, N from 1; `_a` opens `<div class="tab" id="t-<name>" role="tabpanel" hidden>` with its scoped `<style>`, the last closes it |
| `3N_js_<p>_0data.js`, `_1core.js`, `_2<what>.js` ... | that tab's scripts: data (written by a script, never by hand), core helpers under the tab's namespace, then one file per section |
| `39_tab_more.html` | Further reading, the last tab |
| `05z_errbox.js.html` | the error handler, emitted before the scripts by `build.sh` |
| `99_js_tabs.js` | tab wiring, always the last script |

**Name the first Reading part `20_read_a.html` (or keep a wrapper in `20_read.html`, which `build.sh` cats first explicitly), and list globs in byte order:** in this locale the shell sorts `20_read_b.html` before `20_read.html`. The template `build.sh` sorts with `LC_ALL=C`. Make sure every part closes every `div` it opens.

The header's tab bar:
```html
<h1>Topic: example</h1>
<div class="sub">One or two sentences: what the page teaches, how evidence was made, data as of month year.</div>
<div class="tabs" role="tablist" id="tabs">
<button role="tab" data-t="t-read" aria-selected="true">Reading</button><button role="tab" data-t="t-lab" aria-selected="false">Some lab</button><button role="tab" data-t="t-more" aria-selected="false">Further reading</button>
</div>
```
Tab ids are `t-` plus lowercase letters, digits or hyphens (the checks discover tabs by `data-t="t-..."`). Optional deeper tabs can sit after a `.tabsep` label and carry `class="deep"`.

## build.sh
The template ([templates/build.sh](templates/build.sh)) is the generative root's build, generalised; it reproduces that page byte for byte. It:
- concatenates head, header, Reading parts, tab parts;
- emits the hidden `<div id="jsErr" hidden ...>` box, then `05z_errbox.js.html`;
- wraps **each** `*.js` part in its own `<script>` (with a `/* name */` comment) and puts `99_js_tabs.js` last;
- expands link macros (Perl, UTF-8 safe):
  - `{{text|n:<notion id>}}` becomes a link to `https://app.notion.com/p/<id>` in a new tab;
  - `{{text|#t-tab}}` becomes `<a href="#" data-tab="t-tab">text</a>`, which switches tab;
  - `{{text|https://...}}` becomes an external link with `target="_blank" rel="noopener noreferrer"`;
- warns on an unexpanded `{{` and on any em-dash, and prints the page size.
Paper pages also use `ax:` (arXiv HTML anchors), `tab:` and margin-label macros; their build lives in the paper reference folder. Pages with LaTeX add the `tex2mathml` pass (commented in the template). Never put a literal backslash-n through `echo` in `build.sh`; keep such snippets in part files and `cat` them.

## Fail-safe JavaScript
- One `<script>` per JS part, so a syntax error in one part cannot stop the rest. The tab wiring is its own last script, so tabs always work.
- `05z_errbox.js.html` installs `window.__jsErr` and listeners for `error` and `unhandledrejection`; any error appears in the visible `#jsErr` box with a request to send it. A page is publishable only with exactly one `id="jsErr"` (checks report `errbox 1`) and the box hidden on every tab.
- Each part is an IIFE that returns early if its card or its data is missing (`if(!window.FW||!$('fw-toy'))return;`).
- Data parts set one global (`window.FWD={...}`), are generated by a script in `src/<tab>/` from recorded outputs, and say so in their first comment line ("written by src/flow/make_page_data.py; do not edit by hand").
- `TAB_RENDER` registration for every chart ([../visuals/mechanics.md](../visuals/mechanics.md)).
- Storage only in try/catch. The tab script remembers the last tab under a per-page key: replace `STORAGE_KEY` in `99_js_tabs.js` with the page prefix plus `-tab` (for example `gm-tab`, `dc-tab`).

## Prefixes
Pick a short page prefix (`gm`, `mi`, `dc`) for the storage key and the topic's agent names, and a short prefix per tab (`lt`, `df`, `fw`, `vs`, `vl`, `mm`): the tab's part files (`32_js_df_*`), element ids (`df-cfg`), classes (`.df-box`), CSS scope (`#t-diff ...`), global namespaces (`window.DF`, `window.DFD`) and data attributes all carry it. With several agents on one page, each owns only its own part files and `src/<tab>/` folder; shared files (`01_head.html`, `21_js_rd_common.js`, `99_js_tabs.js`, `10_header.html`) belong to the lead.

## Sources distilled
`html_utils/templates/` (README.md, build.sh.example, 05z_errbox.js.html, 10_js_common.js), `html_utils/BRIEF_page_agent.md` (fail-safe build, 20_read_a naming, long runs), `html_utils/methods/topic_pages.md` (one subagent per tab, scoped CSS, prefixed ids), `html_utils/methods/papers.md` (paper build macros), `CLAUDE.md` (layout, git rules), the gm and mi briefs (scaffold, file ownership, link syntax), and the generative root's `src/build.sh` and parts.
