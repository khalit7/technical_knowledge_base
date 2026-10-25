// ---- Hero figure (light pass, 2026-10-25): the five parts of the recipe in order, each marked with whether the paper
// tests it on its own, and the one measured outcome of the whole recipe (macro gains from recompute.json). Static.
(function(){const el=$('heroSvg');if(!el)return;
  const P=[['Harness data','router logs 3 tier fields',1,'vs public data (Table 3)'],
    ['Curation','gates, 6 verdicts, labels',0,'no run without it'],
    ['Routing curriculum','SFT in 3 stages',0,'no shuffled-order run'],
    ['On-policy distillation','teacher on rollouts',0,'no SFT-only run'],
    ['Allocation','next mix from the gaps',0,'the loop ran once']];
  const st=v=>v?['compared','var(--good)']:['not isolated','var(--bad)'];
  fit(el,w=>{let s='';const wide=w>=760;
    const defs='<defs><marker id="ahH" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    const arr=(x1,y1,x2,y2,da)=>'<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="var(--mute)" stroke-width="1.3"'+(da?' stroke-dasharray="5 4"':'')+' marker-end="url(#ahH)"/>';
    let H,yb;
    if(wide){const gap=14,bw=(w-4*gap-4)/5,bh=50,y=26;
      P.forEach((p,i)=>{const x=2+i*(bw+gap),c=st(p[2]);
        s+=rc(x,y,bw,bh,'var(--soft)',{s:'var(--line)',r:8})+tx(x+bw/2,y+21,p[0],{fs:12,a:'middle',w:600})+tx(x+bw/2,y+38,p[1],{fs:11,a:'middle',c:'var(--mute)'});
        s+=tx(x+bw/2,y+bh+18,c[0],{fs:11,a:'middle',w:600,c:c[1]})+tx(x+bw/2,y+bh+33,p[3],{fs:11,a:'middle',c:'var(--mute)'});
        if(i<4)s+=arr(x+bw+1,y+bh/2,x+bw+gap-1,y+bh/2)});
      const xl=2+4*(bw+gap)+bw/2,xf=2+bw/2;
      s+='<path d="M'+xl.toFixed(1)+','+(y-2)+' L'+xl.toFixed(1)+',10 L'+xf.toFixed(1)+',10 L'+xf.toFixed(1)+','+(y-4)+'" fill="none" stroke="var(--mute)" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#ahH)"/>';
      s+=tx((xl+xf)/2,7,'next round: designed, not run',{fs:11,a:'middle',c:'var(--mute)'});
      yb=y+bh+48;H=yb+40}
    else{const bh=44,gap=12,y0=22,bw=w-4;
      s+=tx(2,12,'next round (designed, not run) returns to the top',{fs:11,c:'var(--mute)'});
      P.forEach((p,i)=>{const y=y0+i*(bh+gap),c=st(p[2]);
        s+=rc(2,y,bw,bh,'var(--soft)',{s:'var(--line)',r:8})+tx(10,y+18,p[0],{fs:12,w:600})+tx(10,y+34,p[1],{fs:11,c:'var(--mute)'});
        s+=tx(w-10,y+18,c[0],{fs:11,a:'end',w:600,c:c[1]})+tx(w-10,y+34,p[3],{fs:11,a:'end',c:'var(--mute)'});
        if(i<4)s+=arr(w/2,y+bh+1,w/2,y+bh+gap-1)});
      yb=y0+5*(bh+gap)+4;H=yb+56}
    // the one measured outcome: the whole recipe
    const g4=RCD.gain4.toFixed(2),g9=RCD.gain9.toFixed(2);
    s+=rc(2,yb,w-4,wide?32:48,'var(--acc2)',{s:'var(--acc)',r:8});
    if(wide)s+=tx(w/2,yb+21,'Whole recipe, measured: +'+g4+' macro points at 4B (up on 10 of 10 benchmarks), +'+g9+' at 9B',{fs:12,a:'middle',w:600});
    else{s+=tx(10,yb+19,'Whole recipe, measured:',{fs:12,w:600})+tx(10,yb+37,'+'+g4+' macro at 4B (10 of 10 up), +'+g9+' at 9B',{fs:11})}
    el.innerHTML=svgW(w,H,defs+s,'The five parts of the NeoHorse-1 recipe and which the paper tests')})})();
