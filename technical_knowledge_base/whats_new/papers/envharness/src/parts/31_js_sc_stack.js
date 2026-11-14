// ---- Scene: one episode through the full EnvHarness stack (renderer v2: glass plates for the layers, flowing dots for actions and observations, camera per step) ----
// Everything comes from this page's engine (14_js_world.js, the port of the released classes): the toy household with every component on,
// Stage "hide the mug in drawer 1", Contract f_A no teleport, f_T clean only when held, f_O first observation cut to two sentences, Chain
// "heat a potato and put it on countertop 1", episode seed 3; and the same Stage with the order swapped. Window.ENVSTACK holds the numbers the step list states.
(function(){
  if(!document.getElementById('stg-stack'))return;const {at,off,lerp,mix}=S3;
  const CFG={stage:'hide',hooks:['noteleport','trunc','cleanhold'],chain:true},SEED=3;
  const run=EH.run(CFG,SEED,{}),sw=EH.run({stage:'hide',hooks:['noteleport'],order:'swapped'},SEED,{});
  const has=(s,re)=>s.log.some(l=>re.test(l.layer));
  const N=run.steps.length,BLK=run.steps.findIndex(s=>has(s,/f_A/))+1,FT=run.steps.findIndex(s=>has(s,/f_T/))+1,HO=run.steps.findIndex(s=>has(s,/^Chain$/))+1;
  // the Stage's replay, step by step, on a bare house (the same actions the engine replayed through inner.step())
  const DELTA=run.reset.replay.map(r=>r.a);
  const snapH=h=>{const s=h.getEnvState();return {at:s.at,holding:s.holding,mug:s.items['mug 1'].loc,mugClean:s.items['mug 1'].clean,potato:s.items['potato 1'].loc,potatoHot:s.items['potato 1'].hot,open:Object.assign({},s.open)}};
  const RP=(()=>{const h=new EH.HouseEnv('mug');h.reset();const o=[snapH(h)];DELTA.forEach(a=>{h.step(a);o.push(snapH(h))});return o})();
  const A0=RP[0],B0=run.steps[HO-1].st,AF=Object.assign({},run.steps[HO-2].st,{mug:'desk 1',holding:null});
  const swBlk=sw.reset.log.filter(l=>/f_A/.test(l.layer)).length,swNone=sw.reset.replay.filter(r=>/^Nothing happens/.test(r.obs)).length;
  window.ENVSTACK={N,BLK,FT,HO,delta:DELTA.length,a:run.verdict.a,b:run.verdict.b,ok:run.verdict.success,trunc:run.reset.log.some(l=>/f_O/.test(l.layer)),swBlk,swNone,swMug:sw.reset.st.mug,swDelta:sw.reset.replay.length};
  const stA=f=>f<=0?run.reset.st:f<HO?run.steps[f-1].st:AF,stB=f=>f<=HO?B0:run.steps[f-1].st;
  const SH=['countertop','sink','drawer 1','drawer 2','shelf','microwave','desk'];
  const XS=1.15,X=i=>(i-3)*XS,ZA=0,ZB=-2.6,YS=1.45,YC=2.45,YL=3.45,YP=4.35,X0=-4.3,X1=5.3,VX=4.6;
  const px=p=>p?X(EH.ORDER.indexOf(p)):0;
  const apos=(s,z)=>s.at?[px(s.at),.72,z]:[0,.72,z+.95];
  function house(R,s,z,a,o){o=o||{};const P=R.P;if(a<=.01)return;
    EH.ORDER.forEach((p,i)=>{const cont=!!EH.CONTAINERS[p],h=cont?.42:.2,op=cont&&s.open[p];
      R.box([X(i),0,z],[.9,h,.75],{fill:cont?mix(P.paper,P.c5,op?.12:.32):P.paper,a,fa:op?.55:1});
      if(o.names)R.label([X(i),0,z+.42],SH[i],{mono:true,fs:12,dy:i%2?26:12,c:P.mute,a:Math.min(1,a+.2),wide:1})});
    const item=(loc,col,y0)=>{if(!loc||loc==='hand')return;const i=EH.ORDER.indexOf(loc);if(i<0)return;const cont=!!EH.CONTAINERS[loc],inside=cont&&!s.open[loc];
      R.ball([X(i)+y0,inside?.21:(cont?.42:.2)+.13,z],.13,{c:col,a:a*(inside?.45:1)})};
    item(s.mug,s.mugClean?P.c6:P.c2,-.18);item(s.potato,s.potatoHot?P.bad:P.c5,.2);
    // the original verifier sits with the base environment
    R.box([VX,0,z],[.62,.5,.62],{fill:o.pass?mix(P.paper,P.good,.45):mix(P.paper,P.ink,.12),a})}
  function agent(R,p,s,a){const P=R.P;R.glow(p,.32,{c:P.acc,a:a*.5});R.ball(p,.15,{c:P.acc,a});
    if(s&&s.holding)R.ball([p[0]+.2,p[1]-.12,p[2]],.11,{c:s.holding==='mug 1'?(s.mugClean?P.c6:P.c2):(s.potatoHot?P.bad:P.c5),a})}
  const plate=(R,y,z0,z1,c,a)=>R.glass([X0,y,z0],[X1-X0,0,0],[0,0,z1-z0],{c,a,nu:10,nv:2,th:.04});
  // frames of a stretch: e in [0,1] walks frames a..b; returns [frame, progress into it]
  const fr=(a,b,e)=>{if(e>=1)return [b,1];const n=b-a+1,u=e*n,i=Math.floor(u);return [a+i,u-i]};
  function draw(R,k,e){const P=R.P;R.grid(-4.8,5.8,-3.5,1.6,.5);
    const swp=k===9?e:0,aB=k<3?0:k===3?e:k>=9?1-e:1,aCh=aB;
    // the stack: Stage, Contract, Chain as tinted glass; in the last step the Stage rises above the Contract (the order swapped)
    const aS=k===0?0:k===1?Math.min(1,e*1.6):k===7?.3:1,aC=k<2?0:k===2?Math.min(1,e*1.6):k===7?.3:1;
    const yS=lerp(YS,YC,swp),yC=lerp(YC,YS,swp);
    plate(R,yS,ZA-.65,ZA+.65,P.c3,aS*.95);plate(R,yC,ZA-.65,ZA+.65,P.c2,aC*.95);plate(R,YL,ZB-.65,ZA+.65,P.c4,aCh*.9);
    R.label([X0,yS,ZA],'Stage · reset()',{al:'right',dx:-8,mono:true,fs:12,c:P.c3,a:aS>0?Math.max(.25,aS):0,grp:'pl'});
    R.label([X0,yC,ZA],'Contract · step()',{al:'right',dx:-8,mono:true,fs:12,c:P.c2,a:aC>0?Math.max(.25,aC):0,grp:'pl'});
    R.label([X0,YL,ZB/2],'Chain · joins B',{al:'right',dx:-8,mono:true,fs:12,c:P.c4,a:aCh,grp:'pl'});
    // the policy: a black box that only calls reset() and step() on the outermost layer
    R.box([0,YP,-1.2],[1.6,.3,.7],{fill:mix(P.paper,P.ink,.75),a:k===0?.45:1,shadow:false});
    R.label([-.9,YP+.15,-1.2],'policy π · black box',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:P.ink});
    const top=[0,YP,-1.2],LAB=(p,t,c,a,o)=>R.label(p,t,Object.assign({mono:true,fs:12,dy:-14,c,a,b:1},o||{}));
    // the houses: A under the stack, B behind it under the Chain only
    let fA=0,fe=1;if(k===4)[fA,fe]=fr(1,BLK-1,e);else if(k===5)[fA,fe]=[BLK,e];else if(k===6)[fA,fe]=fr(BLK+1,HO,e);else if(k===7)[fA,fe]=fr(HO+1,N,e);else if(k===8)[fA,fe]=[N,1];
    let sA=k===1?RP[Math.min(DELTA.length,Math.floor(e*(DELTA.length+1)))]:k===0?A0:k>=9?(swp>.5?sw.reset.st:stA(N)):stA(fA);
    const passA=(k>=6&&fA>=HO)||k===8,sB=stB(fA);
    const aA=k===7?.45:1;house(R,sA,ZA,aA,{names:true,pass:passA&&k<9});house(R,sB,ZB,aB*(k===7||k===8?1:.6),{pass:k===8&&run.verdict.b});
    R.label([VX,.5,ZA],passA&&k<9?'R_A ✓':'R_A',{mono:true,fs:12,dy:-12,c:passA&&k<9?P.good:P.mute,a:aA});
    if(aB>.05)R.label([VX,.5,ZB],k===8&&run.verdict.b?'R_B ✓':'R_B',{mono:true,fs:12,dy:-12,c:k===8?P.good:P.mute,a:aB});
    if(aB>.05)R.label([X(0)-.6,.1,ZB],'house B · heat a potato',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:aB,wide:1});
    R.label([X(0)-.6,.1,ZA],'house A · clean mug to desk',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:aA,wide:1});
    // the agent
    const inB=k===7||(k===8),z=inB?ZB:ZA;
    if(k===1){const i=Math.min(DELTA.length,Math.floor(e*(DELTA.length+1))),s=RP[i];const p=apos(s,ZA);agent(R,p,s,.85);
      R.flow([[p[0],YS,ZA],[p[0],.55,ZA]],{c:P.c3,a:.9,r:.07,speed:1.2,n:5});LAB([p[0],YS+.1,ZA],i>0?DELTA[i-1]:'reset()',P.c3,1)}
    else if(k<=3){const p=apos(sA,ZA);agent(R,p,sA,k===0?.6:1);
      if(k===2){ // f_O: the first observation comes up full through the Stage and leaves the Contract cut to two sentences
        R.flow([[p[0]+.25,.55,ZA],[p[0]+.25,YC,ZA]],{c:P.c6,a:.9,r:.07,speed:1.2,n:9});R.flow([[p[0]+.25,YC,ZA],[p[0]+.25,YL,ZA],[top[0]+.3,top[1],top[2]]],{c:P.c6,a:.9,r:.07,speed:1.2,n:3});
        LAB([p[0]+.25,YC+.1,ZA],'f_O: first observation, two sentences',P.c2,e)}
      if(k===3)LAB([0,YL,ZB],'one shared 50-step budget',P.c4,e)}
    else if(k>=4&&k<=7){const prev=k===7&&fA===HO+1?stB(HO):fA>HO?stB(fA-1):stA(fA-1),cur=fA>HO?stB(fA):stA(fA),zp=fA-1>HO||(k===7&&fA===HO+1)?ZB:ZA;
      const p0=apos(prev,zp),p1=apos(cur,z),ap=k===5?p0:[lerp(p0[0],p1[0],fe),.72,lerp(p0[2],p1[2],fe)];agent(R,ap,fe>.5?cur:prev,1);
      const act=run.steps[fA-1].a,ax=ap[0];
      if(k===5){ // f_A: the action stops at the Contract plate; the reason comes back up, the world untouched
        R.flow([[top[0],top[1],top[2]],[ax,YL,ZA],[ax,YC+.02,ZA]],{c:P.c1,a:.9,r:.07,speed:1.3});R.glow([ax,YC,ZA],.55,{c:P.bad,a:.85});
        R.flow([[ax+.25,YC+.02,ZA],[ax+.25,YL,ZA],[top[0]+.3,top[1],top[2]]],{c:P.bad,a:.9,r:.07,speed:1.3});
        if(innerWidth<520)LAB([ax,YC,ZA+.65],'[blocked] '+act,P.bad,1,{dy:16});else LAB([ax,YC+.1,ZA],'[blocked] '+act,P.bad,1)}
      else{const yBot=inB?.55:.55,via=inB?[[ax,YL,ZB],[ax,yBot,ZB]]:[[ax,YL,ZA],[ax,yBot,ZA]];
        R.flow([[top[0],top[1],top[2]]].concat(via),{c:P.c1,a:.85,r:.065,speed:1.6});
        R.flow(via.slice().reverse().map(q=>[q[0]+.25,q[1],q[2]]).concat([[top[0]+.3,top[1],top[2]]]),{c:P.c6,a:.75,r:.055,speed:1.6});
        if(k===6&&fA===FT){R.glow([ax,YC,ZA],.55,{c:P.c2,a:.9});LAB([ax,YC+.1,ZA],'f_T rewrites: hold the mug first',P.c2,1)}
        else LAB([ax,.95,z],act,P.c1,1,{fs:12});
        if(k===6&&fA===HO){R.flow([[ax,YL,ZA],[0,YL,ZB],[0,.7,ZB+.95]],{c:P.c4,a:.9,r:.08,speed:1.3});LAB([0,YL,ZB],'A passed · hand off to B',P.c4,1)}}}
    else if(k===8){agent(R,apos(stB(N),ZB),stB(N),.6);
      // evaluate(): straight through the Contract and the Stage to each original verifier; the Chain combines the two verdicts
      R.flow([[top[0],top[1],top[2]],[VX,YL,ZA],[VX,.55,ZA]],{c:P.good,a:.9,r:.07,speed:1.2});R.flow([[top[0],top[1],top[2]],[VX,YL,ZB],[VX,.55,ZB]],{c:P.good,a:.9,r:.07,speed:1.2});
      LAB([VX-.2,YL+.1,(ZA+ZB)/2],'R′ = R_A ∧ R_B = '+(run.verdict.success?'pass':'fail'),P.good,1,{fs:12.5})}
    else if(k===9){const i=Math.min(DELTA.length,Math.floor(e*(DELTA.length+1))),r=i>0?sw.reset.replay[i-1]:null;agent(R,apos(sw.reset.st,ZA),null,.8);
      if(r){const ax=r.a.startsWith('go to')?X(EH.ORDER.indexOf(r.a.slice(6))):0,blk=/^\[blocked\]/.test(r.obs);
        R.flow([[ax,yS,ZA],[ax,blk?yC+.02:.55,ZA]],{c:P.c3,a:.9,r:.07,speed:1.2});if(blk)R.glow([ax,yC,ZA],.5,{c:P.bad,a:.85});
        LAB([ax,yS+.1,ZA],r.a+(blk?' · blocked':' · nothing happens'),blk?P.bad:P.mute,1)}}
  }
  const full={cam:[.34,.27],bounds:[[-4.5,0,-3.3],[5.4,4.6,1.5]]},near={cam:[.36,.4],bounds:[[-4.4,0,-.9],[5.3,2.0,1.5]]};
  S3.stage({id:'stg-stack',list:'sx-stack',fig:'3D · one episode through the full stack',cam:full.cam,bounds:full.bounds,aspect:.52,dur:3200,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,150],
    // on a phone the long row of places turns into depth (a rotated, steeper camera), so the plates and boxes draw larger
    view:k=>{const v=k<=1?near:k===2||k===9?{cam:[.32,.26],bounds:[[-4.4,0,-1.6],[5.3,4.6,1.5]]}:full;return innerWidth<520&&k>1?{cam:[v.cam[0]+.55,v.cam[1]-.04],bounds:v.bounds}:v}});
})();
