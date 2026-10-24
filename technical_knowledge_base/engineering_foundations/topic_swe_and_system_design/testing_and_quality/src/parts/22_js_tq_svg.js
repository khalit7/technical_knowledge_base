// ---- Reading: small SVG helpers for the static figures (drawn at the measured width, colours from CSS variables) ----
window.TQS=(function(){
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const W=el=>Math.max(300,Math.min(860,RD.width(el)));
  // text: o = {a: anchor, fs, fill, w: weight, mono, cls}
  const T=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'" font-size="'+(o.fs||11.5)+'" fill="'+(o.fill||'var(--ink)')+'"'+(o.a?' text-anchor="'+o.a+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+(o.mono?' font-family="ui-monospace,Menlo,monospace"':'')+'>'+esc(s)+'</text>'};
  // split text into lines that fit maxPx at font size fs (average glyph width about 0.55 em)
  function wrap(s,maxPx,fs,mono){const cw=(fs||11.5)*(mono?0.62:0.55),n=Math.max(6,Math.floor(maxPx/cw));const out=[];let cur='';
    String(s).split(' ').reduce((a,w)=>{while(w.length>n){a.push(w.slice(0,n-1)+'-');w=w.slice(n-1)}a.push(w);return a},[]).forEach(w=>{if(!cur)cur=w;else if((cur+' '+w).length<=n)cur+=' '+w;else{out.push(cur);cur=w}});if(cur)out.push(cur);return out}
  const lines=(x,y,arr,o)=>{o=o||{};const lh=(o.fs||11.5)*1.32;return arr.map((s,i)=>T(x,y+i*lh,s,o)).join('')};
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+Math.max(0,h)+'" rx="'+(o.rx==null?7:o.rx)+'" fill="'+(o.fill||(o.hl?'var(--acc2)':'var(--soft)'))+'" stroke="'+(o.stroke||(o.hl?'var(--acc)':'var(--line)'))+'"'+(o.sw?' stroke-width="'+o.sw+'"':'')+(o.dash?' stroke-dasharray="5 4"':'')+'/>'};
  const arrow=(x1,y1,x2,y2,c)=>{c=c||'var(--mute)';const a=Math.atan2(y2-y1,x2-x1),L=7;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="1.6"/><path d="M'+x2+' '+y2+'L'+(x2-L*Math.cos(a-0.45))+' '+(y2-L*Math.sin(a-0.45))+'L'+(x2-L*Math.cos(a+0.45))+' '+(y2-L*Math.sin(a+0.45))+'Z" fill="'+c+'"/>'};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  // draw now, when the Reading tab opens, and on resize
  function mount(id,draw){const el=document.getElementById(id);if(!el)return;const f=()=>{try{el.innerHTML=draw(W(el),el)}catch(e){window.__jsErr&&window.__jsErr(id+': '+e.message)}};f();RD.onRender(f);RD.onResize(f)}
  // cards: items [{t: title, l: [paragraph strings], hl, dash, tone: 'good'|'bad'}] laid out in rows of as many columns as fit
  // (minW each), with arrows between consecutive cards when o.arrows; a row break gets an elbow connector.
  function cards(w,items,o){o=o||{};const g=o.arrows?26:12,minW=o.minW||160,fs=11.5,lh=fs*1.32;
    let k=Math.max(1,Math.min(items.length,Math.floor((w+g)/(minW+g))));
    if(o.cols)k=Math.min(k,o.cols);
    if(o.all&&k<items.length)k=1;
    const cw=(w-(k-1)*g)/k;
    const laid=items.map(d=>{const ls=[];(d.l||[]).forEach(p=>{wrap(p,cw-16,fs).forEach(x=>ls.push(x));ls.push('')});ls.pop();
      const tl=wrap(d.t,cw-16,12.5);return {d,tl,ls,h:14+tl.length*16+ls.length*lh+8}});
    const rows=[];for(let i=0;i<laid.length;i+=k)rows.push(laid.slice(i,i+k));
    let y=0,b='';const rg=o.arrows?30:12;
    rows.forEach((row,ri)=>{const rh=Math.max(...row.map(c=>c.h));
      row.forEach((c,ci)=>{const x=ci*(cw+g),d=c.d;
        b+=box(x+.5,y+.5,cw-1,rh-1,{hl:d.hl,dash:d.dash,stroke:d.tone==='bad'?'var(--bad)':d.tone==='good'?'var(--good)':null});
        b+=lines(x+8,y+18,c.tl,{fs:12.5,w:600,fill:d.tone==='bad'?'var(--bad)':d.tone==='good'?'var(--good)':null});
        let yy=y+18+c.tl.length*16;c.ls.forEach(s=>{if(s)b+=T(x+8,yy,s,{fs,fill:'var(--ink)'});yy+=lh});
        if(o.arrows&&ci<row.length-1)b+=arrow(x+cw+3,y+rh/2,x+cw+g-3,y+rh/2)});
      if(o.arrows&&ri<rows.length-1){const xl=(row.length-1)*(cw+g)+cw/2,ym=y+rh+rg/2,xf=cw/2;
        b+='<polyline points="'+xl+','+(y+rh+2)+' '+xl+','+ym+' '+xf+','+ym+'" fill="none" stroke="var(--mute)" stroke-width="1.6"/>'+arrow(xf,ym,xf,y+rh+rg-2)}
      y+=rh+rg});
    return {body:b,h:y-rg+1}}
  return {esc,W,T,wrap,lines,box,arrow,svg,mount,cards};
})();
