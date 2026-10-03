// ---- Reading, DPO family: one preference pair through eight losses (port of recompute.py, checked by check_pair.mjs) ----
window.AL_PAIR=(function(){
  const CH=['12',' pens',' is',' ','4',' groups',' of',' ','3',',',' so',' ','4',' ×',' $','2',' =',' $','8','.','<eos>'];
  const CH_P=[0.55,0.92,0.70,0.80,0.45,0.60,0.95,0.90,0.85,0.75,0.80,0.85,0.80,0.55,0.85,0.95,0.90,0.95,0.70,0.85,0.90];
  const RJ=['12',' pens',' cost',' ','12',' ×',' $','2',' =',' $','24','.','<eos>'];
  const RJ_P=[0.55,0.92,0.60,0.80,0.50,0.70,0.85,0.90,0.92,0.95,0.80,0.85,0.90];
  const SH=2;
  const P={rm:{},dpo:{beta:0.1},cdpo:{beta:0.1,eps:0.1},ipo:{tau:0.1},lndpo:{beta:5},simpo:{beta:2,gamma:1},orpo:{lam:0.1},kto:{beta:0.1,lD:1,lU:1}};
  const sig=x=>1/(1+Math.exp(-x)),logit=p=>Math.log(p/(1-p));
  const logsig=x=>x>-30?-Math.log1p(Math.exp(-x)):x;
  const sum=a=>a.reduce((s,x)=>s+x,0);
  const refC=CH_P.map(Math.log),refR=RJ_P.map(Math.log),sRefC=sum(refC),sRefR=sum(refR);
  function evaluate(m,thC,thR,rm){
    const q=P[m],lc=thC.map(logsig),lr=thR.map(logsig),Sc=sum(lc),Sr=sum(lr),nc=lc.length,nr=lr.length,Dc=Sc-sRefC,Dr=Sr-sRefR;
    const o={Sc,Sr,Dc,Dr,nc,nr,lc,lr};let gc=0,gr=0;
    if(m==='rm'){const h=rm[0]-rm[1];Object.assign(o,{score_c:rm[0],score_r:rm[1],margin:h,loss:-logsig(h),grm:sig(-h)})}
    else if(m==='dpo'){const b=q.beta,h=b*(Dc-Dr);Object.assign(o,{score_c:b*Dc,score_r:b*Dr,margin:h,loss:-logsig(h)});gc=b*sig(-h);gr=-b*sig(-h)}
    else if(m==='cdpo'){const b=q.beta,e=q.eps,h=b*(Dc-Dr);Object.assign(o,{score_c:b*Dc,score_r:b*Dr,margin:h,loss:-(1-e)*logsig(h)-e*logsig(-h)});const g=(1-e)*sig(-h)-e*sig(h);gc=b*g;gr=-b*g}
    else if(m==='ipo'){const t=q.tau,h=Dc-Dr;Object.assign(o,{score_c:Dc,score_r:Dr,margin:h,loss:(h-1/(2*t))**2});const g=-2*(h-1/(2*t));gc=g;gr=-g}
    else if(m==='lndpo'){const b=q.beta,h=b*(Dc/nc-Dr/nr);Object.assign(o,{score_c:b*Dc/nc,score_r:b*Dr/nr,margin:h,loss:-logsig(h)});gc=b/nc*sig(-h);gr=-b/nr*sig(-h)}
    else if(m==='simpo'){const b=q.beta,g0=q.gamma,h=b*Sc/nc-b*Sr/nr-g0;Object.assign(o,{score_c:b*Sc/nc,score_r:b*Sr/nr,margin:h,loss:-logsig(h)});gc=b/nc*sig(-h);gr=-b/nr*sig(-h)}
    else if(m==='orpo'){const lam=q.lam,ac=Sc/nc,ar=Sr/nr,Pc=Math.exp(ac),Pr=Math.exp(ar),oc=ac-Math.log(1-Pc),orr=ar-Math.log(1-Pr),z=oc-orr,nll=-ac;
      Object.assign(o,{score_c:oc,score_r:orr,margin:z,loss:nll+lam*-logsig(z),nll,Pc,Pr});gc=1/nc+lam*sig(-z)/(1-Pc)/nc;gr=-lam*sig(-z)/(1-Pr)/nr}
    else if(m==='kto'){const b=q.beta,lD=q.lD,lU=q.lU,z0=Math.max(0,(Dc+Dr)/2),sD=sig(b*(Dc-z0)),sU=sig(b*(z0-Dr));
      Object.assign(o,{score_c:Dc,score_r:Dr,z0,margin:Dc-Dr,loss:(lD-lD*sD)+(lU-lU*sU),vD:lD*sD,vU:lU*sU});gc=lD*b*sD*(1-sD);gr=-lU*b*sU*(1-sU)}
    o.gc=gc;o.gr=gr;return o}
  // 400 steps of gradient descent, step size fixed from the first step (largest parameter moves by lr)
  function train(m,steps,lr){steps=steps||400;lr=lr||0.1;
    let th=m==='rm'?[]:CH_P.map(logit).concat(RJ_P.slice(SH).map(logit));const rm=[0,0],nc=CH_P.length;let rate=0;
    const thC=()=>m==='rm'?CH_P.map(logit):th.slice(0,nc),thR=()=>m==='rm'?RJ_P.map(logit):th.slice(0,SH).concat(th.slice(nc));
    const traj=[],snap={};
    for(let s=0;s<=steps;s++){const o=evaluate(m,thC(),thR(),rm);
      traj.push({s,Sc:o.Sc,Sr:o.Sr,margin:o.margin,loss:o.loss,rmc:rm[0],rmr:rm[1]});
      snap[s]={thC:thC(),thR:thR(),rm:rm.slice()};
      if(s===steps)break;
      let g,params;
      if(m==='rm'){g=[-o.grm,o.grm];params=rm}
      else{g=th.map((t,i)=>{const p=sig(t),push=i<nc?o.gc+(i<SH?o.gr:0):o.gr;return -push*(1-p)});params=th}
      if(s===0){const gm=Math.max(...g.map(Math.abs))||1;rate=lr/gm}
      for(let i=0;i<params.length;i++)params[i]-=rate*g[i]}
    return {traj,snap}}
  return {CH,CH_P,RJ,RJ_P,SH,P,evaluate,train,logit,sRefC,sRefR};
})();
(function(){
  const $=id=>document.getElementById(id);if(!$('pr'))return;
  const X=window.AL_PAIR;
  const MET=[
    {k:'rm',n:'Reward model',bef:1,mem:'1 (the RM, trained)',fw:'2 RM passes',
      eq:'L = −log σ( r(x, y<sub>w</sub>) − r(x, y<sub>l</sub>) )',
      note:'Bradley-Terry on a separate scalar model. It never touches the policy: an RL stage (PPO, GRPO) still has to turn its scores into an assistant.'},
    {k:'dpo',n:'DPO',mem:'2 (policy, frozen reference)',fw:'2 policy + 2 reference (cacheable)',
      eq:'L = −log σ( β [ (log π − log π<sub>ref</sub>)(y<sub>w</sub>) − (log π − log π<sub>ref</sub>)(y<sub>l</sub>) ] ),  β = 0.1',
      note:'The same Bradley-Terry loss, with the reward replaced by β log π/π<sub>ref</sub> summed over the answer: the policy is its own reward model.'},
    {k:'cdpo',n:'cDPO',mem:'2',fw:'as DPO',
      eq:'L = (1 − ε) L<sub>DPO</sub>(y<sub>w</sub>, y<sub>l</sub>) + ε L<sub>DPO</sub>(y<sub>l</sub>, y<sub>w</sub>),  β = 0.1, ε = 0.1',
      note:'Assumes each label is flipped with probability ε, so the push turns to zero once the model is 90% sure: at a margin of ln 9 = 2.20.'},
    {k:'ipo',n:'IPO',mem:'2',fw:'as DPO',
      eq:'L = ( h − 1/(2τ) )²,  h = (log π − log π<sub>ref</sub>)(y<sub>w</sub>) − (log π − log π<sub>ref</sub>)(y<sub>l</sub>),  τ = 0.1',
      note:'A squared loss with a target margin of 1/(2τ) = 5 nats: past it, the push reverses. Bounded where DPO is not.'},
    {k:'lndpo',n:'Length-normalised DPO',mem:'2',fw:'as DPO',
      eq:'L = −log σ( β [ (log π − log π<sub>ref</sub>)(y<sub>w</sub>)/|y<sub>w</sub>| − (log π − log π<sub>ref</sub>)(y<sub>l</sub>)/|y<sub>l</sub>| ] ),  β = 5',
      note:'Tulu 3\'s choice: DPO with each answer\'s log-ratio averaged over its tokens, so a long answer is not favoured or penalised for its length; β is per token, hence 5.'},
    {k:'simpo',n:'SimPO',mem:'1 (policy only)',fw:'2 policy',
      eq:'L = −log σ( (β/|y<sub>w</sub>|) log π(y<sub>w</sub>) − (β/|y<sub>l</sub>|) log π(y<sub>l</sub>) − γ ),  β = 2, γ = 1',
      note:'No reference: the reward is the average log-probability the model generates with, and γ asks for a margin. Note the first step: the wrong answer starts ahead on average log-probability, so the loss is above ln 2.'},
    {k:'orpo',n:'ORPO',mem:'1 (policy only)',fw:'2 policy',
      eq:'L = −(1/|y<sub>w</sub>|) log π(y<sub>w</sub>) + λ · −log σ( log odds(y<sub>w</sub>) − log odds(y<sub>l</sub>) ),  odds = P/(1 − P),  λ = 0.1',
      note:'SFT and preference in one loss: most of the push is the plain NLL on the chosen answer, the odds-ratio term adds a small push apart. No reference, no separate SFT stage.'},
    {k:'kto',n:'KTO',mem:'2',fw:'policy + reference per answer, plus mismatched pairs for z<sub>0</sub>',
      eq:'L = λ<sub>D</sub>(1 − σ(β(r<sub>w</sub> − z<sub>0</sub>))) + λ<sub>U</sub>(1 − σ(β(z<sub>0</sub> − r<sub>l</sub>))),  r = log π/π<sub>ref</sub>,  β = 0.1',
      note:'Each answer judged on its own, as if one had a thumbs up and the other a thumbs down: no pairing needed. The value function saturates, so the push fades once an answer is far enough from z<sub>0</sub>.'}];
  const RUN={};MET.forEach(m=>RUN[m.k]=X.train(m.k));
  const CK=[0,10,25,50,100,200,400];
  const STEPS=[
    {t:'The pair, and the reference',p:'One prompt ("A shop sells 3 pens for $2. How much do 12 pens cost?"), the correct answer (21 tokens) and a wrong one (13 tokens). Pale bars: each token\'s probability under the frozen reference (the SFT model); solid bars: under the policy being trained, which starts as a copy of it. The wrong answer is shorter, so its total log-probability is higher: −3.36 against −5.38.',s:0},
    {t:'What the loss reads',p:'',s:0,read:1},
    {t:'Score each answer, take the margin',p:'',s:0,score:1},
    {t:'The loss, and the push on each token',p:'',s:0,score:1,push:1},
    {t:'Train on this pair: 10 steps',p:'',s:10,score:1,push:1},
    {t:'25 steps',p:'',s:25,score:1,push:1},
    {t:'50 steps',p:'',s:50,score:1,push:1},
    {t:'100 steps',p:'',s:100,score:1,push:1},
    {t:'200 steps',p:'',s:200,score:1,push:1},
    {t:'400 steps: where it ends',p:'',s:400,score:1,push:1,end:1}];
  let cur='dpo',A;
  const f=(x,d)=>(x<0?'−':'')+Math.abs(x).toFixed(d==null?2:d);
  const met=()=>MET.find(m=>m.k===cur);
  $('prM').innerHTML=MET.map(m=>'<button data-m="'+m.k+'" class="'+(m.bef?'bef':'')+'">'+(m.bef?'Before: ':'')+m.n+'</button>').join('');
  function readText(m,o){
    const k=m.k;
    if(k==='rm')return 'The reward model reads the prompt and the whole answer and outputs one number per answer: here both start at 0 (an untrained head). The policy\'s token probabilities play no part.';
    if(k==='simpo'||k==='orpo')return 'Only the policy: the sum of each answer\'s token log-probabilities divided by its length ('+f(o.Sc/o.nc,3)+' for the correct answer, '+f(o.Sr/o.nr,3)+' for the wrong one). No reference model is loaded.';
    if(k==='lndpo')return 'Policy and reference, per answer, averaged over tokens: the log-ratio log π − log π<sub>ref</sub> divided by the length (21 and 13). At the start both are 0, because the policy is the reference.';
    if(k==='kto')return 'Policy and reference, each answer separately: r = log π − log π<sub>ref</sub>, compared with a reference point z<sub>0</sub>, an estimate of how far the policy has drifted overall (clipped at 0). The pairing is not used.';
    return 'Policy and reference, per answer: the summed log-ratio log π − log π<sub>ref</sub>. At the start both are 0, because the policy is the reference; the length of the answers does not enter.'}
  function scoreText(m,o){
    const k=m.k;
    if(k==='rm')return 'r(y<sub>w</sub>) = '+f(o.score_c)+', r(y<sub>l</sub>) = '+f(o.score_r)+'; margin '+f(o.margin)+', loss '+f(o.loss,3)+'.';
    if(k==='orpo')return 'log odds: chosen '+f(o.score_c)+', rejected '+f(o.score_r)+' (P = '+o.Pc.toFixed(3)+' and '+o.Pr.toFixed(3)+'); NLL '+f(o.nll,3)+' plus 0.1 × '+f(-Math.log(1/(1+Math.exp(-o.margin))),3)+': loss '+f(o.loss,3)+'.';
    if(k==='kto')return 'r<sub>w</sub> = '+f(o.score_c)+', r<sub>l</sub> = '+f(o.score_r)+', z<sub>0</sub> = '+f(o.z0)+'; values '+o.vD.toFixed(3)+' and '+o.vU.toFixed(3)+' of a possible 1 each: loss '+f(o.loss,3)+'.';
    return 'Implicit rewards: chosen '+f(o.score_c,3)+', rejected '+f(o.score_r,3)+'; margin '+f(o.margin,3)+(k==='simpo'?' (after subtracting γ)':'')+', loss '+f(o.loss,3)+'.'}
  function pushText(m,o){
    if(m.k==='rm')return 'The push lands on the two scores: r(y<sub>w</sub>) up and r(y<sub>l</sub>) down by σ(−margin) = '+o.grm.toFixed(3)+' each.';
    const sh=o.gc+o.gr;
    return 'Every token of the chosen answer is pushed up by '+f(o.gc,4)+' (in d loss / d log p), every token of the rejected one down by '+f(-o.gr,4)+'. The shared "12 pens" get both: '+(Math.abs(sh)<1e-12?'they cancel exactly, so DPO-style losses learn only from where the answers differ.':'net '+f(sh,4)+', '+(sh<0?'down: the shorter answer\'s per-token push is larger, so length normalisation lowers the shared prefix of a long chosen answer.':'up.'))}
  function endText(m){const tr=RUN[m.k].traj,a=tr[0],b=tr[tr.length-1];
    if(m.k==='rm')return 'The two scores keep moving apart ('+f(b.rmc)+' and '+f(b.rmr)+'): a hard label has no finite optimum, the same runaway the Constitutional AI page shows for 0/1 labels.';
    return 'Chosen answer: log-probability '+f(a.Sc)+' → '+f(b.Sc)+'. Rejected: '+f(a.Sr)+' → '+f(b.Sr)+'. '+({
      dpo:'The margin keeps growing, mostly by crushing the rejected answer: DPO\'s push never reaches zero, the overfitting IPO was written against.',
      cdpo:'It stops at margin '+f(b.margin)+' = ln 9: the label-noise assumption gives the loss a finite optimum.',
      ipo:'It stops exactly at its target margin of 5 nats, with both answers moved far less than under DPO.',
      lndpo:'Per-token averaging keeps the push alive longer than DPO at this β and spreads it over the long answer.',
      simpo:'With no reference to anchor it, the wrong answer is driven down hard; the correct answer gains little, partly because its shared prefix is pushed down.',
      orpo:'The NLL term lifts the correct answer close to certain, while the rejected answer falls only moderately: ORPO is mostly SFT with a nudge.',
      kto:'The correct answer is lifted towards certainty and the rejected one pushed down until its value function saturates, which at β = 0.1 takes a large gap.'}[m.k])}
  // line chart: chosen and rejected log-probability (or RM scores) over training, current method solid, DPO dashed
  function chart(el,step){
    const W=Math.max(240,RD.width(el)),H=170,pl=40,pr=8,pt=10,pb=26,m=met();
    const key=m.k==='rm'?['rmc','rmr']:['Sc','Sr'];
    const tr=RUN[m.k].traj,dp=RUN.dpo.traj;
    const all=[];[tr].concat(m.k==='rm'?[]:[dp]).forEach(t=>t.forEach(p=>{all.push(p[key[0]],p[key[1]])}));
    let lo=Math.min(...all),hi=Math.max(...all);if(hi-lo<1){hi+=.5;lo-=.5}
    const X=s=>pl+(W-pl-pr)*s/400,Y=v=>pt+(H-pt-pb)*(hi-v)/(hi-lo);
    const path=(t,k)=>t.filter(p=>p.s<=Math.max(step,1)).map((p,i)=>(i?'L':'M')+X(p.s).toFixed(1)+' '+Y(p[k]).toFixed(1)).join('');
    let g='';const ticks=4;for(let i=0;i<=ticks;i++){const v=lo+(hi-lo)*i/ticks;g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-4)+'" y="'+(Y(v)+4)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+f(v,1)+'</text>'}
    [0,100,200,300,400].forEach(s=>g+='<text x="'+X(s)+'" y="'+(H-8)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+s+'</text>');
    if(m.k!=='rm'){g+='<path d="'+path(dp,'Sc')+'" fill="none" stroke="var(--c3)" stroke-width="1.5" stroke-dasharray="4 3" opacity=".7"/><path d="'+path(dp,'Sr')+'" fill="none" stroke="var(--bad)" stroke-width="1.5" stroke-dasharray="4 3" opacity=".7"/>'}
    const full=(t,k)=>t.map((p,i)=>(i?'L':'M')+X(p.s).toFixed(1)+' '+Y(p[k]).toFixed(1)).join('');
    g+='<path d="'+full(tr,key[0])+'" fill="none" stroke="var(--c3)" stroke-width="1.2" opacity=".3"/><path d="'+full(tr,key[1])+'" fill="none" stroke="var(--bad)" stroke-width="1.2" opacity=".3"/>';
    g+='<path d="'+path(tr,key[0])+'" fill="none" stroke="var(--c3)" stroke-width="2.4"/><path d="'+path(tr,key[1])+'" fill="none" stroke="var(--bad)" stroke-width="2.4"/>';
    g+='<line x1="'+X(step)+'" x2="'+X(step)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--mute)" stroke-dasharray="2 3"/>';
    el.innerHTML='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Training curves">'+g+'</svg><div class="cap">'+(m.k==='rm'?'Reward-model scores of the chosen (green) and rejected (orange) answer over 400 steps.':'log p of the chosen (green) and rejected (orange) answer over 400 steps (faint: the rest of the run); dashed: DPO, for comparison.')+'</div>'}
  // the loss as a function of its margin, current point marked
  function lossPlot(el,o){
    const W=Math.max(240,RD.width(el)),H=170,pl=36,pr=8,pt=10,pb=26,m=met(),k=m.k;
    let lo=-4,hi=8,fn,lab='margin';
    const q=X.P[k];
    if(k==='rm'||k==='dpo'||k==='lndpo'||k==='simpo'||k==='orpo')fn=h=>-Math.log(1/(1+Math.exp(-h)));
    if(k==='cdpo')fn=h=>-(1-q.eps)*Math.log(1/(1+Math.exp(-h)))-q.eps*Math.log(1/(1+Math.exp(h)));
    if(k==='ipo'){fn=h=>(h-1/(2*q.tau))**2/25;lab='h (loss ÷ 25)'}
    if(k==='kto'){fn=r=>1-1/(1+Math.exp(-q.beta*r));lo=-60;hi=60;lab='r<sub>w</sub> − z<sub>0</sub> (desirable answer)'}
    let mv=k==='kto'?o.score_c-o.z0:(k==='ipo'?o.margin:o.margin);if(k==='orpo')mv=o.margin;
    lo=Math.min(lo,mv-1);hi=Math.max(hi,mv+1);
    const xs=[];for(let i=0;i<=120;i++)xs.push(lo+(hi-lo)*i/120);
    const ys=xs.map(fn),ymax=Math.max(...ys.filter(isFinite).map(v=>Math.min(v,6))),ymin=0;
    const Xp=v=>pl+(W-pl-pr)*(v-lo)/(hi-lo),Yp=v=>pt+(H-pt-pb)*(1-(Math.min(v,ymax)-ymin)/(ymax-ymin||1));
    let g='<line x1="'+Xp(0)+'" x2="'+Xp(0)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)"/><line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Yp(0)+'" y2="'+Yp(0)+'" stroke="var(--line)"/>';
    g+='<path d="'+xs.map((x,i)=>(i?'L':'M')+Xp(x).toFixed(1)+' '+Yp(ys[i]).toFixed(1)).join('')+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    g+='<circle cx="'+Xp(mv)+'" cy="'+Yp(fn(mv))+'" r="5" fill="var(--bad)"/>';
    [lo,0,hi].forEach(v=>g+='<text x="'+Xp(v)+'" y="'+(H-8)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+f(v,0)+'</text>');
    el.innerHTML='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Loss against margin">'+g+'</svg><div class="cap">'+(k==='orpo'?'The odds-ratio term against the log-odds margin (the NLL term comes on top).':'The loss against the '+lab+'; the dot is this pair now.')+(k==='simpo'?' The margin includes −γ.':'')+'</div>'}
  function tokRow(toks,lp,refp,push,isC){
    // bars: probability 0..1 drawn to 40 px; push bars to a scale shared by both answers of the method
    return toks.map((t,i)=>{const p=Math.exp(lp[i]),pr=refp[i],sh=i<X.SH,g=push?push[i]:0;
      const gh=Math.min(13,Math.abs(g)*13);
      return '<div class="pr-tk'+(sh?' sh':'')+'" title="'+RD.esc(t)+': reference '+pr.toFixed(2)+', policy '+p.toFixed(3)+'"><div class="b"><span style="height:'+(40*pr)+'px"></span><span class="pol" style="height:'+(40*p).toFixed(1)+'px;background:'+(isC?'var(--c3)':'var(--bad)')+'"></span></div>'+
        '<div class="g">'+(push?'<span style="'+(g>=0?'bottom:14px;':'top:14px;')+'height:'+gh.toFixed(1)+'px;background:'+(g>=0?'var(--good)':'var(--bad)')+';'+(g>=0?'':'')+'"></span>':'')+'</div>'+
        '<div class="t">'+RD.esc(t.replace(/^ /,'·'))+'</div></div>'}).join('')}
  function draw(i){
    const st=STEPS[i],m=met(),run=RUN[m.k],sn=run.snap[st.s];
    const o=X.evaluate(m.k,sn.thC,sn.thR,sn.rm),o0=X.evaluate(m.k,run.snap[0].thC,run.snap[0].thR,run.snap[0].rm);
    $('prM').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===m.k));
    $('prEq').innerHTML=m.eq;
    // push per token, scaled by this method's largest push at step 0 (so the shape is comparable across methods)
    let pc=null,pr=null;
    if(st.push&&m.k!=='rm'){const sc=Math.max(Math.abs(o0.gc+(o0.gr)),Math.abs(o0.gc),Math.abs(o0.gr))||1;
      pc=o.lc.map((_,j)=>(o.gc+(j<X.SH?o.gr:0))/sc);pr=o.lr.map((_,j)=>(o.gr+(j<X.SH?o.gc:0))/sc)}
    $('prW').innerHTML='<div class="pr-ans"><div class="h">Chosen: correct, 21 tokens <small>log p = '+f(o.Sc)+(st.s?' (was '+f(o0.Sc)+')':'')+'</small></div><div class="pr-toks">'+tokRow(X.CH,o.lc,X.CH_P,pc,1)+'</div></div>'+
      '<div class="pr-ans"><div class="h">Rejected: wrong, 13 tokens <small>log p = '+f(o.Sr)+(st.s?' (was '+f(o0.Sr)+')':'')+'</small></div><div class="pr-toks">'+tokRow(X.RJ,o.lr,X.RJ_P,pr,0)+'</div></div>';
    $('prN').innerHTML=RD.stat('Models in memory',m.mem,'forward passes: '+m.fw)+
      RD.stat(m.k==='kto'?'r<sub>w</sub> − r<sub>l</sub>':'Margin',st.score?f(o.margin,3):'not yet',m.k==='ipo'?'target 5':(m.k==='cdpo'?'push stops at 2.197':''))+
      RD.stat('Loss',st.score?f(o.loss,3):'not yet',st.s?'step '+st.s+' of 400':'first step')+
      RD.stat('Training step',st.s,'on this pair alone');
    let cap='<div class="t">'+(i+1)+' of '+STEPS.length+' · '+m.n+': '+st.t+'</div>';
    if(i===0)cap+=st.p;else if(st.read)cap+=readText(m,o);else if(st.end)cap+=endText(m);
    else if(st.push&&!st.s)cap+=scoreText(m,o)+' '+pushText(m,o)+' '+m.note;
    else if(st.score&&!st.push)cap+=scoreText(m,o);
    else cap+=scoreText(m,o)+' '+pushText(m,o);
    $('prC').innerHTML=cap;
    if(st.score){$('prP').innerHTML='<div id="prL"></div><div id="prT"></div>';lossPlot($('prL'),o);chart($('prT'),st.s)}else $('prP').innerHTML='';
  }
  A=RD.anim({card:'pr',ctl:'prCtl',n:STEPS.length,draw,ms:2600,label:'Step'});
  $('prM').addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;cur=b.dataset.m;A.redraw()});
  window.addEventListener('resize',()=>A.redraw());
})();
