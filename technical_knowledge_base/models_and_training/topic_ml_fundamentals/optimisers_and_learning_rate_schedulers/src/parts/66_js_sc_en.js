// ---- Scene (section 7, Fig. 6): three endpoints (250, 500 and 1,000 steps) under cosine, WSD and schedule-free, on the noisy quadratic toy (renderer v2) ----
// END_RES (44_js_end.js): plain SGD on Zhang et al.'s noisy quadratic model, exact expected losses (checks/nqm_check.py matches 4,000 seeded runs).
// Each curtain is the learning rate over a run as a share of that run's peak; its length is the optimiser steps it costs. Step-list numbers: data-en spans.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-en')||!window.S3||!window.END_RES)return;const {at,off,lerp,mix}=S3;
  const R0=END_RES,TS=[250,500,1000],TM=1000,X=t=>-3.6+7.2*t/TM,HT=1.1;
  const mult=(kind,t,T)=>kind==='cosine'?.5*(1+Math.cos(Math.PI*t/T)):kind==='wsd'?(t<T-Math.round(.2*T)?1:1-Math.sqrt((t-(T-Math.round(.2*T)))/Math.round(.2*T))):1;
  const f4=v=>v.toFixed(4),sum=a=>a.reduce((x,y)=>x+y,0);
  const costC=sum(TS),costW=TS[TS.length-1]-Math.round(.2*TM)+sum(TS.map(T=>Math.round(.2*T))),costS=TM;
  function writeList(){const set=(k,v)=>document.querySelectorAll('[data-en="'+k+'"]').forEach(e=>e.textContent=v);
    set('cc',costC.toLocaleString('en-GB'));set('cw',costW.toLocaleString('en-GB'));set('cs',costS.toLocaleString('en-GB'));
    set('clr',R0.cos.map(c=>c.lr.toPrecision(2)).join(', '));set('wlr',R0.wlr.toPrecision(2));set('slr',R0.slr.toPrecision(2));
    set('c1k',f4(R0.cos[2].L[TM]));set('w1k',f4(R0.wsd[2].L[TM]));set('s1k',f4(R0.sfL[TM]));set('k1k',f4(R0.conL[TM]));
    set('c250',f4(R0.cos[0].L[250]));set('w250',f4(R0.wsd[0].L[250]));set('s250',f4(R0.sfL[250]));
    set('sp',Math.round(100*(R0.sfL[TM]/R0.cos[2].L[TM]-1)));set('wp',Math.round(100*(R0.wsd[2].L[TM]/R0.cos[2].L[TM]-1)))}
  // a curtain: the rate from step a to b of a run of length T and kind, at lane z; dots flow along its top while it is being spent
  function curtain(R,kind,T,a,b,z,c,al,flow){if(al<=.01)return;const pts=[];for(let i=0;i<=40;i++){const t=a+(b-a)*i/40;pts.push([X(t),.04+HT*mult(kind,Math.min(T-1e-9,t),T),z])}
    for(let i=1;i<pts.length;i++){const p=pts[i-1],q=pts[i];R.quad([[p[0],0,z],[q[0],0,z],[q[0],q[1],z],[p[0],p[1],z]],{fill:c,fa:.3,edge:false,a:al})}
    R.line(pts,{c,w:2.4,a:al});if(flow)R.flow(pts,{c,a:al,r:.055,speed:1.5});return pts}
  const LZ=[-1.3,0,1.3];
  function draw(R,k,e){const P=R.P,cT=[P.c1,P.c4,P.c2];R.grid(-4.2,4.2,-2.2,2.2,.5);
    // the step axis on the floor, at the front
    const ax=k<3?1:.6;[0,250,500,750,1000].forEach(t=>R.label([X(t),0,2.05],String(t),{mono:true,fs:12,c:P.mute,dy:10,a:ax}));R.label([X(1000),0,2.05],'optimiser steps',{fs:12,c:P.mute,dy:26,al:'right',a:ax,wide:1});
    const a0=k===0?e:k===1?1-e:0,a1=k===1?e:k===2?1-e:0,a2=k===2?e:k===3?1-e:0;
    // 1. cosine: one run per length, each tuned for it
    if(a0>.01)TS.forEach((T,i)=>{const p=curtain(R,'cosine',T,0,T,LZ[i],cT[i],a0,true);R.label(p[p.length-1],T.toLocaleString('en-GB')+'-step run',{mono:true,fs:12.5,b:1,c:cT[i],al:'left',dx:8,a:a0,grp:'c'})});
    // 2. WSD: one constant trunk, a cooldown branched off it for each length
    if(a1>.01){curtain(R,'const',TM,0,TM-Math.round(.2*TM),0,P.c5,a1,true);R.label([X(400),.04+HT,0],'one shared trunk at a constant rate',{fs:12.5,b:1,c:P.c5,dy:-12,a:a1});
      TS.forEach((T,i)=>{const s=T-Math.round(.2*T),p=curtain(R,'wsd',T,s,T,1.3,cT[i],a1,false);R.flowArc([X(s),.04+HT,0],[X(s),.04+HT,1.3],.25,{c:cT[i],a:a1,r:.05,n:5,speed:1});
        R.label(p[p.length-1],'cooldown to '+T.toLocaleString('en-GB'),{mono:true,fs:12.5,b:1,c:cT[i],al:'left',dx:8,a:a1,grp:'w'})})}
    // 3. schedule-free: one constant run, read at all three lengths
    if(a2>.01){curtain(R,'const',TM,0,TM,0,P.c3,a2,true);TS.forEach((T,i)=>{const q=[X(T),.04+HT,0];R.glow(q,.2,{c:cT[i],a:a2});R.ball(q,.08,{c:cT[i],a:a2});R.label(q,'read at '+T.toLocaleString('en-GB'),{mono:true,fs:12.5,b:1,c:cT[i],dy:-16,a:a2})})}
    // the cost of each picture so far: how many optimiser steps all three endpoints take
    const cost=k===0?costC:k===1?costW:k===2?costS:null;if(cost&&k<3)R.label([X(0),HT+.5,-1.3],cost.toLocaleString('en-GB')+' steps for all three',{fs:13,b:1,c:P.ink,al:'left',dy:-6,a:k===0?a0:k===1?a1:a2});
    // 4. the expected loss each reaches at each endpoint, as columns (the grey row: the same SGD at its best constant rate, never decayed)
    if(k===3){const rows=[['cosine',R0.cos.map(c=>c.L[c.T]),P.c1,-1.35],['WSD',R0.wsd.map(c=>c.L[c.T]),P.c5,-.45],['schedule-free',TS.map(T=>R0.sfL[T]),P.c3,.45],['never decayed',TS.map(T=>R0.conL[T]),P.mute,1.35]];
      const sc=1.5/Math.max(...rows.flatMap(r=>r[1]));
      rows.forEach(([nm,L,c,z])=>{L.forEach((v,i)=>{const h=Math.max(.02,v*sc*e),last=i===TS.length-1;R.box([X(TS[i]),0,z],[.36,h,.36],{fill:mix(P.paper,c,.75),a:last?1:.5});if(last)R.label([X(TS[i]),h,z],v.toFixed(4),{mono:true,fs:12.5,b:1,c,al:'left',dx:14,a:e,grp:'L'})});
        R.label([X(0)-.2,0,z],nm,{fs:12.5,b:1,c,al:'right',dx:-6,a:e})})}
  }
  const full={cam:[.4,.5],bounds:[[-4.4,0,-2.1],[4.3,1.3,2.1]]},cols={cam:[.3,.42],bounds:[[-4.8,0,-1.7],[4.9,1.6,1.7]]};
  S3.stage({id:'stg-en',list:'sx-en',fig:'Fig. 6 · three endpoints, three ways (noisy quadratic toy)',cam:full.cam,bounds:full.bounds,aspect:.56,dur:2200,hold:5000,draw,
    margin:w=>w<520?[18,10,26,10]:[26,24,30,24],view:k=>k===3?cols:full});
  writeList();
})();
