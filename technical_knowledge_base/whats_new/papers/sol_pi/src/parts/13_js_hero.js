// ---- The add-one chart of the "Each mechanism" section (Table 4), drawn inline in the Reading tab. Static: nothing moves.
// (The static hero SVG this file drew until 2026-11-13 became the 3D stage Fig. 1, 31_js_sc_loop.js.)
(function(){const el=$('abSvg');if(!el)return;const AB=PAPER.tables.abl;
  const MS=[['+ Action Fusion','Action Fusion'],['+ Online Context Compact','Online Context Compact'],['+ Evidence-Preserving Reducer','Reducer'],['+ ObservationPack','ObservationPack'],['SoL-Pi [Efficiency]','All four']];
  const MD=[['GPT-5.6 Sol','var(--c1)'],['Opus 5','var(--c2)']];
  fit(el,w=>{const pl=w<520?118:178,pr=w<520?92:120,bw=w-pl-pr,bh=13,X=v=>pl+bw*v/55;let s='',y=24;
    s+=tx(pl,12,'fewer tokens than Pi (%)',{fs:11,c:'var(--mute)'})+tx(w-2,12,'score (Pi 44.8)',{fs:11,a:'end',c:'var(--mute)'});
    for(let v=0;v<=50;v+=10)s+=ln2(X(v),20,X(v),20+MS.length*(2*bh+14),'var(--line)')+tx(X(v),32+MS.length*(2*bh+14),v,{fs:11,a:'middle',c:'var(--mute)'});
    MS.forEach(([key,lab])=>{s+=tx(pl-8,y+bh+4,w<520?lab.replace('Online Context Compact','Context Compact'):lab,{fs:11,a:'end',w:key[0]==='S'?600:400});
      MD.forEach(([m,c],j)=>{const rows=AB[m],pi=rows[0],r=rows.find(x=>x.name===key),cut=100*(1-r.total/pi.total),ds=r.score-pi.score;
        s+=rc(pl,y+j*(bh+1),X(cut)-pl,bh,c,{r:2})+tx(X(cut)+4,y+j*(bh+1)+11,cut.toFixed(1),{fs:11});
        s+=tx(w-2,y+j*(bh+1)+11,r.score.toFixed(1)+' ('+(ds>=0?'+':'')+ds.toFixed(1)+')',{fs:11,a:'end'})});y+=2*bh+14});
    const lg=legend(MD.map(([n,c])=>[n,c]),pl,y+30,w-pl);s+=lg.s;
    el.innerHTML=svgW(w,y+30+lg.h,s,'Each mechanism added to Pi alone: token cut and score, both models (Table 4)')});
})();
