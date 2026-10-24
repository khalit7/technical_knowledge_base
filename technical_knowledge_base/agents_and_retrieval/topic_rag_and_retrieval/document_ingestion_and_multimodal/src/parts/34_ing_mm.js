// ---- Reading s11: nDCG@5 per set and retriever, measured here and published; per-query top pages (data: ING.mm) ----
(function(){
  const M=window.ING&&ING.mm;const chart=document.getElementById('ing-mm-chart');if(!M||!chart)return;
  const setSel=document.getElementById('ing-mm-set'),qSel=document.getElementById('ing-mm-q');
  const sets=Object.keys(M.sets);let si=sets[0];
  setSel.innerHTML=sets.map(s=>'<option value="'+s+'">'+RD.esc(M.sets[s].label)+'</option>').join('');
  function fillQ(){const Q=M.sets[si].examples;qSel.innerHTML=Q.map((q,i)=>'<option value="'+i+'">'+RD.esc(q.query.slice(0,60))+(q.query.length>60?'...':'')+'</option>').join('')}
  function drawChart(){
    const W=RD.width(chart);
    const narrow=W<600,lw=narrow?8:Math.min(250,W*0.38),bh=14,gap=narrow?3:4,top=6;let y=top,body='';
    sets.forEach(s=>{body+=RD.t(0,y+11,M.sets[s].label,{fs:12,w:600});y+=18;
      M.systems.forEach(sy=>{const v=M.sets[s].ndcg5[sy.key];if(v==null)return;const w=(W-lw-62)*v/100;
        if(narrow){body+=RD.t(8,y+10,sy.label,{fs:11,fill:sy.pub?'var(--mute)':null});y+=13}else body+=RD.t(8,y+bh-3,sy.label,{fs:11,fill:sy.pub?'var(--mute)':null});
        body+='<rect x="'+lw+'" y="'+y+'" width="'+Math.max(1,w).toFixed(1)+'" height="'+bh+'" fill="'+sy.color+'"'+(sy.pub?' fill-opacity="0.35" stroke="'+sy.color+'" stroke-dasharray="3 2"':sy.full?' fill-opacity="0.6"':'')+'/>'+RD.t(lw+w+4,y+bh-3,v.toFixed(1)+(M.sets[s].ci&&M.sets[s].ci[sy.key]?' ±'+M.sets[s].ci[sy.key].toFixed(1):''),{fs:11});
        y+=bh+gap});y+=8});
    chart.innerHTML=RD.svg(W,y,body,'nDCG@5 by set and retriever');
  }
  function drawQ(){
    const ex=M.sets[si].examples[+qSel.value||0];
    document.getElementById('ing-mm-qtext').innerHTML='<div class="t">Query</div>'+RD.esc(ex.query);
    document.getElementById('ing-mm-res').innerHTML=M.systems.filter(s=>!s.pub&&!s.full).map(sy=>{const top=ex.top[sy.key]||[];
      return '<div class="card"><b>'+RD.esc(sy.label)+'</b><div class="small mute">rank of the relevant page: '+(ex.rank[sy.key]||'over 100')+'</div><div class="lst">'+top.map((d,k)=>'<figure><img loading="lazy" class="'+(d===ex.gold?'hit':'')+'" alt="Retrieved page '+(k+1)+'" src="'+M.thumbs[d]+'"><figcaption>#'+(k+1)+'</figcaption></figure>').join('')+'</div></div>'}).join('');
  }
  setSel.addEventListener('change',()=>{si=setSel.value;fillQ();drawQ()});qSel.addEventListener('change',drawQ);
  fillQ();drawChart();drawQ();RD.onRender(drawChart);RD.onResize(drawChart);
})();
