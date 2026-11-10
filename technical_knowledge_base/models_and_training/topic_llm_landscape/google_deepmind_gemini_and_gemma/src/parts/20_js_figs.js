// ---- Reading figures drawn at the measured width (2026-10-24): the hero ----
(function(){
  if(!$('heroSvg'))return;
  const T=RD.t;
  // a box with a bold first line and plain further lines; fill and stroke from the family colour
  function box(x,y,w,h,col,lines){
    let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="8" fill="var(--soft)" stroke="'+col+'" stroke-width="1.6"/>';
    const lh=15,y0=y+h/2-(lines.length-1)*lh/2+4;
    lines.forEach((t,i)=>{s+=T(x+w/2,y0+i*lh,t,{a:'middle',fs:i?11:12,w:i?null:600,fill:i?'var(--mute)':'var(--ink)'})});
    return s}
  const arrow=(x1,y1,x2,y2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.4" marker-end="url(#ggah)"/>';
  function hero(){
    const W=Math.max(300,Math.min(860,RD.width($('heroSvg')))),g=12,cw=(W-g)/2,c2=cw+g;
    let s='<defs><marker id="ggah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    let y=2;
    s+=box(1,y,W-2,52,'var(--closed)',['Frontier: Gemini 4 Argon, 3.1 Pro','sparse MoE, natively multimodal, 1M-token window']);y+=52;
    s+=arrow(cw/2,y+2,cw/2,y+38)+arrow(c2+cw/2,y+2,c2+cw/2,y+38);
    s+=T(W/2,y+24,'distil: k-sparse teacher logits',{a:'middle',fs:11,fill:'var(--acc)',w:600});y+=40;
    s+=box(1,y,cw-2,52,'var(--closed)',['Flash, Flash-Lite','closed, Gemini API'])+box(c2+1,y,cw-2,52,'var(--open)',['Gemma','open weights, Apache 2.0']);y+=52;
    s+=arrow(cw/2,y+2,cw/2,y+22)+arrow(c2+cw/2,y+2,c2+cw/2,y+22);y+=24;
    const L=W<520;
    s+=box(1,y,cw-2,92,'var(--acc)',['Caller sets per request',L?'thinking_level':'thinking_level (minimal to high)',L?'media resolution':'media resolution per item',L?'so: tokens per task':'so: tokens per task × price','= cost per task']);
    s+=box(c2+1,y,cw-2,92,'var(--acc)',['Built to fit one machine',L?'5 local : 1 global':'5 local : 1 global layers',L?'keys reused as values':'keys reused as values, p-RoPE',L?'26B A4B MoE; PLE':'26B A4B MoE; PLE on phones','= one card or phone']);y+=92;
    y+=10;s+=box(1,y,W-2,46,'var(--mute)',['Trained on TPU pods with JAX and ML Pathways',L?'v5p (Gemini 2.5); v6e, v4 (Gemma 4)':'TPU v5p pods (Gemini 2.5); v6e and v4 (Gemma 4)']);y+=48;
    $('heroSvg').innerHTML=RD.svg(W,y,s,'Hero: the frontier Gemini model is distilled into the Flash tiers and into open Gemma, all trained on TPUs');
  }
  // (2026-11-10: the edge-model bars and the sparse-against-dense bars became the 3D stages Fig. 4 and Fig. 5, 42_js_sc_pl.js and 43_js_sc_sd.js)
  const all=()=>{hero()};
  RD.onRender(all);RD.onResize(all);
})();
