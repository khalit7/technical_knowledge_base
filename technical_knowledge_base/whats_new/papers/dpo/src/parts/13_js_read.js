// ---- The paper tab: data for the two 3D stages, implicit reward, predictions, Figure 2 ----
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

// ---------- 1 and 2. Data for the two 3D stages (31_js_sc_pipe.js, 32_js_sc_pair.js) ----------
// the RLHF reward model of the toy (Eq. 2, 3 epochs, best validation epoch), fitted once and shared with the implicit-reward plot
const RMFIT=()=>RMFIT.r||(RMFIT.r=TOY.trainRM(DATA,{epochs:3}));
// the four example pairs' sequence ids, and a reward model score centred on its mean under the reference (a reward is defined only up to a constant)
const EXIDS=TOYRES.examples.slice(0,4).map(e=>[TOY.toId(e.w.split(' ').map(w=>TOY.W.indexOf(w))),TOY.toId(e.l.split(' ').map(w=>TOY.W.indexOf(w)))]);
const RMC=id=>{const rm=RMFIT();if(RMC.mu==null){let n=0,s=0;for(let i=0;i<TOY.N;i++){const p=Math.exp(TOY.seqLogp(TOY.LREF,i));n+=p;s+=p*rm.r[i]}RMC.mu=s/n}return rm.r[id]-RMC.mu};

// ---------- 3. The implicit reward against the true reward ----------
(function(){let mode='dpo',beta=1;const ids=[...new Set(DATA.flat())];
  function draw(w){let rv;if(mode==='dpo'){const th=ckRun('dpo',beta).theta,lp=TOY.logSoftmax(th);rv=ids.map(id=>beta*(TOY.seqLogp(lp,id)-TOY.seqLogp(TOY.LREF,id)))}
    else{const rm=RMFIT();rv=ids.map(id=>rm.r[id])}
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
  fit($('dispSvg'),w=>{const H=210,runs=['DPO β = 0.1','DPO β = 1','DPO β = 5'].map(SW);
    const cv=x=>x.c==null?0:x.c,lv=x=>x.l==null?0:x.l;const all=runs.flatMap(r=>r.trace.flatMap(x=>[cv(x),lv(x)]));const leg=legendW([['chosen, β = 0.1','var(--mw)'],['rejected, β = 0.1','var(--ml)'],['β = 1','var(--mw)','da'],['β = 5','var(--mu)']],44,13,w-54);
    const f=linFrame({W:w,H,pl:40,pr:10,pt:10+leg.h,pb:30,x:[0,600],y:[Math.min(...all)-0.5,1],xl:'training step',yl:'log π_θ/π_ref (nats)'});let s=f.s+leg.s+ln2(40,f.Y(0),w-10,f.Y(0),'var(--mute)',{sw:1});
    runs.forEach((r,i)=>{const c=i===2?'var(--mu)':'var(--mw)',c2=i===2?'var(--mu)':'var(--ml)',da=i===1?'5 3':null;s+=lineS(r.trace.map(x=>[x.s,cv(x)]),f.X,f.Y,c,{da})+lineS(r.trace.map(x=>[x.s,lv(x)]),f.X,f.Y,c2,{da,op:i?0.7:1})});
    $('dispSvg').innerHTML=svgW(w,H,s,'Chosen and rejected log-ratios during training')});
  // toy against paper
  const BM=TOYRES.byMethod,g=m=>BM.find(x=>x.m===m).meanGap.toFixed(3);
  $('toyGap').innerHTML='PPO-GT '+g('PPO-GT')+', PPO '+g('PPO')+', Preferred-FT '+g('Preferred-FT')+', DPO '+g('DPO')+' overall, of which DPO at β = 5: '+SW('DPO β = 5').meanGap.toFixed(3)+', β = 1: '+SW('DPO β = 1').meanGap.toFixed(3)+', β = 0.1: '+SW('DPO β = 0.1').meanGap.toFixed(3)+', β = 0.05: '+SW('DPO β = 0.05').meanGap.toFixed(3)+'; Unlikelihood '+g('Unlikelihood');
  fit($('toyMini'),w=>{const ms=['DPO','PPO','PPO-GT','Unlikelihood','Preferred-FT'];const P=toyPlane(w,{legend:ms.map(m=>[m,MCOL[m],'d'])});let s=P.s;
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
