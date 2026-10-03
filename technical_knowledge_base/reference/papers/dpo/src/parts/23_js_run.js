// ---- Train tab: the live trainer, the sweep, long runs, the theorem check ----
(function(){
  const fin=a=>a[a.length-1];
  $('ruRef').innerHTML='Under it, '+pc(TOYRES.ref.gram)+' of the probability is on grammatical reviews and the expected true reward is '+TOYRES.ref.reward.toFixed(3)+'; its favourite review is "'+TOYRES.ref.top[0].t+'" ('+pc(TOYRES.ref.top[0].p)+', reward '+TOYRES.ref.top[0].r.toFixed(2)+').';
  $('ruData').innerHTML=fmt(TOYRES.data.pairs)+' pairs over '+TOYRES.data.distinct+' distinct reviews';
  $('ruRm').innerHTML=pc(TOYRES.rm.valAcc)+' of held-out pairs ordered correctly (best at epoch '+TOYRES.rm.epoch+'), correlation with the true reward '+TOYRES.rm.corrRef.toFixed(3)+' under π<sub>ref</sub>';
  $('ruChk').innerHTML=CHK.verdict+', largest difference '+CHK.worst.toExponential(1)+' over '+CHK.cases.length+' checks (<code>check_engine.py</code>)';
  // ----- the live trainer -----
  const HYP={dpo:['β',[0.05,0.1,0.5,1,5],3],ipo:['τ',[0.05,0.1,0.5,1],1],cdpo:['β (ε = 0.1)',[0.05,0.1,1,5],1],ul:['α',[0.05,0.1,0.5,1],3],sft:['seed',[1,2,3],0],ppo:['target KL',[0.5,1,2,3],1],ppogt:['target KL',[0.5,1,2,3],1]};
  const NAME={dpo:'DPO',ipo:'IPO',cdpo:'cDPO',ul:'Unlikelihood',sft:'Preferred-FT',ppo:'PPO',ppogt:'PPO-GT'};
  let meth='dpo',runner=null,timer=0,rm=null,dataBT=null;
  function setH(){const [l,vs,d]=HYP[meth];$('trHl').textContent=l;$('trH').innerHTML=vs.map((v,i)=>'<option value="'+v+'"'+(i===d?' selected':'')+'>'+v+'</option>').join('')}
  segBind('trMeth',m=>{meth=m;setH();reset()});setH();
  function opts(){const h=+$('trH').value,steps=+$('trSt').value,lab=$('trLab').value;
    const data=lab==='bt'?(dataBT=dataBT||TOY.makeData({groups:1000,seed:1,labels:'bt',k:8})):DATA;
    const every=steps>=1500?100:25;
    if(meth==='ppo'||meth==='ppogt'){if(meth==='ppo')rm=rm&&rm.lab===lab?rm:Object.assign(TOY.trainRM(data,{epochs:3}),{lab});return {method:'ppo',beta:0.1,targetKL:h,reward:meth==='ppo'?rm.r:TOY.RSTAR,data,steps,every}}
    if(meth==='ul')return {method:'unlikelihood',alpha:h,data,steps,every};
    if(meth==='sft')return {method:'sft',data,steps,every,seed:h};
    if(meth==='ipo')return {method:'dpo',loss:'ipo',beta:h,data,steps,every};
    if(meth==='cdpo')return {method:'dpo',loss:'cdpo',beta:h,eps:0.1,data,steps,every};
    return {method:'dpo',beta:h,data,steps,every}}
  function reset(){if(timer){clearTimeout(timer);timer=0}runner=null;$('trGo').disabled=false;render()}
  function go(){if(timer)return;if(!runner||runner.done())runner=TOY.makeRunner(opts());$('trGo').disabled=true;
    const slice=()=>{const t0=performance.now();while(!runner.done()&&performance.now()-t0<30)runner.next();render();if(!runner.done())timer=setTimeout(slice,0);else{timer=0;$('trGo').disabled=false}};slice()}
  $('trGo').addEventListener('click',go);$('trStop').addEventListener('click',()=>{if(timer){clearTimeout(timer);timer=0}$('trGo').disabled=false});$('trReset').addEventListener('click',reset);
  ['trH','trSt','trLab'].forEach(id=>$(id).addEventListener('change',reset));
  function render(){refit($('trFr'));refit($('trLr'));refit($('trMass'));
    const th=runner?runner.theta:TOY.LREF,ev=TOY.evaluate(th),tr=runner?runner.trace:[{step:0,kl:0,reward:TOYRES.ref.reward}];const off=!(meth==='ppo'||meth==='ppogt');
    const c=runner?runner.cnt:{samples:0,fwd:0,pairs:0};
    $('trCnt').innerHTML='<span>step <b>'+(runner?runner.step:0)+'</b> of '+$('trSt').value+'</span><span>'+(off?'pairs processed <b>'+fmt(c.pairs)+'</b>':'answers sampled <b>'+fmt(c.samples)+'</b>')+'</span><span>models in memory <b>'+(off?'2':meth==='ppo'?'3 (+ reward model)':'2 (+ true reward)')+'</b></span>'+
      '<span>KL <b>'+ev.kl.toFixed(3)+'</b></span><span>true reward <b>'+ev.reward.toFixed(3)+'</b></span><span>best possible at this KL <b>'+FRS(ev.kl).toFixed(3)+'</b></span><span>grammatical <b>'+pc(ev.gram)+'</b></span>'+(meth.startsWith('ppo')&&runner?'<span>β now <b>'+runner.beta.toFixed(3)+'</b></span>':'');
    $('trTop').innerHTML='<div class="h">review</div><div class="h">probability</div><div class="h">reward</div>'+ev.top.map(x=>'<div class="t'+(TOY.grammatical(x.id)?'':' bad')+'">'+x.t+'</div><div>'+pc(x.p)+'</div><div>'+x.r.toFixed(2)+'</div>').join('')}
  fit($('trFr'),w=>{const tr=runner?runner.trace:[];const xmax=Math.max(3.2,...tr.map(x=>x.kl))*1.05;const P=toyPlane(w,{xmax:Math.min(xmax,12),legend:[['this run','var(--ink)','d'],['the 19 sweep runs','var(--dim)','d']]});let s=P.s;
    TOYRES.sweep.forEach(r=>r.trace.forEach(x=>{if(x.kl<=P.xmax)s+=dotS(P.X(x.kl),P.Y(x.r),2,'var(--dim)')}));
    const col=MCOL[NAME[meth]]||'var(--ink)';s+=lineS(tr.filter(x=>x.kl<=P.xmax).map(x=>[x.kl,x.reward]),P.X,P.Y,col,{sw:2});tr.forEach(x=>{if(x.kl<=P.xmax)s+=dotS(P.X(x.kl),P.Y(x.reward),3,col,{t:'step '+x.step+': KL '+x.kl.toFixed(3)+', reward '+x.reward.toFixed(3)})});
    $('trFr').innerHTML=svgW(w,P.H,s,'Training run on the reward-KL plane')});
  const small=(id,series,ylab,yr)=>fit($(id),w=>{const tr=runner?runner.trace:[],H=160,st=+$('trSt').value;const vals=series.flatMap(sr=>tr.map(x=>x[sr[0]]).filter(v=>v!=null));
    const y0=yr?yr[0]:Math.min(-1,...vals),y1=yr?yr[1]:Math.max(1,...vals);const f=linFrame({W:w,H,pl:38,pr:8,pt:8,pb:28,x:[0,st],y:[y0,y1],xl:'step',fy:v=>yr?pc(v,0):String(v)});
    let s=f.s;series.forEach(([k,c,n])=>{const pts=tr.filter(x=>x[k]!=null).map(x=>[x.step,x[k]]);s+=lineS(pts,f.X,f.Y,c);if(pts.length){const p=fin(pts);s+=tx(Math.min(f.X(p[0])+3,w-60),f.Y(p[1])-4,n,{fs:11,c})}});
    if(!tr.length||series.every(([k])=>!tr.some(x=>x[k]!=null)))s+=tx(w/2,H/2,meth.startsWith('ppo')&&ylab==='lr'?'(no stored pairs: PPO samples)':'press Train',{fs:11,a:'middle',c:'var(--mute)'});
    $(id).innerHTML=svgW(w,H,s,ylab)});
  small('trLr',[['chosen','var(--mw)','chosen'],['rejected','var(--ml)','rejected']],'lr');
  small('trMass',[['gram','var(--c3)','grammatical'],['unseen','var(--c2)','never seen']],'mass',[0,1]);
  onTab('t-run',render);render();
  // ----- the sweep -----
  const MS=['DPO','PPO','PPO-GT','Unlikelihood','Preferred-FT'],show={};MS.forEach(m=>show[m]=true);
  $('swShow').innerHTML=MS.map(m=>'<label><input type="checkbox" id="sw_'+m.replace(/\W/g,'')+'" checked> '+m+'</label>').join('');
  MS.forEach(m=>$('sw_'+m.replace(/\W/g,'')).addEventListener('change',e=>{show[m]=e.target.checked;refit($('swSvg'))}));
  let SWEEP=TOYRES.sweep;
  fit($('swSvg'),w=>{const P=toyPlane(w,{xmax:3.8,legend:MS.filter(m=>show[m]).map(m=>[m,MCOL[m],'l'])});let s=P.s;
    SWEEP.forEach(r=>{if(!show[r.m])return;r.trace.forEach(x=>{if(x.kl<=P.xmax)s+=dotS(P.X(x.kl),P.Y(x.r),2.3,MCOL[r.m],{op:.5,t:r.m+' '+r.p+', step '+x.s+': KL '+x.kl+', reward '+x.r})})});
    MS.forEach(m=>{if(!show[m])return;const pts=SWEEP.filter(r=>r.m===m).flatMap(r=>r.trace.map(x=>[x.kl,x.r])).filter(p=>p[0]<=P.xmax);s+=lineS(envelope(pts),P.X,P.Y,MCOL[m],{sw:2})});
    $('swSvg').innerHTML=svgW(w,P.H,s,'Figure 2 at toy scale')});
  function table(){const rows=SWEEP.map(r=>{const z=fin(r.trace);return '<tr><td>'+r.m+'</td><td>'+r.p+'</td><td>'+z.kl.toFixed(2)+'</td><td>'+z.r.toFixed(3)+'</td><td>'+r.meanGap.toFixed(3)+'</td><td>'+(z.c!=null?z.c.toFixed(2)+' / '+z.l.toFixed(2):'')+'</td><td>'+fmt(r.samples)+'</td></tr>'}).join('');
    $('swTab').innerHTML='<thead><tr><th>method</th><th>setting</th><th>final KL</th><th>final reward</th><th>mean shortfall</th><th>chosen / rejected log-ratio</th><th>answers sampled</th></tr></thead><tbody>'+rows+'</tbody>'}
  table();
  $('swOut').innerHTML='Lines: each method\'s best-so-far envelope over all its runs; dashed: the exact best possible frontier. Mean shortfall: the frontier\'s reward at the evaluation\'s KL minus the reward reached, averaged over a run\'s evaluations (computed by <code>toy_sweep.mjs</code> in '+(TOYRES.ms/1000).toFixed(0)+' s, all experiments).';
  $('swGo').addEventListener('click',()=>{const btn=$('swGo');btn.disabled=true;const specs=TOYRES.sweep.map(r=>r),out=[];let i=0,rmx=null;
    const spec=r=>{const v=parseFloat(r.p.replace(/[^0-9.]/g,''));if(r.m==='DPO')return {method:'dpo',beta:v,data:DATA,steps:600,every:25};if(r.m==='Unlikelihood')return {method:'unlikelihood',alpha:v,data:DATA,steps:600,every:25};
      if(r.m==='Preferred-FT')return {method:'sft',data:DATA,steps:600,every:25,seed:v};rmx=rmx||TOY.trainRM(DATA,{epochs:3});return {method:'ppo',beta:0.1,targetKL:v,reward:r.m==='PPO'?rmx.r:TOY.RSTAR,data:DATA,steps:400,every:25}};
    let cur=null;const step=()=>{const t0=performance.now();while(performance.now()-t0<30){if(!cur){if(i>=specs.length)break;cur=TOY.makeRunner(spec(specs[i]))}cur.next();if(cur.done()){out.push(cur.trace);cur=null;i++}}
      $('swOut').innerHTML='Rerunning: run '+Math.min(i+1,specs.length)+' of '+specs.length+'…';
      if(i<specs.length)setTimeout(step,0);else{let md=0;out.forEach((t,j)=>t.forEach((x,k)=>{const y=specs[j].trace[k];md=Math.max(md,Math.abs(x.kl-y.kl),Math.abs(x.reward-y.r))}));
        $('swOut').innerHTML='<b>Rerun in your browser:</b> 19 runs, largest difference from <code>toy_sweep.mjs</code> '+md.toExponential(1)+' (the stored values are rounded to 4 decimals), so the figure and table above are reproduced '+(md<1e-3?'exactly':'only approximately')+'.';btn.disabled=false}};step()});
  // ----- long runs -----
  fit($('lgSvg'),w=>{const L=TOYRES.long,H=220,cols=['var(--c1)','var(--c1)','var(--c6)','var(--c6)','var(--c3)','var(--c2)','var(--c5)','var(--c4)'];
    const leg=legendW(L.map((l,i)=>[l.name,cols[i],i===1||i===3?'da':'l']),44,13,w-54);const f=linFrame({W:w,H:H+leg.h,pl:40,pr:10,pt:10+leg.h,pb:30,x:[0,4000],y:[0,1],xl:'training step',yl:'grammatical mass',fy:v=>pc(v,0)});
    let s=f.s+leg.s;L.forEach((l,i)=>{s+=lineS(l.trace.map(x=>[x.s,x.g]),f.X,f.Y,cols[i],{da:i===1||i===3?'5 3':null})});$('lgSvg').innerHTML=svgW(w,H+leg.h,s,'Long runs')});
  $('lgTab').innerHTML='<thead><tr><th>loss</th><th>KL</th><th>true reward</th><th>shortfall</th><th>grammatical</th><th>never seen</th><th>top reviews</th></tr></thead><tbody>'+TOYRES.long.map(l=>{const z=fin(l.trace);return '<tr><td>'+l.name+'</td><td>'+z.kl.toFixed(2)+'</td><td>'+z.r.toFixed(3)+'</td><td>'+(FRS(z.kl)-z.r).toFixed(3)+'</td><td>'+pc(z.g)+'</td><td>'+pc(z.u)+'</td><td class="small">'+l.top.slice(0,3).map(t=>t.t).join('; ')+'</td></tr>'}).join('')+'</tbody>';
  // ----- theorem -----
  const T=TOYRES.theorem;$('thOut').innerHTML='Bradley-Terry labels (scale 8, so preferences are noisy and the maximum-likelihood problem has a finite optimum on most pairs), '+fmt(T.pairs)+' pairs, β = '+T.beta+'. Minimising the DPO loss over the policy\'s 444 logits and the reward-model loss over its 444 weights, full batch, Adam, 4,000 steps each: final losses <b>'+fin(T.dpoLoss)[1].toFixed(5)+'</b> and <b>'+fin(T.rmLoss)[1].toFixed(5)+'</b>, the same minimum, as Theorem 1 says (the classes match exactly here). But the data constrain only the margins between compared answers: the converged DPO policy sits at KL '+T.kl.toFixed(1)+' with <b>'+(T.unseenDPO>0.9999?'more than 99.99%':pc(T.unseenDPO,2))+'</b> of its probability on reviews that never appeared in a pair (its top three: '+T.top.join('; ')+'). Early stopping, the KL-anchored sweep above, is what keeps DPO near π<sub>ref</sub> in practice; this is the failure Xu et al. (2024) prove can happen.';
})();
