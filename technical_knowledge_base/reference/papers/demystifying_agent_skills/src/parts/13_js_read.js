// ---- Reading-tab charts, all computed from window.PAPER (tables.json and recompute.json) ----
const TB=PAPER.tables,RCD=PAPER.rc,MIX=TB.mixtures,KS=TB.K;
const SETUPS=[['codex','TB2','Codex, Terminal-Bench-2'],['codex','SB','Codex, SkillsBench'],['codex','TBPro','Codex, Terminal-Bench-Pro'],['gemini','TB2','Gemini, Terminal-Bench-2'],['gemini','SB','Gemini, SkillsBench'],['gemini','TBPro','Gemini, Terminal-Bench-Pro']];
const nOf=(p,b)=>RCD.denominators[p+'_'+b];
const se=(q,n)=>Math.sqrt(q*(1-q)/n);
const pct=(v,d)=>(v*100).toFixed(d==null?1:d);
// generic chart over categories or numbers; series: {n,c,v:[...],e:[...] (half-width), da, dot}
function chart(w,o){const H=o.H||240,pl=o.pl||44,pr=o.pr||(w<480?70:96),pt=o.pt||14,pb=o.pb||34;
  const xs=o.x,nx=xs.length,lg=!!o.log;
  const X=o.log?(v=>pl+(w-pl-pr)*(Math.log(v)-Math.log(xs[0]))/(Math.log(xs[nx-1])-Math.log(xs[0]))):(i=>pl+(w-pl-pr)*(nx===1?.5:i/(nx-1)));
  const Y=v=>pt+(H-pt-pb)*(1-(v-o.y[0])/(o.y[1]-o.y[0]));let g='';
  o.yt.forEach(v=>{g+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-6,Y(v)+4,o.yf?o.yf(v):v,{fs:11,a:'end',c:'var(--mute)'})});
  if(o.zero!=null)g+=ln2(pl,Y(o.zero),w-pr,Y(o.zero),'var(--mute)',{sw:1.2});
  xs.forEach((x,i)=>{const xx=lg?X(x):X(i);g+=tx(xx,H-pb+16,o.xl?o.xl(x):x,{fs:11,a:'middle',c:'var(--mute)'})});
  if(o.xt)g+=tx((pl+w-pr)/2,H-4,o.xt,{fs:11,a:'middle',c:'var(--mute)'});
  if(o.ytl)g+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">'+o.ytl+'</text>';
  const ends=[];
  o.s.forEach((s,si)=>{if(s.flat!=null){g+=ln2(pl,Y(s.flat),w-pr,Y(s.flat),s.c,{sw:1.6,da:'5 4'});ends.push({y:Y(s.flat),n:s.n,c:s.c,how:s.n});return}
    const off=(o.jit||0)*(si-(o.s.length-1)/2);const pts=s.v.map((v,i)=>v==null?null:[(lg?X(xs[i]):X(i))+off,Y(v)]);
    if(s.e)s.v.forEach((v,i)=>{if(v==null)return;const x=pts[i][0];g+=ln2(x,Y(v-s.e[i]),x,Y(v+s.e[i]),s.c,{sw:1.2,op:.55})});
    let d='';pts.forEach((p,i)=>{if(p)d+=(d?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)});
    if(!s.nol)g+='<path d="'+d+'" fill="none" stroke="'+s.c+'" stroke-width="2"'+(s.da?' stroke-dasharray="'+s.da+'"':'')+'/>';
    pts.forEach(p=>{if(p)g+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="3.2" fill="'+s.c+'"/>'});
    const last=pts.filter(Boolean).pop();if(last&&!s.nolab)ends.push({y:last[1],n:s.n,c:s.c,how:s.n})});
  g+=endLabels(ends,w-pr+6,14);
  return svgW(w,H,g,o.label||'chart')}
// a horizontal interval chart: rows [{n, m, lo, hi, c}], x in points
function intervals(w,rows,xr,o){o=o||{};const pl=w<480?118:170,pr=16,rh=30,H=rows.length*rh+40,X=v=>pl+(w-pl-pr)*(v-xr[0])/(xr[1]-xr[0]);let g='';
  (o.ticks||[]).forEach(v=>{g+=ln2(X(v),10,X(v),H-26,'var(--line)')+tx(X(v),H-12,(v>0?'+':'')+v,{fs:11,a:'middle',c:'var(--mute)'})});
  g+=ln2(X(0),6,X(0),H-26,'var(--mute)',{sw:1.3});
  rows.forEach((r,i)=>{const y=18+i*rh;g+=tx(pl-8,y+4,r.n,{fs:12,a:'end'});
    g+=ln2(X(r.lo),y,X(r.hi),y,r.c,{sw:3});g+='<circle cx="'+X(r.m).toFixed(1)+'" cy="'+y+'" r="5" fill="'+r.c+'"/>';
    g+=tx(X(r.hi)+6>w-60?X(r.lo)-6:X(r.hi)+6,y+4,(r.m>0?'+':'')+r.m.toFixed(2),{fs:11,a:X(r.hi)+6>w-60?'end':'start',c:'var(--mute)'})});
  g+=tx((pl+w-pr)/2,H-1,o.xt||'points',{fs:11,a:'middle',c:'var(--mute)'});
  return svgW(w,H,g,'intervals')}
// ---- Table 10 intervals (predict 1)
PRED_REVEAL.pr1=()=>{const t=TB.T10.map(Number);const rows=[{n:'Workflow Memory − Raw',m:t[0]*100,lo:t[1]*100,hi:t[2]*100,c:ARMC.wf},{n:'Skill − Raw',m:t[3]*100,lo:t[4]*100,hi:t[5]*100,c:'var(--c6)'},{n:'Skill − Workflow Memory',m:t[6]*100,lo:t[7]*100,hi:t[8]*100,c:ARMC.skill}];
  fit($('ciPlot'),w=>{$('ciPlot').innerHTML=intervals(w,rows,[-10,13],{ticks:[-10,-5,0,5,10],xt:'difference in success, points (95% bootstrap interval)'})})};
// ---- Skill minus Workflow per cell, six panels
function diffPanels(w){const cols=w>=700?3:w>=520?2:1,gap=12,pw=(w-gap*(cols-1))/cols,ph=150;let out='<div style="display:grid;grid-template-columns:repeat('+cols+',minmax(0,1fr));gap:'+gap+'px">';
  SETUPS.forEach(([p,b,name])=>{const n=nOf(p,b),wf=TB.T1[p][b].workflow.map(Number),sk=TB.T1[p][b].skill.map(Number);
    const d=sk.map((v,i)=>(v-wf[i])*100),e=sk.map((v,i)=>196*Math.sqrt(se(v,n)**2+se(wf[i],n)**2));
    const pl=34,pr=8,pt=8,pb=22,X=i=>pl+(pw-pl-pr)*(i+.5)/6,Y=v=>pt+(ph-pt-pb)*(1-(v+40)/100);let g='';
    [-40,-20,0,20,40,60].forEach(v=>{g+=ln2(pl,Y(v),pw-pr,Y(v),v===0?'var(--mute)':'var(--line)',{sw:v===0?1.2:1})+tx(pl-4,Y(v)+4,(v>0?'+':'')+v,{fs:11,a:'end',c:'var(--mute)'})});
    d.forEach((v,i)=>{const c=v-e[i]>0?ARMC.skill:v+e[i]<0?ARMC.wf:'var(--mute)';g+=ln2(X(i),Y(v-e[i]),X(i),Y(v+e[i]),c,{sw:1.4,op:.6})+'<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="3.6" fill="'+c+'"><title>'+MIX[i]+': '+(v>0?'+':'')+v.toFixed(1)+' points, 95% interval ±'+e[i].toFixed(1)+'</title></circle>';
      g+=tx(X(i),ph-6,MIX[i],{fs:11,a:'middle',c:'var(--mute)'})});
    out+='<div><div class="small" style="font-weight:600">'+name+' <span class="mute" style="font-weight:400">n = '+n+'</span></div>'+svgW(Math.floor(pw),ph,g,name)+'</div>'});
  return out+'</div><div class="leg"><span><i style="background:var(--c1)"></i>Skill clearly ahead</span><span><i style="background:var(--c2)"></i>Workflow Memory clearly ahead</span><span><i style="background:var(--mute)"></i>interval includes zero</span></div>'}
// ---- Table 13 tokens (predict 2)
PRED_REVEAL.pr2=()=>{const R=TB.T13.map(r=>({n:r[0]==='Raw trajectories'?'Raw row':r[0],s:+r[1],i:+r[2],o:+r[3],t:+r[4]}));
  fit($('tokPlot'),w=>{const pl=w<480?112:150,pr=w<480?84:120,rh=34,H=R.length*rh+30,X=v=>pl+(w-pl-pr)*v/600;let g='';
    [0,200,400,600].forEach(v=>{g+=ln2(X(v),4,X(v),H-22,'var(--line)')+tx(X(v),H-8,v+'K',{fs:11,a:'middle',c:'var(--mute)'})});
    R.forEach((r,i)=>{const y=8+i*rh,c=i===0?ARMC.raw:i===1?ARMC.wf:ARMC.skill;g+=tx(pl-8,y+15,r.n,{fs:12,a:'end'})+rc(pl,y+4,X(r.i)-pl,18,c,{r:3})+tx(X(r.i)+6,y+17,r.i+'K in, '+r.s+'% success',{fs:11,c:'var(--mute)'})});
    $('tokPlot').innerHTML=svgW(w,H,g,'Input tokens per task')})};
// ---- Table 11 taxonomy bars
const MODES=[['SC1','skill_guided_success','skill-guided success'],['SC1','workflow_guided_success','workflow-guided success'],['SC1','autonomous_clean_success','autonomous success'],['SC2','environment_infrastructure_failure','env infrastructure failure'],['SC2','output_format_schema_mismatch','output format/schema mismatch'],['SC2','background_service_lifecycle_failure','background service failure'],['SC2','shell_code_corruption','shell code corruption'],['SC2','algorithmic_logic_error','algorithmic logic error'],['SC2','static_verification_without_runtime','static verify w/o runtime'],['SC3','timeout_budget_exhaustion','timeout/budget exhaustion'],['SC3','skill_guidance_misapplied_or_ignored','skill guidance misapplied'],['SC3','capability_or_safety_limit','capability/safety limit']];
const F2ARM={raw:'Raw',wf:'Workflow Memory',skill:'Skill'};
const cnt=(arm,lab)=>MIX.reduce((a,m)=>a+(TB.F2[F2ARM[arm]][m][lab]||0),0);
function taxBars(w,sc){const ms=MODES.filter(x=>x[0]===sc),bw=w-16,lw=w<480?40:52;let h='';
  const mx=Math.max(...ms.flatMap(x=>['raw','wf','skill'].map(a=>cnt(a,x[2]))));
  ms.forEach(x=>{h+='<div style="margin:8px 0 2px;font-size:13px;font-weight:600"><code>'+x[1]+'</code></div>';
    ['raw','wf','skill'].forEach(a=>{const c=cnt(a,x[2]),row=TB.T11.find(r=>r.mode===x[1]);const pv={raw:row.raw,wf:row.wf,skill:row.skill}[a];
      h+='<div class="pbar"><span>'+ARMN[a].replace('Workflow Memory','Workflow')+'</span><span class="track"><span class="fill" style="width:'+(100*c/Math.max(mx,1)).toFixed(1)+'%;background:'+ARMC[a]+'"></span></span><span class="small">'+c+' ('+pv+'%)</span></div>'})});
  return h}
// ---- Table 16 no-hint lines
function nhChart(w,p,b){const n=nOf(p,b),nm=TB.T16[p][b].normal.map(Number),nh=TB.T16[p][b].nohint.map(Number),raw=+TB.T1[p].raw[b];
  return chart(w,{x:MIX,y:[.2,.9],yt:[.2,.4,.6,.8],yf:v=>Math.round(v*100)+'%',H:240,xt:'source trajectories (successes s, failures f)',
    s:[{n:'Raw '+pct(raw,1)+'%',c:ARMC.raw,flat:raw},{n:'with labels',c:ARMC.skill,v:nm,e:nm.map(v=>1.96*se(v,n))},{n:'no-hint',c:'var(--c4)',v:nh,e:nh.map(v=>1.96*se(v,n)),da:'5 3'}],jit:4,label:'Outcome labels'})}
// ---- Figure 4 transfer
function trChart(w){const F=TB.F4,ord=MIX,n=50;const pl=34,pr=10,pt=18,pb=40,H=230,gw=(w-pl-pr)/6,bw=Math.min(22,gw/3),Y=v=>pt+(H-pt-pb)*(1-v/100);let g='';
  [0,20,40,60,80,100].forEach(v=>{g+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-4,Y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
  g+=ln2(pl,Y(F.raw),w-pr,Y(F.raw),ARMC.raw,{sw:1.6,da:'5 4'})+tx(w-pr,12,'dashed line: Gemini Raw '+F.raw+'%',{fs:11,a:'end',c:'var(--mute)'});
  ord.forEach((m,i)=>{const cx=pl+gw*(i+.5);[['workflow',ARMC.wf,-1],['skill',ARMC.skill,1]].forEach(([k,c,sgn])=>{const v=F[k][m],x=cx+sgn*bw*.55-bw/2,e=196*Math.sqrt(v/100*(1-v/100)/n);
      g+=rc(x,Y(v),bw,Y(0)-Y(v),c,{r:2})+ln2(x+bw/2,Y(v-e),x+bw/2,Y(Math.min(100,v+e)),'var(--ink)',{op:.5})+(w>=480?tx(x+bw/2,Y(Math.min(100,v+e))-3,v,{fs:11,a:'middle',c:'var(--mute)'}):'')});
    g+=tx(cx,H-pb+16,m,{fs:11,a:'middle',c:'var(--mute)'})});
  g+=tx((pl+w-pr)/2,H-6,'mixture of the Codex source trajectories',{fs:11,a:'middle',c:'var(--mute)'});
  return svgW(w,H,g,'Transfer')+'<div class="leg"><span><i style="background:var(--c2)"></i>Workflow Memory (from Codex)</span><span><i style="background:var(--c1)"></i>Skill (from Codex)</span><span>bars: ±1.96 standard errors if n = 50 (derived)</span></div>'}
// ---- retrieval averages (predict 3)
function rtAvg(w){const A=k=>RCD['avg_'+k];
  return chart(w,{x:KS,log:true,y:[0,100],yt:[0,20,40,60,80,100],yf:v=>v+'%',H:250,xt:'skills in the pool, k (log scale)',
    s:[{n:'Arm 1 embed P',c:'var(--c3)',v:A('arm1_p')},{n:'Arm 2 select P',c:'var(--c4)',v:A('arm2_p')},{n:'Arm 3 use P',c:'var(--c2)',v:A('arm3_p')},{n:'Arm 3 success',c:'var(--ink)',v:A('arm3_succ'),da:'5 4'}],label:'Retrieval'})}
PRED_REVEAL.pr3=()=>fit($('rtPlot'),w=>{$('rtPlot').innerHTML=rtAvg(w)});
// ---- design effect slider
function deff(){const r=+$('rho').value,se0=RCD.se_boot,m=32/528,s=se0*Math.sqrt(1+5*r),lo=m-1.96*s,hi=m+1.96*s;$('rhoV').textContent=r.toFixed(2);
  fit($('deffPlot'),w=>{$('deffPlot').innerHTML=intervals(w,[{n:'paper (ρ = 0)',m:m*100,lo:(m-1.96*se0)*100,hi:(m+1.96*se0)*100,c:'var(--mute)'},{n:'ρ = '+r.toFixed(2),m:m*100,lo:lo*100,hi:hi*100,c:lo>0?ARMC.skill:'var(--bad)'}],[-8,18],{ticks:[-5,0,5,10,15],xt:'Skill − Workflow Memory, points'})});refit($('deffPlot'));
  $('deffTxt').innerHTML='Interval: ['+(lo*100>0?'+':'')+(lo*100).toFixed(2)+', +'+(hi*100).toFixed(2)+'] points; design effect 1 + 5ρ = '+(1+5*r).toFixed(2)+'. '+(lo>0?'Still above zero.':'<b>Now includes zero</b> (threshold ρ ≈ '+RCD.rho_zero.toFixed(3)+').')+' Derived: standard error from the paper\'s interval width, normal approximation.'}
// ---- wire up
(function(){
  const t1=RCD.t1_compare;const wins='<b>'+RCD.t1_cells_skill_wins+' of '+RCD.t1_cells_total+'</b> cells and Workflow Memory '+RCD.t1_cells_wf_wins+' (one tie)';
  $('wins').innerHTML=wins;$('wins2').innerHTML=wins;
  $('relab').textContent=RCD.raw_relabel_min;$('rawsg').textContent=RCD.raw_skillguided.join(', ');
  fit($('dPlot'),w=>{$('dPlot').innerHTML=diffPanels(w)});
  let sc='SC2';const tx2=()=>{$('txPlot').innerHTML=taxBars($('txPlot').clientWidth||600,sc)};segBind('txM',m=>{sc=m;tx2()});tx2();
  const seg=$('nhM');seg.innerHTML=SETUPS.map((s,i)=>'<button data-m="'+i+'"'+(i===3?' class="on"':'')+'>'+s[2].replace('Terminal-Bench-','TB-').replace('SkillsBench','SB')+'</button>').join('');
  let nh=3;fit($('nhPlot'),w=>{$('nhPlot').innerHTML=nhChart(w,SETUPS[nh][0],SETUPS[nh][1])});segBind('nhM',m=>{nh=+m;refit($('nhPlot'))});
  fit($('trPlot'),w=>{$('trPlot').innerHTML=trChart(w)});
  $('rho').addEventListener('input',deff);deff();
  onTab('t-read',()=>['dPlot','nhPlot','trPlot','deffPlot','ciPlot','tokPlot','rtPlot'].forEach(id=>refit($(id))));
})();
