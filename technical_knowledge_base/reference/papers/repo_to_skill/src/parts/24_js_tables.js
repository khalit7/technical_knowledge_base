// ---- Tables tab ----
function wl(a){let m=a.match(/^[SA]\d+\.T(\d+)$/);if(m)return 'Table '+m[1];m=a.match(/^A(\d+)((?:\.SS+\d+)*)$/);if(m)return 'App. '+'ABCDEFG'[+m[1]-1]+(m[2]?'.'+m[2].match(/\d+/g).join('.'):'');m=a.match(/^S(\d+)((?:\.SS+\d+)*)$/);if(m)return '§'+m[1]+(m[2]?'.'+m[2].match(/\d+/g).join('.'):'');return a}
(function(){
  const T1=TB.t1,base=T1.rows.find(r=>r.agent==='Codex'),pub=T1.rows.filter(r=>!r.agent.startsWith('Codex')),best=RCV.t1_best_public;
  function t1(){const v=$('t1V').value;let h='<tr><th>Agent</th><th>Backbone</th>'+T1.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr>';
    T1.rows.forEach(r=>{const cx=r.agent.startsWith('Codex');h+='<tr'+(cx?' class="basec"':'')+'><td>'+(cx?'<b>'+r.agent+'</b>':r.agent)+'</td><td>'+r.backbone+'</td>'+r.v.map((x,i)=>{
      if(v==='v')return '<td class="num">'+r.printed[i].replace(' $\\pm$ ',' ± ').replace('$\\pm$','± ')+'</td>';
      const d=v==='d'?x[0]-base.v[i][0]:x[0]-best[i];return '<td class="num"'+(d<0?' style="color:var(--bad)"':'')+'>'+(d>0?'+':'')+d.toFixed(2)+'</td>'}).join('')+'</tr>'});
    $('t1Tab').innerHTML=h}
  $('t1V').addEventListener('change',t1);t1();
  const R=RCV.t1_runs,f=k=>R[k].per_split.map((s,i)=>s.map(x=>x.join(', ')).join(' or ')+' of '+T1.n[i]);
  $('t1Runs').innerHTML='<b>Medal counts per run, recovered from the printed mean and SEM</b> (derived; three runs, sample standard deviation): Codex alone: Low '+f('Codex')[0]+'; Medium '+f('Codex')[1]+'; High '+f('Codex')[2]+'; All '+f('Codex')[3]+'. With skills: Low '+f('Codex + AREX-Skill')[0]+'; Medium '+f('Codex + AREX-Skill')[1]+'; High '+f('Codex + AREX-Skill')[2]+'; All '+f('Codex + AREX-Skill')[3]+'. Each set is the only one that fits, and some pairing of the tier counts sums to the All counts run by run ('+R['Codex'].joint+' and '+R['Codex + AREX-Skill'].joint+' consistent pairings). Gap 41.78 points; standard error from the SEMs '+RCV.t1_sig.se_runs+' (z = '+RCV.t1_sig.z_runs+'); treating each competition as one coin flip at the observed rates, '+RCV.t1_sig.se_bin+' (z = '+RCV.t1_sig.z_bin+').';

  // Table 2 sortable
  let key='delta',dir=-1;const cols=[['paper','Paper',0],['topic','ICML topic',0],['base','Codex',1],['skill','Codex + AREX-Skill',1],['delta','Δ',1]];
  function t2(){const rows=TB.t2.rows.slice().sort((a,b)=>(typeof a[key]==='string'?a[key].localeCompare(b[key]):a[key]-b[key])*dir);
    let h='<tr>'+cols.map(c=>'<th'+(c[2]?' class="num"':'')+'><button class="small" data-k="'+c[0]+'">'+c[1]+(key===c[0]?(dir<0?' ▼':' ▲'):'')+'</button></th>').join('')+'</tr>';
    rows.forEach(r=>{h+='<tr><td>'+r.paper+'</td><td>'+r.topic+'</td><td class="num">'+r.printed[0]+'</td><td class="num"'+(r.skill>r.base?' style="font-weight:700"':'')+'>'+r.printed[1]+'</td><td class="num"'+(r.delta<0?' style="color:var(--bad)"':'')+'>'+r.printed[2]+'</td></tr>'});
    const P=RCV.pb;h+='<tr class="basec"><td><b>Average</b></td><td></td><td class="num">'+TB.t2.avg_printed[0]+'</td><td class="num"><b>'+TB.t2.avg_printed[1]+'</b></td><td class="num">'+TB.t2.avg_printed[2]+'</td></tr>';
    h+='<tr><td colspan="5" class="small">Derived: median gain '+P.median_delta+'; 95% interval for the mean gain ['+P.ci_t[0]+', '+P.ci_t[1]+'] (t) or ['+P.ci_boot[0]+', '+P.ci_boot[1]+'] (bootstrap over papers); sign test p = '+P.sign_p.toFixed(4)+'; mean gain without rice '+P.mean_wo_rice+'.</td></tr>';
    $('t2Tab').innerHTML=h;$('t2Tab').querySelectorAll('button[data-k]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.k;if(k===key)dir=-dir;else{key=k;dir=typeof TB.t2.rows[0][k]==='string'?1:-1}t2()}))}
  t2();

  const T3=TB.t3.rows,ref=T3[4];
  $('t3Tab').innerHTML='<tr><th>Agent</th><th>Backbone</th><th class="num">Score</th><th class="num">Avg. steps</th><th class="num">Avg. tool calls</th><th class="num">Avg. tokens</th><th class="num">Tokens vs Codex + skills</th></tr>'+T3.map(r=>'<tr'+(r.agent.startsWith('Codex')?' class="basec"':'')+'><td>'+r.agent+'</td><td>'+r.backbone+'</td>'+r.printed.map(x=>'<td class="num">'+x+'</td>').join('')+'<td class="num">'+(r.tokens_m/ref.tokens_m).toFixed(2)+'×</td></tr>').join('');

  const T4=TB.t4,cx=T4.rows.slice(2);
  $('t4Tab').innerHTML='<tr><th>Method</th>'+T4.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr>'+T4.rows.map((r,i)=>'<tr'+(i>1?' class="basec"':'')+'><td>'+r.method+'</td>'+r.printed.map((x,j)=>{let bold=false;if(i>1){const k=['as','gm','corr','fast1','failed'][j],o=cx[3-i];bold=j===4?r.failed<o.failed:r[k]>o[k]}return '<td class="num">'+(bold?'<b>'+x+'</b>':x)+'</td>'}).join('')+'</tr>').join('');

  $('t6Tab').innerHTML='<tr><th>Metric</th>'+TB.t6.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr>'+TB.t6.rows.map(r=>'<tr><td>'+r.metric+'</td>'+r.printed.map(x=>'<td class="num">'+x+'</td>').join('')+'</tr>').join('')+'<tr><td colspan="4" class="small">Derived: second version against baseline, geometric mean '+(RCV.t6.gm>0?'+':'')+RCV.t6.gm+'%, arithmetic mean '+RCV.t6.am+'% (two no-skill outliers, 10.63 and 8.18, that scored 0.99 and 0.10 on a repeat).</td></tr>';

  function ck(){const v=$('ckF').value,C=PAPER.rc.checks.filter(c=>v==='all'||(v==='p'&&c.kind!=='derived')||(v==='d'&&c.kind==='derived')||(v==='x'&&!c.ok));
    $('ckTab').innerHTML='<tr><th>Claim</th><th>Printed</th><th>Recomputed</th><th>Verdict</th><th>Where</th></tr>'+C.map(c=>'<tr><td>'+c.claim+'</td><td>'+c.printed+'</td><td>'+c.got+'</td><td>'+(c.ok?(c.kind==='derived'?'derived':'<span class="ok">reproduces</span>'):'<span class="no" style="color:var(--bad)">does not reproduce</span>')+'</td><td>'+(c.where==='release'?A('https://github.com/VectorSpaceLab/AREX-Skill','release'):A(PAPER.meta.ax+'#'+c.where,wl(c.where)))+'</td></tr>').join('')}
  $('ckF').addEventListener('change',ck);ck();
})();
