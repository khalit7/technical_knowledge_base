// ---- Reading tab: SVG helpers drawn at the measured width (window.QPG). Adapted from the Transactions and concurrency page's TXF. ----
window.QPG=(function(){
  const esc=RD.esc;
  const T=(x,y,s,o)=>{o=o||{};return '<text x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11.5)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+(o.mono?' font-family="ui-monospace,Menlo,Consolas,monospace"':'')+'>'+esc(s)+'</text>'};
  const R=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" rx="'+(o.rx===undefined?5:o.rx)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+'/>'};
  let mk=0;
  function A(x1,y1,x2,y2,o){o=o||{};const id='qpm'+(++mk),col=o.col||'var(--mute)';
    let d;if(o.c){const mx=(x1+x2)/2,my=(y1+y2)/2,dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1;d='M'+x1+' '+y1+' Q'+(mx-dy/L*o.c).toFixed(1)+' '+(my+dx/L*o.c).toFixed(1)+' '+x2+' '+y2}
    else d='M'+x1+' '+y1+' L'+x2+' '+y2;
    return '<defs><marker id="'+id+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="'+col+'"/></marker></defs>'+
      '<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+(o.sw||1.5)+'"'+(o.dash?' stroke-dasharray="5 4"':'')+' marker-end="url(#'+id+')"/>'};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  // horizontal bars, label above each bar on narrow screens, beside it on wide ones.
  // groups: [{title, rows:[{label, v, col, txt, hl}]}], opts {max, log, perGroup, label}
  function hbars(el,groups,opts){opts=opts||{};const w=RD.width(el);const vw=opts.vw||76;
    const all=groups.flatMap(g=>g.rows.map(r=>r.v));
    let y=4,b='';
    groups.forEach(g=>{const vs=opts.perGroup?g.rows.map(r=>r.v):all,mx=opts.max||Math.max(1e-9,...vs),mn=Math.min(...vs.filter(v=>v>0));
      const frac=v=>opts.log?Math.max(0.01,(Math.log10(v)-Math.log10(mn/3))/(Math.log10(mx)-Math.log10(mn/3))):v/mx;
      if(g.title){b+=T(0,y+12,g.title,{w:600,fill:'var(--mute)',fs:11.5});y+=20}
      const wide=w>=640,lw=wide?Math.min(w*0.42,12+6.4*Math.max(...g.rows.map(r=>r.label.length))):0;
      g.rows.forEach(r=>{b+=T(0,y+12,r.label,{fs:11.5,w:r.hl?600:400});if(!wide)y+=16;else y+=2;
        const tw=w-vw-6-lw,bw=Math.max(2,tw*frac(r.v));b+=R(lw,y,tw,12,{fill:'var(--soft)',stroke:'none',rx:3})+R(lw,y,bw,12,{fill:r.col||'var(--c1)',stroke:'none',rx:3})+T(w,y+10.5,r.txt,{a:'end',fs:11.5,w:600});y+=wide?18:20});
      y+=4});
    el.innerHTML=svg(w,y,b,opts.label);
  }
  return {T,R,A,svg,hbars};
})();
