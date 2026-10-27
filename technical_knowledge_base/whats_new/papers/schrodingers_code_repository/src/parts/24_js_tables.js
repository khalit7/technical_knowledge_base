// ---- Tables tab ----
(function(){
  const TB=PAPER.tables,RC=PAPER.rc;
  const MET=[['pass','Pass@1'],['actions','Actions'],['input','Input tokens'],['output','Output tokens']];
  let mode='printed';
  function chg(c){return c?(c.recomputed>0?'+':'')+(Math.abs(c.recomputed)<10?c.recomputed.toFixed(2):c.recomputed.toFixed(1))+(c.unit==='%'?'%':c.unit==='pp'?' pp':''):''}
  function t1(){const rows=TB.T1.rows;let h='<table><thead><tr><th>Model</th><th>Setting</th>'+MET.map(m=>'<th class="num">'+m[1]+'</th>').join('')+'</tr></thead><tbody>';
    rows.forEach(r=>{h+='<tr><td>'+r.model+'</td><td>'+r.setting+'</td>'+MET.map(([m])=>{const v=r[m];const c=RC.checks.find(q=>q.t==='T1'&&q.model===r.model&&q.setting===r.setting&&q.metric===m);
      const ch=mode==='printed'?(v.dp!=null?' ('+(v.dir>0?'&#8593;':'&#8595;')+' '+v.dp+(m==='pass'?'':'%')+')':''):(c?' ('+chg(c)+')':'');
      return '<td class="num"'+(c&&!c.ok?' style="color:var(--bad);font-weight:600"':'')+'>'+v.p+'*'.repeat(v.sig||0).replace(/\*/g,'&#42;')+'<span class="small">'+ch+'</span></td>'}).join('')+'</tr>'});
    $('tbT1').innerHTML=h+'</tbody></table>'}
  segBind('tbM',m=>{mode=m;$('tbM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));t1()});
  function ci(){let h='<table><thead><tr><th>Model</th><th>Setting</th><th class="num">Change</th><th class="num">95% interval</th><th class="num">z</th><th>Stars</th><th class="num">Max fail-to-pass flips for p&lt;0.05</th></tr></thead><tbody>';
    RC.ci.forEach(c=>{h+='<tr><td>'+c.model+(c.N!==500?' ('+c.N+')':'')+'</td><td>'+c.setting+'</td><td class="num">'+c.diff_pp.toFixed(1)+'</td><td class="num">'+(+c.lo).toFixed(1)+' to '+(+c.hi).toFixed(1)+'</td><td class="num">'+c.z_unpaired.toFixed(2)+'</td><td>'+('&#42;'.repeat(c.stars)||'none')+'</td><td class="num">'+(c.mcnemar_max_up_flips==null?'(no drop)':c.mcnemar_max_up_flips+' (drop of '+c.drop_instances+')')+'</td></tr>'});
    $('tbCI').innerHTML=h+'</tbody></table>'}
  function chk(){const n=RC.checks.length,bad=RC.bad;
    $('tbChk').innerHTML='<p>'+n+' printed changes in Tables I to III recomputed from their own values; '+(n-bad.length)+' agree within rounding, '+bad.length+' do not:</p><ul class="lst">'+bad.map(b=>'<li><b>'+b.t.replace('T','Table ')+', '+b.model+', '+b.setting+', '+b.metric+'</b>: printed '+(b.printed>0?'+':'')+b.printed+(b.unit==='%'?'%':'')+', recomputed '+chg(b)+'.</li>').join('')+'</ul><p class="small">Other text claims checked: "more than 65%" with leakage evidence (lowest '+RC.f1_min_leak+'%, holds); "more than 18%" at patch/test level (lowest '+RC.f1_min_patch+'%, exactly 18.0% for GPT 5.1); input tokens "more than 2.5&#215;" ('+Object.entries(RC.input_x).map(([m,v])=>m+' '+v+'&#215;').join(', ')+'); exploration shares 83.6% and 81.6% (labels sum to '+RC.f3['DeepSeek-v4-Flash'].explore+' and '+RC.f3['GPT-5.4-mini'].explore+'); case study 37 to 217 actions ('+RC.case_x+'&#215;); SWE-QA actions up 18.15 to 43.02% (holds).</p>'}
  function t23(id,tk,first){const rows=TB[tk].rows;const M=[[first,first==='score'?'Score':'Pass@1'],['actions','Actions'],['input','Input tokens'],['output','Output tokens']];
    let h='<table><thead><tr><th>Model</th><th>Setting</th>'+M.map(m=>'<th class="num">'+m[1]+'</th>').join('')+'</tr></thead><tbody>';
    rows.forEach(r=>{h+='<tr><td>'+r.model+'</td><td>'+r.setting+'</td>'+M.map(([m])=>{const v=r[m];const c=RC.checks.find(q=>q.t===tk&&q.model===r.model&&q.setting===r.setting&&q.metric===m);
      return '<td class="num"'+(c&&!c.ok?' style="color:var(--bad);font-weight:600"':'')+'>'+v.p+(v.dp!=null?' <span class="small">('+(v.dir>0?'&#8593;':'&#8595;')+' '+v.dp+')</span>':'')+(c&&!c.ok?' <span class="small">recomputed '+chg(c)+'</span>':'')+'</td>'}).join('')+'</tr>'});
    $(id).innerHTML=h+'</tbody></table>'}
  function figs(){const F=TB.F1;let h='<table><thead><tr><th>Model</th>'+F.cats.map(c=>'<th class="num">'+c+'</th>').join('')+'<th class="num">Leakage</th><th class="num">Strong</th></tr></thead><tbody>';
    Object.entries(F.rows).forEach(([m,v])=>{const r=RC.f1[m];h+='<tr><td>'+m+'</td>'+v.map(x=>'<td class="num">'+x+'</td>').join('')+'<td class="num">'+r.leak_pct+'%</td><td class="num">'+r.strong_pct+'%</td></tr>'});
    $('tbF1').innerHTML=h+'</tbody></table>';const G=TB.F3;h='<table><thead><tr><th>Model</th>'+G.cats.map(c=>'<th class="num">'+c+'</th>').join('')+'<th class="num">Sum</th></tr></thead><tbody>';
    Object.entries(G.rows).forEach(([m,v])=>{h+='<tr><td>'+m+'</td>'+v.map(x=>'<td class="num">'+(x==null?'(none)':x.toFixed(1))+'</td>').join('')+'<td class="num">'+RC.f3[m].sum+'</td></tr>'});$('tbF3').innerHTML=h+'</tbody></table>'}
  t1();ci();chk();t23('tbT2','T2','score');t23('tbT3','T3','pass');figs();
})();
