// ---- Scene, Fig. 2 (section 3): the life of a jitted call. The recurrent cell under lax.scan, n = 1,000 (run_cf.py, JC.cf.loops.rows: trace, lower,
// compile and run times, optimised HLO lines and while loops), traced into a jaxpr of one scan equation with a three-equation body, lowered to StableHLO,
// compiled by XLA, stored in the cache and reused; the hit and the new-shape miss use the counts of the root's Transforms lab (JC.rc.drills,
// on the running example's loss). Back row: the slow path, paid once per key. Front row: the call, the cache and the run.
// Steps are explained by #sx-jit on the left. ----
(function(){
  if(!document.getElementById('stg-jit')||!window.JCS||!window.JC)return;const {at,off,lerp,lerp3,mix}=S3,{lab,slot,tint,legs}=JCS;
  const r=JC.cf.loops.rows.find(x=>x.variant==='scan'&&x.n===1000),D=id=>JC.rc.drills.find(d=>d.id===id);
  const ms=v=>v<.1?(v*1e3).toFixed(1)+' ms':(v*1e3).toFixed(0)+' ms';
  const ZF=1.45,ZB=-1.35,CX=-4.3,KX=-1.4,OX=1.7,TX=-4.0,JX=-1.8,SX=.4,XX=2.4,EX=3.9,SL=[-2.0,-.8];
  const body=['dot_general','add','tanh'];   // bottom to top, in the order the body runs
  // the executable: a green block; where it sits at step k
  function exe(R,p,a,lbl){const P=R.P;R.box(p,[.72,.46,.62],{fill:tint(P,P.c3,.65),a});if(lbl)lab(R,[p[0],p[1]+.46,p[2]],lbl,{mono:true,fs:12,dy:-11,c:P.c3,b:1,a})}
  function draw(R,k,e){const P=R.P;R.grid(-5.4,4.8,-2.6,2.6,.5);
    const slow=k===0?.25:k<=3?1:k===4?.45:k===5?.16:.25+.75*Math.min(1,e*1.4); // the back row recedes once the program is cached
    const front=k>=1&&k<=3?.35:1;
    // the call and its arguments
    R.box([CX,0,ZF],[1.3,.55,.82],{fill:tint(P,P.acc,.2),a:front});
    lab(R,[CX,.55,ZF],k===6?'jit(f)(h, xs) · new shape':'jit(f)(h, xs)',{mono:true,fs:12.5,b:1,dy:-12,c:P.acc,a:front});
    if(k===0)lab(R,[CX,0,ZF+.41],'h f32[32,128] · xs f32[1000,32,128]',{mono:true,fs:12,dy:14,c:P.mute,a:e,wide:1});
    // the cache: a shelf with slots keyed by signature
    R.box([KX,0,ZF],[2.5,.16,1.0],{fill:mix(P.paper,P.ink,.06),a:front});
    lab(R,[KX,0,ZF+.5],'cache · key = function + avals',{fs:12.5,b:1,dy:16,c:P.ink,a:front*(k===0||k>=4?1:.6)});
    SL.forEach(x=>slot(R,[x,.16,ZF],.8,.7,front*.9));
    // the run's output
    const runA=k>=4?1:.2;R.box([OX,0,ZF],[1.1,.36,.7],{fill:tint(P,P.c3,.25),a:runA*(k>=1&&k<=3?.5:1)});
    lab(R,[OX,.36,ZF],'h f32[32,128]',{mono:true,fs:12,dy:-11,c:P.c3,a:runA});
    // 1. the miss
    if(k===0||k===6){R.flow(legs([[CX+.65,.35,ZF],[KX-1.2,.35,ZF]]),{c:P.acc,r:.07,a:k===0?e:1,n:4});
      lab(R,[KX,.16,ZF-.45],k===0?'miss: no entry yet':'miss: new key',{fs:12.5,b:1,dy:-14,c:P.bad,a:k===0?e:Math.min(1,e*2)})}
    // the slow path, back row
    R.box([TX,0,ZB],[1.4,.72,.9],{fill:tint(P,P.acc,.12),a:slow});
    lab(R,[TX,.72,ZB],'Python f, on tracers',{mono:true,fs:12.5,b:1,dy:-12,c:P.acc,a:slow});
    // the jaxpr: one scan equation, its body as three plates on it (one plate per equation)
    const jA=k<1?0:k===1?Math.min(1,e*1.4):1;
    if(jA>0){R.glass([JX-.85,.12,ZB-.6],[1.7,0,0],[0,0,1.2],{c:P.c4,a:jA*slow,nu:4,nv:3,th:.05});
      body.forEach((b,i)=>{const y=.5+i*.36,a=k===1?Math.min(1,Math.max(0,e*2.2-.3*(2-i))):1;R.glass([JX-.6,y,ZB-.42],[1.2,0,0],[0,0,.84],{c:P.c4,a:a*slow,nu:3,nv:2,th:.04});
        lab(R,[JX+.6,y,ZB],b,{mono:true,fs:12,al:'left',dx:8,c:P.c4,a:a*slow*(k<=2?1:.75),grp:'eq'})});
      lab(R,[JX+.85,.12,ZB],'scan',{mono:true,fs:12.5,b:1,al:'left',dx:8,c:P.c4,a:jA*slow,grp:'eq'})}
    if(k===1){R.flowArc([CX,.55,ZF-.2],[TX,.72,ZB+.2],.5,{c:P.acc,r:.07,a:Math.min(1,e*2),n:7});R.flow(legs([[TX+.7,.4,ZB],[JX-.85,.5,ZB]]),{c:P.acc,r:.07,a:Math.max(0,e*2-.6),n:5})}
    if(k>=1)lab(R,[TX,0,ZB+.45],'trace '+ms(r.trace_s),{mono:true,fs:12.5,b:k===1,dy:15,c:P.acc,a:slow*(k===1?e:.8),wide:1});
    // 3. StableHLO
    const sA=k<2?0:k===2?e:1;
    if(sA>0){R.glass([SX-.75,.5,ZB-.55],[1.5,0,0],[0,0,1.1],{c:P.c6,a:sA*slow,nu:6,nv:4,th:.05});lab(R,[SX,.5,ZB+.55],'StableHLO',{mono:true,fs:12.5,b:1,dy:16,c:P.c6,a:sA*slow});
      lab(R,[SX,.55,ZB-.55],'lower '+ms(r.lower_s),{mono:true,fs:12.5,b:k===2,dy:-12,c:P.c6,a:slow*(k===2?e:.8),wide:1})}
    if(k===2)R.flow(legs([[JX+.85,.6,ZB],[SX-.75,.55,ZB]]),{c:P.c4,r:.07,a:e,n:5});
    // 4. XLA compiles
    const xA=k<3?.15:1;R.box([XX,0,ZB],[1.2,.7,.9],{fill:tint(P,P.c2,.28),a:xA*slow});
    lab(R,[XX,.7,ZB],'XLA compile',{mono:true,fs:12.5,b:1,dy:-12,c:P.c2,a:Math.max(.3,xA*slow)});
    if(k>=3)lab(R,[XX,0,ZB+.45],ms(r.compile_s)+' · '+r.hlo_lines+' HLO lines · '+r.hlo_while+' while',{mono:true,fs:12.5,b:k===3,dy:15,c:P.c2,a:slow*(k===3?e:.8),wide:1});
    if(k===3){R.flow(legs([[SX+.75,.55,ZB],[XX-.6,.45,ZB]]),{c:P.c6,r:.07,a:Math.min(1,e*2),n:4});R.flow(legs([[XX+.6,.35,ZB],[EX-.36,.3,ZB]]),{c:P.c3,r:.07,a:Math.max(0,e*2-.8),n:3})}
    // the first executable: made at step 4, into the cache at step 5, used after
    const s0=[SL[0],.16,ZF];
    if(k===3)exe(R,[EX,0,ZB],Math.max(0,e*2-.8),'executable');
    if(k===4){const p=lerp3([EX,0,ZB],s0,Math.min(1,e*1.4));p[1]=Math.max(p[1],.16*Math.min(1,e*1.4))+Math.sin(Math.PI*Math.min(1,e*1.4))*.6;exe(R,p,1,null)}
    if(k>=5)exe(R,s0,k===6?.6:1,null);
    // run: the cached executable on the real arrays
    if(k===4)R.flow(legs([[SL[0]+.36,.4,ZF],[OX-.55,.25,ZF]]),{c:P.c3,r:.07,a:Math.max(0,e*2-1),n:5});
    if(k>=4)lab(R,[OX,0,ZF+.35],'run '+r.run_ms.toFixed(1)+' ms',{mono:true,fs:12.5,b:k===4,dy:15,c:P.c3,a:k===4?Math.max(0,e*2-1):.85});
    // 6. the hit: straight from the call to the executable and out
    if(k===5){R.flow(legs([[CX+.65,.35,ZF],[SL[0]-.36,.35,ZF]]),{c:P.acc,r:.07,a:e,n:4});R.flow(legs([[SL[0]+.36,.4,ZF],[OX-.55,.25,ZF]]),{c:P.c3,r:.07,a:e,n:5});
      lab(R,[KX,.16,ZF-.45],'hit: '+D('values').traces+' traces, '+D('values').compiles+' compiles',{fs:12.5,b:1,dy:-14,c:P.good,a:e})}
    // 7. a new shape: the slow path again, and a second executable beside the first
    if(k===6){const t=Math.min(1,e*1.5);R.flowArc([CX,.55,ZF-.2],[TX,.72,ZB+.2],.5,{c:P.acc,r:.06,a:t,n:6});
      R.flow(legs([[TX+.7,.4,ZB],[JX-.85,.5,ZB],[SX-.75,.55,ZB],[XX-.6,.45,ZB]]),{c:P.acc,r:.06,a:t,n:12});
      const u=Math.max(0,e*1.6-.6),p=lerp3([EX,0,ZB],[SL[1],.16,ZF],u);p[1]+=Math.sin(Math.PI*u)*.6;exe(R,p,Math.max(.15,Math.min(1,e*2)),null);
      lab(R,[XX,.7,ZB],D('batch16').traces+' trace, '+D('batch16').compiles+' compile',{fs:12.5,b:1,dy:-30,c:P.bad,a:t})}
  }
  const full={cam:[.16,.8],bounds:[[-5,0,-2.1],[4.4,1.5,2.1]]};
  const st=S3.stage({id:'stg-jit',list:'sx-jit',fig:'Fig. 2 · trace once, compile once, run many times',cam:full.cam,bounds:full.bounds,aspect:.58,dur:1500,hold:5000,draw,
    margin:w=>w<520?[14,10,14,10]:[22,16,22,16],
    // the camera follows the work: the call and the cache, then the slow path, then the cache again
    view:k=>k===0||k===5?{cam:[.16,.72],bounds:[[-5,0,.4],[2.4,1.0,2.2]]}:k===1?{cam:[.2,.75],bounds:[[-5,0,-2.1],[-.6,1.3,2.0]]}:k===2||k===3?{cam:[.16,.75],bounds:[[-2.8,0,-2.1],[4.4,1.3,-.5]]}:full});
  (window.JCSTG=window.JCSTG||{})['stg-jit']=st;
})();
