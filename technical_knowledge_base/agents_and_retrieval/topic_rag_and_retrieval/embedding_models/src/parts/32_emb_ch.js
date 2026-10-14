// ---- Model chooser tab: quality with paired intervals, limits, tied group, costs, subsample stability ----
(function(){
  const E=window.EMB,esc=RD.esc;
  const LAT=[10,20,60,1000,Infinity],LATN=['10 ms','20 ms','60 ms','1 s','no limit'];
  const BYT=[384,1536,3072,Infinity],BYTN=['384 B (int8 384-d)','1,536 B','3,072 B','no limit'];
  const NS=[25,50,100,200];
  let set='scifact';
  const latEl=document.getElementById('emb-ch-lat'),bytEl=document.getElementById('emb-ch-byt'),nEl=document.getElementById('emb-ch-n');
  function draw(){const S=E.ch[set],lat=LAT[+latEl.value],byt=BYT[+bytEl.value];
    document.getElementById('emb-ch-latv').textContent=LATN[+latEl.value];document.getElementById('emb-ch-bytv').textContent=BYTN[+bytEl.value];
    const keys=Object.keys(S.systems).sort((a,b)=>S.systems[b].ndcg10-S.systems[a].ndcg10);
    const ok=k=>{const c=E.cost[k];if(!c)return true;if(c.q_ms!=null&&c.q_ms>lat)return false;if(c.bytes!=null&&c.bytes>byt)return false;if(k==='colbert-small'&&byt<Infinity)return false;return true};
    const rows=keys.map(k=>{const v=S.systems[k],p=S.vs_best[k];return {k,name:EL.NM[k],v:v.ndcg10,lo:v.lo,hi:v.hi,color:ok(k)?EL.C[k]:'var(--dim)',txt:v.ndcg10.toFixed(3),dim:!ok(k)}});
    EL.intervals(document.getElementById('emb-ch-svg'),rows,{lo:Math.floor(Math.min(...rows.map(r=>r.lo))*20)/20,hi:Math.ceil(Math.max(...rows.map(r=>r.hi))*20)/20,ticks:(function(){const a=[];for(let v=Math.floor(Math.min(...rows.map(r=>r.lo))*20)/20;v<=Math.max(...rows.map(r=>r.hi))+0.05;v+=0.05)a.push(+v.toFixed(2));return a})(),label:'nDCG@10 with 95% intervals'});
    let h='<tr><th>system</th><th class="num">nDCG@10 (95% interval)</th><th class="num">against the best (paired)</th><th>verdict</th><th class="num">bytes per vector</th><th class="num">query ms</th><th class="num">indexing docs/s</th><th class="num">weights</th><th>licence</th></tr>';
    const allowed=keys.filter(ok);const top=allowed.length?allowed[0]:null;
    keys.forEach(k=>{const v=S.systems[k],p=S.vs_best[k],c=E.cost[k]||{};let verdict,cls;
      if(k===S.best){verdict='best on this set';cls='emb-best'}else if(p.hi>=0){verdict='tied with the best';cls='emb-tie'}else{verdict='worse';cls='emb-worse'}
      h+='<tr class="'+(ok(k)?'':'emb-off')+'"><td>'+esc(EL.NM[k])+'</td><td class="num">'+v.ndcg10.toFixed(3)+' ('+v.lo.toFixed(3)+' to '+v.hi.toFixed(3)+')</td><td class="num">'+(p?(p.diff>=0?'+':'')+p.diff.toFixed(3)+' ('+(p.lo>=0?'+':'')+p.lo.toFixed(3)+' to '+(p.hi>=0?'+':'')+p.hi.toFixed(3)+')':'reference')+'</td><td class="'+cls+'">'+verdict+'</td>'+
        '<td class="num">'+(c.bytes!=null?c.bytes.toLocaleString('en-US'):'n/a')+'</td><td class="num">'+(c.q_ms!=null?c.q_ms.toFixed(1):'n/a')+'</td><td class="num">'+(c.docs_s!=null?c.docs_s.toFixed(1):'n/a')+'</td><td class="num">'+(c.weights?EL.fmt(c.weights)+'B':'none')+'</td><td>'+esc(c.lic||'')+'</td></tr>'});
    document.getElementById('emb-ch-tab').innerHTML=h;
    const tied=allowed.filter(k=>k===S.best||S.vs_best[k].hi>=0);
    const qm=k=>{const c=E.cost[k]||{};return c.q_ms==null?Infinity:c.q_ms};const cheapest=tied.slice().sort((a,b)=>qm(a)-qm(b))[0];
    let msg;
    if(!allowed.length)msg='No system meets these limits.';
    else if(!allowed.includes(S.best))msg='The best system on this set ('+EL.NM[S.best]+') is outside your limits. Within them, the highest is '+EL.NM[top]+' ('+S.systems[top].ndcg10.toFixed(3)+'), '+(S.vs_best[top].hi>=0?'still statistically tied with the best.':'clearly below the best (paired interval '+S.vs_best[top].lo.toFixed(3)+' to '+S.vs_best[top].hi.toFixed(3)+').');
    else msg='Statistically tied group within your limits: '+tied.map(k=>EL.NM[k]).join(', ')+'. '+(tied.length>1?'Choose on cost: the cheapest query among them is '+EL.NM[cheapest]+'.':'One clear winner.');
    document.getElementById('emb-ch-verdict').innerHTML='<div class="t">Verdict on '+EL.SET[set]+' ('+S.n+' queries)</div>'+esc(msg)+' Confirm on held-out queries that look like your traffic: on SciFact the train claims and the test claims disagree (Reading, section 10).';
    // subsample
    const ns=S.subsample.map(x=>x.n);let ni=Math.min(+nEl.value,ns.length-1);const x=S.subsample[ni];document.getElementById('emb-ch-nv').textContent=x.n;
    document.getElementById('emb-ch-sub').innerHTML=RD.stat('same winner as all '+S.n,(x.same_winner<1&&x.same_winner>=0.9995?'99.95':(100*x.same_winner).toFixed(1))+'%','of 2,000 random subsets')+RD.stat('same order of all four',(100*x.same_order).toFixed(1)+'%','')+RD.stat('paired 95% half-width',x.ci_halfwidth.toFixed(3),'best minus second, nDCG@10')}
  RD.seg(document.getElementById('emb-ch-set'),v=>{set=v;draw()});
  [latEl,bytEl,nEl].forEach(e=>e.addEventListener('input',draw));
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-embchoose']=window.TAB_RENDER['t-embchoose']||[]).push(draw);
  addEventListener('resize',()=>{const t=document.getElementById('t-embchoose');if(t&&!t.hidden)draw()});
  draw();
})();
