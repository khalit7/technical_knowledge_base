// ---- Scene (slime stage, stg-sl): slime's disaggregated mode and GLM-5's two staleness rules. Left: four rollout engines as lanes over time,
// each bar one agentic episode, coloured by the policy version that generated each part of it; middle: the data buffer (glass); right: the
// trainer, pushing new weights back. Then rule 1 (discard if w' - w0 > tau) on the long episode, and rule 2 (mask tokens whose importance ratio
// leaves [1 - eps_l, 1 + eps_h]) on one kept trajectory. Every number here is illustrative (engines, lengths, push times, tau, band, ratios);
// the design and the rules are from the GLM-4.5 and GLM-5 reports. ----
(function(){
  if(!document.getElementById('stg-sl'))return;const {lerp,mix}=S3;
  const X0=-4.7,SC=.5,xt=t=>X0+t*SC,LZ=[-1.05,-.35,.35,1.05],BH=.22,BD=.44,TMAX=8;
  // episodes per lane: [start, end] on an illustrative clock; lane 2 holds the long one
  const EP=[[[0,1],[1,2.2],[2.2,3],[3,4.6],[4.6,5.2],[5.2,6.6],[6.6,7.8]],[[0,.6],[.6,1.4],[1.4,3.6],[3.6,4.2],[4.2,5.8],[5.8,6.4],[6.4,7.4]],
    [[0,7.8]],[[0,2.6],[2.6,3.2],[3.2,5.6],[5.6,6],[6,7.6]]];
  const PUSH=[3.4,5,6.6],TAU=2,ver=t=>PUSH.filter(p=>p<=t).length;
  const CLK=[[0,0],[0,3.2],[3.2,7],[7,8],[8,8]];
  // rule 2: one kept trajectory's tokens, importance ratios around 1 (illustrative), band [0.8, 1.28]
  const RT=[1,.97,1.04,1.1,.92,1.02,1.35,.99,1.06,.88,1.01,.95,1.15,.74,1.03,.98,1.08,1.21,.96,1.02,1.4,1.0,.93,1.05],LO=.8,HI=1.28;
  window.ZG_SL={TAU,PUSH,RT,LO,HI,EP};
  function draw(R,k,e,st){const P=R.P;R.grid(-5.6,4.6,-1.8,2.6,.5);
    const VC=[P.c2,P.c5,P.c6,P.c4];
    const lab=(p,t,o)=>{const q=R.p(p);if(q[2]<=0||q[0]<-30||q[0]>R.W+30||q[1]<-4||q[1]>R.H+4)return;R.label(p,t,o)};
    const la=f=>{const a=f(st.pk),b=f(k);if(e>=1||a===b)return b;return a>b?lerp(a,b,Math.min(1,2*e)):lerp(a,b,Math.max(0,2*e-1))};
    const tw=f=>{const a=f(st.pk),b=f(k);return e>=1||a===b?b:lerp(a,b,e)};
    const now=lerp(CLK[k][0],CLK[k][1],e),zoom=tw(s=>s===4?1:0),base=1-zoom;
    // the engines: lanes over time
    LZ.forEach((z,i)=>{R.box([xt(TMAX/2),0,z],[TMAX*SC+.1,.03,BD+.12],{fill:mix(P.paper,P.mute,.18),a:base,shadow:false,lw:.5})});
    lab([xt(0),0,LZ[3]+.6],R.W<520?'4 engines · time →':'4 rollout engines (SGLang) · time →',{fs:12,al:'left',dy:10,c:P.mute,a:la(s=>s<4?1:0)});
    // episodes: segments coloured by the policy version at the time they were generated
    let fin=[];
    EP.forEach((eps,i)=>eps.forEach(([s0,s1],j)=>{if(now<=s0+.001)return;const end=Math.min(now,s1),cuts=[s0,...PUSH.filter(p=>p>s0&&p<end),end];
      const stale=i===2&&now>=s1-.001,dis=stale?Math.min(1,(now-s1)/.15+(k>3?1:0)):0,ga=base*(stale?(k>=3?lerp(1,.25,k===3?e:1):1):1);
      for(let c=0;c<cuts.length-1;c++){const a0=cuts[c],a1=cuts[c+1];if(a1-a0<.01)continue;const col=stale&&k>=3?mix(VC[ver(a0)],P.mute,k===3?e:1):VC[ver(a0)];
        R.box([xt((a0+a1)/2),.03,LZ[i]],[(a1-a0)*SC-.025,BH,BD],{fill:mix(P.paper,col,.85),a:ga,shadow:false,lw:.5,ea:.5})}
      if(now>=s1&&now-s1<1.2&&!(i===2&&k>=3))fin.push([xt(s1),LZ[i],ver(s0)])}));
    // the buffer and the trainer
    const BX=.35,TX=2.75;
    R.box([BX,0,0],[.9,.9,2.5],{fill:mix(P.paper,P.c1,.35),fa:.18,ec:P.c1,ea:.8,a:base,lw:1,shadow:false});
    const nb=Math.min(14,Math.floor(EP.flat().filter(([s0,s1])=>s1<=now).length*.5));
    for(let i=0;i<nb;i++)R.box([BX,.04+i*.055,0],[.7,.035,2.2],{fill:mix(P.paper,P.c1,.5),a:base*.8,shadow:false,lw:.3,ea:.3});
    R.box([TX,0,0],[1.3,.9,1.8],{fill:mix(P.paper,P.c4,.25),a:base,lw:.9});
    const w=ver(now),lb=la(s=>s===4?0:1);lab([BX,0,1.25],R.W<520?'buffer':'data buffer',{fs:12.5,b:1,dy:18,c:P.c1,a:lb});
    lab([TX,0,.9],R.W<520?'trainer':'trainer (Megatron)',{fs:12.5,b:1,dy:18,c:P.ink,a:lb});lab([TX,0,.9],'w′ = '+w,{mono:true,fs:12.5,b:1,dy:34,c:VC[w],a:lb});
    // finished episodes stream into the buffer; the trainer pulls from it
    fin.forEach(([x,z,v])=>R.flow([[x,.2,z],[BX-.5,.3,z*.6],[BX-.2,.35,0]],{c:VC[v],a:base*.9,r:.05,n:5,speed:1.2}));
    if(now>.8&&k<4)R.flow([[BX+.45,.4,0],[TX-.65,.45,0]],{c:P.c1,a:base,r:.06,n:6,speed:1});
    // prompts in, and weight pushes back to the engines
    const pa=tw(s=>s===0?1:0);if(pa>.01)R.flow([[xt(0)-.7,.1,0],[xt(0)-.1,.1,0]],{c:P.ink,a:pa*.6,r:.05,n:5,speed:.8});
    if(pa>.01)lab([xt(0)-.7,.1,0],'prompts',{fs:12,dy:-14,c:P.mute,a:la(s=>s===0?1:0)});
    PUSH.forEach((p,i)=>{const ag=now-p;if(ag<0||ag>.9)return;R.flowArc([TX,.9,0],[xt(p),.3,0],1.1,{c:VC[i+1],a:base,r:.07,n:10,speed:1.6})});
    if(k===2)lab([xt(5),1.2,0],'new weights pushed back',{fs:12.5,b:1,dy:-10,c:P.ink,a:la(s=>s===2?1:0),wide:1});
    // rule 1: the long episode, started under w0 = 0, finishes at w' = 3 > tau: discarded
    const r1=la(s=>s===3?1:0);
    if(r1>.01){lab([xt(4),.25,LZ[0]-.4],'third lane: started at w₀ = 0, now w′ = 3; 3 − 0 > τ = 2, discarded',{fs:12.5,b:1,dy:-14,c:P.bad,a:r1,wide:1})}
    // rule 2: one kept trajectory's tokens as ratio bars, the band as two lines; tokens outside it masked
    if(zoom>.01){const x0=-1.6,dx=.16,z=1.95,yb=.05,hs=.8;
      R.quad([[x0-.15,yb,z-.3],[x0+RT.length*dx+.05,yb,z-.3],[x0+RT.length*dx+.05,yb,z+.3],[x0-.15,yb,z+.3]],{fill:P.soft,fa:.7,ec:P.line,a:zoom});
      RT.forEach((r,i)=>{const out=r<LO||r>HI;R.box([x0+i*dx,yb,z],[.1,r*hs,.18],{fill:out?mix(P.paper,P.mute,.45):mix(P.paper,P.c3,.85),a:zoom,shadow:false,lw:.5,ea:out?.3:.5})});
      [[LO,'1 − εₗ'],[HI,'1 + εₕ']].forEach(([v,t])=>{const y=yb+v*hs,xe=x0+RT.length*dx;R.line([[x0-.15,y,z+.12],[xe,y,z+.12]],{c:P.c2,w:1.6,dash:[5,3],a:zoom});
        lab([x0-.15,y,z+.12],t,{mono:true,fs:12.5,b:1,al:'right',dx:-8,c:P.c2,a:la(s=>s===4?1:0)})});
      const nm=RT.filter(r=>r<LO||r>HI).length;
      lab([x0+RT.length*dx/2,yb+HI*hs+.25,z],RT.length+' tokens of one kept trajectory: '+nm+' outside the band are masked',{fs:12.5,b:1,dy:-10,c:P.ink,a:la(s=>s===4?1:0),wide:1})}
  }
  const full={cam:[.26,.5],bounds:[[-5.4,0,-1.4],[3.6,.95,1.5]]};
  S3.stage({id:'stg-sl',list:'sx-sl',fig:'slime · not waiting, and its two rules (illustrative run)',cam:full.cam,bounds:full.bounds,aspect:.5,dur:2600,hold:5600,draw,
    margin:w=>w<520?[30,8,30,8]:[40,16,40,16],
    view:k=>k===4?{cam:[.1,.28],bounds:[[-2.5,0,1.6],[2.4,1.4,2.3]]}:k===3?{cam:[.26,.5],bounds:[[-5.3,0,-1.6],[1.3,.9,1.5]]}:full});
})();
