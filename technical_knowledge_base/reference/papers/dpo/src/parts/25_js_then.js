// ---- Then and now: the push on a pair as a function of its margin, one loss at a time ----
(function(){const sg=TOY.sig,ls=x=>-TOY.lsig(x),LG=TOYRES.long,find=n=>LG.find(l=>l.name===n);
  const F=[
   {n:'Unlikelihood',d:'2019 / the paper\'s baseline',run:'Unlikelihood α = 1',c:'var(--c4)',push:h=>1,loss:h=>1-h/5,
    t:'Unlikelihood: push every pair at full strength',cap:'−log π(<i>y<sub>w</sub></i>) + α log π(<i>y<sub>l</sub></i>) (@APPC3@). The push does not depend on the margin at all, and nothing ties the policy to π<sub>ref</sub>. On the toy the grammar is gone by 4,000 steps, the paper\'s "when when when" in miniature.'},
   {n:'DPO',d:'May 2023',run:'DPO β = 0.1',c:'var(--c1)',push:h=>2*sg(-0.1*h),loss:h=>ls(0.1*h)/Math.LN2,
    t:'DPO: push fades as the margin grows, but never stops',cap:'−log σ(β<i>h</i>). The weight σ(−β<i>h</i>) is the paper\'s key ingredient; but it only reaches zero at an infinite margin, so with near-deterministic preferences the margins keep growing and the KL penalty is effectively ignored (Azar et al.\'s critique). At β = 0.1 the push is still 75% of its starting value at a margin of 5 nats.'},
   {n:'Hinge (SLiC-HF)',d:'May 2023, concurrent',run:'Hinge (SLiC) β = 0.5',c:'var(--c5)',push:h=>0.5*h<1?1:0,loss:h=>Math.max(0,1-0.5*h),
    t:'SLiC-HF\'s hinge: full push until a fixed margin, then none',cap:'max(0, δ − β<i>h</i>), here with δ = 1 and β = 0.5, so the push stops at <i>h</i> = 2 (SLiC-HF calibrates sequence likelihoods this way, with an extra SFT term not run here). A pair that is ordered well enough is left alone.'},
   {n:'IPO',d:'October 2023',run:'IPO τ = 0.1',c:'var(--c6)',push:h=>1-2*0.1*h,loss:h=>(h-5)*(h-5)/25,
    t:'IPO: pull every margin to a target, from either side',cap:'(<i>h</i> − 1/(2τ))². The push is linear and changes sign at the target margin 1/(2τ) = 5 nats, so a pair can be pushed back. Azar et al. derive it as the identity case of their ΨPO objective, which needs no Bradley-Terry assumption. On the toy it is the only loss whose KL nearly levels off: 1.26 at 1,200 steps, 1.52 at 4,000, against DPO\'s climb from 2.06 to 7.47.'},
   {n:'cDPO',d:'November 2023 note; rDPO March 2024',run:'cDPO β = 0.1, ε = 0.1',c:'var(--c3)',push:h=>((0.9)*sg(-0.1*h)-0.1*sg(0.1*h))/0.4,loss:h=>(0.9*ls(0.1*h)+0.1*ls(-0.1*h))/Math.LN2,
    t:'Conservative DPO: assume ε of the labels are flipped',cap:'(1 − ε) ℒ<sub>DPO</sub>(<i>y<sub>w</sub></i>, <i>y<sub>l</sub></i>) + ε ℒ<sub>DPO</sub>(<i>y<sub>l</sub></i>, <i>y<sub>w</sub></i>): the gradient is zero when σ(β<i>h</i>) = 1 − ε (Mitchell\'s note), at <i>h</i> = ln 9 / β ≈ 22 nats for ε = 0.1, β = 0.1. A finite stopping point, but far away; the toy is still drifting at 4,000 steps.'},
   {n:'SimPO',d:'May 2024',run:'SimPO β = 2, γ = 1',c:'var(--c2)',push:h=>sg(-(0.5*h-1))/sg(1),loss:h=>ls(0.5*h-1)/ls(-1),
    t:'SimPO: no reference model, a length-averaged margin and a target gap',cap:'−log σ(β/|<i>y<sub>w</sub></i>| log π(<i>y<sub>w</sub></i>) − β/|<i>y<sub>l</sub></i>| log π(<i>y<sub>l</sub></i>) − γ). Dropping π<sub>ref</sub> saves memory and aligns the reward with how text is generated (average log-probability), but nothing anchors the policy except early stopping: on the toy, where every answer has 4 words so the length fix cannot help, it degenerates fastest.'}];
  F.forEach(f=>{f.cap=f.cap.replace('@'+'APPC3@','<a href="'+PAPER.meta.ax+'#A3.SS3" target="_blank" rel="noopener noreferrer">App. C.3</a>')});
  const mk=()=>F.map(f=>({t:f.n+' ('+f.d+')',c:f.cap}));
  const A_=makeAnim({id:'lfx',mode:'push',modes:{push:mk(),loss:mk()},dur:2600,draw(m,k,e,w){const H=w<500?250:290,key=m==='push'?'push':'loss',yr=m==='push'?[-1.5,2.1]:[0,2.6];
    const f=linFrame({W:w,H,pl:40,pr:10,pt:12,pb:32,x:[-5,25],y:yr,xl:'margin h (nats)',yl:m==='push'?'push on the pair (1 at h = 0)':'loss (1 at h = 0)',fy:v=>v.toFixed(1)});
    let s=f.s+ln2(40,f.Y(0),w-10,f.Y(0),'var(--mute)',{sw:1})+ln2(f.X(0),12,f.X(0),H-32,'var(--mute)',{sw:1,da:'3 3'});
    const xs=[];for(let h=-5;h<=25.001;h+=0.25)xs.push(h);const cv=(fn)=>xs.map(h=>[h,clampv(fn(h),yr[0],yr[1])]);
    for(let i=0;i<k;i++)s+=lineS(cv(F[i][key]),f.X,f.Y,F[i].c,{sw:1.3,op:.35});
    const prev=k?F[k-1][key]:F[0][key],cur=F[k][key];s+=lineS(cv(h=>prev(h)+(cur(h)-prev(h))*e),f.X,f.Y,F[k].c,{sw:2.6});
    const lx=F[k].n==='Hinge (SLiC-HF)'?6:14,ly=clampv(cur(lx),yr[0],yr[1]);s+=G(e,tx(f.X(lx)+4,f.Y(ly)-6,F[k].n,{fs:12,c:F[k].c,w:600}));
    return svgW(w,H,s,'Loss family')},
   counters(m,k){const r=find(F[k].run),z=r.trace[r.trace.length-1];return '<span>on the toy after 4,000 steps ('+r.name+'):</span> <span>KL <b>'+z.kl.toFixed(2)+'</b></span><span>true reward <b>'+z.r.toFixed(3)+'</b></span><span>grammatical <b>'+pc(z.g)+'</b></span><span>never seen <b>'+pc(z.u)+'</b></span><span>top review "<b>'+r.top[0].t+'</b>"</span>'}});
})();
