// ---- Scene: the EnvRigger loop on the toy household (renderer v2: the candidate Stage as a glass plate, rollouts as bars, flowing dots for rollouts and diagnoses) ----
// The scripted designer of the "Wrap a world yourself" tab (its fixed ladder of the paper's own example Stages, the release prompt's band rule
// [0.4, 0.6]) with K = 5 rollouts per candidate and rollout seeds from 1000, exactly as that tab's loop button runs on its first press;
// then each candidate's true success rate from 400 rollouts (seeds 1000 to 1399, the rates check_world.mjs checks). Window.ENVRIG holds them.
(function(){
  if(!document.getElementById('stg-rig'))return;const {at,off,lerp,mix}=S3;
  const K=5,sr=R=>R.filter(x=>x.ok).length/R.length;let seed=1000;
  const C=[{stage:'none',hooks:[],l:'observe · static'},{stage:'hide',hooks:[],l:'round 1 · mug in drawer 1'},{stage:'hidemw',hooks:[],l:'round 2 · mug in microwave'}];
  // the loop exactly as 15_js_run.js runs it: Observe, then Write and Validate up the ladder until a candidate lands in the band
  const rows=[];{const r0=EH.rollouts(C[0],K,{},seed);seed+=K;rows.push({c:C[0],R:r0,p:sr(r0)});let lvl=0;
    for(let r=1;r<=5;r++){const c=C[1+lvl],R=EH.rollouts(c,K,{},seed);seed+=K;const p=sr(R);rows.push({c,R,p});if(p>=.4-1e-9&&p<=.6+1e-9)break;if(p>.6){if(lvl<1)lvl++}else if(lvl>0)lvl--}}
  const inBand=p=>p>=.4-1e-9&&p<=.6+1e-9;
  rows.forEach(w=>{w.t=sr(EH.rollouts(w.c,400,{},1000));w.band=BAND(K,w.t)});
  window.ENVRIG={K,rows:rows.map(w=>({stage:w.c.stage,ok:w.R.filter(x=>x.ok).length,steps:w.R.map(x=>x.steps),p:w.p,t:w.t,band:w.band})),accepted:inBand(rows[rows.length-1].p)};
  const n=rows.length,ZR=r=>(n-1)/2*2.2-r*2.2,EX=-3.1,BX=i=>-1.7+i*.52,RX=1.0,DES=[-.9,0,ZR(n-1)-2.1],HM=1.15;
  const verdict=p=>inBand(p)?'accept':p>.6?'harder':'easier';
  function draw(R,k,e){const P=R.P;R.grid(-4.4,3.6,ZR(n-1)-3.1,ZR(0)+1.3,.5);
    // row 0 is observed at step 0 and diagnosed at 1; row r is written at step 2r and validated at 2r+1; the last step (2n) shows the true rates
    const wr=r=>r===0?-1:2*r,vd=r=>r===0?0:2*r+1,last=2*n,des=k===1||(k%2===0&&k<last);
    // the designer, behind the rows: it reads the verdicts and writes the next candidate
    R.box(DES,[2.0,.6,1.0],{fill:mix(P.paper,P.c4,des?.45:.22),a:1});
    R.label([DES[0],.6,DES[2]],'EnvRigger · LLM designer',{mono:true,fs:12.5,b:1,dy:-18,c:P.c4,a:des?1:.6});
    rows.forEach((w,r)=>{const z=ZR(r),born=r===0?(k===0?Math.min(1,e*1.5):1):at(k,e,wr(r)),done=r===0?at(k,e,0):at(k,e,vd(r));if(born<=.01)return;
      const foc=k>=last?1:(k===vd(r)||k===wr(r)||(r===0&&k<=1))?1:.25,fa=Math.max(foc,.25);
      // the environment, and over it the candidate Stage as a glass plate
      R.box([EX,0,z],[1.6,.16,1.0],{fill:P.paper,a:born*fa});
      if(r>0)R.glass([EX-.8,.4,z-.5],[1.6,0,0],[0,0,1.0],{c:P.c3,a:born*fa,nu:6,nv:3});
      R.label([EX-.85,.2,z],w.c.l,{al:'right',dx:-6,mono:true,fs:12,c:r?P.c3:P.ink,a:Math.max(.45,born*foc),grp:'row'});
      // K rollouts: one bar each, its height the steps it used (of 50), green when the original verifier passed it
      if(done>.01){w.R.forEach((x,i)=>{const h=Math.max(.05,x.steps/50*HM)*done;R.box([BX(i),0,z],[.4,h,.4],{fill:x.ok?mix(P.paper,P.good,.6):mix(P.paper,P.bad,.6),a:fa});
          if(foc>.9&&k<last)R.label([BX(i),h,z],String(x.steps),{mono:true,fs:12,dy:-10,c:x.ok?P.good:P.bad,a:done})});
        // the measured success rate, beside the band [0.4, 0.6] drawn as a green glass slab
        const hr=Math.max(.04,w.p*HM)*done;R.box([RX,0,z],[.46,hr,.46],{fill:mix(P.paper,P.c1,.55),a:fa});
        R.box([RX,.4*HM,z],[.8,.2*HM,.7],{fill:P.good,fa:.2,ea:.4,a:fa,shadow:false});
        if(foc>.9&&k<last){R.label([RX+.5,.25,z],w.R.filter(x=>x.ok).length+'/'+K+' = '+w.p.toFixed(2)+' · '+verdict(w.p),{al:'left',dx:8,mono:true,fs:12,b:1,c:inBand(w.p)?P.good:P.c2,a:done});}
        // the true rate (400 rollouts), in the last step: a dark marker on the rate column
        if(k>=last){const ht=w.t*HM;R.box([RX,ht-.01,z],[.62,.02,.56],{fill:P.ink,a:.85*e,shadow:false});
          R.label([RX+.5,.25,z],'true '+w.t.toFixed(3)+' · in band '+Math.round(w.band*100)+'%',{al:'left',dx:8,mono:true,fs:12,b:1,c:P.ink,a:e})}}
      // flows: rollouts stream from the environment to the bars; the verdict goes back to the designer; the designer writes the next plate
      if((r===0&&k===0)||(k===vd(r)&&r>0))w.R.forEach((x,i)=>R.flowArc([EX+.5,.25,z],[BX(i),.15,z],.5,{c:P.c1,a:.8,r:.05,n:5,speed:1.4}));
      if((r===0&&k===1)||(k===wr(r+1)&&r+1<n))R.flowArc([RX,Math.max(.1,w.p*HM),z],[DES[0]+.6,.6,DES[2]],1.0,{c:P.c2,a:.9,r:.06,speed:1.5});
      if(r>0&&k===wr(r))R.flowArc([DES[0]-.6,.6,DES[2]],[EX+.4,.45,z],1.2,{c:P.c3,a:.9,r:.07,speed:1.5});
      if(r===n-1&&k===vd(r)&&inBand(w.p))R.glow([EX,.45,z],1.0,{c:P.good,a:.5*e})});
  }
  const full={cam:[.12,.5],bounds:[[-3.9,0,ZR(n-1)-2.7],[4.6,1.4,ZR(0)+.7]]};
  S3.stage({id:'stg-rig',list:'sx-rig',fig:'3D · the EnvRigger loop on the toy household',cam:full.cam,bounds:full.bounds,aspect:.46,dur:1500,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,200],
    // a validation step moves in close on its row; observing, diagnosing and writing show the designer and every row
    view:k=>{if(k===1||k===2*n||(k>0&&k%2===0))return full;const z=ZR(k===0?0:(k-1)/2);return {cam:[.1,.42],bounds:[[-3.9,0,z-1.1],[4.6,1.3,z+.9]]}}});
})();
