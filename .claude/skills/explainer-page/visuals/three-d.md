# 3D stages: the renderer, the stage and the step list

Agreed with Khalid on 2026-11-06 after the trial on the Attention Is All You Need paper page (`technical_knowledge_base/whats_new/papers/attention_is_all_you_need_transformer/`, parts `30_js_s3.js` to `36_js_sc_pe.js`; read them before building a scene). The look is that of the every-joule explainers: white blocks with thin ink edges, soft glows, arcs, a floor grid, drag to turn. **Use one when it is reasonable, never force it** ([../teaching/teaching-contract.md](../teaching/teaching-contract.md)): Khalid prefers a 3D visual to none, but a concept that reads best flat (a curve, a log-scale scatter, a heatmap, a table) stays 2D.

## When 3D earns its place
- Stacks and pipelines: the layers of a model, the sub-layers of a block, a request moving through serving stages.
- Shapes: a tensor's dimensions, a vector split into heads, the FFN's expansion drawn in depth, a KV cache by layer, head and token.
- Many matrices at once: attention weights as bar fields (rows queries, columns keys, height weight), one plate per head or layer.
- Spatial systems: GPUs in a node, a rack, a memory hierarchy, a mesh of devices with the collective moving over it.
- Before/after of two architectures on the same input, side by side in depth.
Not for: anything whose message is a number on an axis, decoration, or a picture that would be the same flat.

## Files
- [../build/templates/25_js_s3.js](../build/templates/25_js_s3.js) into `src/parts/`, unchanged: `window.S3` (the renderer on Canvas 2D, no WebGL, no library, so pages stay self-contained and checkable in headless Chrome) and `S3.stage` (the card, its controls, autoplay on view, the link to the step list).
- [../build/templates/02_split.html](../build/templates/02_split.html) into `src/parts/`: the split layout and the stage and step-list styles.
- One script per scene, `3x_js_sc_<name>.js`, each an IIFE that returns early when its stage is absent.

## A scene
```js
(function(){
  if(!document.getElementById('stg-x'))return;const {at,off,lerp,mix}=S3;
  function draw(R,k,e){const P=R.P;            // k: current step, e: its eased progress 0..1; P: the theme's colours (P.c1..c6, P.paper, P.ink, P.mute, P.q/P.k/P.v)
    R.grid(-5,5,-3,3,.5);                       // floor
    R.box([x,y,z],[w,h,d],{fill:mix(P.paper,P.c1,.4),a:at(k,e,2)}); // centre of the bottom face, size; fades in at step 2
    R.arc(a,b,height,{c:P.c4,w:2,t:e,top:1});  // a curve drawn as it progresses
    R.line(pts,{c:P.acc,w:2,head:6});R.quad(pts,{fill:..});R.glow(p,r,{c:P.c2});R.ball(p,r,{c:..});
    R.label(p,'text',{mono:true,fs:12,al:'right',dx:-8,grp:'rows'}); // upright; grouped labels are pushed apart with leader lines and hidden under 520 px
  }
  S3.stage({id:'stg-x',list:'sx-x',fig:'Fig. 2 · what it shows',cam:[theta,phi],bounds:[[x0,y0,z0],[x1,y1,z1]],aspect:.7,draw,dur:1300,hold:4200,onStep:k=>{}});
})();
```
- `bounds` is what the camera fits to the canvas at any size; include room for side labels. `aspect` (height / width) sets the card's height on wide screens: a wide, shallow scene gets a short card instead of floating in empty space.
- `cam:[theta,phi]`: start around `phi` .5 to .8 (looking down) so rows in depth spread vertically; a low camera flattens the scene into a band.
- `S3.stage(...).list('other-id')` swaps the step list (a mode toggle such as recurrent against self-attention) and replays. A stage pauses while under half in view (or, if taller than the window, while under half the window) and resumes where it was, keeping a play the reader pressed.

## Rules (each from something that went wrong or right in the trial)
- **Every step is explained on the left.** The stage is driven by an `ol.sx` with exactly one item per step (the check fails a mismatch): a bold short title, then what the step shows and why. The figure never carries the explanation alone.
- **Real numbers where the page has them.** The trial's attention, heads and mask scenes run the page's trained toy model; say on the page which model, layer and head. Illustrative inputs are labelled as such.
- **Labels upright and at least 12 px**, never drawn in perspective; side labels in a `grp` so they never overlap; on a phone (under 520 px) the grouped and `wide:1` labels hide and the step text names the parts. Labels are clamped inside the canvas.
- **Fade, do not clutter:** a step highlights its parts and fades the rest (alpha about .15 to .25); a step that changes the whole picture fades the old one out fully before the new one appears.
- **Motion:** autoplay on view and the stop rules are in [mechanics.md](mechanics.md); no idle spinning or drifting; drag turns the model (horizontal only on touch so the page still scrolls); a "Reset view" button appears after a drag.
- **Colours:** palette keys from CSS variables, so light and dark both work; the page's highlight colour for the thing being taught; query, key and value are orange, teal and purple (`P.q`, `P.k`, `P.v` in a scene, `.s3q`, `.s3k`, `.s3v` in the prose) on every page; many categories use the muted Tableau set from [mechanics.md](mechanics.md).
- **Size:** the renderer is about 15 KB; a scene 3 to 6 KB. Draw on demand (no loop while idle).

## Checks
On top of [../build/checks.md](../build/checks.md): every stage plays when scrolled into view and none moves under reduced motion; stepping forward reaches "step n of n"; the step list has n items; screenshots at 1400 px light, 390 px dark and a mid step of each scene, looked at. The trial page's `src/check_page.mjs` has the code to copy.
