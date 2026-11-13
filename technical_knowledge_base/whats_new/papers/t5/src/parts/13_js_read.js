// ---- The paper tab: text-to-text examples, STS-B rounding, position buckets, LR schedule, predictions, mixing, Table 15 ----
const tokChip=x=>x.sent?'<span class="tk s">'+escH(x.s)+'</span>':x.rnd?'<span class="tk r" title="random replacement token">'+escH(x.t)+'</span>':'<span class="tk">'+escH(x.t)+'</span>';
// Text to text
(function(){const bar=$('t2tChips');if(!bar)return;
  T2T.forEach((e,i)=>{const b=document.createElement('button');b.textContent=e.n;b.dataset.i=i;bar.appendChild(b)});
  const show=i=>{const e=T2T[i];[...bar.children].forEach((b,j)=>b.classList.toggle('on',j===i));$('t2tIn').textContent=e.i;$('t2tOut').textContent=e.o;$('t2tNote').textContent=e.note};
  bar.addEventListener('click',ev=>{const b=ev.target.closest('button');if(b)show(+b.dataset.i)});show(0)})();
// STS-B: round to the nearest 0.2, written as a string; 21 classes from 1.0 to 5.0
(function(){const i=$('stsIn');if(!i)return;const go=()=>{const v=parseFloat(i.value);
  if(!isFinite(v)){$('stsOut').textContent='(type a number)';return}
  const r=Math.round(v/0.2)*0.2,s=r.toFixed(1),k=Math.round((r-1)/0.2)+1;
  $('stsOut').innerHTML=(v<1||v>5)?'outside 1 to 5: no class (the model\'s output would count as wrong)':'becomes the target text "'+s+'", class '+k+' of 21'};
  i.addEventListener('input',go);go()})();
// Relative position buckets
(function(){const el=$('bkSvg');if(!el)return;const K=$('bkK');
  const range=(b,bi)=>{let lo=null,hi=null;for(let k=-600;k<=600;k++){if(!bi&&k>0)break;if(T5.bucket(k,bi)===b){if(lo===null)lo=k;hi=k}}return [lo,hi]};
  function draw(W){const k=+K.value;$('bkKv').textContent=k;const pl=34,pr=8,pt=34,pb=30,H=224,lo=-160,hi=160;
    const X=v=>pl+(W-pl-pr)*(v-lo)/(hi-lo),Y=b=>pt+(H-pt-pb)*(1-b/31);let s='';
    [0,8,16,24,31].forEach(b=>{s+=ln2(pl,Y(b),W-pr,Y(b),'var(--line)')+tx(pl-5,Y(b)+4,b,{fs:11,a:'end',c:'var(--mute)'})});
    [-128,-64,0,64,128].forEach(v=>{s+=ln2(X(v),H-pb,X(v),H-pb+4,'var(--mute)')+tx(X(v),H-pb+16,v,{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx((pl+W-pr)/2,H-2,'key position minus query position',{fs:11,a:'middle',c:'var(--mute)'});
    let pe='',pd='';for(let v=lo;v<=hi;v++){const be=T5.bucket(v,true);pe+=(v===lo?'M':'L')+X(v).toFixed(1)+','+Y(be).toFixed(1)+' ';if(v<=0){const bd=T5.bucket(v,false);pd+=(v===lo?'M':'L')+X(v).toFixed(1)+','+Y(bd).toFixed(1)+' '}}
    s+='<path d="'+pe+'" fill="none" stroke="var(--c1)" stroke-width="2"/><path d="'+pd+'" fill="none" stroke="var(--c2)" stroke-width="2" stroke-dasharray="5 3"/>';
    s+=ln2(X(k),pt,X(k),H-pb,'var(--ink)',{da:'2 2'});
    const lg=legend([['encoder (bidirectional)','var(--c1)'],['decoder (looks back only)','var(--c2)','5 3']],pl,14,W-pl-pr);s+=lg.s;
    el.innerHTML=svgW(W,H,s,'Relative position bucket against offset');
    const be=T5.bucket(k,true),re=range(be,true);let o='Offset '+k+': encoder scalar #'+be+' (shared by offsets '+re[0]+' to '+re[1]+')';
    if(k<=0){const bd=T5.bucket(k,false),rd=range(bd,false);o+='; decoder scalar #'+bd+' (offsets '+rd[0]+' to '+rd[1]+')'}else o+='; the decoder never looks ahead';
    $('bkO').innerHTML=o+'.'}
  K.addEventListener('input',()=>refit(el));fit(el,draw)})();
// Learning-rate schedule
(function(){const el=$('lrSvg');if(!el)return;fit(el,W=>{const H=210;
  const f=logFrame({W,H,pl:52,pr:10,pt:12,pb:34,x:[1,2**20*1.4],y:[6e-4,0.02],xt:[[1,'1'],[100,'10²'],[1e4,'10⁴'],[2**19,'2¹⁹'],[2**20,'']],yt:[[0.01,'0.01'],[0.005,'0.005'],[0.002,'0.002'],[0.001,'0.001']],xl:'training step (log scale)',yl:'learning rate'});
  let s=f.s,p='',q='';for(let i=0;i<=200;i++){const n=Math.exp(Math.log(2**20)*i/200);const lr=1/Math.sqrt(Math.max(n,1e4));const pt=f.lx(n).toFixed(1)+','+f.ly(lr).toFixed(1);
    if(n<=2**19)p+=(p?'L':'M')+pt;else q+=(q?'L':'M')+pt}
  s+='<path d="'+p+'" fill="none" stroke="var(--c1)" stroke-width="2.2"/><path d="'+q+'" fill="none" stroke="var(--c1)" stroke-width="2" stroke-dasharray="5 3"/>';
  [[1e4,0.01,'0.01 until step 10⁴'],[2**19,1/Math.sqrt(2**19),'0.00138 at 2¹⁹']].forEach(([n,v,t],i)=>{s+='<circle cx="'+f.lx(n)+'" cy="'+f.ly(v)+'" r="3.5" fill="var(--c2)"/>'+tx(f.lx(n)+(i?-8:6),f.ly(v)+(i?16:-8),t,{fs:11,a:i?'end':'start'})});
  s+=tx(W-12,22,'solid: baseline, 2¹⁹ steps; dashed: final models',{fs:11,a:'end',c:'var(--mute)'});
  el.innerHTML=svgW(W,H,s,'Inverse square root learning rate')})})();
// Predict, then reveal
PRED_REVEAL['pr-arch']=()=>predBars('prArch','T2',0,{pick:r=>r.labels[0]==='Denoising',hl:x=>/shared/.test(x.n),title:'GLUE, Table 2, denoising objective'});
PRED_REVEAL['pr-data']=()=>{const el=$('prData');el.innerHTML='<div id="prData0"></div><div id="prData3"></div>';predBars('prData0','T8',0,{hl:x=>/unfiltered/.test(x.n),title:'GLUE, Table 8'});predBars('prData3','T8',3,{hl:x=>/unfiltered/.test(x.n),title:'SuperGLUE, Table 8'})};
PRED_REVEAL['pr-scale']=()=>predBars('prScale','T13',3,{hl:x=>/4×size/.test(x.n),title:'SuperGLUE, Table 13'});
// Multi-task mixing (§3.5.2)
(function(){const el=$('mixSvg');if(!el)return;const S=RC.task_sizes,names=Object.keys(S),TOT=786432*128;
  function rates(rule,K,T){if(rule==='eq'){const o={};names.forEach(k=>o[k]=1/names.length);return o}
    if(rule==='temp')K=2**21;let r={};names.forEach(k=>r[k]=Math.min(S[k],K));let s=0;names.forEach(k=>s+=r[k]);names.forEach(k=>r[k]=Math.pow(r[k]/s,1/(rule==='temp'?T:1)));s=0;names.forEach(k=>s+=r[k]);names.forEach(k=>r[k]/=s);return r}
  function go(){const rule=$('mixR').value,K=2**(+$('mixK').value),T=+$('mixT').value;$('mixKv').textContent=$('mixK').value;$('mixKl').style.display=rule==='prop'?'':'none';$('mixTl').style.display=rule==='temp'?'':'none';
    const r=rates(rule,K,T),mx=Math.max(...names.map(k=>r[k]));
    let h='<div class="tw"><table class="mixt"><thead><tr><th>Task</th><th>Training examples</th><th>Share of examples</th><th class="num">Passes over it</th></tr></thead><tbody>';
    names.forEach(k=>{const p=r[k]*TOT/S[k];h+='<tr><td>'+escH(k)+'</td><td class="num">'+fmt(S[k])+'</td><td><span class="dbar" style="width:'+Math.max(1,Math.round(90*r[k]/mx))+'px;background:var(--acc)"></span> '+(100*r[k]).toFixed(r[k]<0.001?3:r[k]<0.01?2:1)+'%</td><td class="num"'+(p>100?' style="color:var(--bad);font-weight:600"':'')+'>'+(p>=10?fmt(Math.round(p)):p.toFixed(p<0.1?3:2))+'</td></tr>'});
    el.innerHTML=h+'</tbody></table></div>';
    const nm=rule==='eq'?'Equal':rule==='temp'?'Temperature-scaled, T='+T:'Examples-proportional, K=2^'+$('mixK').value;const row=TB.T11.rows.find(x=>x.name===nm),b=TB.T11.rows[0];
    const lowp=['CB','COPA','WSC + DPR'].map(k=>k+' '+fmt(Math.round(r[k]*TOT/S[k]))).join(', '),enfr=(r['WMT EnFr']*TOT/S['WMT EnFr']).toFixed(2);
    $('mixO').innerHTML=(row?'<b>Measured (Table 11, '+escH(nm)+'):</b> GLUE '+row.v[0]+', SuperGLUE '+row.v[3]+', EnFr '+row.v[5]+' BLEU, against pretrain-then-fine-tune '+b.v[0]+', '+b.v[3]+', '+b.v[5]+'. ':'')+'Passes over the smallest sets: '+lowp+'; over WMT EnFr (40.8M pairs): '+enfr+'. Red: more than 100 passes, where overfitting is expected.'}
  ['mixK'].forEach(i=>$(i).addEventListener('input',go));['mixR','mixT'].forEach(i=>$(i).addEventListener('change',go));go()})();
// Table 15: gains over the baseline from 1T tokens, then from the non-scaling changes
(function(){const el=$('t15Svg');if(!el)return;fit(el,W=>{const rows=M7.map((m,j)=>({m,a:RC.t15[m].scale,b:RC.t15[m].nonscale}));const lw=58,pr=40,rh=26,top=22,H=top+rows.length*rh+30;
  const mx=Math.max(...rows.map(r=>r.a+r.b)),X=v=>lw+(W-lw-pr)*v/mx;let s='';
  const lg=legend([['1T tokens instead of 34B','var(--c1)'],['the non-scaling changes','var(--c3)']],lw,12,W-lw);s+=lg.s;const t0=top+lg.h-8;
  rows.forEach((r,i)=>{const y=t0+i*rh;s+=tx(lw-6,y+15,r.m,{fs:12,a:'end'})+rc(X(0),y+4,X(r.a)-X(0),14,'var(--c1)',{r:2})+rc(X(r.a),y+4,X(r.a+r.b)-X(r.a),14,'var(--c3)',{r:2})+tx(X(r.a+r.b)+4,y+15,'+'+(r.a+r.b).toFixed(2),{fs:11})});
  const Hh=t0+rows.length*rh+20;s+=tx(lw,Hh-4,'points gained over the baseline (34B tokens), Table 15',{fs:11,c:'var(--mute)'});
  el.innerHTML=svgW(W,Hh,s,'Table 15 gains')})})();
