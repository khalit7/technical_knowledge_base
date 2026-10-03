// ---- The paper tab: pipeline animation, one batch through two losses, implicit reward, predictions, Figure 2 ----
const DATA=TOY.makeData({groups:1000,seed:1}); // the toy's preference pairs (same as toy_sweep.mjs)
const SW=n=>TOYRES.sweep.filter(s=>s.m+' '+s.p===n)[0];
const pc=(v,d)=>(100*v).toFixed(d==null?1:d)+'%';
// cached DPO / Unlikelihood runs with checkpoints, shared by the pair animation and the implicit-reward plot
const CK=[0,5,10,25,50,100,200,400,600],RUNS={};
function ckRun(kind,beta){const key=kind==='ul'?'ul':kind+beta;if(RUNS[key])return RUNS[key];
  const o=kind==='ul'?{method:'unlikelihood',alpha:1,data:DATA,steps:600,every:600}:{method:'dpo',beta,data:DATA,steps:600,every:600};
  const r=TOY.makeRunner(o),ex=TOYRES.examples.slice(0,4).map(e=>[TOY.toId(e.w.split(' ').map(w=>TOY.W.indexOf(w))),TOY.toId(e.l.split(' ').map(w=>TOY.W.indexOf(w)))]);
  const snaps=[];const snap=()=>{const th=r.theta,lp=TOY.logSoftmax(th),ev=TOY.evaluate(th);
    snaps.push({s:r.step,kl:ev.kl,rw:ev.reward,gram:ev.gram,pairs:ex.map(([a,b])=>{const lw=TOY.seqLogp(lp,a)-TOY.seqLogp(TOY.LREF,a),ll=TOY.seqLogp(lp,b)-TOY.seqLogp(TOY.LREF,b);return {lw,ll,w:kind==='ul'?1:TOY.sig(-beta*(lw-ll))}})})};
  snap();while(!r.done()){r.next();if(CK.includes(r.step))snap()}
  return RUNS[key]={snaps,theta:r.theta,ex}}

// ---------- 1. RLHF against DPO, the pipeline ----------
(function(){const sp=SW('PPO target KL 1'),sd=SW('DPO β = 1'),P=TOYRES.data.pairs,ACC=TOYRES.rm.valAcc;
  const fin=s=>s.trace[s.trace.length-1];
  const M={rlhf:[
    {t:'Start from the SFT model',c:'π<sub>ref</sub> = π<sup>SFT</sup> is a model of how reviews are usually written. Every method starts from it and is measured by how far it moves (the KL) for how much true reward it gains.',on:['ref']},
    {t:'Collect and label pairs',c:'π<sub>ref</sub> writes 4 answers per group; the classifier ranks every pair of them, as the paper does for IMDb: '+fmt(P)+' labelled pairs. Both pipelines use exactly these.',on:['ref','data']},
    {t:'Fit a reward model (Eq. 2)',c:'A separate network <i>r<sub>φ</sub></i> learns to score answers so that σ(<i>r<sub>φ</sub></i>(<i>y<sub>w</sub></i>) − <i>r<sub>φ</sub></i>(<i>y<sub>l</sub></i>)) matches the labels: 3 epochs, '+pc(ACC)+' of held-out pairs ordered correctly. It must stay loaded for the whole RL stage.',on:['data','rm']},
    {t:'Copy the SFT model as the policy',c:'The policy π<sub>θ</sub> starts equal to π<sub>ref</sub>. PPO normally adds a fourth network, a value function that predicts each answer\'s reward (dashed here: the toy uses the batch mean instead).',on:['ref','pol','val']},
    {t:'RL loop: sample from the policy',c:'Every step, π<sub>θ</sub> generates 64 fresh answers. This sampling in the training loop is what makes RLHF slow at scale: generation is sequential.',on:['pol'],flow:'sample'},
    {t:'Score them',c:'Each answer gets <i>r<sub>φ</sub></i>(<i>y</i>) − β (log π<sub>θ</sub>(<i>y</i>) − log π<sub>ref</sub>(<i>y</i>)): one pass of the reward model and one of the frozen reference per sample.',on:['pol','rm','ref'],flow:'score'},
    {t:'PPO update, and repeat 400 times',c:'A clipped surrogate, 4 epochs on the batch, β nudged towards the target KL. After 400 steps: '+fmt(sp.samples)+' answers generated, KL '+fin(sp).kl.toFixed(2)+', true reward '+fin(sp).r.toFixed(3)+'.',on:['pol'],flow:'upd'}],
   dpo:[
    {t:'Start from the SFT model',c:'The same π<sub>ref</sub> and the same objective, Eq. 3: maximise reward with a KL penalty of strength β.',on:['ref']},
    {t:'The same labelled pairs',c:fmt(P)+' pairs, labelled once. DPO never generates during training: the pairs are all it sees.',on:['ref','data']},
    {t:'Cache the reference\'s log-probabilities',c:'log π<sub>ref</sub>(<i>y<sub>w</sub></i>) and log π<sub>ref</sub>(<i>y<sub>l</sub></i>) for every pair, computed once; Tülu 3 does exactly this at 70B. No reward model is fitted.',on:['data','ref']},
    {t:'Copy the SFT model as the policy',c:'π<sub>θ</sub> = π<sub>ref</sub> at the start. Two models in memory, and the reference could even be dropped after caching.',on:['pol']},
    {t:'Loss on a batch of pairs (Eq. 7)',c:'For 64 pairs: two policy passes each, the log-ratio margin, −log σ(β × margin). The implicit reward β log π<sub>θ</sub>/π<sub>ref</sub> is the reward model.',on:['pol','data'],flow:'loss'},
    {t:'Update, and repeat 600 times',c:'One backward pass and an RMSprop step. After 600 steps (about 7 passes over the data) at β = 1: 0 answers generated, KL '+fin(sd).kl.toFixed(2)+', true reward '+fin(sd).r.toFixed(3)+', on the exact frontier within '+(FRS(fin(sd).kl)-fin(sd).r).toFixed(3)+'.',on:['pol'],flow:'upd'}]};
  function box(x,y,w,h,lab,sub,on,dash,col){return rc(x,y,w,h,on?'var(--acc2)':'var(--soft)',{s:on?(col||'var(--acc)'):'var(--line)',sw:on?2:1,da:dash?'5 3':null,r:7})+tx(x+w/2,y+h/2-1,lab,{fs:12,a:'middle',w:600})+tx(x+w/2,y+h/2+13,sub,{fs:11,a:'middle',c:'var(--mute)'})}
  makeAnim({id:'pipe',mode:'rlhf',modes:M,dur:2600,draw(m,k,e,w){const S=M[m][k],on=n=>S.on.includes(n),H=232,bw=Math.min(150,(w-30)/3),bh=48;
    const xs=[10,(w-bw)/2,w-10-bw];let s='';
    s+=box(xs[0],12,bw,bh,'pairs',fmt(TOYRES.data.pairs)+' labelled',on('data'));
    s+=box(xs[1],12,bw,bh,'reference','frozen SFT model',on('ref'));
    const showRm=m==='rlhf'&&k>=2,showPol=k>=3;
    if(m==='rlhf')s+=G(showRm?1:0.25,box(xs[2],12,bw,bh,'reward model',k>=2?'fitted, loaded':'not yet',on('rm'),!showRm,'var(--c2)'));
    else s+=G(0.35,box(xs[2],12,bw,bh,'reward model','none: implicit',false,true));
    s+=G(showPol?1:0.25,box(xs[1],120,bw,bh,'policy',showPol?'trainable':'not yet',on('pol'),!showPol,'var(--c1)'));
    if(m==='rlhf')s+=G(k>=3?0.8:0.2,box(xs[0],120,bw,bh,'value net','PPO usually',on('val'),true));
    // flows
    const ax=(x1,y1,x2,y2,c,op)=>G(0.35+0.65*op,ln2(x1,y1,x2,y2,c,{sw:2.2})+'<circle cx="'+x2+'" cy="'+y2+'" r="3" fill="'+c+'"/>');
    if(S.flow==='sample'||S.flow==='score'||S.flow==='upd'){const n=8;for(let i=0;i<n;i++){const t=(e*1.4+i/n)%1,yy=120+bh+10+t*40;s+=G(Math.sin(Math.PI*t),'<circle cx="'+(xs[1]+bw/2-30+i*8).toFixed(1)+'" cy="'+yy.toFixed(1)+'" r="3" fill="var(--c1)"/>')}
      s+=tx(xs[1]+bw/2,H-6,'64 new answers sampled per step',{fs:11,a:'middle',c:'var(--mute)'})}
    if(S.flow==='score'){s+=ax(xs[1]+bw,140,xs[2]+bw/2,12+bh+4,'var(--c2)',e);s+=ax(xs[1]+bw/2,120,xs[1]+bw/2,12+bh+4,'var(--mute)',e)}
    if(S.flow==='loss'){for(let i=0;i<6;i++){const t=(e*1.2+i/6)%1;s+=G(Math.sin(Math.PI*t),'<rect x="'+(xs[0]+bw/2-4+t*(xs[1]-xs[0])*0.9).toFixed(1)+'" y="'+(12+bh+8+t*50).toFixed(1)+'" width="9" height="6" rx="2" fill="var(--c5)"/>')}
      s+=tx(xs[1]+bw/2,H-6,'64 stored pairs per step, nothing generated',{fs:11,a:'middle',c:'var(--mute)'})}
    if(S.flow==='upd')s+=G(e,tx(xs[1]+bw+8,150,'θ ← θ − η ∇ℒ',{fs:12,c:'var(--c1)'}));
    return svgW(w,H,s,'Pipeline')},
   counters(m,k){const M_=m==='rlhf'?(k>=3?'4 (policy, reference, reward, value)':k>=2?'2':'1'):(k>=3?'2 (policy, reference)':'1');
    const smp=m==='rlhf'?(k<4?0:k===6?sp.samples:64):0;
    return '<span>models in memory: <b>'+M_+'</b></span><span>answers generated in training: <b>'+fmt(smp)+'</b></span><span>networks trained: <b>'+(m==='rlhf'?(k>=6?2:k>=2?1:0):(k>=5?1:0))+'</b></span>'}});
})();

// ---------- 2. One batch through DPO and through Unlikelihood ----------
(function(){let beta=1;const lab=(s,i)=>s.s;
  const steps=m=>CK.map((s,i)=>({t:i===0?'Start: π<sub>θ</sub> = π<sub>ref</sub>':'After '+s+' step'+(s>1?'s':''),get c(){return caption(m,i)}}));
  const M={dpo:steps('dpo'),ul:steps('ul')};
  function caption(m,k){const R=ckRun(m,beta),S=R.snaps[k],p0=S.pairs[0];
    if(k===0)return 'Every log-ratio is 0, so every margin is 0 and every DPO weight is σ(0) = ½. Exact over all reviews: KL 0, true reward '+S.rw.toFixed(3)+'.';
    const avgW=S.pairs.reduce((a,p)=>a+p.w,0)/4;
    const mg=S.pairs.reduce((a,p)=>a+p.lw-p.ll,0)/4;
    if(m==='ul')return 'Every pair still pushes at full strength (weight 1), however well it is already ordered; the average margin of these four is '+mg.toFixed(1)+' nats. Answers also move because they appear in other pairs, on either side. KL '+S.kl.toFixed(2)+', true reward '+S.rw.toFixed(3)+' (best possible at this KL: '+FRS(S.kl).toFixed(3)+'), '+pc(S.gram)+' of the mass on grammatical reviews.';
    return 'Average weight of these pairs: '+avgW.toFixed(2)+', average margin '+mg.toFixed(1)+' nats. '+(avgW<0.25?'They are ordered well, so they barely push any more; the remaining gradient comes from pairs still ranked wrongly.':avgW>0.45?'The margins are still small relative to 1/β, so the weights stay near ½ and the update is close to the unweighted one.':'The weights are falling as the margins grow.')+' KL '+S.kl.toFixed(2)+', true reward '+S.rw.toFixed(3)+' (best possible at this KL: '+FRS(S.kl).toFixed(3)+').'}
  const A_=makeAnim({id:'pair',mode:'dpo',modes:M,dur:2200,draw(m,k,e,w){const R=ckRun(m,beta),a=R.snaps[Math.max(0,k-1)],b=R.snaps[k],ee=k===0?1:e;
    const LIM=R.lim||(R.lim=Math.max(2,Math.ceil(Math.max(...R.snaps.flatMap(q=>q.pairs.flatMap(p=>[Math.abs(p.lw),Math.abs(p.ll)])))))),lr=(x,y)=>x+(y-x)*ee,rowH=66,H=4*rowH+24,x0=w*0.5,half=w*0.5-12,XS=v=>x0+half*clampv(v,-LIM,LIM)/LIM;
    let s=ln2(x0,4,x0,H-22,'var(--mute)',{sw:1,da:'3 3'});
    niceTicks(-LIM,LIM,w<500?4:6).filter(v=>v&&Math.abs(v)<=LIM).forEach(v=>{s+=tx(XS(v),H-8,(v>0?'+':'')+v,{fs:11,a:'middle',c:'var(--mute)'})});s+=tx(x0,H-8,'0',{fs:11,a:'middle',c:'var(--mute)'});
    R.ex.forEach((pr,i)=>{const y=4+i*rowH,P=a.pairs[i],Q=b.pairs[i],lw=lr(P.lw,Q.lw),ll=lr(P.ll,Q.ll),wt=lr(P.w,Q.w),E=TOYRES.examples[i];
      s+=tx(8,y+11,'pair '+(i+1)+' · weight '+wt.toFixed(2),{fs:11,w:600})+rc(w-8-64,y+3,64,8,'var(--soft)',{s:'var(--line)',r:3})+rc(w-8-64,y+3,64*wt,8,'var(--mu)',{r:3});
      const sg2=v=>{v=Math.abs(v)<0.005?0:v;return (v>=0?'+':'−')+Math.abs(v).toFixed(2)};
      s+=tx(8,y+25,'chosen "'+E.w+'"  '+sg2(lw),{fs:11,c:'var(--mw)'})+rc(Math.min(x0,XS(lw)),y+29,Math.max(1,Math.abs(XS(lw)-x0)),8,'var(--mw)',{r:2});
      s+=tx(8,y+50,'rejected "'+E.l+'"  '+sg2(ll),{fs:11,c:'var(--ml)'})+rc(Math.min(x0,XS(ll)),y+54,Math.max(1,Math.abs(XS(ll)-x0)),8,'var(--ml)',{r:2})});
    return svgW(w,H,s,'Four pairs through the loss')},
   counters(m,k){const S=ckRun(m,beta).snaps[k];return '<span>step <b>'+S.s+'</b></span><span>exact KL <b>'+S.kl.toFixed(2)+'</b></span><span>true reward <b>'+S.rw.toFixed(3)+'</b></span><span>grammatical mass <b>'+pc(S.gram)+'</b></span>'}});
  $('pairB').addEventListener('change',e=>{beta=+e.target.value;A_.st.lk=-1;A_.draw()});
})();

// ---------- 3. The implicit reward against the true reward ----------
(function(){let mode='dpo',beta=1,rm=null;const ids=[...new Set(DATA.flat())];
  function draw(w){let rv;if(mode==='dpo'){const th=ckRun('dpo',beta).theta,lp=TOY.logSoftmax(th);rv=ids.map(id=>beta*(TOY.seqLogp(lp,id)-TOY.seqLogp(TOY.LREF,id)))}
    else{rm=rm||TOY.trainRM(DATA,{epochs:3});rv=ids.map(id=>rm.r[id])}
    const pr=ids.map(id=>Math.exp(TOY.seqLogp(TOY.LREF,id))),W_=pr.reduce((a,b)=>a+b,0);
    const mu=rv.reduce((a,v,i)=>a+v*pr[i],0)/W_;const yv=rv.map(v=>v-mu);
    const lo=Math.min(...yv),hi=Math.max(...yv),H=w<500?240:280;
    const f=linFrame({W:w,H,pl:44,pr:10,pt:10,pb:32,x:[0,1],y:[lo-0.05*(hi-lo),hi+0.05*(hi-lo)],xl:'true reward r* (the classifier)',yl:mode==='dpo'?'β log π_θ/π_ref (centred)':'r_φ (centred)',fx:v=>v.toFixed(1),fy:v=>v.toFixed(1)});
    let s=f.s;ids.forEach((id,i)=>{s+=dotS(f.X(TOY.RSTAR[id]),f.Y(yv[i]),Math.max(1.6,Math.min(7,Math.sqrt(pr[i])*40)),TOY.grammatical(id)?'var(--c1)':'var(--c2)',{op:.55,t:TOY.text(id)})});
    $('irSvg').innerHTML=svgW(w,H,s,'Implicit reward against true reward');
    // weighted correlation and pair accuracy
    let sx=0,sy=0,sxx=0,syy=0,sxy=0;ids.forEach((id,i)=>{const p=pr[i]/W_,x=TOY.RSTAR[id],y=yv[i];sx+=p*x;sy+=p*y;sxx+=p*x*x;syy+=p*y*y;sxy+=p*x*y});
    const cor=(sxy-sx*sy)/Math.sqrt((sxx-sx*sx)*(syy-sy*sy));const ix=new Map(ids.map((id,i)=>[id,i]));let ok=0;DATA.forEach(([a,b])=>{if(yv[ix.get(a)]>yv[ix.get(b)])ok++});
    $('irOut').innerHTML=(mode==='dpo'?'DPO at β = '+beta+' after 600 steps: its log-ratio':'The RLHF reward model')+' orders <b>'+pc(ok/DATA.length)+'</b> of the '+fmt(DATA.length)+' training pairs the right way, and correlates with the true reward at <b>'+cor.toFixed(3)+'</b> (Pearson, weighted by π<sub>ref</sub>). Blue: grammatical reviews; orange: the rest. '+(mode==='dpo'?'Nobody trained this as a reward model: it is the policy, read through Eq. 5.':'')}
  segBind('irM',m=>{mode=m;refit($('irSvg'))});$('irB').addEventListener('change',e=>{beta=+e.target.value;refit($('irSvg'))});
  const go=()=>fit($('irSvg'),draw);
  setTimeout(go,0);
  onTab('t-read',()=>refit($('irSvg')));
})();

// ---------- 4. Predictions and the numbers in the prose ----------
(function(){const T=TOYRES.theorem,last=a=>a[a.length-1];
  $('thLoss').innerHTML='after 4,000 full-batch steps each, '+last(T.dpoLoss)[1].toFixed(5)+' for DPO and '+last(T.rmLoss)[1].toFixed(5)+' for the reward model (Bradley-Terry labels, β = '+T.beta+')';
  $('thUn').textContent=T.unseenDPO>0.9999?'more than 99.99%':pc(T.unseenDPO,2);
  const d=SW('DPO β = 0.1'),z=last(d.trace);$('dispC').textContent=z.c.toFixed(2);$('dispX').textContent=fmt(Math.exp(-z.c),0);$('dispL').textContent=z.l.toFixed(2);
  PRED_REVEAL['pr-disp']=()=>fit($('dispSvg'),w=>{const H=210,runs=['DPO β = 0.1','DPO β = 1','DPO β = 5'].map(SW);
    const cv=x=>x.c==null?0:x.c,lv=x=>x.l==null?0:x.l;const all=runs.flatMap(r=>r.trace.flatMap(x=>[cv(x),lv(x)]));const leg=legendW([['chosen, β = 0.1','var(--mw)'],['rejected, β = 0.1','var(--ml)'],['β = 1','var(--mw)','da'],['β = 5','var(--mu)']],44,13,w-54);
    const f=linFrame({W:w,H,pl:40,pr:10,pt:10+leg.h,pb:30,x:[0,600],y:[Math.min(...all)-0.5,1],xl:'training step',yl:'log π_θ/π_ref (nats)'});let s=f.s+leg.s+ln2(40,f.Y(0),w-10,f.Y(0),'var(--mute)',{sw:1});
    runs.forEach((r,i)=>{const c=i===2?'var(--mu)':'var(--mw)',c2=i===2?'var(--mu)':'var(--ml)',da=i===1?'5 3':null;s+=lineS(r.trace.map(x=>[x.s,cv(x)]),f.X,f.Y,c,{da})+lineS(r.trace.map(x=>[x.s,lv(x)]),f.X,f.Y,c2,{da,op:i?0.7:1})});
    $('dispSvg').innerHTML=svgW(w,H,s,'Chosen and rejected log-ratios during training')});
  // toy against paper
  const BM=TOYRES.byMethod,g=m=>BM.find(x=>x.m===m).meanGap.toFixed(3);
  $('toyGap').innerHTML='PPO-GT '+g('PPO-GT')+', PPO '+g('PPO')+', Preferred-FT '+g('Preferred-FT')+', DPO '+g('DPO')+' overall, of which DPO at β = 5: '+SW('DPO β = 5').meanGap.toFixed(3)+', β = 1: '+SW('DPO β = 1').meanGap.toFixed(3)+', β = 0.1: '+SW('DPO β = 0.1').meanGap.toFixed(3)+', β = 0.05: '+SW('DPO β = 0.05').meanGap.toFixed(3)+'; Unlikelihood '+g('Unlikelihood');
  PRED_REVEAL['pr-toy']=()=>fit($('toyMini'),w=>{const ms=['DPO','PPO','PPO-GT','Unlikelihood','Preferred-FT'];const P=toyPlane(w,{legend:ms.map(m=>[m,MCOL[m],'d'])});let s=P.s;
    TOYRES.sweep.forEach(r=>r.trace.slice(1).forEach(x=>{if(x.kl<=P.xmax)s+=dotS(P.X(x.kl),P.Y(x.r),2.4,MCOL[r.m],{op:.65,t:r.m+' '+r.p+', step '+x.s})}));
    $('toyMini').innerHTML=svgW(w,P.H,s,'Toy sweep')});
  const rc_=PAPER.rc;$('seZ').textContent='4.7 ± 4.3 points, z = '+rc_.tldr_gap_z.toFixed(2);$('seZ2').textContent=rc_.tldr_dpo_vs_bo_z.toFixed(1);$('seZ3').textContent=rc_.hh_dpo_vs_bo_z.toFixed(1);
})();

// ---------- 5. Figure 2 left, rebuilt from its vector data ----------
const F2COL={'DPO (Ours)':'var(--c1)','Unlikelihood':'var(--c4)','PPO (Our impl.)':'var(--c2)','PPO-GT (Our impl.)':'var(--c3)','PPO-GT (TRL)':'var(--c6)','Preferred-FT':'var(--c5)'};
function drawF2(el,w,show,o){o=o||{};const S=Object.values(FIGS.frontier.series),H=o.H||(w<500?260:320),nm=S.map(s=>s.label).filter(n=>!show||show[n]);
  const leg=legendW(nm.map(n=>[n,F2COL[n],'d']),46,14,w-56);
  const f=linFrame({W:w,H,pl:42,pr:10,pt:10+leg.h,pb:32,x:[0,20],y:[0.4,1.0],xl:'KL(π ‖ π_ref), as plotted',yl:'true reward (classifier)',fy:v=>v.toFixed(1)});let s=f.s+leg.s;
  S.forEach(sr=>{if(show&&!show[sr.label])return;const c=F2COL[sr.label];if(o.env!==false)s+=lineS(envelope(sr.points),f.X,f.Y,c,{sw:1.6,op:.85});
    sr.points.forEach(p=>{s+=dotS(f.X(p[0]),f.Y(p[1]),sr.label.startsWith('DPO')?3:2.5,c,{op:.75,hollow:!sr.label.startsWith('DPO'),sw:1.3,t:sr.label+': KL '+p[0].toFixed(2)+', reward '+p[1].toFixed(3)})})});
  el.innerHTML=svgW(w,H,s,'Figure 2 left rebuilt')}
fit($('f2Mini'),w=>drawF2($('f2Mini'),w,null));
