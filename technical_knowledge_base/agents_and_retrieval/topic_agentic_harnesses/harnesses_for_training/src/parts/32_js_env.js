// ---- Environment lab: bugs, tasks, checks, and a verifier over real final states ----
(function(){
  const HT=window.HT,esc=RD.esc,$=id=>document.getElementById(id);
  const C=HT.checks;
  $('ev-bugs').innerHTML='<table class="ht-t"><thead><tr><th>Bug</th><th>File</th><th>Clean</th><th>Planted</th></tr></thead><tbody>'+
    Object.entries(HT.bugs).map(([k,b])=>'<tr><td><b>'+esc(k)+'</b></td><td><code>'+esc(b.file)+'</code></td><td><code>'+esc(b.old.trim()||'(two lines)')+'</code></td><td><code>'+esc(b.new.trim()||'(deleted)')+'</code></td></tr>').join('')+'</tbody></table>';
  $('ev-tasks').innerHTML='<table class="ht-t"><thead><tr><th>Task</th><th>Bugs</th><th>Prompt</th><th>Fail-to-pass</th><th>Pass-to-pass</th></tr></thead><tbody>'+
    HT.tasks.map(t=>'<tr><td><b>'+t.id+'</b></td><td>'+t.bugs.map(esc).join(', ')+'</td><td class="small">'+esc(t.prompt)+'</td><td class="small">'+t.f2p.length+': '+t.f2p.map(esc).join(', ')+'</td><td class="ht-num">'+t.p2p+'</td></tr>').join('')+'</tbody></table>';
  $('ev-checks').innerHTML='<table class="ht-t"><thead><tr><th>Check</th><th>Kind</th><th>Area</th><th>Must be true</th></tr></thead><tbody>'+
    C.map(c=>'<tr><td><code>'+esc(c.n)+'</code></td><td>'+(c.n[0]==='v'?'visible':'held out')+'</td><td>'+esc(c.area)+'</td><td><code>'+esc(c.expr)+'</code></td></tr>').join('')+'</tbody></table>';
  const ts=$('ev-task'),ds=$('ev-diff');
  ts.innerHTML=HT.tasks.map(t=>'<option>'+t.id+'</option>').join('');
  function variants(t){
    const m={};HT.runs.filter(r=>r.t===t&&r.stop!=='infra_error'&&r.res).forEach(r=>{const k=r.d+'|'+r.res;(m[k]=m[k]||{d:r.d,res:r.res,runs:[]}).runs.push(r)});
    return Object.values(m).sort((a,b)=>b.runs.length-a.runs.length);
  }
  function fillDiffs(){
    const V=variants(ts.value);HTX.evV=V;
    ds.innerHTML=V.map((v,i)=>{const r=v.runs[0];const bin=v.res.indexOf('0')<0;
      return '<option value="'+i+'">'+(i+1)+'. '+(bin?'passes all':'fails '+(v.res.split('0').length-1))+' checks, '+v.runs.length+' rollout'+(v.runs.length>1?'s':'')+(HT.diffs[v.d]?'':' (no change)')+'</option>'}).join('');
    show();
  }
  function show(){
    const v=HTX.evV[+ds.value||0];if(!v)return;
    const t=HT.tasks.find(x=>x.id===ts.value);
    $('ev-diffv').textContent=HT.diffs[v.d]||'(the rollout left the code unchanged)';
    const res=v.res.split('').map(x=>x==='1');
    const vis=C.map((c,i)=>[c,res[i]]).filter(x=>x[0].n[0]==='v');
    const visAll=vis.every(x=>x[1]),all=res.every(x=>x),part=res.filter(x=>x).length/res.length;
    const vr=v.runs[0];
    $('ev-rw').innerHTML='<div>Visible reward<b>'+(vr.vis?1:0)+'</b><span class="mu small">workspace tests when the agent stopped'+(vr.tu?'':' (tests were edited)')+'</span></div><div>Hidden, binary<b>'+(all?1:0)+'</b><span class="mu small">all 20 checks</span></div><div>Hidden, partial<b>'+part.toFixed(2)+'</b><span class="mu small">'+res.filter(x=>x).length+' of 20</span></div><div>Produced by<b class="ht-num" style="font-size:15px">'+v.runs.length+'</b><span class="mu small">'+v.runs.map(r=>esc(r.id)).join(', ')+'</span></div>';
    $('ev-res').innerHTML=C.map((c,i)=>'<div class="'+(res[i]?'ok':'no')+(t.f2p.indexOf(c.n)>=0?' f2p':'')+'"><code>'+esc(c.n)+'</code> '+(res[i]?'pass':'<b>fail</b>')+'</div>').join('');
  }
  ts.addEventListener('change',fillDiffs);ds.addEventListener('change',show);
  ts.value='T01';fillDiffs();
})();
