// ---- Tables tab ----
(function(){
  const OC={executed:'var(--bad)',attempted:'var(--c5)',no_attempt:'var(--dim)',refused:'var(--c1)'};
  const alias={'Gemini 3.1 Pro':'Gemini 3.1 Pro Preview','Mistral-Large-3':'Mistral Large 3 2512','Qwen3.5-397B':'Qwen3.5-397B-A17B','Qwen3.5-122B':'Qwen3.5-122B-A10B','Qwen3-235B':'Qwen3-235B-A22B (stock)','Qwen3-235B (abl.)':'Qwen3-235B-A22B (abliterated)'};
  const t11={};TB.T11.forEach(r=>t11[r[0]]=r);
  let sortBy='executed';
  function d11(w){const rows=Object.entries(TB.F3).map(([m,v])=>({m,v,t:t11[alias[m]||m]})).sort((a,b)=>b.v[sortBy]-a.v[sortBy]||(a.m<b.m?-1:1));
    const rh=16,pt=6,lw=Math.min(132,w*.3),pl=lw+6,pr=w<480?62:96,iw=w-pl-pr,H=pt+rows.length*rh+40;let s='';
    rows.forEach((r,i)=>{const y=pt+i*rh;let x=pl;s+=tx(pl-5,y+11,r.m,{fs:11,a:'end'});
      ['executed','attempted','no_attempt','refused'].forEach(k=>{const bw=iw*r.v[k]/100;if(bw>0)s+='<rect x="'+x.toFixed(1)+'" y="'+(y+2)+'" width="'+bw.toFixed(1)+'" height="'+(rh-4)+'" fill="'+OC[k]+'"><title>'+r.m+': '+k.replace('_',' ')+' '+r.v[k].toFixed(1)+'%</title></rect>';x+=bw});
      s+=tx(w-pr+4,y+11,(r.t?r.t[1]+' / '+r.t[2]+(w<480?'':' · N '+r.t[3]):''),{fs:11,c:'var(--mute)'})});
    const lg=legend([['executed',OC.executed],['attempted',OC.attempted],['no attempt',OC.no_attempt],['refused',OC.refused]],pl,H-14,iw);s+=lg.s;
    return svgW(w,H+lg.h-12,s,'Four-way outcomes for 39 models')}
  fit($('t11Plot'),w=>{$('t11Plot').innerHTML=d11(w)});segBind('t11S',m=>{sortBy=m;refit($('t11Plot'))});
  onTab('t-tables',()=>{drawF4($('f4Plot'));let m=1;drawObs($('t12Plot'),m);refit($('t11Plot'))});
  segBind('t12M',m=>{drawObs($('t12Plot'),+m)});
  // Appendix J.1 classical monitors on multiday corpora
  $('j1Tab').innerHTML='<tr><th>J.1, AUROC / R@10/day</th><th class="num">z-score</th><th class="num">peer-fit</th><th class="num">FACADE</th></tr>'+Object.entries(TB.J1).map(([g,v])=>'<tr><td>'+g+' multiday</td>'+v.map(x=>'<td class="num">'+x[0]+' / '+x[1]+'</td>').join('')+'</tr>').join('');
  // Table 13
  const t13n=['Claude Opus 4.7 (R@10/day)','GPT-5.5 (R@10/day)','FACADE (R@10/day)','Opus 4.7 − GPT-5.5','GPT-5.5 − FACADE','GPT-4.1-mini − GPT-4.1','GPT-5.5 reasoning − audit, GPT-5.3 multiday','… Kimi multiday','… Qwen multiday','… DeepSeek multiday','GPT-4.1 reasoning − GPT-5.5 audit, Kimi multiday','… Qwen multiday','… DeepSeek multiday'];
  $('t13Tab').innerHTML='<tr><th>Table 13 row</th><th class="num">estimate</th><th class="num">95% interval</th><th></th></tr>'+TB.T13.map((r,i)=>{const z=i>2&&+r[1]<=0&&+r[2]>=0;return '<tr><td>'+t13n[i]+'</td><td class="num">'+r[0]+'</td><td class="num">['+r[1].replace('-','−')+', '+r[2]+']</td><td class="small" style="color:'+(z?'var(--bad)':'var(--mute)')+'">'+(i>2?(z?'includes 0':'excludes 0'):'')+'</td></tr>'}).join('');
  // Figure 6 with recomputed classical columns
  (function(){const f=TB.F6,np=RC.f6_pos;    const TH={'IP theft':'01_ip_theft','Credential exfil.':'02_credential_exfil','Privilege escalation':'03_priv_esc','Fraud':'04_fraud','Sabotage':'05_sabotage','Weight exfil.':'06_weight_exfil','Evaluation manip.':'07_eval_manip','Data poisoning':'08_data_poisoning','Release manip.':'09_release_manip','Safety sabotage':'10_safety_sabotage'};
    const cnt=mon=>{const R=AUD.rankAll(mon,[...Array(20).keys()]),o={};R.forEach(it=>it.forEach(x=>{if(x.r.pos){o[x.r.th]=o[x.r.th]||[0,0];o[x.r.th][1]++;if(x.rank<=10)o[x.r.th][0]++}}));return o};
    const cz=cnt('z'),cp=cnt('peer');let h='<tr><th>threat</th><th class="num">n</th>'+f.cols.map(c=>'<th class="num">'+c+'</th>').join('')+'<th class="num">z recomputed</th><th class="num">peer recomputed</th></tr>';
    f.rows.forEach(r=>{const k=TH[r[0]],isAll=r[0]==='ALL';const z=isAll?[AUD.recall(AUD.rankAll('z',[...Array(20).keys()]),10),45]:cz[k],p=isAll?[AUD.recall(AUD.rankAll('peer',[...Array(20).keys()]),10),45]:cp[k];
      h+='<tr'+(isAll?' class="basec"':'')+'><td>'+r[0]+'</td><td class="num">'+(isAll?45:np[r[0]])+'</td>'+r.slice(1).map(v=>'<td class="num"'+(!isAll&&+v<=.43?' style="color:var(--bad)"':'')+'>'+v+'</td>').join('')+'<td class="num">'+(z[0]/z[1]).toFixed(2)+' <span class="mute small">'+z[0]+'/'+z[1]+'</span></td><td class="num">'+(p[0]/p[1]).toFixed(2)+' <span class="mute small">'+p[0]+'/'+p[1]+'</span></td></tr>'});
    $('f6Tab').innerHTML=h})();
  // Tables 19 to 21
  $('t19Tab').innerHTML='<tr><th>Table 19 (AUROC)</th><th class="num">best classical</th><th class="num">GPT-5.5</th></tr>'+TB.T19.map(r=>'<tr><td>'+r[0]+'</td><td class="num">'+r[1]+'</td><td class="num">'+r[2]+'</td></tr>').join('');
  $('t20Tab').innerHTML='<tr><th>Table 20, GPT-5.3 single-day</th><th class="num">R@10/day</th><th class="num">budget-AUC</th><th class="num">AUROC</th></tr>'+TB.T20.map((r,i)=>'<tr><td>'+TB.T20names[i]+'</td><td class="num">'+r[0]+' <span class="mute small">'+Math.round(+r[0]*45)+'/45</span></td><td class="num">'+r[1]+'</td><td class="num">'+r[2]+'</td></tr>').join('');
  const t21n=['z-score','peer-fit','GPT-4.1-mini','GPT-4.1','GPT-5.5'],T21=TB.T21;
  $('t21Tab').innerHTML='<tr><th>Table 21 (R@10/day / budget-AUC)</th><th class="num">non-held-out (32)</th><th class="num">held-out (13)</th></tr>'+t21n.map((n,i)=>'<tr><td>'+n+'</td><td class="num">'+T21[2*i].join(' / ')+' <span class="mute small">'+Math.round(+T21[2*i][0]*32)+'/32</span></td><td class="num">'+T21[2*i+1].join(' / ')+' <span class="mute small">'+Math.round(+T21[2*i+1][0]*13)+'/13</span></td></tr>').join('')+'<tr class="basec"><td>z-score and peer-fit refit with held-out accounts (this page)</td><td class="num">7/32 and 8/32, unchanged</td><td class="num">'+RC.heldout_refit.join(' and ')+' of 13</td></tr>';
  // Table 22 cost chart
  let col=3;
  function d22(w){const r=TB.T22,H=250,pl=44,pr=14,pt=14,pb=34,iw=w-pl-pr,ih=H-pt-pb,ymax=col==4?.7:.55;const x=c=>pl+iw*c/4.8,y=v=>pt+ih*(1-v/ymax);let s='';
    [0,.1,.2,.3,.4,.5,.6,.7].filter(v=>v<=ymax).forEach(v=>{s+=ln2(pl,y(v),w-pr,y(v),'var(--line)')+tx(pl-5,y(v)+4,v.toFixed(1),{fs:11,a:'end',c:'var(--mute)'})});
    [0,1,2,3,4].forEach(c=>{s+=tx(x(c),H-pb+15,c+'×',{fs:11,a:'middle',c:'var(--mute)'})});s+=tx(pl+iw/2,H-4,'modeled daily cost (uniform GPT-4.1 = 1×)',{fs:11,a:'middle',c:'var(--mute)'});
    if(col==3){const g=[[1,.304],[1.23,.391],[1.75,.407],[2.5,.449]];s+='<path d="'+g.map((p,i)=>(i?'L':'M')+x(p[0]).toFixed(1)+','+y(p[1]).toFixed(1)).join('')+'" fill="none" stroke="var(--c4)" stroke-width="1.6" stroke-dasharray="5 3"/>'}
    if(col==4)[['uniform GPT-4.1-mini',.2,.112],['uniform GPT-5.5',2.5,.571]].forEach(([n,c,v])=>{s+='<circle cx="'+x(c)+'" cy="'+y(v)+'" r="4" fill="var(--dim)"><title>'+n+' '+v+'</title></circle>'});
    const pts=r.map(q=>({x:x(+q[2]),y:y(+q[col]),t:w<520?(q[0]==='GPT-4.1'?'GPT-4.1':'it. '+(q[0].match(/iteration (\d+)/)||['',''])[1]):q[0].replace(/ \(iteration (\d+)\)/,' ($1)').replace('rarity/sequence','rarity/seq.'),fs:11,base:q[0]==='GPT-4.1'}));
    pts.forEach(p=>{s+='<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4.5" fill="'+(p.base?'var(--c2)':'var(--c1)')+'"/>'});
    placeLabels(pts.map(p=>({x:p.x-pl,y:p.y,t:p.t,fs:11})),w-pl,H-pb).forEach(p=>{s+=tx(p.lx+pl,p.ly,p.t,{fs:11,a:p.la})});
    return svgW(w,H,s,'Cost against budget-AUC')}
  fit($('t22Plot'),w=>{$('t22Plot').innerHTML=d22(w)});segBind('t22M',m=>{col=+m;refit($('t22Plot'))});
  // Table 6
  const t6=TB.T6;$('t6Tab').innerHTML='<tr><th>measure</th><th class="num">role-matched</th><th class="num">mismatched control</th><th class="num">difference</th><th class="num">alpha</th></tr>'+['Task fit','Threat realism'].map((n,i)=>'<tr><td>'+n+'</td>'+t6.slice(i*4,i*4+4).map(c=>'<td class="num">'+c[0]+' <span class="mute small">['+c[1].replace('-','−')+', '+c[2]+']</span></td>').join('')+'</tr>').join('');
  // checks
  $('chkTab').innerHTML='<tr><th>check</th><th>ours</th><th>paper</th><th></th></tr>'+RC.checks.map(c=>'<tr><td>'+c.name+'<div class="mute small">'+c.how+'</div></td><td>'+c.ours+'</td><td>'+c.paper+'</td><td class="small" style="white-space:nowrap;color:'+(c.ok===true?'var(--good)':c.ok===false?'var(--bad)':'var(--c5)')+'">'+(c.ok===true?'✓ agrees':c.ok===false?'✗ disagrees':c.ok==='part'?'≈ partly':'+ new')+'</td></tr>').join('');
})();
