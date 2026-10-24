// ---- Reading, section 6: one ranked list, every list metric at cutoff k (illustrative grades; src/rank_example.py checks the numbers) ----
(function(){
  const $=id=>document.getElementById(id),F=RD.f;if(!$('rd-rk'))return;
  const G=EM.rank.grades,M=EM.rank.missing,REL=G.filter(g=>g>0).length+M.length,IDEAL=G.filter(g=>g>0).concat(M).sort((a,b)=>b-a);
  const dcg=(gr,k,ex)=>gr.slice(0,k).reduce((s,g,i)=>s+(ex?2**g-1:g)/Math.log2(i+2),0);
  function at(k){const hits=G.slice(0,k).filter(g=>g>0).length,fi=G.slice(0,k).findIndex(g=>g>0);let ap=0,h=0;for(let i=0;i<k;i++)if(G[i]>0){h++;ap+=h/(i+1)}
    return {p:hits/k,r:hits/REL,rr:fi<0?0:1/(fi+1),ap:ap/REL,dcg:dcg(G,k),idcg:dcg(IDEAL,k),ndcg:dcg(G,k)/dcg(IDEAL,k),ndcgx:dcg(G,k,1)/dcg(IDEAL,k,1)}}
  function draw(){const k=+$('rd-rkK').value;$('rd-rkKv').textContent=k;const m=at(k);
    const box=$('rd-rkSvg'),W=RD.width(box),n=G.length,lab=44,cw=(W-lab-4)/n,H=150,y0=96;
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Ranked list with relevance grades">';
    s+='<text x="0" y="14" font-size="11" fill="var(--mute)">rank</text><text x="0" y="'+(y0-30)+'" font-size="11" fill="var(--mute)">grade</text>'+(W>420?'<text x="0" y="'+(y0+26)+'" font-size="11" fill="var(--mute)">gain/</text><text x="0" y="'+(y0+40)+'" font-size="11" fill="var(--mute)">disc.</text>':'');
    s+='<rect x="'+lab+'" y="20" width="'+(cw*k)+'" height="'+(y0-6)+'" rx="6" fill="var(--acc)" fill-opacity=".10" stroke="var(--acc)"/>';
    G.forEach((g,i)=>{const cx=lab+cw*i+cw/2,on=i<k,h=g*16;
      s+='<text x="'+cx+'" y="14" font-size="11" text-anchor="middle" fill="var(--mute)">'+(i+1)+'</text>';
      if(g>0)s+='<rect x="'+(cx-cw*0.32)+'" y="'+(y0-12-h)+'" width="'+(cw*0.64)+'" height="'+h+'" rx="2" fill="var(--c3)" fill-opacity="'+(on?0.9:0.3)+'"/>';
      s+='<text x="'+cx+'" y="'+(y0+2)+'" font-size="11" text-anchor="middle" fill="var(--ink)">'+g+'</text>';
      if(g>0&&W>420)s+='<text x="'+cx+'" y="'+(y0+32)+'" font-size="11" text-anchor="middle" fill="'+(on?'var(--ink)':'var(--mute)')+'">'+F(g/Math.log2(i+2),2)+'</text>'});
    if(W<=420)s+='<text x="0" y="'+(y0+32)+'" font-size="11" fill="var(--mute)">gain / log2(rank + 1) per hit: '+G.map((g,i)=>g>0?F(g/Math.log2(i+2),2):null).filter(v=>v).join(', ')+'</text>';
    s+='<text x="'+(W>420?lab:0)+'" y="'+(H-4)+'" font-size="11" fill="var(--mute)">+1 relevant item (grade 1) never returned</text>';
    box.innerHTML=s+'</svg>';
    $('rd-rkN').innerHTML=RD.stat('Precision@'+k,F(m.p,3),'hits / k')+RD.stat('Recall@'+k,F(m.r,3),'hits / 5 relevant')+RD.stat('Reciprocal rank',F(m.rr,3),'1 / rank of first hit')+RD.stat('AP@'+k,F(m.ap,3),'mean precision at each hit / 5')+
      RD.stat('nDCG@'+k,F(m.ndcg,3),'DCG '+F(m.dcg,3)+' / ideal '+F(m.idcg,3))+RD.stat('nDCG@'+k+', 2<sup>g</sup> &minus; 1',F(m.ndcgx,3),'exponential gain')}
  $('rd-rkK').addEventListener('input',draw);RD.onRender(draw);draw();RD.onResize(draw);
})();
