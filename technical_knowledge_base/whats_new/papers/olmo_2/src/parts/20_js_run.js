// ---- Replay the stability fixes: the spike detector sweeping both runs of each ablation figure ----
(function(){if(!$('sw'))return;
const NS=8;let pk={};
const INFO={
 fig4:{a:'A 16,000-step test run made to spike quickly by shortening the warmup; the only difference is the initialisation.',z:'The old scaled initialisation spikes again and again; the normal(0, 0.02) one almost never.'},
 fig3:{a:'Two runs, the same except that one masks sequences with long repeated n-grams out of the loss.',z:'The filter removes most gradient spikes, though not all, and does nothing for the slow growth of the norm.'},
 fig7:{a:'160,000 steps: OLMo-0424\'s pre-attention norm against OLMo 2\'s reordered norm with QK-norm.',z:'The pre-norm run\'s gradient norm drifts upward and spikes; the combined change keeps it flat.'},
 fig9:{a:'The first 8,000 steps with AdamW ε = 10⁻⁵ against 10⁻⁸.',z:'With 10⁻⁸ the gradient norm settles faster and stays lower; there are few spikes either way in this short window.'},
 fig10:{a:'280,000 steps with and without weight decay on the token embeddings.',z:'Decaying the embeddings shrinks them and raises the gradient norm, with more spikes.'},
 fig2:{a:'The two production 7B runs, about 600,000 steps each, everything changed at once (and different data, so the loss levels differ).',z:'OLMo-0424\'s loss and gradient spikes grow through the run; OLMo 2 has almost none in the loss.'}};
const PAPERN={fig4:'0.40 → 0.03',fig7:'0.108 → 0.069',fig10:'0.16 → 0.092'};
function panel(m){const F=CV[m];const want=pk[m]||'gnorm';return F.panels.find(p=>p.key===want)||F.panels[0]}
function fillSel(m){const F=CV[m],sel=$('swP');sel.innerHTML=F.panels.map(p=>'<option value="'+p.key+'"'+((pk[m]||'gnorm')===p.key?' selected':'')+'>'+p.label+(p.runs[0].z?'':' (not scored)')+'</option>').join('')}
const K=()=>+$('swK').value;
function steps(m){const F=CV[m],P=F.panels.find(p=>p.key==='gnorm')||F.panels[0];return Array.from({length:NS},(_,k)=>{
  const xs=Math.round(P.x1*(k+1)/NS);
  return {t:k===0?'Start the detector':k===NS-1?'The whole run':'Sweep to step '+fmt(xs),
    c:k===0?F.title+' ('+F.paper+'). '+INFO[m].a+' The detector cannot score a value until it has the 1,000 before it.':k===NS-1?INFO[m].z+(PAPERN[m]?' The paper prints '+PAPERN[m]+'%.':' The paper prints no spike score for this figure.'):'Each value is compared with the mean of the 1,000 values before it; triangles mark those at least k standard deviations away. Top: OLMo-0424\'s setting; bottom: OLMo 2\'s.'}})}
function draw(m,k,e,w){const P=panel(m),H=w<500?340:310,pl=46,pr=10,W=w-pl-pr,gap=36,h=(H-gap-40)/2,frac=Math.min(1,(k+e)/NS),upto=Math.round(P.nb*frac),xm=P.x0+(P.x1-P.x0)*frac;let s='';
  P.runs.forEach((R,j)=>{const y=14+j*(h+gap);s+=axesSvg(P,pl,y,W,h,{noX:j===0});
    s+=envSvg(P,R,pl,y,W,h,{op:.15,col:'var(--dim)'})+envSvg(P,R,pl,y,W,h,{upto,band:!!R.z,k:R.z?K():0});
    s+=tx(pl+6,y+16,R.name,{fs:11,c:RUNC[R.c],w:600});
    if(frac<1){const cx=scales(P,pl,y,W,h).lx(xm);s+=ln2(cx,y,cx,y+h,'var(--acc)',{sw:1.5})}});
  s+=tx(pl+W/2,H-2,'training step ('+P.label+(P.log?', log scale':'')+')',{fs:11,a:'middle',c:'var(--mute)'});
  return svgW(w,H,s,'Spike detector replay')}
function counters(m,k,e){const P=panel(m),frac=Math.min(1,(k+e)/NS),xm=P.x0+(P.x1-P.x0)*frac,kk=K();
  if(!P.runs[0].z)return stat('This panel','not scored','the paper scores gradient norms (and Figure 2\'s loss)');
  return P.runs.map((R,j)=>{const n=spikes(R,kk,xm),f=Math.max(0,(xm-R.first_eval_step)/(P.x1-R.first_eval_step)),ev=Math.max(1,Math.round(R.ev*Math.min(1,f)));
    return stat((j?'OLMo 2 setting':'OLMo-0424 setting')+', spikes at '+kk+'σ',n+(frac>=1?' of '+fmt(R.ev):''),frac>=1?'score <b>'+(100*n/R.ev).toFixed(3)+'%</b>':'about '+(100*n/ev).toFixed(2)+'% so far')}).join('')+(PAPERN[m]&&P.key==='gnorm'?stat('Paper',PAPERN[m]+'%','§3, at 7σ'):'')}
const modes={};Object.keys(INFO).forEach(m=>modes[m]=steps(m));
const A=makeAnim({id:'sw',modes,mode:'fig4',draw,counters,dur:1700});
const redraw=()=>{if(A)A.draw()};
$('swM').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{fillSel(b.dataset.m)}));
$('swP').addEventListener('change',e=>{pk[A.st.m]=e.target.value;redraw()});
$('swK').addEventListener('input',()=>{setH('swKv',K()+'σ');redraw()});setH('swKv',K()+'σ');fillSel('fig4');

// the definition-sensitivity table and the reproduction box
(function(){const S=RC.spikes,F={fig4:'Figure 4, initialisation',fig3:'Figure 3, n-gram filter',fig7:'Figure 7, norm + QK-norm',fig9:'Figure 9, AdamW ε',fig10:'Figure 10, embedding decay',fig2:'Figure 2, whole runs'};
  const rows=[];Object.keys(F).forEach(f=>{rows.push({grp:F[f]});Object.keys(S).filter(k=>k.startsWith(f+'/')).forEach(k=>{const v=S[k],nm=k.split('/');
    rows.push({c:[nm[2]+(nm[1]==='loss'?' (loss)':''),v.paper==null?'':'<b>'+v.paper+'</b>','<b>'+v.ours.pct.toFixed(3)+'</b> <span class="small mute">'+v.ours.spikes+'/'+fmt(v.ours.evaluated)+'</span>',v.resampled.pct.toFixed(3),v.W250.pct.toFixed(3),v.W2000.pct.toFixed(3),v.k5.pct.toFixed(3),v.k10.pct.toFixed(3)]})})});
  setH('swTab',htab(['Run','Paper','Drawn, 1,000 window','Per step','Window 250','Window 2,000','5σ','10σ'],rows));
  const g=(a,b)=>S[a].ours.pct.toFixed(2)+' → '+S[b].ours.pct.toFixed(2);
  setH('swRepro','<div class="t">What reproduces</div><b>Direction, independently, for all three printed scores</b>: initialisation '+g('fig4/gnorm/old init','fig4/gnorm/new init')+'% (paper 0.40 → 0.03), reordered norm + QK-norm '+S['fig7/gnorm/pre-attention norm'].ours.pct.toFixed(3)+' → '+S['fig7/gnorm/reordered norm + QK-norm'].ours.pct.toFixed(3)+'% (paper 0.108 → 0.069), embedding decay '+g('fig10/gnorm/weight decay on embeddings','fig10/gnorm/no weight decay on embeddings')+'% (paper 0.16 → 0.092). <b>Levels do not reproduce</b>: the old initialisation comes out higher than printed and the combined norm change lower, under every window and resampling in the table at the paper\'s 7σ. The drawn curves are simplified and may cover a different span of steps than the paper scored, so a mismatch in level is not evidence against the paper; a flip in direction would have been, and none appears.')})();

// Figure 8: the z-loss fork
(function(){const Z=CV.fig8;fit($('zSvg'),w=>{const H=200,pl=46,pr=10,P={x0:Z.x0,x1:Z.x1,lo:Z.lo,hi:Z.hi,log:true,nb:Z.nb};let s=axesSvg(P,pl,6,w-pl-pr,H-36,{});
  Z.runs.forEach(R=>{s+=envSvg(P,R,pl,6,w-pl-pr,H-36,{op:.6,col:R.c?'var(--c1)':'var(--c2)'})});
  const lx=scales(P,pl,6,w-pl-pr,H-36).lx;s+=ln2(lx(Z.fork_start),6,lx(Z.fork_start),H-30,'var(--mute)',{da:'3 3'})+tx(lx(Z.fork_start)-4,22,'fork at step '+fmt(Z.fork_start),{fs:11,a:'end',c:'var(--mute)'});
  s+=legend([['Flash Attention fused z-loss (kept)','var(--c1)'],['PyTorch z-loss fork (abandoned)','var(--c2)']],pl+6,22,Math.min(w-pl-pr-12,lx(Z.fork_start)-pl-120>200?lx(Z.fork_start)-pl-120:w-pl-pr-12)).s;
  $('zSvg').innerHTML=svgW(w,H,s,'Figure 8 re-drawn')})})();
// Figure 10, right: embedding norm
(function(){const E=CV.embnorm;fit($('eSvg'),w=>{const H=190,pl=50,pr=10,pt=8,pb=26,lx=v=>pl+(w-pl-pr)*v/280000,ly=v=>pt+(H-pt-pb)*(1-v/2000);let s='';
  [0,500,1000,1500,2000].forEach(v=>{s+=ln2(pl,ly(v),w-pr,ly(v),'var(--line)',{sw:.6})+tx(pl-4,ly(v)+4,fmt(v),{fs:11,a:'end',c:'var(--mute)'})});
  [0,100000,200000].forEach(v=>{s+=tx(lx(v),H-8,(v/1000)+'k',{fs:11,a:'middle',c:'var(--mute)'})});
  Object.entries(E).forEach(([k,p])=>{const c=k.startsWith('no')?'var(--c1)':'var(--c2)';s+='<path d="'+p.map((q,i)=>(i?'L':'M')+lx(q[0]).toFixed(1)+','+ly(q[1]).toFixed(1)).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="2"/>'});
  s+=legend([['no decay on embeddings (OLMo 2)','var(--c1)'],['decay on embeddings (OLMo-0424)','var(--c2)']],pl+6,pt+14,w-pl-pr-12).s;
  $('eSvg').innerHTML=svgW(w,H,s,'Embedding norm')})})();
})();
