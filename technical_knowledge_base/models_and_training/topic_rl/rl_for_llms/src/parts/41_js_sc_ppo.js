// ---- Scene: RLHF with PPO (Fig. 2, section 2). Four models as glass plates (policy and critic trained, reference and reward model frozen)
// and one real answer between them: answer 7 to GSM8K test problem 3 (LLD.feat), its real reward-model score, its per-token KL term against the
// base model as stand-in reference (beta = 0.02), the critic's values measured from real continuations (vrm), and GAE's advantages (lambda = 1).
// Each step shows one hop of data as a flow and moves the camera to the two things it joins. Renderer v2. ----
(function(){
  if(!document.getElementById('stg-ppo'))return;const {at,off,lerp,mix}=S3;
  const E=window.LLE,D=window.LLD;if(!E||!D)return;
  const f=D.feat.find(x=>!x.pass)||D.feat[0],T=f.L,BETA=.02;
  const vAt=t=>{const c=f.cuts,v=f.vrm;if(t<=c[0])return v[0];for(let j=1;j<c.length;j++)if(t<=c[j]){const a=(t-c[j-1])/(c[j]-c[j-1]);return v[j-1]*(1-a)+v[j]*a}return v[v.length-1]};
  const V=[];for(let t=0;t<T;t++)V.push(vAt(t));
  const kl=f.lr.map(x=>-BETA*x),rew=E.shaped(f.lr,f.rm,BETA),A=E.gae(rew,V,1,1),klSum=kl.reduce((a,b)=>a+b,0);
  const BIN=6,bin=arr=>{const o=[];for(let s=0;s<T;s+=BIN){const sl=arr.slice(s,s+BIN);o.push({s,n:sl.length,v:sl.reduce((x,y)=>x+y,0)/sl.length})}return o};
  const AB=bin(A);
  const X0=-2.2,LEN=4.4,YB=.55,xt=t=>X0+LEN*t/T;
  const POS={pol:[-4.3,0],ref:[-1.5,-2.4],rm:[1.7,-2.4],val:[0,2.7]};
  // a model: a glass plate (its weights) standing on a white plinth
  function model(R,key,c,a,big){const [x,z]=POS[key];if(a<=.01)return;R.box([x,0,z],[1.4,.09,.4],{a});R.glass([x-.62,.12,z],[1.24,0,0],[0,big?1.3:1.05,0],{c,a,nu:6,nv:6})}
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-5.4,3.4,-3.4,3.6,.5);
    const ACT=[['pol'],['rm'],['ref'],['val'],[],['pol','val']][k],al=key=>ACT.indexOf(key)>=0?1:.22;
    const C={pol:P.c1,ref:P.mute,rm:P.c5,val:P.c4};
    model(R,'pol',C.pol,al('pol'),1);model(R,'ref',C.ref,al('ref'));model(R,'rm',C.rm,al('rm'));model(R,'val',C.val,al('val'));
    // the critic stands in front of the answer, so its name sits under its plinth
    const lab=(key,t,sub)=>{const [x,z]=POS[key],a=al(key);if(key==='val'){R.label([x,0,z+.3],t+(a>.5?' · '+sub:''),{fs:13.5,b:1,c:C[key],dy:16,a:Math.max(.45,a)});return}
      R.label([x,key==='pol'?1.55:1.3,z],t,{fs:13.5,b:1,c:C[key],dy:-8,a:Math.max(.45,a)});if(a>.5&&sub)R.label([x,0,z+.35],sub,{fs:12,dy:14,c:P.mute,wide:1})};
    lab('pol','policy πθ','trained');lab('ref','reference πref','frozen');lab('rm','reward model rφ','frozen');lab('val','critic Vψ','trained');
    // the answer: a white plinth with 242 tokens on it (drawn in bins of 6), growing while it is written
    const grow=k===0?e:1;R.box([0,YB-.05,0],[LEN+.2,.05,.34],{a:1,shadow:false});[-1,1].forEach(sx=>R.box([sx*LEN/2,0,0],[.04,YB-.05,.04],{a:.9}));
    R.box([X0+LEN*grow/2,YB,0],[LEN*grow,.05,.2],{fill:mix(P.paper,P.c1,.25),a:k>=4?.35:1,shadow:false,lw:.6});
    if(k<4)R.label([0,YB,.3],nar?'answer 7 · 242 tokens':'answer 7 to GSM8K #3 · 242 tokens · wrong',{fs:12.5,dy:16,c:P.mute,a:k===0?Math.max(.3,e):.8});
    const t=Math.min(1,e*1.5),[px,pz]=POS.pol,[rx,rz]=POS.ref,[mx,mz]=POS.rm,[vx,vz]=POS.val;
    // 1. the policy writes the answer
    if(k===0)R.flowArc([px+.65,.9,pz],[X0+LEN*grow,YB+.08,0],.3,{c:P.c1,a:t,r:.065,speed:1.4});
    // 2. the reward model reads it all and returns one number on the last token
    const sa=k<1?0:k===1?e:k>=4?1:.5,sh=f.rm*.1;
    if(sa>0){R.box([xt(T-1),YB+.05,0],[.14,sh*Math.min(1,k===1?e*1.3:1),.2],{fill:mix(P.paper,P.c5,.75),a:sa,shadow:false});
      R.label([xt(T-1),YB+.05+sh,0],'rφ = '+RD.n(f.rm,2),{mono:true,fs:12.5,b:1,c:P.c5,dy:-10,a:sa})}
    if(k===1){R.flowArc([0,YB+.1,-.15],[mx,.7,mz+.25],.45,{c:P.c1,a:t*.8,r:.05,speed:1.5,n:7});R.flowArc([mx+.3,1.0,mz+.25],[xt(T-1),YB+.1+sh,0],.4,{c:P.c5,a:t,r:.08,speed:1.3})}
    // 3. the reference: the running sum of the per-token KL term along the answer (a tax where the policy likes a token more than the reference)
    const ka=k<2?0:k===2?e:k===3?.45:.2,ky=c=>YB+.75+c*.45;
    if(ka>0){const pts=[];let c=0;for(let s=0;s<T;s++){c+=kl[s];if(s%2===0||s===T-1)pts.push([xt(s+1),ky(c),-.05])}
      R.line([[xt(0),ky(0),-.05]].concat(pts.slice(0,Math.max(1,Math.round(pts.length*(k===2?e:1))))),{c:P.c2,w:2.2,a:ka});
      R.line([[xt(0),ky(0),-.05],[xt(T),ky(0),-.05]],{c:P.mute,w:1,a:ka*.6,dash:[4,4]});
      if(k===2){R.label([xt(T),ky(klSum),-.05],'running KL term: '+RD.n(klSum,2),{al:'left',dx:8,mono:true,fs:12.5,b:1,c:P.c2,a:e});R.label([xt(0),ky(0),-.05],'0',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:e})}}
    if(k===2){R.flowArc([-.6,YB+.1,-.15],[rx+.2,.7,rz+.25],.35,{c:P.c1,a:t*.8,r:.05,speed:1.5,n:7});R.flowArc([rx+.4,.9,rz+.25],[.6,YB+.1,-.1],.35,{c:P.c2,a:t,r:.06,speed:1.3,n:8})}
    // 4. the critic: V(prefix) as a line above the answer, measured points as balls
    const va=k<3?0:k===3?e:k===4?.8:.5,vy=v=>YB+.25+v*.1;
    if(va>0){const pts=[];for(let s=0;s<=T;s+=4)pts.push([xt(s),vy(vAt(s)),0]);R.line(pts.slice(0,Math.max(2,Math.round(pts.length*(k===3?e:1)))),{c:P.c4,w:2.3,a:va});
      f.cuts.forEach((c,j)=>R.ball([xt(c),vy(f.vrm[j]),0],.05,{c:P.c4,a:va*(k===3&&c/T>e?0:1)}));
      if(k===3){R.label([xt(0),vy(f.vrm[0]),0],'V = '+RD.n(f.vrm[0],2),{al:'right',dx:-8,mono:true,fs:12.5,b:1,c:P.c4,a:va});
      R.label([xt(f.cuts[7]),vy(f.vrm[7]),0],'V ≈ 8.7',{mono:true,fs:12.5,b:1,c:P.c4,dy:-12,a:va,wide:1})}}
    if(k===3){R.flowArc([.3,YB+.1,.15],[vx,.8,vz-.25],.35,{c:P.c1,a:t*.8,r:.05,speed:1.5,n:7});R.flowArc([vx-.3,1.05,vz-.25],[-1.2,vy(5),0],.4,{c:P.c4,a:t,r:.065,speed:1.3})}
    // 5. GAE: the per-token advantage, from all three inputs
    const aa=k<4?0:k===4?e:1;
    if(aa>0){AB.forEach(b=>{const h=Math.abs(b.v)*.24*aa,x0=xt(b.s),w=xt(b.s+b.n)-x0;if(h<.004)return;R.box([x0+w/2,b.v>=0?YB+.05:YB+.05-h,-.02],[w*.8,h,.2],{fill:mix(P.paper,b.v>=0?P.c3:P.c2,.8),a:1,shadow:false,lw:.6})});
      R.label([xt(0),YB+.05+A[0]*.24,-.02],'Â = '+RD.sg(A[0],1)+' early',{al:'right',dx:-8,mono:true,fs:12.5,b:1,c:P.c3,a:aa});
      R.label([xt(T-6),YB+.05+A[T-1]*.24,-.02],'Â ≈ '+RD.n(A[T-1],1)+' late',{al:'left',dx:6,dy:12,mono:true,fs:12.5,b:1,c:P.c2,a:aa,wide:1})}
    if(k===4){R.flowArc([mx-.2,.9,mz+.25],[1.3,YB+.3,-.1],.3,{c:P.c5,a:t*.8,r:.05,speed:1.3,n:5});R.flowArc([rx+.2,.9,rz+.25],[-1.3,YB+.3,-.1],.3,{c:P.c2,a:t*.8,r:.05,speed:1.3,n:5});R.flowArc([vx,1.0,vz-.25],[0,YB+.4,.1],.3,{c:P.c4,a:t*.8,r:.05,speed:1.3,n:5})}
    // 6. the update: advantages into the policy (clipped objective), returns into the critic (regression)
    if(k===5){R.flowArc([X0+.2,YB+.3,0],[px+.5,1.0,pz],.5,{c:P.c3,a:t,r:.075,speed:1.3,n:10});R.flowArc([.8,YB+.2,.15],[vx+.3,.9,vz-.25],.4,{c:P.c4,a:t,r:.065,speed:1.3,n:8});
      R.label([(X0+px)/2,1.6,0],nar?'PPO clip':'PPO clip, ε = 0.2',{mono:true,fs:12.5,b:1,c:P.c1,a:t});R.label([(.8+vx)/2+.6,1.2,vz-.9],'regress onto Â + V',{mono:true,fs:12.5,b:1,c:P.c4,a:t,wide:1});
      R.label([0,1.8,-2.4],'frozen: never updated',{fs:12.5,c:P.mute,a:t,wide:1})}
  }
  const full={cam:[.18,.66],bounds:[[-5.1,0,-2.9],[3.1,1.7,3.3]]};
  const near=(a,b)=>[[Math.min(a[0],b[0])-1.2,0,Math.min(a[1],b[1])-.8],[Math.max(a[0],b[0])+1.2,1.6,Math.max(a[1],b[1])+.8]];
  S3.stage({id:'stg-ppo',list:'sx-ppo',fig:'Fig. 2 · four models, one real answer',cam:full.cam,bounds:full.bounds,aspect:.64,dur:1500,hold:5200,draw,
    view:k=>k===0?{cam:[.2,.6],bounds:[[-5.1,0,-1.2],[2.4,1.6,1.2]]}:k===1?{cam:[.1,.6],bounds:near([X0,0],POS.rm)}:k===2?{cam:[-.1,.6],bounds:near([2.2,0],POS.ref)}:k===3?{cam:[.15,.55],bounds:[[-2.6,0,-.8],[2.6,1.6,3.1]]}:k===4?{cam:[.05,.4],bounds:[[-2.6,-.2,-1.2],[2.6,1.6,1.2]]}:full});
  window.RL3=Object.assign(window.RL3||{},{ppo:{rm:f.rm,L:T,klSum,v0:f.vrm[0],A0:A[0],Alast:A[T-1]}});
})();
