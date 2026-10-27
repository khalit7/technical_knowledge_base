// ---- The paper's numbers, rebuilt: checks, per-seed data, appendix tables ----
(function(){if(!window.PAPER||!$('gfChecksT'))return;const P=PAPER,AX=P.meta.ax;
  const lab=at=>{let m=at.match(/^A4\.T(\d)$/);if(m)return 'Table '+m[1];m=at.match(/^S\d\.T(\d)$/);if(m)return 'Table '+m[1];m=at.match(/^[SA]\d\.F(\d+)$/);if(m)return 'Figure '+m[1];
    if(at==='S3.E1')return 'Eq. 1';if(at==='alg1')return 'Algorithm 1';m=at.match(/^A(\d)(?:\.SS(\d))?$/);if(m)return 'App. '+'ABCDEFG'[+m[1]-1]+(m[2]?'.'+m[2]:'');return '§'+at.replace(/^S/,'').replace('.SS','.')};
  let h='<table><thead><tr><th>Claim</th><th>Where</th><th>Paper</th><th>This page</th><th></th><th>How</th></tr></thead><tbody>';
  P.rc.checks.forEach(c=>{h+='<tr><td>'+c.claim+'</td><td>'+A(AX+'#'+c.at,lab(c.at))+'</td><td>'+c.paper+'</td><td>'+c.ours+'</td><td class="'+(c.ok?'ok':'no')+'">'+(c.ok?'agrees':'differs')+'</td><td class="small mute">'+c.how+'</td></tr>'});
  $('gfChecksT').innerHTML=h+'</tbody></table>';
  h='<table><thead><tr><th>Arm</th><th>Seed</th><th class="num">Hack</th><th class="num">Flagged</th><th class="num">Constraint removal</th><th class="num">Clean solve</th><th class="num">Proxy</th><th class="num">Task (Table 4 metric)</th></tr></thead><tbody>';
  GD.cd.arms.forEach(a=>a.seeds.forEach(p=>{const f=v=>v==null?'':(100*v).toFixed(1);h+='<tr><td>'+a.label+'</td><td>'+(p.seed==null?'':p.seed)+'</td><td class="num">'+f(p.hack)+'</td><td class="num">'+f(p.detected)+'</td><td class="num">'+f(p.constraint_relax)+'</td><td class="num">'+f(p.clean)+'</td><td class="num">'+f(p.proxy)+'</td><td class="num">'+f(p.retain)+'</td></tr>'}));
  $('gfSeedT').innerHTML=h+'</tbody></table>';
  h='<table><thead><tr><th>Environment</th><th>Arm</th><th class="num">Task</th><th class="num">Hack</th><th class="num">Detectable</th><th class="num">Undetectable</th></tr></thead><tbody>';
  Object.entries(GD.env).forEach(([e,v])=>['No intervention','Reward penalty','GRAFT: pre-ablation','GRAFT (ours)','Base model'].forEach(a=>{const r=v[a];h+='<tr><td>'+e+'</td><td>'+a+(a==='Reward penalty'?' ('+v.rp_pick.replace('rp','')+')':'')+'</td><td class="num">'+r.retain.toFixed(1)+'</td><td class="num">'+r.hack.toFixed(1)+'</td><td class="num">'+r.detected.toFixed(1)+'</td><td class="num">'+r.undetected.toFixed(1)+'</td></tr>'}));
  $('gfEnvT').innerHTML=h+'</tbody></table>';
  const tb=(t,rows,cap)=>{let s='<table><caption class="small mute" style="text-align:left">'+A(AX+'#'+t.at,t.n)+': '+t.title+(cap?' ('+cap+')':'')+'; ± '+t.err+'.</caption><thead><tr><th></th>'+t.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'</tr></thead><tbody>';
    rows.forEach(r=>{s+='<tr><td>'+r.n+'</td>'+r.v.map((v,i)=>'<td class="num">'+v.toFixed(1)+(r.e[i]!=null?' ± '+r.e[i].toFixed(1):'')+'</td>').join('')+'</tr>'});return s+'</tbody></table>'};
  const T=P.tables;$('gfT2').innerHTML=tb(T.t2,T.t2.rows);$('gfT3').innerHTML=tb(T.t3,T.t3.HumanEval,'HumanEval')+tb(T.t3,T.t3.LeetCode,'LeetCode');$('gfT4').innerHTML=tb(T.t4,T.t4.rows);
})();
