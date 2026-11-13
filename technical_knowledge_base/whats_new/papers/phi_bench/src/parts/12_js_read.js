// ---- The paper tab: formats, funnel, reward curve, format bars, task-count heatmap, effort chart ----
const T=PAPER.tables, RC=PAPER.rc, MS=T.models;
const MC={'Claude Opus 5':'var(--c2)','Kimi K3':'var(--c6)','Qwen3.8 Max':'var(--c4)','GPT 5.6 Sol':'var(--ink)','GLM 5.2':'var(--c1)','Claude Sonnet 5':'var(--c5)','Qwen3.7 Max':'var(--c7)','DeepSeek V4Pro':'var(--c8)'};
const MN={'Claude Opus 5':'Claude Opus 5','Kimi K3':'Kimi K3','Qwen3.8 Max':'Qwen3.8 Max','GPT 5.6 Sol':'GPT-5.6 Sol','GLM 5.2':'GLM-5.2','Claude Sonnet 5':'Claude Sonnet 5','Qwen3.7 Max':'Qwen3.7 Max','DeepSeek V4Pro':'DeepSeek-V4-Pro'};
function reward(s,ref){if(ref<=1||s<=ref)return 0;return Math.min(1,Math.log(s/ref)/Math.log(ref))}
function rewardOld(s,ref){if(s<=1)return 0;return Math.min(1,.5*Math.log(s)/Math.log(ref))}
const SN={'Claude Opus 5':'Opus 5','Kimi K3':'Kimi K3','Qwen3.8 Max':'Qwen3.8','GPT 5.6 Sol':'GPT-5.6','GLM 5.2':'GLM-5.2','Claude Sonnet 5':'Sonnet 5','Qwen3.7 Max':'Qwen3.7','DeepSeek V4Pro':'DeepSeek'};
const seBound=(m,n)=>Math.sqrt(Math.max(0,m)*(1-m)/n);

// Three formats: the 3D stage in 31_js_sc_fmt.js (replaced the nested-scope widget on 2026-11-13)

// Funnel: sources to tasks, log scale
(function(){const host=$('funSvg');
  const R=[['Candidate sources (README)',10000,'more than'],['Kept by agent-assisted triage (README)',4000,'over'],['Papers + engineering artifacts',4112,''],['Fine-grained tags',410,''],['Middle-level topics',62,''],['Top-level categories',9,''],['E2EO candidates before final selection',15,''],['Tasks: 55 KFC + 20 LHI + 10 E2EO',85,'']];
  fit(host,w=>{const nar=w<560,lw=nar?0:240,bw=w-lw-(nar?8:110),rh=nar?40:24,lg=Math.log10;let s='';
    R.forEach(([n,v,q],i)=>{const y=6+i*rh,yb=nar?y+16:y,len=Math.max(3,bw*lg(v)/lg(12000));
      s+=(nar?tx(0,y+12,n,{fs:11.5}):tx(lw-6,y+15,n,{fs:11.5,a:'end'}))+rc(lw,yb+3,len,16,i===7?'var(--acc)':'var(--dim)',{r:3});
      const lab=(q?q+' ':'')+fmt(v),inside=len>w-lw-90;s+=tx(inside?lw+len-5:lw+len+5,yb+15,lab,{fs:11.5,c:inside?'var(--bg)':'var(--mute)',a:inside?'end':'start'})});
    host.innerHTML=svgW(w,R.length*rh+10,s,'From sources to tasks')});
})();

// Predict 1: the reward curve for a chosen task
(function(){const sel=$('rcTask');const P=T.tasks.filter(t=>t.cls==='p').sort((a,b)=>a.ref-b.ref);
  P.forEach(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=t.id+' ('+t.b.toUpperCase().replace('LH','LHI').replace('E2E','E2EO')+', anchor '+(t.ref<10?t.ref.toFixed(2):fmt(t.ref))+'×)';sel.appendChild(o)});
  sel.value='kv-traffic-sol';
  const cur=()=>P.find(t=>t.id===sel.value);
  const sOf=(ref)=>{const v=+$('rcS').value/1000;const lo=Math.log(1),hi=Math.log(ref*ref*1.6);return Math.exp(lo+(hi-lo)*v)};
  function draw(w){const t=cur(),ref=t.ref,s=sOf(ref),H=230,pl=44,pr=14,pt=12,pb=40,lg=Math.log;
    const xmax=ref*ref*1.6,lx=v=>pl+(w-pl-pr)*lg(v)/lg(xmax),ly=r=>pt+(H-pt-pb)*(1-r);
    let g='';[0,.25,.5,.75,1].forEach(r=>{g+=ln2(pl,ly(r),w-pr,ly(r),'var(--line)')+tx(pl-6,ly(r)+4,r.toFixed(2),{fs:11,a:'end',c:'var(--mute)'})});
    const ticks=[[1,'1×'],[ref,'anchor'],[ref*ref,'anchor²']];
    ticks.forEach(([v,l],i)=>{g+=ln2(lx(v),pt,lx(v),H-pb,'var(--dim)',{da:'3 3'})+tx(lx(v),H-pb+14,l,{fs:11,a:i===0?'start':'middle',c:'var(--mute)'})+tx(lx(v),H-pb+27,(v<100?v.toFixed(v<10?2:1):fmt(v))+'×',{fs:11,a:i===0?'start':'middle',c:'var(--mute)'})});
    let p1='',p2='';for(let i=0;i<=160;i++){const v=Math.exp(lg(xmax)*i/160);p1+=(i?'L':'M')+lx(v).toFixed(1)+','+ly(reward(v,ref)).toFixed(1);p2+=(i?'L':'M')+lx(v).toFixed(1)+','+ly(rewardOld(v,ref)).toFixed(1)}
    g+='<path d="'+p2+'" fill="none" stroke="var(--mute)" stroke-width="1.4" stroke-dasharray="5 4"/><path d="'+p1+'" fill="none" stroke="var(--acc)" stroke-width="2.4"/>';
    const r=reward(s,ref);g+='<circle cx="'+lx(s)+'" cy="'+ly(r)+'" r="5.5" fill="var(--c2)"/>';
    g+=tx(14,(pt+H-pb)/2,'reward',{fs:11,a:'middle',c:'var(--mute)'}).replace('<text ','<text transform="rotate(-90 14 '+((pt+H-pb)/2)+')" ');
    $('rcPlot').innerHTML=svgW(w,H,g,'Reward against speed-up');
    $('rcSv').textContent=(s<100?s.toFixed(2):fmt(s))+'×';
    $('rcOut').innerHTML=stat('Speed-up / anchor',(s/ref).toFixed(3)+'×')+stat('Reward (the paper)',r.toFixed(3))+stat('Old curve (tie = 0.5)',rewardOld(s,ref).toFixed(3))+stat('Needed for full marks',(ref*ref<100?(ref*ref).toFixed(2):fmt(ref*ref))+'×')}
  const host=$('rcPlot');
  const go=()=>refit(host);
  sel.addEventListener('change',()=>{const t=cur();const v=Math.log(t.ref)/Math.log(t.ref*t.ref*1.6);$('rcS').value=Math.round(v*1000);go()});
  $('rcS').addEventListener('input',go);
  PRED_REVEAL.pr1=()=>{const t=cur();$('rcS').value=Math.round(Math.log(t.ref)/Math.log(t.ref*t.ref*1.6)*1000);fit(host,draw)};
})();

// Predict 2: Table 3 by format, with the standard-error bound
(function(){PRED_REVEAL.pr2=()=>fit($('fmtPlot'),w=>{const F=['KFC','LHI','E2EO'],N=[55,20,10],H=MS.length*34+46,lw=Math.min(118,w*.3),pr=10,bw=(w-lw-pr);
  const cw=bw/3,sc=v=>v/80*(cw-12);let s='';
  F.forEach((f,j)=>{s+=tx(lw+j*cw+4,14,f+' ('+N[j]+')',{fs:12,w:600})});
  MS.forEach((m,i)=>{const y=24+i*34;s+=tx(lw-6,y+14,MN[m],{fs:11.5,a:'end'});
    F.forEach((f,j)=>{const v=T.T3[m][j],x=lw+j*cw+4,e=100*seBound(v/100,N[j]);
      s+=rc(x,y+4,sc(v),14,j===2?'var(--c2)':'var(--acc)',{r:2,op:.85})+ln2(x+sc(Math.max(0,v-e)),y+11,x+sc(Math.min(100,v+e)),y+11,'var(--ink)',{sw:1})+tx(x+sc(v)+3,y+27,v.toFixed(1),{fs:11,c:'var(--mute)'})})});
  $('fmtPlot').innerHTML=svgW(w,H,s,'Table 3 by format')})})();

// The tables tab: task counts by category and format (Figure 4; the predict question that revealed it became the categories stage on 2026-11-13)
function drawHeat(host){fit(host,w=>{const C=T.cats,F=['KFC','LHI','E2EO'],n=RC.cat_n,cw=(w-70)/9,W=w,H=190;let s='';
  const best=C.map((c,i)=>{let bm=MS[0];MS.forEach(m=>{if(T.T2[m][i]>T.T2[bm][i])bm=m});return [bm,T.T2[bm][i]]});
  const short=cw>60?['Training','Inference','Compress','Kernel','I/O','HW, Edge','Data','Sys opt','Assurance']:['Trn','Inf','Cmp','Krn','I/O','HW','Data','Opt','Asr'];
  C.forEach((c,i)=>{const x=70+i*cw+cw/2;s+=tx(x,14,short[i],{fs:11,a:'middle',w:i===5?700:400,c:i===5?'var(--c2)':'var(--ink)'})});
  F.forEach((f,r)=>{const y=22+r*30;s+=tx(64,y+19,f,{fs:11.5,a:'end'});
    T.F4[f].forEach((v,i)=>{const x=70+i*cw;s+=rc(x+1,y,cw-2,28,v?'var(--acc)':'var(--soft)',{r:3,op:v?Math.min(1,.18+v/22):1})+tx(x+cw/2,y+18,v||'',{fs:11.5,a:'middle',w:600})})});
  let y=22+3*30+8;s+=tx(64,y+14,'total',{fs:11.5,a:'end',w:600});n.forEach((v,i)=>{s+=tx(70+i*cw+cw/2,y+14,v,{fs:12,a:'middle',w:700,c:i===5?'var(--c2)':'var(--ink)'})});
  y+=24;s+=tx(64,y+14,'best %',{fs:11.5,a:'end'});best.forEach(([m,v],i)=>{s+=tx(70+i*cw+cw/2,y+14,v.toFixed(1),{fs:11.5,a:'middle'})});
  y+=18;s+=tx(64,y+14,'± bound',{fs:11.5,a:'end',c:'var(--mute)'});best.forEach(([m,v],i)=>{s+=tx(70+i*cw+cw/2,y+14,(100*seBound(v/100,n[i])).toFixed(1),{fs:11,a:'middle',c:'var(--mute)'})});
  host.innerHTML=svgW(W,H+12,s,'Tasks by category and format')+(cw>60?'':'<p class="small mute" style="margin:2px 0">Trn Training, Inf Inference and Serving, Cmp Compression, Krn Kernel, HW Hardware and Edge, Opt System Optimization, Asr System Assurance.</p>')})}
onTab('t-tables',()=>drawHeat($('hmPlot')));

// Figure 5 rebuilt
(function(){const host=$('effPlot');const L=['Claude Opus 5','Kimi K3','GPT 5.6 Sol'];
  fit(host,w=>{const H=230,pl=40,pr=Math.min(118,w*.3),pt=12,pb=30,tiers=T.F5.tiers,lx=i=>pl+(w-pl-pr)*i/4,ly=v=>pt+(H-pt-pb)*(1-(v-14)/(38-14));
    let s='';[15,20,25,30,35].forEach(v=>{s+=ln2(pl,ly(v),w-pr,ly(v),'var(--line)')+tx(pl-6,ly(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
    tiers.forEach((t,i)=>{s+=tx(lx(i),H-pb+16,t,{fs:11,a:'middle',c:'var(--mute)'})});
    const ends=[];L.forEach(m=>{const v=T.F5[m];let d='';v.forEach((x,i)=>{if(x==null)return;d+=(d?'L':'M')+lx(i).toFixed(1)+','+ly(x).toFixed(1)});
      s+='<path d="'+d+'" fill="none" stroke="'+MC[m]+'" stroke-width="2"'+(m==='Kimi K3'?' stroke-dasharray="5 4"':'')+'/>';
      v.forEach((x,i)=>{if(x!=null)s+='<circle cx="'+lx(i)+'" cy="'+ly(x)+'" r="3.5" fill="'+MC[m]+'"><title>'+MN[m]+' '+tiers[i]+': '+x+'</title></circle>'});
      ends.push({y:ly(v[4]),n:SN[m]+' '+v[4],c:MC[m],how:'printed label'})});
    const mx=RC.effort_mix;L.forEach(m=>{s+='<circle cx="'+lx(4)+'" cy="'+ly(mx[m])+'" r="7" fill="none" stroke="var(--mute)" stroke-dasharray="2 2"><title>(20 LHI + 10 E2EO)/30 from Table 3: '+mx[m].toFixed(2)+'</title></circle>'});
    s+=endLabels(ends,w-pr+10,14);
    host.innerHTML=svgW(w,H,s,'Score against reasoning effort')});
})();
