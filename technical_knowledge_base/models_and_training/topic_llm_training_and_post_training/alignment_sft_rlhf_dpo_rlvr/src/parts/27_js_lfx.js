// ---- Reading, DPO family: the push on one pair as a function of its margin, one loss per step ----
// Moved from the DPO paper page's Then and now tab on 2026-10-26 (this page owns the DPO family). A stepper on RD.anim:
// nothing moves until the reader acts. Toy outcomes in the counters: window.LFX (mk_lfx_data.py, from the DPO page's long runs).
window.AL_LFX=(function(){
  const card=document.getElementById('lfx');if(!card)return null;
  const sg=x=>1/(1+Math.exp(-x)),ls=x=>x>-30?Math.log1p(Math.exp(-x)):-x;   // ls(x) = -log sigma(x)
  const AX='https://arxiv.org/html/2305.18290v3#A3.SS3';
  const F=[
   {n:'Unlikelihood',d:'2019, the DPO paper\'s baseline',run:'Unlikelihood α = 1',c:'var(--c4)',push:h=>1,loss:h=>1-h/5,
    t:'Unlikelihood: push every pair at full strength',cap:z=>'−log π(<i>y<sub>w</sub></i>) + α log π(<i>y<sub>l</sub></i>) (DPO paper, <a href="'+AX+'" target="_blank" rel="noopener noreferrer">App. C.3</a>). The push does not depend on the margin at all, and nothing ties the policy to π<sub>ref</sub>. On the toy the grammar is gone by 4,000 steps ('+pc(z.g)+' grammatical), the paper\'s "when when when" in miniature.'},
   {n:'DPO',d:'May 2023',run:'DPO β = 0.1',c:'var(--c1)',push:h=>2*sg(-0.1*h),loss:h=>ls(0.1*h)/Math.LN2,
    t:'DPO: push fades as the margin grows, but never stops',cap:z=>'−log σ(β<i>h</i>). The weight σ(−β<i>h</i>) is the paper\'s key ingredient; but it only reaches zero at an infinite margin, so with near-deterministic preferences the margins keep growing and the KL penalty is effectively ignored (Azar et al.\'s critique). At β = 0.1 the push is still 75% of its starting value at a margin of 5 nats. On the toy the KL keeps climbing: '+z.kl1200.toFixed(2)+' at 1,200 steps, '+z.kl.toFixed(2)+' at 4,000.'},
   {n:'Hinge (SLiC-HF)',d:'May 2023, concurrent',run:'Hinge (SLiC) β = 0.5',c:'var(--c5)',push:h=>0.5*h<1?1:0,loss:h=>Math.max(0,1-0.5*h),
    t:'SLiC-HF\'s hinge: full push until a fixed margin, then none',cap:z=>'max(0, δ − β<i>h</i>), here with δ = 1 and β = 0.5, so the push stops at <i>h</i> = 2 (SLiC-HF calibrates sequence likelihoods this way, with an extra SFT term not run here). A pair that is ordered well enough is left alone.'},
   {n:'IPO',d:'October 2023',run:'IPO τ = 0.1',c:'var(--c6)',push:h=>1-2*0.1*h,loss:h=>(h-5)*(h-5)/25,
    t:'IPO: pull every margin to a target, from either side',cap:z=>'(<i>h</i> − 1/(2τ))². The push is linear and changes sign at the target margin 1/(2τ) = 5 nats, so a pair can be pushed back. Azar et al. derive it as the identity case of their ΨPO objective, which needs no Bradley-Terry assumption. On the toy it is the only loss whose KL nearly levels off: '+z.kl1200.toFixed(2)+' at 1,200 steps, '+z.kl.toFixed(2)+' at 4,000, against DPO\'s climb from '+D('DPO β = 0.1').kl1200.toFixed(2)+' to '+D('DPO β = 0.1').kl.toFixed(2)+'.'},
   {n:'cDPO',d:'November 2023 note; rDPO March 2024',run:'cDPO β = 0.1, ε = 0.1',c:'var(--c3)',push:h=>((0.9)*sg(-0.1*h)-0.1*sg(0.1*h))/0.4,loss:h=>(0.9*ls(0.1*h)+0.1*ls(-0.1*h))/Math.LN2,
    t:'Conservative DPO: assume ε of the labels are flipped',cap:z=>'(1 − ε) ℒ<sub>DPO</sub>(<i>y<sub>w</sub></i>, <i>y<sub>l</sub></i>) + ε ℒ<sub>DPO</sub>(<i>y<sub>l</sub></i>, <i>y<sub>w</sub></i>): the gradient is zero when σ(β<i>h</i>) = 1 − ε (Mitchell\'s note), at <i>h</i> = ln 9 / β ≈ 22 nats for ε = 0.1, β = 0.1. A finite stopping point, but far away; the toy is still drifting at 4,000 steps.'},
   {n:'SimPO',d:'May 2024',run:'SimPO β = 2, γ = 1',c:'var(--c2)',push:h=>sg(-(0.5*h-1))/sg(1),loss:h=>ls(0.5*h-1)/ls(-1),
    t:'SimPO: no reference model, a length-averaged margin and a target gap',cap:z=>'−log σ(β/|<i>y<sub>w</sub></i>| log π(<i>y<sub>w</sub></i>) − β/|<i>y<sub>l</sub></i>| log π(<i>y<sub>l</sub></i>) − γ). Dropping π<sub>ref</sub> saves memory and aligns the reward with how text is generated (average log-probability), but nothing anchors the policy except early stopping: on the toy, where every answer has 4 words so the length fix cannot help, it degenerates fastest ('+pc(z.g)+' grammatical).'}];
  function D(n){return window.LFX[n]}
  function pc(v){return (100*v).toFixed(1)+'%'}
  let mode='push';
  function draw(k){
    const el=document.getElementById('lfxSvg'),w=RD.width(el),H=w<500?250:290,key=mode,yr=mode==='push'?[-1.5,2.1]:[0,2.6];
    const pl=44,pr=10,pt=12,pb=34,x0=-5,x1=25,X=v=>pl+(w-pl-pr)*(v-x0)/(x1-x0),Y=v=>pt+(H-pt-pb)*(1-(v-yr[0])/(yr[1]-yr[0]));
    const cl=v=>v<yr[0]?yr[0]:v>yr[1]?yr[1]:v;
    let s='';
    for(let v=Math.ceil(yr[0]*2)/2;v<=yr[1]+1e-9;v+=0.5)s+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" style="stroke:var(--line)"/>'+RD.t(pl-4,(Y(v)+3).toFixed(1),v.toFixed(1),{fs:10,a:'end',fill:'var(--mute)'});
    for(let v=x0;v<=x1;v+=5)s+=RD.t(X(v).toFixed(1),H-pb+14,String(v),{fs:10,a:'middle',fill:'var(--mute)'});
    s+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+Y(0).toFixed(1)+'" y2="'+Y(0).toFixed(1)+'" style="stroke:var(--mute)"/><line x1="'+X(0).toFixed(1)+'" x2="'+X(0).toFixed(1)+'" y1="'+pt+'" y2="'+(H-pb)+'" style="stroke:var(--mute);stroke-dasharray:3 3"/>';
    s+=RD.t((pl+w-pr)/2,H-3,'margin h (nats)',{fs:10.5,a:'middle',fill:'var(--mute)'})+RD.t(w-pr-2,pt+10,mode==='push'?'push on the pair (1 at h = 0)':'loss (1 at h = 0)',{fs:10.5,a:'end',fill:'var(--mute)'});
    const path=(fn,c,sw,op)=>{let d='';for(let h=x0;h<=x1+1e-9;h+=0.25)d+=(d?'L':'M')+X(h).toFixed(1)+' '+Y(cl(fn(h))).toFixed(1);return '<path d="'+d+'" style="fill:none;stroke:'+c+';stroke-width:'+sw+';opacity:'+op+'"/>'};
    for(let i=0;i<k;i++)s+=path(F[i][key],F[i].c,1.3,.35);
    s+=path(F[k][key],F[k].c,2.6,1);
    const lx=F[k].n==='Hinge (SLiC-HF)'?6:14;s+=RD.t((X(lx)+4).toFixed(1),(Y(cl(F[k][key](lx)))-6).toFixed(1),F[k].n,{fs:12,w:600,fill:F[k].c});
    el.innerHTML=RD.svg(w,H,s,'The push each preference loss puts on one pair, against the pair\'s margin');
    const z=D(F[k].run);
    document.getElementById('lfxStep').innerHTML=F[k].t+' <span class="mute">('+F[k].d+')</span>';
    document.getElementById('lfxCap').innerHTML=F[k].cap(z);
    document.getElementById('lfxCnt').innerHTML='<span>on the DPO page\'s toy after '+z.steps.toLocaleString('en')+' steps ('+F[k].run+'):</span> <span>KL <b>'+z.kl.toFixed(2)+'</b></span> <span>true reward <b>'+z.r.toFixed(3)+'</b></span> <span>grammatical <b>'+pc(z.g)+'</b></span> <span>never seen <b>'+pc(z.u)+'</b></span> <span>top review "<b>'+z.top+'</b>"</span>';
  }
  const A=RD.anim({card:'lfx',ctl:'lfxCtl',n:F.length,draw,ms:2600,label:'Loss'});
  RD.seg(document.getElementById('lfxM'),m=>{mode=m;A.redraw()});
  RD.onResize(()=>A.redraw());
  return {F,A,draw};
})();
