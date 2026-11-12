// ---- window.SGDRAW: small SVG helpers (wrapped text in boxes, arrows) for the static diagrams of sections 6 and 8 (27_js_sg_diag.js).
// The hero figure that used to be drawn here is the 3D stage Fig. 1 since 2026-11-12 (40_js_sc_hero.js). ----
(function(){
  const D=window.SGDRAW={
    wrap(s,n){const out=[];let cur='';for(const w of String(s).split(' ')){if(cur&&(cur+' '+w).length>n){out.push(cur);cur=w}else cur=cur?cur+' '+w:w}if(cur)out.push(cur);return out},
    // a box with a bold title and wrapped lines; returns {svg,h}
    box(x,y,w,title,sub,o){o=o||{};const cw=6.1,n=Math.max(8,Math.floor((w-16)/cw)),tl=D.wrap(title,Math.floor((w-16)/6.8)),sl=sub?D.wrap(sub,n):[];
      const h=o.h||(10+tl.length*15+sl.length*14+6);let s='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="7" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"/>';
      tl.forEach((t,i)=>s+=RD.t(x+8,y+18+i*15,RD.esc(t),{fs:12,w:600,fill:o.tc||'var(--ink)'}));
      sl.forEach((t,i)=>s+=RD.t(x+8,y+18+tl.length*15+i*14,RD.esc(t),{fs:11,fill:'var(--mute)'}));
      return {svg:s,h:h}},
    arrow(x1,y1,x2,y2,lab,col){col=col||'var(--mute)';const a=Math.atan2(y2-y1,x2-x1),k=6;
      let s='<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+col+'" stroke-width="1.5"/>';
      s+='<path d="M'+x2.toFixed(1)+','+y2.toFixed(1)+' L'+(x2-k*Math.cos(a-0.45)).toFixed(1)+','+(y2-k*Math.sin(a-0.45)).toFixed(1)+' L'+(x2-k*Math.cos(a+0.45)).toFixed(1)+','+(y2-k*Math.sin(a+0.45)).toFixed(1)+'Z" fill="'+col+'"/>';
      if(lab)s+=RD.t((x1+x2)/2+8,(y1+y2)/2+4,RD.esc(lab),{fs:11,fill:'var(--mute)'});return s}};
})();
