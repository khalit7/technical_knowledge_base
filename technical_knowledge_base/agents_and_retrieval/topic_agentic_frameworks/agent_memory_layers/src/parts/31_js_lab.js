// ---- Memory lab tab (t-lab): question matrix with details, and the stores side by side ----
window.FMLAB=(function(){
  const F=FM.F,esc=FM.esc,tb=document.getElementById('fmem-lab-mx'),det=document.getElementById('fmem-lab-det');
  if(!tb)return null;
  const COLS=[];FM.SYS.forEach(s=>FM.READERS.forEach(r=>{if(F.A[s.k+'|'+r[0]])COLS.push({s,r})}));
  const TN={IE:'Extraction',MS:'Multi-session',KU:'Update',TR:'Temporal',ABS:'Abstention'};
  let selCol=null;
  function matrix(){
    tb.innerHTML='<thead><tr><th class="mh">Question</th>'+COLS.map((c,i)=>'<th data-c="'+i+'"'+(selCol===i?' class="colsel"':'')+'>'+esc(c.s.l)+'<small>'+(c.s.w?'writes: '+c.s.w+'; ':'')+'reads: '+(c.s.k==='letta'?'its own agent':c.r[1])+'</small></th>').join('')+'</tr></thead><tbody>'+
      F.Q.map(q=>'<tr><th class="mh" title="'+esc(q.q)+'"><small>'+TN[q.t]+'</small>'+esc(q.q.length>58?q.q.slice(0,56)+'…':q.q)+'</th>'+COLS.map((c,i)=>{const a=F.A[c.s.k+'|'+c.r[0]][q.id];
        return a?'<td class="v '+(a[1]?'ok':'no')+(selCol===i?' colsel':'')+'" data-q="'+q.id+'" data-c="'+i+'" aria-label="'+(a[1]?'right':'wrong')+'">'+(a[1]?'✓':'✗')+'</td>':'<td class="na">-</td>'}).join('')+'</tr>').join('')+
      '<tr><th class="mh"><b>Total right</b></th>'+COLS.map(c=>{const v=Object.values(F.A[c.s.k+'|'+c.r[0]]);return '<td><b>'+v.filter(x=>x[1]).length+'</b>/'+v.length+'</td>'}).join('')+'</tr></tbody>';
  }
  const hit=(q,t)=>{t=(t||'').toLowerCase();return q.k.length&&q.k.some(g=>g.some(w=>t.includes(w)))};
  function ctx(c,q){const k=c.s.k,w=k.split('_')[1];
    if(k==='none')return '<div class="ctx"><div class="cl">(no memory)</div></div>';
    if(k==='full')return '<details><summary class="small">The whole history ('+F.S.length+' sessions)</summary><div class="ctx">'+F.S.map(s=>'<div><b>'+s.d+'</b></div>'+s.t.map(x=>'<div class="'+(hit(q,x[1])?'hit':'')+'">'+x[0]+': '+esc(x[1])+'</div>').join('')).join('')+'</div></details>';
    if(k==='mem0'){const h=F.M0.ret[q.id]||[];return '<div class="small">The '+h.length+' memories mem0 search returned (date, hybrid score):</div><div class="ctx">'+h.map(x=>'<div class="'+(hit(q,x[0])?'hit':'')+'">['+x[1]+'] '+esc(x[0])+' <span class="mute">('+x[2].toFixed(3)+')</span></div>').join('')+'</div>'}
    if(k.startsWith('graphiti')){const h=(F.GR[w]&&F.GR[w].ret[q.id])||[];return '<div class="small">The '+h.length+' edges Graphiti search returned (valid from, to):</div><div class="ctx">'+h.map(x=>'<div class="'+(hit(q,x[0])?'hit':'')+(x[2]?' cl':'')+'">'+esc(x[0])+' <span class="mute">['+(x[1]||'undated')+' to '+(x[2]||'present')+']</span></div>').join('')+'</div>'}
    if(k.startsWith('paper')){const st=F.PA[w].s[F.PA[w].s.length-1].st;return '<details><summary class="small">The whole store ('+Object.keys(st).length+' facts; small enough that no search step was used)</summary><div class="ctx">'+Object.entries(st).map(([i,t])=>'<div class="'+(hit(q,t)?'hit':'')+'">'+i+': '+esc(t)+'</div>').join('')+'</div></details>'}
    if(k==='lettastore'){const last=F.LT.ses[F.LT.ses.length-1];return '<details><summary class="small">The core block and all '+last.a.length+' archival notes the Letta agent wrote</summary><div class="ctx"><div class="'+(hit(q,last.h)?'hit':'')+'">'+esc(last.h)+'</div>'+last.a.map(t=>'<div class="'+(hit(q,t)?'hit':'')+'">'+esc(t)+'</div>').join('')+'</div></details>'}
    if(k==='letta'){const a=F.LT.ans[q.id];if(!a)return '';const last=F.LT.ses[F.LT.ses.length-1];
      return '<div class="small">Core block in the prompt:</div><div class="ctx"><div class="'+(hit(q,last.h)?'hit':'')+'">'+esc(last.h||'(empty)')+'</div></div><div class="small">Tool calls while answering ('+a.calls.length+'), and what they returned:</div><div class="ctx">'+(a.calls.length?a.calls.map((x,i)=>'<div><b>'+esc(x[0])+'</b> '+esc(x[1])+'</div><div class="'+(hit(q,a.rets[i])?'hit':'cl')+'">'+esc((a.rets[i]||'').slice(0,500))+'</div>').join(''):'<div class="cl">(none: it answered without searching)</div>')+'</div>'}
    return '';}
  function show(qid,ci){const q=F.Q.find(x=>x.id===qid),c=COLS[ci],a=F.A[c.s.k+'|'+c.r[0]][qid];
    const ev=c.s.k==='full'?F.EV.full:(c.s.ev&&F.EV[c.s.ev]);
    det.innerHTML='<b>'+esc(q.q)+'</b> <span class="pill '+(a[1]?'ok':'bad')+'">'+(a[1]?'right':'wrong')+'</span><div class="small mute">'+TN[q.t]+'. Reference: '+esc(q.g)+(q.ev.length?'. Said in session'+(q.ev.length>1?'s ':' ')+q.ev.join(', '):'')+'.'+(ev&&ev[qid]!==undefined?' Evidence words in the memory text: '+(ev[qid]?'yes':'<b>no</b>')+'.':'')+'</div>'+
      '<h4>'+esc(c.s.l)+(c.s.w?' (written by '+c.s.w+')':'')+', answered by '+(c.s.k==='letta'?'the Letta agent (local 4B)':c.r[1])+'</h4><pre>'+esc(a[0]||'(empty answer)')+'</pre>'+ctx(c,q);}
  tb.addEventListener('click',e=>{const td=e.target.closest('td[data-q]');if(td){show(td.dataset.q,+td.dataset.c);return}
    const th=e.target.closest('th[data-c]');if(th){selCol=+th.dataset.c===selCol?null:+th.dataset.c;matrix()}});
  matrix();
  // stores side by side
  const side=document.getElementById('fmem-lab-side'),cap=document.getElementById('fmem-lab-cap');
  function drawSide(i){const L=(h,items)=>'<div><h4>'+h+'</h4><ul>'+(items||'<li class="mute">(empty)</li>')+'</ul></div>';let out='';
    if(F.M0){const nw=F.M0.ev[i]||[];out+=L('Mem0 2.2.1 ('+F.M0.after[i].length+')',F.M0.after[i].map(j=>'<li class="'+(nw.includes(j)?'nw':'')+'">'+esc(F.M0.mem[j].t)+'</li>').join(''))}
    if(F.PA.haiku){const s=F.PA.haiku.s[i],prev=i?F.PA.haiku.s[i-1].st:{};out+=L('Paper loop ('+Object.keys(s.st).length+')',Object.entries(s.st).map(([k,t])=>'<li class="'+(prev[k]!==t?'nw':'')+'">'+k+': '+esc(t)+'</li>').join(''))}
    if(F.GR.haiku){const E=F.GR.haiku.e.filter(e=>e.s0<=i);out+=L('Graphiti edges ('+E.length+')',E.map(e=>'<li class="'+(e.sc!==null&&e.sc<=i?'cl':e.s0===i?'nw':'')+'">'+esc(e.f)+'</li>').join(''))}
    if(F.LT&&F.LT.ses[i]){const s=F.LT.ses[i],p=i?F.LT.ses[i-1].a:[];out+=L('Letta core block and archival ('+s.a.length+')','<li><b>human:</b> '+esc(s.h||'(empty)')+'</li>'+s.a.map(t=>'<li class="'+(p.includes(t)?'':'nw')+'">'+esc(t)+'</li>').join(''))}
    side.innerHTML=out;cap.innerHTML='<div class="t">After session '+(i+1)+' of '+F.S.length+' ('+F.S[i].d+')</div><p>'+esc(F.S[i].t.filter(x=>x[0]==='user').map(x=>x[1]).join(' ').slice(0,260))+'</p>';}
  const A=RD.anim({card:'fmem-lab-sc',ctl:'fmem-lab-ctl',n:F.S.length,ms:2000,draw:drawSide,label:'Session',tab:'t-lab',start:F.S.length-1});
  return {open(k,r){const i=COLS.findIndex(c=>c.s.k===k&&c.r[0]===(k==='letta'?'local':r));selCol=i<0?null:i;matrix();
    const b=document.querySelector('#tabs button[data-t="t-lab"]');if(b){b.click();tb.scrollIntoView({block:'start'})}}};
})();
