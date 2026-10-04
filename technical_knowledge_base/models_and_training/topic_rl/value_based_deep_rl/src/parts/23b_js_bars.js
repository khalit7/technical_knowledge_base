// ---- Horizontal bars helper (rows: {nm, v, col, lab, note, hl}); values may be negative (drawn from a zero line) ----
RD.bars=function(el,rows,o){o=o||{};const lo=o.lo!=null?o.lo:Math.min(0,...rows.map(r=>r.v)),hi=o.hi!=null?o.hi:Math.max(...rows.map(r=>r.v));
  const sp=hi-lo||1,z=(0-lo)/sp*100;
  el.innerHTML=rows.map(r=>{const a=Math.max(lo,Math.min(hi,r.v));const x0=Math.min(z,(a-lo)/sp*100),w=Math.abs((a-lo)/sp*100-z);
    return '<div class="row'+(r.hl?' hl':'')+'"><div class="nm" title="'+RD.esc(r.full||'')+'">'+r.nm+(r.note?'<span class="ml">'+r.note+'</span>':'')+'</div><div class="track">'+
      (lo<0?'<div style="position:absolute;left:'+z.toFixed(2)+'%;top:0;bottom:0;width:1px;background:var(--mute)"></div>':'')+
      '<div class="fill" style="left:'+x0.toFixed(2)+'%;width:'+Math.max(0.6,w).toFixed(2)+'%;background:'+(r.col||'var(--c1)')+'"></div></div><div class="val">'+(r.lab!=null?r.lab:RD.n(r.v,1))+'</div></div>'}).join('')};
