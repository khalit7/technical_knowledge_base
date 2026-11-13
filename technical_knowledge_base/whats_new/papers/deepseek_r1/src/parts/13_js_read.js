// ---- The paper tab: decoded figures, the stage-by-stage animation (Table 3), predict reveals ----
(function(){
const RC=PAPER.rc,TB=PAPER.tables,TD=window.TOYDATA;
const C1='var(--c1)',C2='var(--c2)',C3='var(--c3)',C4='var(--c4)',C5='var(--c5)',C6='var(--c6)';
const pct=v=>Math.round(v*100)+'%';
// a line chart at the measured width. o: {h, x, y, xl, yl, fx, fy, series:[{pts, c, sw, da, dots, op}], hl:[{y,c,t,da}], vl:[{x,c,t}], legend:[[n,c,k]], marks:[{x,y,t,c}]}
function chart(el,o){if(!el)return;fit(el,w=>{const H=o.h||(w<420?200:230),lg=o.legend?legendW(o.legend,8,14,w-16):{s:'',h:0};
  const F=linFrame({W:w,H:H+lg.h,pl:o.pl||(w<420?40:46),pr:o.pr||12,pt:8+lg.h,pb:30,x:o.x,y:o.y,xl:o.xl,yl:o.yl,fx:o.fx,fy:o.fy,yt:o.yt,xt:o.xt});
  let s=F.s;(o.hl||[]).forEach(h=>{s+=ln2(F.X(o.x[0]),F.Y(h.y),F.X(o.x[1]),F.Y(h.y),h.c,{sw:1.3,da:h.da||'5 3'});if(h.t)s+=tx(F.X(o.x[1])-4,F.Y(h.y)-4,h.t,{fs:11,a:'end',c:h.c})});
  (o.vl||[]).forEach(v=>{s+=ln2(F.X(v.x),8+lg.h,F.X(v.x),H+lg.h-30,v.c||'var(--mute)',{sw:1,da:'3 3'});if(v.t)s+=tx(F.X(v.x)+(v.left?-4:4),8+lg.h+12+(v.dy||0),v.t,{fs:11,a:v.left?'end':'start',c:v.c||'var(--mute)'})});
  (o.series||[]).forEach(S=>{if(S.band){const up=S.band.map(p=>[p[0],p[2]]),dn=S.band.map(p=>[p[0],p[1]]).reverse();s+='<path d="'+pathOf(up.concat(dn),F.X,F.Y)+'Z" fill="'+S.c+'" opacity="0.18"/>'}
    if(!S.noline)s+=lineS(S.pts,F.X,F.Y,S.c,{sw:S.sw||1.8,da:S.da,op:S.op});if(S.dots)S.pts.forEach(p=>{s+=dotS(F.X(p[0]),F.Y(p[1]),S.r||2.2,S.c,{t:S.tt?S.tt(p):null})})});
  (o.marks||[]).forEach(m=>{s+=dotS(F.X(m.x),F.Y(m.y),4.5,m.c,{hollow:true,sw:2});if(m.t)s+=tx(F.X(m.x)+(m.left?-8:8),F.Y(m.y)+(m.dy||4),m.t,{fs:11,a:m.left?'end':'start',c:m.c})});
  el.innerHTML=svgW(w,H+lg.h,lg.s+s,o.label||'chart')})}
const kfmt=v=>v>=1000?(v/1000)+'k':String(v);
// ---------- Figure 1 ----------
let f1m='v2';
function drawF1(){const P=RC.fig1_pass.map(p=>[p[0],p[1]/480*100]),Cn=RC.fig1_cons.map(p=>[p[0],p[1]*100]);
  const marks=f1m==='v1'?[{x:8400,y:71.04,c:C4,t:'v1: 71.0%',left:true,dy:-8}]:[{x:RC.fig1_summary.max_step,y:RC.fig1_summary.max,c:C1,t:'peak 77.7%',left:true,dy:20}];
  chart($('f1aSvg'),{x:[0,10400],y:[10,92],xl:'RL step',yl:'AIME 2024 accuracy (%)',fx:kfmt,yt:[20,40,60,80],series:[{pts:P,c:C1,dots:true,tt:p=>'step '+p[0]+': '+p[1].toFixed(1)+'%'},{pts:Cn,c:C2,dots:true,r:1.8,sw:1.4,tt:p=>'step '+p[0]+': '+p[1].toFixed(1)+'%'}],
    hl:[{y:RC.fig1_human*100,c:C3,t:'human average 37.8%'}],vl:[{x:8200,t:'cap 32K → 64K',left:true,dy:118}],marks,legend:[['pass@1',C1,'d'],['cons@16 (majority of 16)',C2,'d']],label:'R1-Zero AIME accuracy during RL'});
  chart($('f1bSvg'),{x:[0,10400],y:[0,20000],xl:'RL step',yl:'average response length (tokens)',fx:kfmt,fy:kfmt,series:[{pts:RC.fig1_len,c:'var(--mute)',sw:0.8,op:0.8},{pts:RC.fig1_len_smooth,c:C1,sw:2.2}],vl:[{x:8200,t:'cap doubled',left:true}],legend:[['every 20th step','var(--mute)','l'],['smoothed (the paper\'s)',C1,'l']],label:'R1-Zero response length during RL'});
  const S=RC.fig1_summary,L=RC.len_summary;
  $('f1Note').innerHTML=f1m==='v1'?'The January 2025 report gave 71.0% as R1-Zero\'s pass@1. On the Nature version\'s curve that is exactly the point at step 8,400 (341 of 480 samples correct), just after the length cap was raised. The paper does not say which checkpoint either version reported; Table 3 gives 77.9%.':
    'Decoded from the vector drawing of FIG1LINK: pass@1 starts at '+S.start.toFixed(1)+'% ('+S.start_k+' of 480 samples), peaks at '+S.max.toFixed(1)+'% at step '+S.max_step.toLocaleString('en-GB')+', ends the plotted range at '+S.last.toFixed(1)+'%; cons@16 ends at '+S.cons_last.toFixed(1)+'%. Length: '+L.first100+' tokens over the first 100 steps, '+L.last100.toLocaleString('en-GB')+' over the last 100. Light line: every 20th step of the raw curve; dark line: the paper\'s own smoothed curve.';
  $('f1Note').innerHTML=$('f1Note').innerHTML.replace('FIG1LINK','<a href="'+PAPER.meta.ax+'#S2.F1" target="_blank" rel="noopener noreferrer">Figure 1</a>')}
segBind('f1M',m=>{f1m=m;$('f1M').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));drawF1()});
drawF1();
// ---------- Figures 8 and 9 ----------
const LV=[C6,C3,C5,C2,C4];
chart($('f8Svg'),{x:[0,10400],y:[0.5,1],xl:'RL step',yl:'MATH-500 accuracy',fx:kfmt,fy:v=>v.toFixed(1),series:RC.fig8.map((s,i)=>({pts:s,c:LV[i],sw:1.6})),legend:RC.fig8.map((s,i)=>['level '+(i+1),LV[i],'l']),label:'R1-Zero accuracy by MATH difficulty level'});
chart($('f9aSvg'),{x:[0,10400],y:[0,12000],xl:'RL step',yl:'reflective words (count)',fx:kfmt,fy:kfmt,series:[{pts:RC.fig9_reflect,c:C2,dots:true,r:1.8}],label:'Reflective word counts during training',h:190});
chart($('f9bSvg'),{x:[0,10400],y:[0,1600],xl:'RL step',yl:'"wait" (count)',fx:kfmt,series:[{pts:RC.fig9_wait,c:C1,dots:true,r:1.8}],vl:[{x:8000,t:'step 8,000',left:true}],label:'Count of the word wait during training',h:190});
// ---------- Figure 7, Figure 6, Figure 18 ----------
const F7=RC.fig7;
[['f7aSvg','lc','language consistency',[0.85,1]],['f7bSvg','lcb','LiveCodeBench pass@1',[0.35,0.55]],['f7cSvg','aime','AIME accuracy',[0.4,0.66]]].forEach(([id,k,yl,yr])=>chart($(id),{x:[0,5000],y:yr,xl:'RL step',yl,fx:kfmt,fy:v=>v.toFixed(2),series:[{pts:F7[k].on,c:C1,sw:1.4},{pts:F7[k].off,c:C3,sw:1.4}],legend:id==='f7aSvg'?[['with the reward',C1,'l'],['without',C3,'l']]:null,label:yl+' with and without the language reward',h:170}));
(function(){const el=$('f6Svg');fit(el,w=>{const H=w<420?210:240,pl=w<420?40:46,pr=w<420?46:52;const R=RC.fig6.reward,Rr=RC.fig6.reward_raw,CF=RC.fig6.cf;
  const F=linFrame({W:w,H,pl,pr,pt:24,pb:30,x:[0,720],y:[2.5,5],xl:'RL step',yl:'reward model score'});let s=F.s;
  const Y2=v=>24+(H-24-30)*(1-(v-0.25)/(0.37-0.25));[0.26,0.29,0.32,0.35].forEach(v=>{s+=tx(w-pr+5,Y2(v)+4,v.toFixed(2),{fs:11,c:C2})});
  s+=lineS(Rr,F.X,F.Y,C1,{sw:0.8,op:0.4})+lineS(R,F.X,F.Y,C1,{sw:2});s+='<path d="'+CF.map((p,i)=>(i?'L':'M')+F.X(p[0]).toFixed(1)+' '+Y2(p[1]).toFixed(1)).join('')+'" fill="none" stroke="'+C2+'" stroke-width="2"/>';
  CF.forEach(p=>{s+=dotS(F.X(p[0]),Y2(p[1]),2.4,C2,{t:'step '+p[0]+': '+p[1]})});
  const lg=legendW([['reward model score (left)',C1,'l'],['Codeforces score (right)',C2,'l']],pl,14,w-pl-pr);el.innerHTML=svgW(w,H,s+lg.s,'Reward hacking: reward up, Codeforces down')})})();
chart($('f18Svg'),{x:[1,0],y:[4000,22000],xl:'problem pass@1 (harder to the right)',yl:'thinking tokens (smoothed)',fx:v=>v.toFixed(1),fy:kfmt,xt:[1,0.8,0.6,0.4,0.2,0],series:[{pts:RC.fig18_band.map(p=>[p[0],(p[1]+p[2])/2]),band:RC.fig18_band,c:'var(--mute)',noline:true},{pts:RC.fig18,c:C1,sw:2.2}],hl:[{y:7000,c:C2,t:'7,000'},{y:18000,c:C2,t:'18,000'}],legend:[['mean (smoothed)',C1,'l'],['± one standard deviation (shaded)','var(--mute)','l']],label:'Thinking tokens against problem difficulty'});
// (the GRPO group is the 3D stage in 31_js_sc_grp.js)
// ---------- the stage-by-stage animation (Table 3) ----------
const T3=TB.t3.rows,T12=TB.t12.rows;
const pick=(b,m)=>T3.find(r=>r.bench===b&&(!m||r.metric.startsWith(m)));
const v3=(b,m)=>{const r=T12.find(r=>r.bench===b&&(!m||r.metric.startsWith(m)));return r?r.n[1]:null};
const SETS={reason:[['AIME 2024','Pass','AIME 2024'],['CNMO 2024','Pass','CNMO 2024'],['MATH-500','Pass','MATH-500'],['LiveCodeBench','Pass','LiveCodeBench'],['Codeforces','Percentile','Codeforces percentile'],['GPQA Diamond','Pass','GPQA Diamond'],['Aider-Polyglot','Acc','Aider-Polyglot']],
  general:[['IF-Eval','Prompt','IF-Eval'],['AlpacaEval2.0','LC','AlpacaEval 2.0'],['ArenaHard','GPT','ArenaHard'],['MMLU-Pro','EM','MMLU-Pro'],['SimpleQA','Correct','SimpleQA'],['SWE Verified','Resolved','SWE-bench Verified'],['C-Eval','EM','C-Eval']]};
const SN=['R1-Zero','Dev1','Dev2','Dev3','R1'];
// the step texts are the ol.sx list in 03_paper.html (sx-t3); what each stage did is the 3D pipeline's list (sx-pipe)
const STC=SN.map(n=>({t:n}));
makeAnim({id:'t3',mode:'reason',modes:{reason:STC,general:STC},lists:{reason:'sx-t3',general:'sx-t3'},dur:4200,
 draw(m,k,e,w){const set=SETS[m],rh=w<480?30:32,lw=Math.min(160,Math.max(122,w*0.3)),vw=74,bw=Math.max(80,w-lw-vw-8),X=v=>lw+bw*v/100;let s='',y=22;
   s+=tx(lw,14,'0',{fs:11,c:'var(--mute)'})+tx(lw+bw,14,'100',{fs:11,a:'end',c:'var(--mute)'})+tx(lw+bw/2,14,'score',{fs:11,a:'middle',c:'var(--mute)'});
   set.forEach(([b,mm,lab])=>{const r=pick(b,mm),now=r.n[k],prev=k?r.n[k-1]:r.n[0],v=prev+(now-prev)*e,base=v3(b,mm);
     s+=tx(lw-6,y+rh*0.58,lab,{fs:11.5,a:'end'});s+=rc(lw,y+6,bw,rh-14,'var(--soft)',{r:3});
     s+=rc(lw,y+6,X(v)-lw,rh-14,k===0?'var(--c4)':'var(--acc)',{r:3,op:.85});
     if(k>0)s+=ln2(X(prev),y+3,X(prev),y+rh-5,'var(--mute)',{sw:1.2,da:'2 2'});
     if(base!=null)s+=ln2(X(base),y+2,X(base),y+rh-4,'var(--ink)',{sw:2,op:.45})+'<title>DeepSeek-V3: '+base+'</title>';
     const d=now-prev;s+=tx(lw+bw+6,y+rh*0.58,now.toFixed(1)+(k&&e>0.6?' ('+(d>=0?'+':'')+d.toFixed(1)+')':''),{fs:11,c:k&&e>0.6?(d>=0?'var(--good)':'var(--bad)'):'var(--ink)'});y+=rh});
   if(w<480){s+=tx(8,y+12,'grey tick: DeepSeek-V3',{fs:11,c:'var(--mute)'})+tx(8,y+27,'dashed: the previous stage',{fs:11,c:'var(--mute)'});y+=15}else s+=tx(lw,y+12,'grey tick: DeepSeek-V3 · dashed: previous stage',{fs:11,c:'var(--mute)'});
   return svgW(w,y+18,s,'Benchmark scores at each R1 stage')},
 counters(m,k){return ''}});
// ---------- distillation chart ----------
const T15=TB.v1t5.rows,DC=TB.t15.cols;let dsel=0;
function drawD(){const el=$('dSvg');fit(el,w=>{const refs=['GPT-4o-0513','Claude-3.5-Sonnet-1022','OpenAI-o1-mini','QwQ-32B-Preview'],ref={},rows=[];
  T15.forEach(r=>{if(refs.includes(r.model))ref[r.model]=r.n[dsel];else rows.push(r)});
  const isCF=dsel===5,vmax=isCF?2000:100,lw=Math.min(160,Math.max(110,w*0.34)),bw=w-lw-50,rh=24,X=v=>lw+bw*v/vmax,RC4=[C2,C3,C4,C5];
  const lg=legendW(refs.map((n,i)=>[n.replace('-Sonnet-1022','').replace('-0513','')+' '+(ref[n]==null?'':isCF?ref[n]:ref[n].toFixed(1)),RC4[i],'da']),6,12,w-12);
  const y0=lg.h+12,y1=y0+rows.length*rh;let s=lg.s,y=y0;
  refs.forEach((n,i)=>{const v=ref[n];if(v!=null)s+=ln2(X(v),y0-4,X(v),y1,RC4[i],{sw:1.6,da:'4 3'})});
  rows.forEach(r=>{const v=r.n[dsel];s+=tx(lw-6,y+rh*0.65,r.model.replace('DeepSeek-R1-Distill-',''),{fs:11.5,a:'end'})+rc(lw,y+4,X(v)-lw,rh-8,'var(--acc)',{r:3,op:.8})+tx(X(v)+4,y+rh*0.65,isCF?String(v):v.toFixed(1),{fs:11});y+=rh});
  el.innerHTML=svgW(w,y+6,s,'Distilled models against reference models')})}
(function(){const sg=$('dM');DC.forEach((c,i)=>{const b=document.createElement('button');b.textContent=c.replace(' pass@1','').replace('Codeforces rating','Codeforces');b.dataset.m=i;if(!i)b.className='on';b.setAttribute('aria-pressed',i?'false':'true');sg.appendChild(b)});
  segBind('dM',m=>{dsel=+m;sg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));drawD()});drawD()})();
// ---------- results chart (Table 8) ----------
let rgrp='Math';
function drawR(){const el=$('rSvg');fit(el,w=>{const rows=TB.t8.rows.filter(r=>r.group===rgrp&&!(r.bench==='Codeforces'&&r.metric==='Rating')),cols=TB.t8.cols,CC=[C5,C3,'var(--mute)',C6,C4,C1];
  const lw=Math.min(150,Math.max(100,w*0.3)),bw=w-lw-44,bh=w<480?7:8,gap=10,X=v=>lw+bw*v/100;const lg=legendW(cols.map((c,i)=>[c.replace('-Sonnet-1022','').replace('-0513','').replace('OpenAI-','').replace('DeepSeek-',''),CC[i],'l']),6,12,w-12);let s=lg.s,y=lg.h+10;
  rows.forEach(r=>{const hh=cols.length*bh;s+=tx(lw-6,y+hh/2+4,r.bench,{fs:11.5,a:'end'});r.n.forEach((v,i)=>{if(v==null){s+=tx(lw+2,y+i*bh+bh-0.5,'·',{fs:11,c:'var(--mute)'});return}s+=rc(lw,y+i*bh+1,X(v)-lw,bh-2,CC[i],{r:1,op:i===5?1:.75});if(i===5)s+=tx(X(v)+3,y+i*bh+bh+1,v.toFixed(1),{fs:11,c:CC[i]})});y+=hh+gap});
  el.innerHTML=svgW(w,y+4,s,'Table 8 benchmarks')})}
segBind('rM',m=>{rgrp=m;$('rM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));drawR()});drawR();
// ---------- predict reveals ----------
PRED_REVEAL['pr-len']=()=>{const Z=TD.sweep.zero,D=TD.sweep.drgrpo;chart($('prLenSvg'),{x:[0,400],y:[0,5],xl:'toy RL step',yl:'thinking tokens per answer',
  series:[{pts:Z.s.map((s,i)=>[s,Z.think[i]]),band:Z.s.map((s,i)=>[s,Z.thinkLo[i],Z.thinkHi[i]]),c:C1,sw:2.2},{pts:D.s.map((s,i)=>[s,D.think[i]]),c:C2,da:'5 3'}],hl:[{y:4.5,c:C3,t:'what the questions need: 4.5'}],vl:[{x:316,t:'cap 7 → 10 tokens',left:true}],
  legend:[['GRPO (3 seeds, range shaded)',C1,'l'],['Dr. GRPO',C2,'da']],label:'Toy thinking length during RL'})};
PRED_REVEAL['pr-cold']=()=>{const el=$('prColdSvg');const a=pick('AIME 2024','Pass').n;el.innerHTML='';const box=document.createElement('div');el.appendChild(box);
  fit(box,w=>{box.innerHTML=hbars(w,SN.map((n,i)=>({n:n+(i===1?' (cold start)':''),v:a[i],hl:i===1,c:i===1?'var(--c2)':'var(--acc)'})),{vmax:100,fmt:v=>v.toFixed(1)+'%',label:'AIME 2024 by stage',id:'cold'})});
  const box2=document.createElement('div');el.appendChild(box2);const Z=TD.sweep.zero_long_lc,Cd=TD.sweep.cold_lc;
  chart(box2,{x:[0,400],y:[0.3,1],xl:'toy RL step',yl:'toy accuracy',fy:v=>pct(v),series:[{pts:Z.s.map((s,i)=>[s,Z.acc[i]]),band:Z.s.map((s,i)=>[s,Z.accLo[i],Z.accHi[i]]),c:C1},{pts:Cd.s.map((s,i)=>[s,Cd.acc[i]]),band:Cd.s.map((s,i)=>[s,Cd.accLo[i],Cd.accHi[i]]),c:C2}],
    hl:[{y:1/3,c:'var(--mute)',t:'guessing'}],legend:[['RL from the base',C1,'l'],['cold start, then RL',C2,'l']],label:'Toy with and without a cold start',h:180})};
PRED_REVEAL['pr-dist']=()=>{const el=$('prDistSvg');fit(el,w=>{const R=TB.t16.rows,cols=TB.t16.cols,CC=['var(--mute)',C2,C1];const lw=Math.min(130,Math.max(90,w*0.28)),bw=w-lw-44,bh=9,X=v=>lw+bw*v/100;
  const lg=legendW(R.map((r,i)=>[r.model.replace('DeepSeek-R1-',''),CC[i],'l']),6,12,w-12);let s=lg.s,y=lg.h+10;
  cols.forEach((c,j)=>{s+=tx(lw-6,y+bh*1.5+4,c.replace(' pass@1',''),{fs:11,a:'end'});R.forEach((r,i)=>{const v=r.n[j];s+=rc(lw,y+i*bh+1,X(v)-lw,bh-2,CC[i],{r:1});if(i)s+=tx(X(v)+3,y+i*bh+bh,v.toFixed(1),{fs:11,c:CC[i]})});y+=3*bh+10});
  el.innerHTML=svgW(w,y,s,'Distillation against RL at 32B')})};
// nav: mark the section in view
(function(){const links=[...document.querySelectorAll('#nav a')];if(!('IntersectionObserver' in window))return;const seen=new Map();
  const io=new IntersectionObserver(es=>{es.forEach(x=>seen.set(x.target.id,x.isIntersecting));const cur=links.find(a=>seen.get(a.getAttribute('href').slice(1)));links.forEach(a=>a.classList.toggle('cur',a===cur))},{rootMargin:'-20% 0px -70% 0px'});
  links.forEach(a=>{const t=document.getElementById(a.getAttribute('href').slice(1));if(t)io.observe(t)})})();
})();
