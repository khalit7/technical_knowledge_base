// ---- This page's helpers on top of the skill template (21_js_rd_common.js): number formatting, the one-screen table's row jumps, and RD.stretch ----
// numbers with a true minus sign; percentages; powers of ten with a superscript exponent
RD.pct=(v,n)=>(100*v).toFixed(n==null?1:n)+'%';
RD.e=(v,n)=>{if(v===0)return '0';const a=Math.abs(v),ex=Math.floor(Math.log10(a)),m=v/Math.pow(10,ex);return m.toFixed(n?n-1:1)+' &times; 10<sup>'+(ex<0?'&minus;'+(-ex):ex)+'</sup>'};
RD.n=(v,d)=>{const s=(+v).toFixed(d==null?2:d);return /^-0?\.?0*$/.test(s)?s.slice(1):s.replace('-','−')};
RD.sg=(v,d)=>(v>0?'+':'')+RD.n(v,d);
// clicking a row of the one-screen table jumps to its section
(function(){
  const tb=document.getElementById('rd-spine');
  if(tb)tb.addEventListener('click',e=>{const r=e.target.closest('tr[data-go]');if(!r||e.target.closest('a'))return;const s=document.getElementById(r.dataset.go);if(s)s.scrollIntoView({behavior:RD.RM?'auto':'smooth',block:'start'})});
})();
// RD.stretch: a long replay (a learning run of tens of frames) grouped into a few explained stretches (2026-11-06 rule: never one step per frame).
// o: {card, ctl, list, cps (the frame each step ends on; cps[0] is the opening frame), frame(f, step), ms (time on each step), per (ms per frame), dur (cap)}.
// Built on RD.anim, so it autoplays in view, pauses off screen and stops on any reader control. Stepping forward plays the stretch's frames
// once (requestAnimationFrame); back, the scrubber and the list jump to the stretch's last frame; under reduced motion every step jumps.
RD.stretch=function(o){const card=document.getElementById(o.card);let raf=0,cur=o.cps[0];
  function to(i){if(raf){cancelAnimationFrame(raf);raf=0}const f1=o.cps[i],fwd=i>0&&!RD.RM&&card.classList.contains('rd-fwd');
    if(!fwd||f1<=o.cps[i-1]){cur=f1;o.frame(f1,i);return}
    const f0=o.cps[i-1],D=Math.min(o.dur||2600,Math.max(500,(f1-f0)*(o.per||110))),t0=performance.now();cur=f0;o.frame(f0,i);
    const run=now=>{raf=0;const u=card.offsetParent===null?1:Math.min(1,(now-t0)/D),f=Math.round(f0+(f1-f0)*u);if(f!==cur){cur=f;o.frame(f,i)}if(u<1)raf=requestAnimationFrame(run)};
    raf=requestAnimationFrame(run)}
  const an=RD.anim({card:o.card,ctl:o.ctl,n:o.cps.length,ms:o.ms||4800,label:o.label||'Step',list:o.list,draw:to});
  return {an,
    // redraw the current step's last frame (a slider moved or the data changed)
    redraw(){if(raf){cancelAnimationFrame(raf);raf=0}cur=o.cps[an.i];o.frame(cur,an.i)},
    // a mode toggle: new stretch boundaries, back to the first step, and replay
    reset(cps){if(cps)o.cps=cps;if(raf){cancelAnimationFrame(raf);raf=0}an.reset(o.cps.length)},
    get frame(){return cur}};
};
