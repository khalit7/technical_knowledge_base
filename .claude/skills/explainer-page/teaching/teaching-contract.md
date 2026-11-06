# The teaching contract

**The goal of every page: Khalid understands the subject deeply in the least time.** Every section, visual, tab and sentence is there because it serves that goal; anything that does not is cut or collapsed. This file overrides any older rule in this skill that says a section is mandatory or that a page should be longer. Agreed with Khalid on 2026-10-23 after a full audit of the knowledge base.

## The reader, once more
An MSc-level AI engineer with production LLM experience ([../understand/reader.md](../understand/reader.md)). Predict-then-reveal is allowed as a one-question pause before a real result (no score, always skippable, at most two or three per page; it sits in the left column with the text), not an assessment. He prefers visuals, and the evidence agrees with him for a different reason: words plus a picture beat words alone for everyone (Mayer's multimedia principle). So every core idea gets **a picture and a short statement**, never only one of them. He reads to understand, not to pass an exam: no quizzes, flashcards or spaced review.

## The shape of a page
1. **Top, about two minutes.**
   - **The core idea in one sentence**, the sentence the whole subject hangs on (`curriculum.md` already asks for it; now it is on the page).
   - **One hero figure** that the rest of the page elaborates: the picture you would draw on a whiteboard first.
   - **"You need"**: links to the pages this one assumes, only when it assumes something he may not have. Its strict subset (pages he cannot understand this one without, transitively reduced) is the page's `prereqs` in `pages.json`, which orders the learning map on the site's landing page; every prerequisite must appear in "You need" (`python3 html_utils/learning_map.py check` warns when one does not).
   - **New terms**: a short list, only the terms this page introduces, each with a few words.
2. **Core.** The explanation, in the subject's own order.
   - **Concrete, then picture, then formula.** A small instance with real numbers, the diagram of the same thing, then the equation with the same names and colours (concreteness fading).
   - **Visuals beside the claim they prove, in the split layout** (below). The strongest visual of a page must not sit one click away in a tab while the prose describes it in words.
   - **One widget, one variable**, with a prediction prompt before the reader moves it ("predict what happens to the cache when you halve the heads, then drag").
   - **On ground he already knows, skip to what is different.** A worked walkthrough of something familiar slows an expert down (expertise reversal); a full worked example is for genuinely new ground.
   - **A root** is a map, comparisons, definitions and child cards. It never re-teaches a child.
3. **Depth.** Closed `<details>` blocks for proofs, derivations, edge cases, provenance tables, per-item lists and interview rehearsal. They are optional and not counted in the core reading time.
4. **Further reading** last.

What is **not** required any more: interview questions on every page (only when useful, and then in a closed block), a "common mistakes" section that repeats the core (keep a mistake only when it teaches something the core does not show), the five-things template for every idea (say cost, when and how to check where they matter, not by rote), a fixed number of labs, a map tab or data tabs on every root, "How we got here" (keep a lineage only when the order explains the design), and news-like "the models today" sections (volatile; they belong in tech news).

## Page layout: text on the left, visuals on the right (standing rule, Khalid, 2026-11-06)
Every page, every tab, from the Attention Is All You Need trial:
- **A section with a visual is two columns**: the explanation on the left, its visual on the right (a 3D stage, a 2D diagram, chart, animation, stepper, slider widget or real image), sticky while the section is read. On screens under 1100 px the visual sits at the top of its section (an animated stage stays under the section nav while its steps are read).
- **A section with no visual is full width.** Never invent a visual to fill the right column.
- **The visual is explained, never left to be read on its own.** An animation or stepper has its steps written out on the left as a numbered step list (`ol.sx`), the current step marked and each item clickable; a static figure has its caption and the sentence that uses it.
- **3D when it is reasonable, never forced.** Prefer a 3D stage over none when the concept has real spatial structure (stacks of layers, tensors and their shapes, heads side by side, a grid of GPUs, a memory hierarchy, a matrix of weights as a bar field, parts moving through a pipeline) or when depth separates things that a flat drawing would overlap. Keep 2D for what reads best flat: curves, scatters, log axes, heatmaps, tables, timelines. Khalid prefers having a 3D visual to not having one, but a forced one is decoration.
- How to build it: [../visuals/three-d.md](../visuals/three-d.md) (renderer, stage, step list) and [../visuals/mechanics.md](../visuals/mechanics.md) (the layout classes).

## Length: judged per page, never by a fixed limit
There is no word or minute budget. Each page is as long as its subject needs, and condensing must never lose important information. The method:
1. **Knowledge ledger.** Before rewriting an existing page, list every knowledge unit it holds (a claim, a number, a mechanism step, a caveat, a source) in `src/ledger.json` (`html_utils/ledger.py init` drafts it).
2. **Label each unit**, exactly one of:
   - `core`: needed to understand the subject;
   - `depth`: true and useful, but not needed on first read; goes into a closed block;
   - `owned:<page path>`: another page owns it; replace it with a link, only after checking that page carries the unit with its caveats (if not, move it there first);
   - `volatile`: a dated product, price or news fact; goes to tech news or the provider page;
   - `fat`: a wind-up, a restatement, prose that a visual now carries, chronicle, a recap.
3. **Delete only fat.** Everything else survives somewhere.
4. **Rewrite for density.** A paragraph that a visual now carries becomes one caption sentence. A list of facts becomes the example that shows them.
5. **Check the ledger after the rebuild** (`html_utils/ledger.py check`): every non-fat unit is found on the page or at its owner.
6. **Record the judgement** in `src/README.md`: core reading time before and after, and why that length is right. A long page whose ledger is all core is fine; a thin page whose subject matters grows.

## Choosing a visual: by what the concept is
| Kind of concept | Visual |
|---|---|
| Structure or layout (an architecture, a memory hierarchy, a protocol's parties) | Static annotated diagram, labels on the figure |
| A process (a request's path, a training step, a handshake) | A step sequence that plays when in view, its steps written out as a step list on the left |
| A change over time that is itself the point (a cache filling, weights moving, a schedule unrolling) | Animation that plays when scrolled into view, with step and scrub controls and its steps written out on the left |
| Spatial structure (stacked layers, tensor shapes, heads, a GPU grid, a weight matrix as heights) | A 3D stage, when reasonable ([../visuals/three-d.md](../visuals/three-d.md)) |
| How a result depends on a parameter | One slider, defaults landing on a published figure |
| A method against the one it replaced | Before/after on the same input (the DeepSeek MLA pattern) |
| A real object (hardware, a paper's own figure, a real UI or log) | A real image |
| Something a sentence says completely | Nothing; text |
| Decoration | Nothing, ever |

The evidence: animation beats a well-made sequence of static steps only slightly on average (Höffler and Leutner 2007; Berney and Betrancourt 2016). It earns its cost when the change is the content and the reader can take over the pace (Tversky et al. 2002; Rey et al. 2019 on segmenting). Khalid chose autoplay (2026-11-06): an animation plays by itself once in view, and the reader can stop it on any step; so every animation stays segmented into explained steps with controls.

Rules for every visual (Mayer's coherence, signalling and contiguity principles):
- **A one-line title saying what to notice**, not a name ("The cache stops growing with heads", not "KV cache chart").
- **Labels on the figure**, not in a legend; the explaining sentence right beside it.
- **One highlight colour per page for the thing being taught**, used for the same term in the prose.
- **One owner per concept.** The page that owns a concept has the single best visual of it; other pages link to it (to the tab) instead of drawing their own. The audit found KV-cache sizing drawn on nine pages.

## Images
- **Hand-built SVG** is the default for mechanisms: it matches the page's colours and notation, themes, animates and diffs.
- **A paper's own figure** when the figure is the reference people cite: redraw it, or embed it with its source and licence named under it.
- **Photos** (hardware, a die shot, a rack) from Wikimedia Commons or another licensed source, credited with author and licence.
- **AI-generated images never for a mechanism**: they draw plausible wrong labels. At most a non-technical illustration, and rarely.
- Images are files in the page's `img/` folder, WebP, small (under about 200 KB each), referenced by relative path, with `alt` text that says what the image shows.
- Each image is credited under it (author, licence, link) and listed in `img/CREDITS.md`; download with `curl`, convert with `cwebp`.
- **When to use a real image (Khalid, 2026-10-29): never forced, always when it adds something new.** An image earns its place only if it shows something the prose and the SVGs on the page do not: what the real object looks like, its scale or layout (the HBM stacks beside a GPU die on the Attention variants page, where "the cache lives in memory" was only a sentence before), a real output (generated samples, a real attention map, a real log or UI), or the figure people actually cite. If it adds something new, include it; if it only decorates or repeats a diagram, leave it out. No quota: a mechanism page may need none, a hardware page several.
- **Place it where the text talks about it**: in the right column of that section (split layout), with a caption that says what to notice, not just what it is. `figure.ph.side` floats are retired.

## Sources
Mayer, *Multimedia Learning* (3rd ed., 2020); Pashler et al. 2008 (learning styles); Höffler and Leutner 2007; Berney and Betrancourt 2016; Tversky, Morrison and Betrancourt 2002; Rey et al. 2019 (segmenting); Kalyuga 2007 (expertise reversal); Fyfe et al. 2014 (concreteness fading); Victor 2011 (explorable explanations).
