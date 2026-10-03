// ---- Tables tab ----
(function(){
  // Table 1 / 16 explorer
  let si=0,view='rate';
  $('t1M').innerHTML=SETUPS.map((s,i)=>'<button data-m="'+i+'"'+(i===0?' class="on"':'')+'>'+s[2].replace('Terminal-Bench-','TB-').replace('SkillsBench','SB')+'</button>').join('');
  function t1Draw(w){const [p,b,name]=SETUPS[si],n=nOf(p,b),raw=+TB.T1[p].raw[b],wf=TB.T1[p][b].workflow.map(Number),sk=TB.T1[p][b].skill.map(Number),nh=TB.T16[p][b].nohint.map(Number);
    if(view==='rate'){const s=[{n:'Raw '+pct(raw)+'%',c:ARMC.raw,flat:raw},{n:'Workflow',c:ARMC.wf,v:wf,e:wf.map(v=>1.96*se(v,n))},{n:'Skill',c:ARMC.skill,v:sk,e:sk.map(v=>1.96*se(v,n))}];
      if($('t1Nh').checked)s.push({n:'no-hint skill',c:'var(--c4)',v:nh,e:nh.map(v=>1.96*se(v,n)),da:'5 3'});
      return chart(w,{x:MIX,y:[.2,.9],yt:[.2,.4,.6,.8],yf:v=>Math.round(v*100)+'%',H:260,xt:'source trajectories',s,jit:4,label:'Table 1'})}
    const d=sk.map((v,i)=>v-wf[i]),e=sk.map((v,i)=>1.96*Math.sqrt(se(v,n)**2+se(wf[i],n)**2));
    return chart(w,{x:MIX,y:[-.4,.6],yt:[-.4,-.2,0,.2,.4,.6],yf:v=>(v>0?'+':'')+Math.round(v*100),zero:0,H:260,xt:'source trajectories',ytl:'points',s:[{n:'Skill − Workflow',c:ARMC.skill,v:d,e}],label:'Skill minus Workflow'})}
  function t1(){refit($('t1Plot'));const [p,b,name]=SETUPS[si],n=nOf(p,b),c=RCD.t1_compare.find(x=>x.pair===p&&x.bench===b);
    $('t1Note').innerHTML=name+': '+n+' trials per condition ('+n/5+' tasks × 5). Averaged over the six mixtures, Skill '+pct(c.skill_mean)+'% against Workflow '+pct(c.wf_mean)+'% ('+(c.diff>0?'+':'')+pct(c.diff)+' points, z = '+c.z.toFixed(1)+', pooled binomial). Skill above Raw in '+c.skill_above_raw+' of 6 mixtures, Workflow in '+c.wf_above_raw+'.';
    const T1=TB.T1[p],hdr='<tr><th>Mixture</th><th class="num">Workflow</th><th class="num">Skill</th><th class="num">No-hint skill</th><th class="num">Skill − Workflow</th></tr>';
    $('t1Tab').innerHTML=hdr+'<tr class="basec"><td>Raw</td><td class="num" colspan="3">'+T1.raw[b]+'</td><td></td></tr>'+MIX.map((m,i)=>{const d=(+T1[b].skill[i]-+T1[b].workflow[i])*100;return '<tr><td>'+m+'</td><td class="num">'+T1[b].workflow[i]+'</td><td class="num">'+T1[b].skill[i]+'</td><td class="num">'+TB.T16[p][b].nohint[i]+'</td><td class="num" style="color:'+(d>0?'var(--c1)':d<0?'var(--c2)':'var(--mute)')+'">'+(d>0?'+':'')+d.toFixed(1)+'</td></tr>'}).join('')}
  fit($('t1Plot'),w=>{$('t1Plot').innerHTML=t1Draw(w)});
  segBind('t1M',m=>{si=+m;t1()});segBind('t1V',m=>{view=m;t1()});$('t1Nh').addEventListener('change',t1);t1();
  // Figure 2 stacked bars
  const COL={'skill-guided success':'#1a7c3e','workflow-guided success':'#52ae6b','autonomous success':'#b2dfbb','algorithmic logic error':'#1f5fa6','static verify w/o runtime':'#4e94d4','output format/schema mismatch':'#91c4ea','env infrastructure failure':'#c9dff5','background service failure':'#6ab0e0','shell code corruption':'#b8d4ee','timeout/budget exhaustion':'#b5182b','skill guidance misapplied':'#e8621a','capability/safety limit':'#f5b97a'};
  let f2a='Skill';
  function f2Draw(w){const D=TB.F2[f2a],pl=34,pr=10,pt=10,pb=26,H=280,gw=(w-pl-pr)/6,bw=Math.min(54,gw*.62),Y=v=>pt+(H-pt-pb)*(1-v/88);let g='';
    [0,22,44,66,88].forEach(v=>{g+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-4,Y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
    MIX.forEach((m,i)=>{let acc=0;const x=pl+gw*(i+.5)-bw/2;MODES.forEach(md=>{const v=D[m][md[2]]||0;if(!v)return;g+='<rect x="'+x.toFixed(1)+'" y="'+Y(acc+v).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(Y(acc)-Y(acc+v)).toFixed(1)+'" fill="'+COL[md[2]]+'" stroke="var(--bg)" stroke-width=".6"><title>'+m+', '+md[2]+': '+v+' of 88</title></rect>';
        if(v>=6&&bw>=26)g+=tx(x+bw/2,Y(acc+v/2)+4,v,{fs:11,a:'middle',c:md[0]==='SC1'&&md[2]!=='skill-guided success'||/output|env|shell|capab/.test(md[2])?'#222':'#fff'});acc+=v});
      g+=tx(x+bw/2,H-pb+16,m,{fs:11,a:'middle',c:'var(--mute)'})});
    return svgW(w,H,g,'Figure 2 decoded')+'<div class="leg">'+MODES.map(md=>'<span><i style="background:'+COL[md[2]]+';height:10px;width:10px"></i>'+md[2]+'</span>').join('')+'</div>'}
  fit($('f2Plot'),w=>{$('f2Plot').innerHTML=f2Draw(w)});segBind('f2M',m=>{f2a=m;refit($('f2Plot'))});
  // retrieval explorer
  const POOLS=['random','similar','dissimilar'],PC={random:'var(--c3)',similar:'var(--c2)',dissimilar:'var(--c1)'};
  const col={p:0,r:1,f:2},T15=(ag,pool,i,arm,met)=>{const r=TB.T15[ag][pool][i];return +r[(arm===2?0:3)+(met==='s'?3:col[met])]};
  function val(arm,met,ag,pool,i){if(arm===1){const r=TB.T14[pool][i];return met==='p'||met==='r'?+r[0]:met==='f'?+r[0]:null}
    if(arm===2&&met==='s')return null;
    if(ag==='avg')return (T15('gemini',pool,i,arm,met)+T15('codex',pool,i,arm,met))/2;return T15(ag,pool,i,arm,met)}
  function rtDraw(w){const met=$('rtMet').value,arm=+$('rtArm').value,ag=$('rtAg').value;const s=[];
    POOLS.forEach(pool=>{const v=KS.map((k,i)=>val(arm,met,ag,pool,i));if(v.some(x=>x!=null))s.push({n:pool,c:PC[pool],v})});
    if(arm===3&&met==='p'&&$('rtScan').checked)POOLS.forEach(pool=>s.push({n:pool+': R ÷ k',nolab:1,c:PC[pool],v:KS.map((k,i)=>val(3,'r',ag,pool,i)/k),da:'2 3'}));
    if(!s.length)return '<p class="small mute">Not measured for this arm.</p>';
    const mx=Math.max(...s.flatMap(x=>x.v.filter(v=>v!=null)));const top=mx>50?100:50;return chart(w,{x:KS,log:true,y:[0,top],yt:top>50?[0,20,40,60,80,100]:[0,10,20,30,40,50],yf:v=>v+'%',H:260,xt:'skills in the pool, k (log scale)',s,label:'Retrieval explorer'})}
  function rt(){refit($('rtPlot2'));const met=$('rtMet').value,arm=+$('rtArm').value;
    $('rtNote').innerHTML=(arm===1?'Arm 1 (Table 14) has no agent: top-1 precision, which equals top-1 recall since every task has one gold skill. ':'')+(arm===2&&met==='s'?'Arm 2 never runs the task. ':'')+(arm===3&&met==='p'?'Dotted: the precision of a run that touches every skill in the pool and finds the gold one, recall ÷ k. Gemini\'s solid lines sit on it; Codex\'s do not. ':'')+'Sources: '+(arm===1?'{T14}':'{T15}')+'; the averages reproduce Table 4 (44 of 45 cells exactly, one 0.1 off).';
    $('rtNote').innerHTML=$('rtNote').innerHTML.replace('{T14}',A(PAPER.meta.ax+'#A3.T14','Table 14')).replace('{T15}',A(PAPER.meta.ax+'#A3.T15','Table 15'))}
  fit($('rtPlot2'),w=>{$('rtPlot2').innerHTML=rtDraw(w)});['rtMet','rtArm','rtAg'].forEach(id=>$(id).addEventListener('change',rt));$('rtScan').addEventListener('change',rt);rt();
  // small tables
  const T9=TB.T9;$('t9').innerHTML='<tr><th>Arm</th><th class="num">Success / total</th><th class="num">Rate</th></tr>'+['Raw','Workflow memory','Skill'].map((n,i)=>'<tr><td>'+n+'</td><td class="num">'+T9[i][0]+' / '+T9[i][1]+'</td><td class="num">'+(100*T9[i][0]/T9[i][1]).toFixed(1)+'%</td></tr>').join('');
  const t10=TB.T10;$('t10').innerHTML='<tr><th>Comparison</th><th class="num">Mean</th><th class="num">95% CI</th></tr>'+['WM vs Raw','Skill vs Raw','Skill vs WM'].map((n,i)=>'<tr><td>'+n+'</td><td class="num">'+t10[3*i]+'</td><td class="num">['+t10[3*i+1]+', '+t10[3*i+2]+']</td></tr>').join('');
  $('t12').innerHTML='<tr><th>Condition</th><th>Source</th><th class="num">Success</th><th class="num">Rate</th></tr>'+TB.T12.map(r=>'<tr><td>'+r.cond+'</td><td>'+r.source+'</td><td class="num">'+r.succ+' / '+r.n+'</td><td class="num">'+r.rate+'%</td></tr>').join('');
  $('t13').innerHTML='<tr><th>Row</th><th class="num">Success</th><th class="num">Input</th><th class="num">Output</th><th class="num">Total</th></tr>'+TB.T13.map(r=>'<tr><td>'+r[0]+'</td><td class="num">'+r[1]+'%</td><td class="num">'+r[2]+'K</td><td class="num">'+r[3]+'K</td><td class="num">'+r[4]+'K</td></tr>').join('')+'<tr><td colspan="5" class="small mute">The table labels its Raw row "Raw trajectories" and calls it "full prior traces"; Raw elsewhere means no prior experience.</td></tr>';
  $('t4f').innerHTML='<tr><th>Mixture</th><th class="num">Workflow</th><th class="num">Skill</th><th class="num">Skill − Workflow</th></tr>'+MIX.map(m=>'<tr><td>'+m+'</td><td class="num">'+TB.F4.workflow[m]+'%</td><td class="num">'+TB.F4.skill[m]+'%</td><td class="num">+'+(TB.F4.skill[m]-TB.F4.workflow[m])+'</td></tr>').join('')+'<tr><td colspan="4" class="small mute">Gemini Raw baseline '+TB.F4.raw+'%. Benchmark and trial count not stated.</td></tr>';
  // checks
  const VC={reproduces:'var(--good)','within rounding':'var(--good)',consistent:'var(--good)',derived:'var(--acc)',partly:'var(--bad)',inconsistent:'var(--bad)','does not':'var(--bad)',note:'var(--mute)'};
  $('chkTab').innerHTML='<tr><th>Claim or quantity</th><th>This page</th><th>Paper</th><th>Verdict</th></tr>'+RCD.checks.map(c=>'<tr><td>'+esc(c.claim)+'<div class="small mute">'+esc(c.how)+'</div></td><td class="small" style="overflow-wrap:anywhere">'+esc(c.ours)+'</td><td class="small">'+esc(c.paper)+'</td><td style="color:'+(VC[c.verdict]||'var(--ink)')+';font-weight:600">'+c.verdict+'</td></tr>').join('');
  onTab('t-tables',()=>['t1Plot','f2Plot','rtPlot2'].forEach(id=>refit($(id))));
})();
