// ---- Train a LoRA tab: in-browser trainer, sweep charts, inside-dW heatmaps and toy Table 7, FT spectra ----
(function(){
const E=window.LORA,LD=window.LORA_DATA;if(!E||!LD)return;
const base=E.loadBase(LD.base);const TE={};for(const k in LD.teachers)TE[k]=E.loadTeacher(LD.teachers[k]);
const TN={v1:'Wv, rank 1',v4:'Wv, rank 4',v32:'Wv, dense (rank 32)',mlp4:'MLP W1, rank 4'};
const pct=v=>v==null?'n/a':(100*v).toFixed(1)+'%';
const SUB=k=>k.replace(/^W([qkvo])$/,'W<sub>$1</sub>').replace(/^W([12])$/,'W<sub>$1</sub>');
// ---------- facts ----------
const pre=LD.pre;$('ruParams').textContent=fmt(LD.cfg.params);
$('ruPre').textContent=pct(pre.float.acc)+' held-out accuracy in float, '+pct(pre.quantised.acc)+' after 8-bit storage (the 8-bit weights are the base everywhere on this page)';
$('ruTasks').innerHTML=Object.entries(LD.teachers).map(([t,v])=>'<b>'+TN[t]+'</b>: Δ'+SUB(v.k)+'* of rank '+v.r+', ‖ΔW*‖ = '+v.ratio.toFixed(2)+' × ‖'+SUB(v.k)+'‖; the base model agrees with this teacher on '+pct(v.base_agree)+' of sequences').join('; ')+'. The edit sizes were set once, so that the base agrees with each teacher on 75%.';
// ---------- held-out sets (fixed seeds, never used for training streams) ----------
const TEST={};const test=t=>TEST[t]||(TEST[t]=E.gen(base,TE[t],400,E.rng(900001+['v1','v4','v32','mlp4'].indexOf(t)),true));
// ---------- trainer ----------
const st={task:'v4',meth:'lora',run:null,raf:0,evals:[],stop:false};
segBind('trTask',m=>{st.task=m;reset()});segBind('trMeth',m=>{st.meth=m;$('trLoraCtl').style.opacity=m==='ft'?.45:1;reset()});
const targets=()=>[...$('trTg').querySelectorAll('input')].filter(x=>x.checked).map(x=>x.value);
function reset(){if(st.raf)cancelAnimationFrame(st.raf);st.raf=0;st.run=null;st.evals=[];$('trAfter').hidden=true;$('trOut').innerHTML='Press Train. Step 0 is the base model: '+baseLine();drawLoss();counters()}
function baseLine(){const a=E.accuracy(base,null,test(st.task));return 'agreement with the teacher '+pct(a.acc)+' overall, '+pct(a.changed)+' on changed sequences.'}
function counters(){const r=st.run;const n=r?r.trainable:0;const k=r?r.step:0;const total=LD.cfg.params;
  $('trCnt').innerHTML=stat('step',fmt(k)+(r?' of '+fmt(r.steps):''),'batch 64')+stat('trainable numbers',fmt(n),total?(100*n/total).toFixed(1)+'% of '+fmt(total):'')+stat('Adam state',fmt(2*n),'two moments per trainable number')+stat('checkpoint (FP16)',fmtBytes(2*n),st.meth==='ft'?'a full copy':'the adapter only')}
function evalNow(){const r=st.run,a=E.accuracy(r.P,r.lora||null,test(st.task));st.evals.push([r.step,a]);return a}
function go(){const tg=targets();if(st.meth==='lora'&&!tg.length){$('trOut').innerHTML='<span class="no">Pick at least one matrix.</span>';return}
  if(!st.run||st.run.step>=st.run.steps){st.evals=[];st.run=E.makeRun(base,{method:st.meth,targets:tg,r:+$('trR').value,alpha:8,scaling:$('trSc').value,lr:+$('trLr').value,steps:+$('trSt').value,batch:64,seed:+$('trSeed').value,teach:TE[st.task]});st.evals.push([0,E.accuracy(base,null,test(st.task))]);$('trAfter').hidden=true}
  st.stop=false;const every=Math.max(50,Math.round(st.run.steps/12));
  const loop=()=>{st.raf=0;const r=st.run;if(!r||st.stop)return;const t0=performance.now();
    while(r.step<r.steps&&performance.now()-t0<28){E.trainStep(r);if(r.step%every===0)evalNow()}
    drawLoss();counters();const last=st.evals[st.evals.length-1][1];
    $('trOut').innerHTML='step '+fmt(r.step)+': loss '+r.curve[r.curve.length-1][1].toFixed(4)+'; agreement '+pct(last.acc)+' overall, <b>'+pct(last.changed)+'</b> on changed, '+pct(last.kept)+' on unchanged (held-out, last check at step '+fmt(st.evals[st.evals.length-1][0])+').';
    if(r.step<r.steps)st.raf=requestAnimationFrame(loop);else{if(st.evals[st.evals.length-1][0]!==r.step)evalNow();drawLoss();done()}};
  st.raf=requestAnimationFrame(loop)}
$('trGo').addEventListener('click',go);$('trStop').addEventListener('click',()=>{st.stop=true});$('trReset').addEventListener('click',reset);
['trR','trSc','trLr','trSt','trSeed'].forEach(i=>$(i).addEventListener('change',reset));$('trTg').addEventListener('change',reset);
function drawLoss(){fit($('trLoss'),W=>{const H=210,pl=46,pr=40,pt=12,pb=30;const r=st.run;let s='';
  const c=r?r.curve:[];const mx=c.length?Math.max(...c.map(x=>x[1])):3,mn=c.length?Math.max(1e-3,Math.min(...c.map(x=>x[1]))):0.1;
  const lo=Math.log10(Math.min(mn,0.5))-0.1,hi=Math.log10(Math.max(mx,1))+0.1,N=r?r.steps:1000;
  const lx=v=>pl+(W-pl-pr)*v/N,ly=v=>pt+(H-pt-pb)*(1-(Math.log10(v)-lo)/(hi-lo)),ay=v=>pt+(H-pt-pb)*(1-v);
  for(let e=Math.ceil(lo);e<=Math.floor(hi);e++){s+=ln2(pl,ly(10**e),W-pr,ly(10**e),'var(--line)')+tx(pl-5,ly(10**e)+4,String(10**e),{fs:11,a:'end',c:'var(--mute)'})}
  [0,.5,1].forEach(v=>{s+=tx(W-pr+5,ay(v)+4,(100*v)+'%',{fs:11,c:'var(--c3)'})});
  s+=tx(pl,H-6,'step',{fs:11,c:'var(--mute)'})+tx(W-pr,H-6,fmt(N),{fs:11,a:'end',c:'var(--mute)'});
  if(c.length){let d='';const stp=Math.max(1,Math.floor(c.length/400));for(let i=0;i<c.length;i+=stp)d+=(i?'L':'M')+lx(c[i][0]).toFixed(1)+' '+ly(Math.max(1e-3,c[i][1])).toFixed(1);s+='<path d="'+d+'" fill="none" stroke="var(--c1)" stroke-width="1.3"/>'}
  if(st.evals.length){let d='';st.evals.forEach(([k,a],i)=>{d+=(i?'L':'M')+lx(k).toFixed(1)+' '+ay(a.changed||0).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="var(--c3)" stroke-width="2"/>';st.evals.forEach(([k,a])=>{s+='<circle cx="'+lx(k).toFixed(1)+'" cy="'+ay(a.changed||0).toFixed(1)+'" r="3" fill="var(--c3)"/>'})}
  const lg=legend([['training loss (log, left)','var(--c1)'],['agreement on changed (right)','var(--c3)']],pl,12,W-pl-pr);
  $('trLoss').innerHTML=svgW(W,H+lg.h,lg.s+'<g transform="translate(0,'+lg.h+')">'+s+'</g>','Training curve')})}
function done(){const r=st.run;$('trAfter').hidden=false;const tt=TE[st.task];const data=test(st.task);
  // merge
  if(!r.full){const Ws=E.weightsSplit(base,r.lora),Wm=E.weights(base,r.lora);let md=0;for(let i=0;i<100;i++){const a=E.fwd(base,Ws,data.X,i).lg,b=E.fwd(base,Wm,data.X,i).lg;a.forEach((x,j)=>md=Math.max(md,Math.abs(x-b[j])))}
    $('trMerge').innerHTML='Merged: W = W₀ + (α/r)BA for '+Object.keys(r.lora).map(SUB).join(', ')+'. Unmerged and merged logits differ by at most '+md.toExponential(1)+' on 100 held-out sequences, so the merged model is the adapted model, at the base model\'s cost per token. The adapter is '+fmtBytes(2*r.trainable)+' in FP16 against '+fmtBytes(2*LD.cfg.params)+' for a full copy.'}
  else $('trMerge').innerHTML='Full fine-tuning: nothing to merge; the result is a complete '+fmtBytes(2*LD.cfg.params)+' copy of the model (in FP16).';
  // spectra of the learned update for each adapted matrix, against the true edit
  const mats=r.full?['Wq','Wk','Wv','Wo','W1','W2']:Object.keys(r.lora);const sp={};
  mats.forEach(k=>{const [o,i]=E.SHAPES[k];let d;if(r.full){d=new Float64Array(o*i);for(let j=0;j<o*i;j++)d[j]=r.P[k][j]-base[k][j]}else d=E.deltaW(r,k);sp[k]=E.svd(d,o,i).S});
  const [to,ti]=E.SHAPES[tt.k];const tru=new Float64Array(to*ti);for(let a=0;a<to;a++)for(let q=0;q<tt.r;q++)for(let c=0;c<ti;c++)tru[a*ti+c]+=tt.B[a*tt.r+q]*tt.A[q*ti+c];sp['true edit ('+tt.k+')']=E.svd(tru,to,ti).S;
  drawSpec('trSpec',sp,'Singular values of the learned ΔW, and of the true edit');
  // phi between learned and true input directions on the teacher's matrix
  let note='';if(mats.includes(tt.k)){let U1;if(r.full){const d=new Float64Array(to*ti);for(let j=0;j<d.length;j++)d[j]=r.P[tt.k][j]-base[tt.k][j];const s=E.svd(d,to,ti);U1={U:s.V,k:s.k}}else{const L=r.lora[tt.k];U1=E.rightSV(L.A,L.r,ti)}
      const U2=E.rightSV(tt.A,tt.r,ti);const ph=E.subspaceSim(U1.U,U1.k,U2.U,U2.k,ti);drawPhi('trPhi',ph,'learned ΔW'+(r.full?'':' (A)')+', top i','true edit, top j');
      note='Heatmap: φ(i, j) between the learned update\'s top-i input directions and the true edit\'s top-j. φ(1, 1) = '+ph[0][0].toFixed(2)+'; φ('+Math.min(U1.k,tt.r)+', '+tt.r+') = '+ph[Math.min(U1.k,tt.r)-1][tt.r-1].toFixed(2)+' (1 means the true edit\'s directions are all inside the learned ones).'}
  else{$('trPhi').innerHTML='<p class="small">The teacher edited '+SUB(tt.k)+', which this run did not adapt, so there is no learned update on that matrix to compare with the true one. Whatever accuracy it reached, it got by changing other matrices.</p>'}
  $('trSpecNote').innerHTML='Bars: singular values of each learned update (log scale). The true edit has exactly '+tt.r+' non-zero singular value'+(tt.r>1?'s':'')+', all equal to '+LD.teachers[st.task].c.toFixed(2)+'. '+note}
function drawSpec(id,sp,label){fit($(id),W=>{const H=200,pl=40,pr=10,pt=10,pb=28,keys=Object.keys(sp);const n=Math.min(32,Math.max(...keys.map(k=>sp[k].length)));
  const all=[].concat(...keys.map(k=>Array.from(sp[k]).slice(0,n))).filter(v=>v>1e-6);const hi=Math.log10(Math.max(...all))+0.15,lo=Math.max(hi-5,Math.log10(Math.min(...all))-0.1);
  const lx=i=>pl+(W-pl-pr)*(i+0.5)/n,ly=v=>pt+(H-pt-pb)*(1-(Math.log10(Math.max(v,10**lo))-lo)/(hi-lo));let s='';
  for(let e=Math.ceil(lo);e<=Math.floor(hi);e++)s+=ln2(pl,ly(10**e),W-pr,ly(10**e),'var(--line)')+tx(pl-4,ly(10**e)+4,e===0?'1':'10'+sup(e),{fs:11,a:'end',c:'var(--mute)'});
  [1,8,16,24,32].filter(i=>i<=n).forEach(i=>{s+=tx(lx(i-1),H-pb+14,String(i),{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pl+W)/2,H-2,'singular value index',{fs:11,a:'middle',c:'var(--mute)'});
  const cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--ink)'];
  keys.forEach((k,j)=>{let d='';Array.from(sp[k]).slice(0,n).forEach((v,i)=>{d+=(i?'L':'M')+lx(i).toFixed(1)+' '+ly(v).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="'+cols[k.startsWith('true')?6:j%6]+'" stroke-width="'+(k.startsWith('true')?2.4:1.6)+'"'+(k.startsWith('true')?' stroke-dasharray="5 3"':'')+'/>'});
  const lg=legend(keys.map((k,j)=>[k.startsWith('true')?k:'Δ'+k,cols[k.startsWith('true')?6:j%6],k.startsWith('true')?'5 3':null]),pl,12,W-pl-pr);
  $(id).innerHTML=svgW(W,H+lg.h,lg.s+'<g transform="translate(0,'+lg.h+')">'+s+'</g>',label)})}
function drawPhi(id,ph,yl,xl){fit($(id),W=>{const ni=ph.length,nj=ph[0].length,pl=44,pt=8,pb=34;const cw=Math.max(4,Math.min(26,(W-pl-12)/nj)),ch=Math.max(6,Math.min(22,cw*1.1));let s='';
  for(let i=0;i<ni;i++)for(let j=0;j<nj;j++){const v=ph[i][j];s+='<rect x="'+(pl+j*cw).toFixed(1)+'" y="'+(pt+i*ch).toFixed(1)+'" width="'+(cw-0.6).toFixed(1)+'" height="'+(ch-0.6).toFixed(1)+'" fill="var(--c1)" fill-opacity="'+(0.06+0.94*v).toFixed(3)+'"><title>φ('+(i+1)+', '+(j+1)+') = '+v.toFixed(3)+'</title></rect>'}
  const H=pt+ni*ch+pb;[1,ni].forEach(i=>{s+=tx(pl-4,pt+(i-0.5)*ch+4,String(i),{fs:11,a:'end',c:'var(--mute)'})});[1,nj].forEach(j=>{s+=tx(pl+(j-0.5)*cw,pt+ni*ch+13,String(j),{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx(pl+nj*cw/2,H-4,xl,{fs:11,a:'middle',c:'var(--mute)'})+'<text x="11" y="'+(pt+ni*ch/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 '+(pt+ni*ch/2)+')">'+yl+'</text>';
  $(id).innerHTML=svgW(Math.max(W,10),H,s,'Subspace similarity heatmap')})}
// ---------- sweep charts ----------
const SUMM=LD.summary||[];const sw={task:'v4',met:'changed'};
const SETS=[['Wq','var(--c2)'],['Wv','var(--c4)'],['Wq+Wv','var(--c1)'],['Wq+Wk+Wv+Wo+W1+W2','var(--c3)']];
const valsOf=(x,m)=>m==='acc'?x.accs:m==='kept'?x.kepts:x.changeds;
function drawSweep(){fit($('swSvg'),W=>{const H=260,pl=46,pr=12,pt=10,pb=34;const rk=[1,2,4,8,16,32];const lx=r=>pl+(W-pl-pr)*(Math.log2(r)/5),ly=v=>pt+(H-pt-pb)*(1-v);let s='';
  [0,.25,.5,.75,1].forEach(v=>{s+=ln2(pl,ly(v),W-pr,ly(v),'var(--line)')+tx(pl-5,ly(v)+4,(100*v)+'%',{fs:11,a:'end',c:'var(--mute)'})});
  rk.forEach(r=>{s+=tx(lx(r),H-pb+15,String(r),{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pl+W-pr)/2,H-3,'rank r of each LoRA matrix',{fs:11,a:'middle',c:'var(--mute)'});
  const ft=SUMM.find(x=>x.task===sw.task&&x.method==='ft'&&x.mode==='tuned');
  if(ft){const v=valsOf(ft,sw.met);const m=v.reduce((a,b)=>a+b,0)/v.length;s+=rc(pl,ly(Math.max(...v)),W-pl-pr,Math.max(1,ly(Math.min(...v))-ly(Math.max(...v))),'var(--ink)',{r:0,op:.12})+ln2(pl,ly(m),W-pr,ly(m),'var(--ink)',{da:'5 4'})+tx(W-pr-4,ly(m)+13,'full fine-tuning '+pct(m),{fs:11,a:'end'})}
  const base0=sw.met==='changed'?0:null;
  const tc=LD.teachers[sw.task];s+=ln2(lx(Math.min(32,tc.r)),pt,lx(Math.min(32,tc.r)),H-pb,'var(--bad)',{da:'2 3',op:.8})+tx(lx(Math.min(32,tc.r))+(tc.r>=32?-4:4),H-pb-6,'true edit rank '+tc.r,{fs:11,c:'var(--bad)',a:tc.r>=32?'end':'start'});
  const shown=[];SETS.forEach(([tg,c])=>{const P=rk.map(r=>SUMM.find(x=>x.task===sw.task&&x.targets===tg&&x.r===r&&x.scaling==='r'&&x.mode==='tuned')).filter(Boolean);if(!P.length)return;shown.push([tg,c]);
    let d='';P.forEach((x,i)=>{const v=valsOf(x,sw.met);const m=v.reduce((a,b)=>a+b,0)/v.length;d+=(i?'L':'M')+lx(x.r).toFixed(1)+' '+ly(m).toFixed(1);s+=ln2(lx(x.r),ly(Math.min(...v)),lx(x.r),ly(Math.max(...v)),c,{sw:1,op:.7})});
    s+='<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="2"/>';P.forEach(x=>{const v=valsOf(x,sw.met);const m=v.reduce((a,b)=>a+b,0)/v.length;s+='<circle cx="'+lx(x.r).toFixed(1)+'" cy="'+ly(m).toFixed(1)+'" r="3.5" fill="'+c+'"><title>'+tg+' r='+x.r+': '+pct(m)+' (seeds '+v.map(pct).join(', ')+'), lr '+x.lr+'</title></circle>'})});
  const lg=legend(shown.map(([n,c])=>[n==='Wq+Wk+Wv+Wo+W1+W2'?'all six':n.replace('+',', '),c]),pl,12,W-pl-pr);
  $('swSvg').innerHTML=svgW(W,H+lg.h,lg.s+'<g transform="translate(0,'+lg.h+')">'+s+'</g>','Agreement against rank');
  const pend=SETS.filter(([tg])=>!SUMM.some(x=>x.task===sw.task&&x.targets===tg&&x.mode==='tuned')).length;
  $('swNote').innerHTML='Base model before any training: '+pct(LD.teachers[sw.task].base_agree)+' overall and 0% on changed sequences, by definition. Dashed line and band: full fine-tuning (mean and the range of three seeds). Learning rate picked per point on seed 0; hover a point for its seeds and rate. A wide bar means that rate diverged on another seed, a hazard of tuning on one seed that the paper\'s single-run GPT-3 entries share.'+(pend?' ('+pend+' target set'+(pend>1?'s':'')+' not shown: not run for this task.)':'')})}
segBind('swTask',m=>{sw.task=m;drawSweep();drawBudget();drawScale()});segBind('swMet',m=>{sw.met=m;drawSweep();drawBudget()});
const BUD=[['Wq',8],['Wk',8],['Wv',8],['Wo',8],['Wq+Wk',4],['Wq+Wv',4],['Wv+Wo',4],['Wq+Wk+Wv+Wo',2],['W1+W2',2]];
function drawBudget(){fit($('bdSvg'),W=>{const pl=Math.min(116,W*0.34),pr=48,bh=15,gap=6;let s='',y=6;const lx=v=>pl+(W-pl-pr)*v;
  BUD.forEach(([tg,r])=>{const x=SUMM.find(z=>z.task===sw.task&&z.targets===tg&&z.r===r&&z.scaling==='r'&&z.mode==='tuned');s+=tx(pl-6,y+bh-3,tg.split('+').join(', ')+' · r '+r,{fs:11,a:'end'});
    if(x){const v=valsOf(x,sw.met);const m=v.reduce((a,b)=>a+b,0)/v.length;s+=rc(pl,y,lx(m)-pl,bh,tg.includes('W1')?'var(--c5)':'var(--c1)',{r:2})+ln2(lx(Math.min(...v)),y+bh/2,lx(Math.max(...v)),y+bh/2,'var(--ink)',{sw:1.4})+tx(Math.min(W-2,lx(m)+4),y+bh-3,pct(m),{fs:11,a:lx(m)+44>W?'end':'start'})}
    else s+=tx(pl+4,y+bh-3,'not run yet',{fs:11,c:'var(--mute)'});y+=bh+gap});
  [0,.5,1].forEach(v=>{s+=tx(lx(v),y+10,(100*v)+'%',{fs:11,a:'middle',c:'var(--mute)'})});
  $('bdSvg').innerHTML=svgW(W,y+16,s,'Fixed budget comparison')})}
function drawScale(){const t=(sw.task==='v4'||sw.task==='v32')?sw.task:'v4';fit($('scSvg'),W=>{const H=200,pl=46,pr=12,pt=10,pb=32,rk=[1,2,4,8,16,32];const lx=r=>pl+(W-pl-pr)*(Math.log2(r)/5),ly=v=>pt+(H-pt-pb)*(1-v);let s='';
  [0,.5,1].forEach(v=>{s+=ln2(pl,ly(v),W-pr,ly(v),'var(--line)')+tx(pl-5,ly(v)+4,(100*v)+'%',{fs:11,a:'end',c:'var(--mute)'})});rk.forEach(r=>{s+=tx(lx(r),H-pb+15,String(r),{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pl+W-pr)/2,H-3,'rank r (Wq, Wv), learning rate 0.01',{fs:11,a:'middle',c:'var(--mute)'});
  [['r','var(--c1)','α/r'],['sqrt','var(--c2)','α/√r']].forEach(([sc,c])=>{const P=rk.map(r=>SUMM.find(x=>x.task===t&&x.targets==='Wq+Wv'&&x.r===r&&x.scaling===sc&&x.mode==='fixedlr')).filter(Boolean);let d='';
    P.forEach((x,i)=>{const v=x.changeds,m=v.reduce((a,b)=>a+b,0)/v.length;d+=(i?'L':'M')+lx(x.r).toFixed(1)+' '+ly(m).toFixed(1);s+=ln2(lx(x.r),ly(Math.min(...v)),lx(x.r),ly(Math.max(...v)),c,{sw:1,op:.7})});s+='<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="2"/>'});
  const lg=legend([['α/r (the paper)','var(--c1)'],['α/√r (rsLoRA)','var(--c2)']],pl,12,W-pl-pr);$('scSvg').innerHTML=svgW(W,H+lg.h,lg.s+'<g transform="translate(0,'+lg.h+')">'+s+'</g>','Scaling comparison');
  let gap=0;rk.forEach(r=>{const a=SUMM.find(x=>x.task===t&&x.targets==='Wq+Wv'&&x.r===r&&x.scaling==='r'&&x.mode==='fixedlr'),b=SUMM.find(x=>x.task===t&&x.targets==='Wq+Wv'&&x.r===r&&x.scaling==='sqrt'&&x.mode==='fixedlr');if(a&&b)gap=Math.max(gap,Math.abs(a.changed-b.changed))});
  $('scNote').innerHTML='Largest gap between the two curves: '+(100*gap).toFixed(1)+' points. Task: '+TN[t]+(t!==sw.task?' (this comparison was run on the two Wv tasks with rank 4 and 32 only)':'')+'; agreement on changed sequences; α = 8, three seeds, no learning-rate tuning. With α/r, r = 32 scales the update by 0.25; with α/√r, by 1.41. In this toy the two match closely up to r = 16 (probably because Adam normalises each weight\'s step, which absorbs most of the scale: the paper\'s own argument for not tuning α); rsLoRA\'s gains were measured on far larger models and ranks.'})}
// ---------- inside dW ----------
const ph={task:'v4',pair:'r',mat:'Wv'};segBind('phTask',m=>{ph.task=m;drawInside()});segBind('phPair',m=>{ph.pair=m;drawInside()});segBind('phMat',m=>{ph.mat=m;drawInside()});
const AD=(t,sd,r,k)=>{const a=LD.adapters&&LD.adapters[t]&&LD.adapters[t][sd]&&LD.adapters[t][sd][r]&&LD.adapters[t][sd][r][k];if(!a)return null;const [o,i]=E.SHAPES[k];return {A:E.decode(a.A,a.sA,r*i),B:E.decode(a.B,a.sB,o*r),r:+r,s:a.s}};
function drawInside(){const t=ph.task,k=ph.mat,n=32;let U1,U2,yl,xl,msg='';
  if(ph.pair==='g'){const R=E.rng(77);const g=()=>{const M=new Float64Array(16*n);for(let j=0;j<M.length;j++)M[j]=R.gauss();return E.rightSV(M,16,n)};U1=g();U2=g();yl='random A₁, top i';xl='random A₂, top j'}
  else{const a4=AD(t,'1',4,k),a16=AD(t,'1',16,k),b16=AD(t,'2',16,k);if(!a4||!a16||!b16){$('phSvg').innerHTML='<p class="small mute">These adapters are not in the exported data yet.</p>';$('phOut').innerHTML='';return}
    if(ph.pair==='r'){U1=E.rightSV(a4.A,4,n);U2=E.rightSV(a16.A,16,n);yl='A at r = 4, top i';xl='A at r = 16, top j'}
    else if(ph.pair==='s'){U1=E.rightSV(a16.A,16,n);U2=E.rightSV(b16.A,16,n);yl='seed 1 (r = 16), top i';xl='seed 2 (r = 16), top j'}
    else{const tt=TE[t];if(tt.k!==k){$('phSvg').innerHTML='<p class="small">The teacher for this task edited only '+SUB(tt.k)+'; '+SUB(k)+' has no true update to compare with. Switch to ΔW<sub>v</sub>.</p>';$('phOut').innerHTML='';drawAmp();return}
      U1=E.rightSV(a16.A,16,n);U2=E.rightSV(tt.A,tt.r,n);yl='learned A (r = 16), top i';xl='true edit, top j'}}
  const P=E.subspaceSim(U1.U,U1.k,U2.U,U2.k,n);drawPhi('phSvg',P,yl,xl);
  msg='φ(1, 1) = <b>'+P[0][0].toFixed(2)+'</b>';if(P.length>=4&&P[0].length>=4)msg+='; φ(4, 4) = '+P[3][3].toFixed(2);msg+='; φ('+P.length+', '+P[0].length+') = '+P[P.length-1][P[0].length-1].toFixed(2)+'.';
  if(ph.pair==='g')msg+=' Two random 16 × 32 Gaussian matrices: the baseline, as in the right panel of Figure 4; for i = j = 16 the overlap is just 16/32 by dimension count.';
  else if(ph.pair==='r')msg+=' The paper found φ &gt; 0.5 for the top direction in GPT-3 (Figure 3).';
  else if(ph.pair==='s')msg+=' Same configuration, two seeds; the paper\'s Figure 4.';
  else msg+=' Possible only in a toy: the true edit\'s input directions are known.';
  msg+=' Colour: faint is 0, solid blue is 1.';$('phOut').innerHTML=msg;drawAmp()}
function drawAmp(){const t=ph.task,k=ph.mat;const rows=[];[4,16].forEach(r=>{const a=AD(t,'1',r,k);if(!a)return;const [o,i]=E.SHAPES[k];const d=new Float64Array(o*i);for(let x=0;x<o;x++)for(let q=0;q<r;q++)for(let c=0;c<i;c++)d[x*i+c]+=a.s*a.B[x*r+q]*a.A[q*i+c];
    const m=E.amplify(base[k],d,r,E.rng(5+r));rows.push([r,m])});if(!rows.length){$('ampSvg').innerHTML='';return}
  fit($('ampSvg'),W=>{const pl=Math.min(150,W*0.42),pr=52,bh=13;let s='',y=8;const vals=[].concat(...rows.map(([r,m])=>[m.pd,m.pw,m.prand,m.dWnorm])).filter(v=>v>0);const lo=Math.floor(Math.log10(Math.min(...vals))),hi=Math.ceil(Math.log10(Math.max(...vals)));
    const lx=v=>pl+(W-pl-pr)*(Math.log10(Math.max(v,10**lo))-lo)/(hi-lo);
    rows.forEach(([r,m])=>{s+=tx(4,y+10,'r = '+r+': amplification ‖ΔW‖ / ‖UᵀWV‖ = '+(m.dWnorm/m.pd).toFixed(1),{fs:11,w:600});y+=16;[['along ΔW',m.pd,'var(--c3)'],['along W\'s top '+r,m.pw,'var(--c1)'],['random',m.prand,'var(--dim)'],['‖ΔW‖',m.dWnorm,'var(--c2)']].forEach(([n,v,c])=>{s+=tx(pl-5,y+bh-2,n,{fs:11,a:'end'})+rc(pl,y,lx(v)-pl,bh,c,{r:2})+tx(lx(v)+4,y+bh-2,v.toFixed(2),{fs:11});y+=bh+4});y+=6});
    s+=tx(4,y+10,'‖'+k+'‖ = '+rows[0][1].Wnorm.toFixed(2)+'; log scale',{fs:11,c:'var(--mute)'});$('ampNote').innerHTML='Toy Table 7 for Δ'+SUB(k)+'. The toy\'s edits use random directions, so here ΔW lines up with W about as much as a random subspace does (compare the first and third bars): the paper\'s finding that ΔW picks directions W has but under-uses cannot appear in this toy by construction; what it does show is the measurement itself: amplification '+(rows[0][1].dWnorm/rows[0][1].pd).toFixed(1)+' at r = 4 and '+(rows[1]?(rows[1][1].dWnorm/rows[1][1].pd).toFixed(1):'n/a')+' at r = 16, where the paper found 21.5 at r = 4 and about 2 at r = 64.';$('ampSvg').innerHTML=svgW(W,y+16,s,'Toy Table 7')})}
// ---------- FT spectra ----------
const ftS={task:'v4'};segBind('ftTask',m=>{ftS.task=m;drawFt()});
function drawFt(){const S=LD.spectra&&LD.spectra[ftS.task];if(!S){$('ftSvg').innerHTML='<p class="small mute">Not exported yet.</p>';return}const sp={};['Wq','Wk','Wv','Wo','W1','W2'].forEach(k=>{if(S[k])sp[k]=S[k]});
  const tc=LD.teachers[ftS.task];sp['true edit ('+tc.k+')']=Array.from({length:32},(_,i)=>i<tc.r?tc.c:0);drawSpec('ftSvg',sp,'Full fine-tuning update spectra');
  const v=S[tc.k];if(v){const tot=v.reduce((a,b)=>a+b*b,0);let c=0,k90=0;for(let i=0;i<v.length;i++){c+=v[i]*v[i];if(c>=0.9*tot){k90=i+1;break}}
    $('ftNote').innerHTML='Full fine-tuning\'s Δ'+SUB(tc.k)+' (the edited matrix): '+k90+' singular direction'+(k90>1?'s':'')+' carry 90% of its squared norm, against a true edit of rank '+tc.r+'. The other matrices move too, since nothing stops them.'}}
// ---------- honesty ----------
function honest(){const c=LD.check||{},ov=LD.overlap||{};const L=[];
  L.push('<b>The browser engine is PyTorch\'s twin.</b> The same JS code that trains here was run in node and replayed in PyTorch (float64) with identical initial weights and batches: forward logits agree within '+(c.forward_max_logit_diff||0).toExponential(1)+' on '+c.forward_n+' sequences ('+c.forward_same_argmax+' identical answers), losses over three short training runs (LoRA, rsLoRA on all six matrices, full fine-tuning) within '+(c.train_max_loss_diff||0).toExponential(1)+' and final weights within '+(c.train_max_weight_diff||0).toExponential(1)+'; teacher labels identical on '+c.teacher_labels_same+' of 200; the Jacobi SVD matches NumPy within '+(c.svd_max_singular_value_diff||0).toExponential(1)+'. Verdict: '+(c.verdict||'not run')+' (check_engine.mjs, check_engine.py).');
  const bc=ov.by_count||{};const hi=[8,9,10].map(k=>(bc[k]||[0,0])[0]).reduce((a,b)=>a+b,0);
  L.push('<b>Held-out sets.</b> Every accuracy is on sequences from seeds the training streams never use. Because a count of 9 or 10 leaves very few distinct sequences, '+fmt(ov.test_in_train||0)+' of the '+fmt(ov.test||0)+' offline test sequences (all with counts 8 to 10: '+hi+') also occur somewhere in one run\'s '+fmt(ov.train||0)+' training sequences; for counts 0 to 7 the overlap is zero.');
  L.push('<b>Quantisation.</b> The base model is stored in 8 bits ('+pct(LD.pre.float.acc)+' in float, '+pct(LD.pre.quantised.acc)+' after); the 8-bit weights are the base model for every run, offline and here, so nothing is lost between them. Adapters shown under "Inside ΔW" are stored at 12 bits.');
  L.push('<b>What the toy can and cannot test.</b> It is built so the needed update is known, which a real task never offers: it tests whether LoRA finds a low-rank update when one exists and fails when it lacks rank or targets the wrong matrix. It cannot test whether real tasks have low intrinsic rank (the paper\'s empirical claim), and its "MLP task" puts the edit in the MLP by construction, so it illustrates LoRA Without Regret\'s point rather than confirming it.');
  L.push('<b>A first design failed, and is recorded.</b> The first toy tasks relabelled symbols ("count b when asked about a"), which has an exact rank-k update of W<sub>q</sub>; LoRA did not find it (on the changed queries, 7% at r = 1 on W<sub>q</sub> after 3,000 steps, 78% at r = 8 on W<sub>q</sub> and W<sub>v</sub>), while full fine-tuning, which can also move the embeddings, reached 100%. Probably the pretrained attention is so sharp that gradients towards the new symbol vanish: an optimisation barrier, not a rank limit, so the task could not test the paper\'s claim and was replaced before any result was used; the log is model/abandoned_swap_tasks.log.');
  $('ruHonest').innerHTML=L.map(x=>'<li>'+x+'</li>').join('')}
onTab('t-run',()=>{if(!st.drawn){st.drawn=1;reset();honest()}drawSweep();drawBudget();drawScale();drawInside();drawFt()});
})();
