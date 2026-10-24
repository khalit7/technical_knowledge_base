// ---- Reading figures drawn at the measured width (2026-10-24): hero, edge-model parameters, sparse against dense ----
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
  // edge models: checkpoint against effective or resident parameters, to scale
  function ple(){
    const el=$('pleSvg'),W=Math.max(300,Math.min(860,RD.width(el))),mx=8,sc=v=>v/mx*(W-125);
    const R=[['Gemma 4 E2B',5.1,'5.1B with embeddings',2.3,'2.3B effective'],['Gemma 4 E4B',8,'8B with embeddings',4.5,'4.5B effective'],['Gemma 3n E2B',5,'over 5B loaded (standard execution)',1.91,'1.91B resident with PLE']];
    let s='',y=4;
    R.forEach(([n,a,al,b,bl],i)=>{
      s+=T(0,y+12,n,{fs:12,w:600});y+=18;
      s+='<rect x="0" y="'+y+'" width="'+sc(a)+'" height="14" rx="2" fill="var(--dim)"'+(i===2?' stroke="var(--mute)" stroke-dasharray="4 3"':'')+'/>'+T(sc(a)+5,y+11,al.split(' (')[0],{fs:11,fill:'var(--mute)'});y+=17;
      s+='<rect x="0" y="'+y+'" width="'+sc(b)+'" height="14" rx="2" fill="var(--acc)"/>'+T(sc(b)+5,y+11,bl,{fs:11});y+=24});
    el.innerHTML=RD.svg(W,y,s,'Edge models: checkpoint parameters against effective or resident parameters');
  }
  // sparse against dense, each row to its own scale
  function mvd(){
    const el=$('mvdSvg'),W=Math.max(300,Math.min(860,RD.width(el))),bw=W-96;
    const R=[['Compute per token (GFLOP)',7.6,61.4,''],['Weights in bf16 (GB)',52.0,64.0,''],['Weights at 4 bits, Q4_0 (GB)',16.2,19.2,''],['Weights read per token at 4 bits (GB)',2.8,19.2,''],['KV cache at 32K, int8 (GB)',0.28,1.10,'']];
    let s='',y=4;
    R.forEach(([n,a,b])=>{const m=Math.max(a,b),sc=v=>Math.max(2,v/m*bw);
      s+=T(0,y+12,n,{fs:12,w:600});y+=18;
      s+='<rect x="0" y="'+y+'" width="'+sc(a)+'" height="14" rx="2" fill="var(--acc)"/>'+T(sc(a)+5,y+11,'26B A4B '+a,{fs:11});y+=17;
      s+='<rect x="0" y="'+y+'" width="'+sc(b)+'" height="14" rx="2" fill="var(--dim)"/>'+T(Math.min(sc(b)+5,W-4),y+11,'31B '+b,{fs:11,a:sc(b)+5>W-50?'end':null,fill:'var(--mute)'});y+=24});
    el.innerHTML=RD.svg(W,y,s,'Gemma 4 26B A4B against 31B: compute, memory and bytes read per token');
  }
  const all=()=>{hero();ple();mvd()};
  RD.onRender(all);RD.onResize(all);
})();
