// ---- Reading: LiveCodeBench split, Verified statistics, SWE-rebench split, Real-SWE grid, SchrodingerRepo bars ----
window.LCBX=(function(){
  const L=CD.lcb;
  // mean pass@1 (in %) of model m over problems matching f(q); returns [mean, count]
  function mean(m,f){let s=0,n=0;const M=L.models.find(x=>x.m===m);for(let i=0;i<L.q.length;i++){if(!f(L.q[i]))continue;s+=CM.dig(M.c[i])/M.n;n++}return [n?100*s/n:NaN,n]}
  return {mean};
})();
(function(){
  const el=document.getElementById('rd-lcb-split');if(!el)return;
  const ms=[['DeepSeek-V3','DeepSeek-V3'],['GPT-4-Turbo-2024-04-09','GPT-4-Turbo'],['GPT-4O-2024-08-06','GPT-4o (2024-08-06)'],['Claude-3.5-Sonnet-20241022','Claude 3.5 Sonnet (Oct 2024)'],['O4-Mini (High)','o4-mini (high)']];
  let h='<div class="small" style="margin-bottom:4px"><b>Medium problems, released before July 2024 against July to December 2024</b> <i class="nl d">derived</i></div><div class="bars">';
  for(const [m,nm] of ms){const a=LCBX.mean(m,q=>q[2]==='m'&&q[1]<'2024-07-01'),b=LCBX.mean(m,q=>q[2]==='m'&&q[1]>='2024-07-01'&&q[1]<'2025-01-01');
    h+='<div class="row"><span class="nm" title="'+nm+'">'+nm+'</span><span class="track"><span class="fill" style="width:'+a[0]+'%;background:var(--c1);opacity:.45"></span><span class="fill" style="width:'+b[0]+'%;height:55%;top:22%;background:var(--c2)"></span></span><span class="val">'+a[0].toFixed(1)+' → '+b[0].toFixed(1)+'</span></div>'}
  h+='</div><p class="small mute">Pale bar: pass@1 on the '+LCBX.mean('DeepSeek-V3',q=>q[2]==='m'&&q[1]<'2024-07-01')[1]+' earlier medium problems; dark bar: on the '+LCBX.mean('DeepSeek-V3',q=>q[2]==='m'&&q[1]>='2024-07-01'&&q[1]<'2025-01-01')[1]+' later ones. LiveCodeBench stores 30 June 2024 as DeepSeek-V3\'s contamination marker. DeepSeek-V3\'s rows from January 2025 are left out of every view: they score 0 on nearly every problem, easy ones included, which looks like failed runs rather than results.</p>';
  el.innerHTML=h;
})();
(function(){
  const el=document.getElementById('rd-vstats');if(!el)return;const V=CD.ver;
  const bars=(rows,tot,col)=>'<div class="bars">'+rows.map(([k,v])=>'<div class="row"><span class="nm" title="'+k+'">'+k+'</span><span class="track"><span class="fill" style="width:'+(100*v/tot)+'%;background:'+col+'"></span></span><span class="val">'+v+'</span></div>').join('')+'</div>';
  const d=V.difficulty;
  const reps=V.repos.slice(0,5).map(r=>[r[0].split('/')[1],r[1]]);reps.push(['6 others',V.repos.slice(5).reduce((a,r)=>a+r[1],0)]);
  const f=V.files,f1=f['1'],f2=f['2'],f3=500-f1-f2;
  const yrs=Object.keys(V.year).sort();const early=yrs.filter(y=>y<'2019').reduce((a,y)=>a+V.year[y],0);
  el.innerHTML='<div class="rd-vs"><div><div class="h">Annotated time to fix</div>'+bars([['under 15 min',d['<15 min fix']],['15 min to 1 h',d['15 min - 1 hour']],['1 to 4 h',d['1-4 hours']],['over 4 h',d['>4 hours']]],500,'var(--c1)')+'</div>'+
   '<div><div class="h">Repository</div>'+bars(reps,500,'var(--c4)')+'</div>'+
   '<div><div class="h">Files changed by the gold patch</div>'+bars([['1 file',f1],['2 files',f2],['3 or more',f3]],500,'var(--c3)')+'<p class="small mute" style="margin:6px 0 0">Median '+V.lines_median+' changed lines; median '+V.f2p_median+' fail-to-pass and '+V.p2p_median+' pass-to-pass tests.</p></div>'+
   '<div><div class="h">Year the issue was filed</div>'+bars([['2013 to 2018',early]].concat(yrs.filter(y=>y>='2019').map(y=>[y,V.year[y]])),500,'var(--c5)')+'</div></div>';
})();
(function(){
  const el=document.getElementById('rd-rb');if(!el)return;
  const rows=CD.rb.map(r=>{const a=r.pre[3],b=r.post[3];const se=100*Math.sqrt(a/100*(1-a/100)/r.pre[2]+b/100*(1-b/100)/r.post[2]);return {m:r.m,rel:r.rel,a,b,d:b-a,se,na:r.pre[2],nb:r.post[2]}}).sort((x,y)=>x.d-y.d);
  const X=v=>50+v*50/45;// -45..+45 points mapped to 0..100%
  let h='<div class="rbx"><div class="rbh"><span class="small mute">after minus before, points</span><span class="ax"><b style="left:'+X(-40)+'%">−40</b><b style="left:'+X(-20)+'%">−20</b><b style="left:50%">0</b><b style="left:'+X(20)+'%">+20</b><b style="left:'+X(40)+'%">+40</b></span><span></span></div>';
  for(const r of rows){const sig=Math.abs(r.d)>2*r.se;
    h+='<div class="rbr" title="'+RD.esc(r.m)+', released '+r.rel+': '+r.a.toFixed(1)+'% on '+r.na+' tasks before, '+r.b.toFixed(1)+'% on '+r.nb+' after"><span class="nm">'+RD.esc(r.m)+'</span><span class="tr"><i class="z"></i><i class="ci" style="left:'+X(Math.max(-45,r.d-2*r.se))+'%;width:'+(X(Math.min(45,r.d+2*r.se))-X(Math.max(-45,r.d-2*r.se)))+'%"></i><i class="pt'+(sig?' s':'')+'" style="left:'+X(Math.max(-45,Math.min(45,r.d)))+'%"></i></span><span class="v">'+(r.d>0?'+':'')+r.d.toFixed(1)+'</span></div>'}
  const up=rows.filter(r=>r.d>0).length,sig=rows.filter(r=>Math.abs(r.d)>2*r.se).length,med=rows.map(r=>r.d).sort((a,b)=>a-b);const md=(med[24]+med[25])/2;
  h+='</div><p class="small" id="rd-rb-sum"><b>'+rows.length+' models:</b> '+(rows.length-up)+' score higher on tasks from before their release, '+up+' on tasks from after; median change '+(md>0?'+':'')+md.toFixed(1)+' points; '+sig+' beyond ±2 standard errors (filled dots).</p>';
  el.innerHTML=h;
})();
(function(){
  const el=document.getElementById('rd-rs');if(!el)return;const S=CD.rs;const off=new Set();
  function render(){
    const tot=S.models.map((_,j)=>S.grid.reduce((a,g,i)=>a+(off.has(i)?0:g[1][j]),0)),nt=S.grid.length-off.size;
    const rate=tot.map(t=>nt?100*t/(nt*8):0);const order=S.models.map((_,j)=>j).sort((a,b)=>rate[b]-rate[a]);const rank={};order.forEach((j,r)=>rank[j]=r+1);
    let h='<div class="tw"><table class="rs"><thead><tr><th class="tk">Task (click to drop)</th>'+S.models.map(m=>'<th>'+m.replace(' ','<br>')+'</th>').join('')+'</tr></thead><tbody>';
    S.grid.forEach((g,i)=>{h+='<tr data-i="'+i+'" class="'+(off.has(i)?'off':'')+'"><td class="tk">'+g[0]+'</td>'+g[1].map(v=>'<td class="c" style="background:color-mix(in srgb,var(--good) '+Math.round(v/8*70)+'%,transparent)">'+v+'</td>').join('')+'</tr>'});
    h+='</tbody><tfoot><tr><td class="tk">Rate</td>'+rate.map(r=>'<td>'+r.toFixed(1)+'%</td>').join('')+'</tr><tr><td class="tk">Rank</td>'+S.models.map((_,j)=>'<td>'+rank[j]+'</td>').join('')+'</tr></tfoot></table></div>';
    el.innerHTML=h;
    const base=S.rate,shift=Math.max(...rate.map((r,j)=>Math.abs(r-base[j])));
    document.getElementById('rd-rs-cnt').innerHTML=RD.stat('Tasks counted',nt+' of 10',off.size?'click a struck-out row to restore it':'every row')+RD.stat('Leader',S.models[order[0]],rate[order[0]].toFixed(2)+'%')+RD.stat('Largest move from the published rate',shift.toFixed(1)+' points','any model');
  }
  el.addEventListener('click',e=>{const tr=e.target.closest('tr[data-i]');if(!tr)return;const i=+tr.dataset.i;off.has(i)?off.delete(i):(off.size<9&&off.add(i));render()});
  render();
})();
(function(){
  const el=document.getElementById('rd-schro');if(!el)return;
  const rows=[['Original repository',46.8,11.25],['1: issue reworded',46.8,11.56],['2: names remapped',40.4,14.92],['3: layout reordered',43.4,13.27],['4: code rewritten',44.6,12.66],['All four',35.6,19.83]];
  el.innerHTML=rows.map((r,i)=>'<div class="row'+(i===5?' hl':'')+'"><span class="nm" title="'+r[0]+'">'+r[0]+'</span><span class="track"><span class="fill" style="width:'+r[1]+'%;background:'+(i?'var(--c3)':'var(--c1)')+'"></span></span><span class="val">'+r[1].toFixed(1)+'%</span></div>').join('')+'<p class="small mute">GPT-5.4-mini, mini-swe-agent, pass@1 on the same 500 Verified tasks (a paired comparison); average actions per task 11.25 originally, 19.83 with all four ({{Table I|https://arxiv.org/html/2609.27891v1#S4.T1}}).</p>';
})();
