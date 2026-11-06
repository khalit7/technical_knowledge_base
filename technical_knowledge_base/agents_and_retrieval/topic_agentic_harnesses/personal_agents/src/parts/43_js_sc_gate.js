// ---- Scene: Fig. 7, the gate by undo class (renderer v2), on every action the recorded models proposed with the gate on (window.HPD, all
// scenarios, both models). Two sources (runs Sam started; heartbeats and the scheduled job), the gate as a glass wall, and a bar field:
// columns are action classes, rows are who started the run, bar height is the number of recorded actions, colour the recorded decision.
// Steps: ol#sx-gate; the counts in the step text are checked against the data by src/check.py. ----
(function(){
  if(!document.getElementById('stg-gate')||!window.HPD)return;const {mix,at}=S3;
  const CL=['read','reversible','staged','irreversible'],CX=[0,1.3,2.6,3.9],ZO=.9,ZU=-.9,GX=-1.5,SRC=-3.5;
  const C={};CL.forEach(c=>C[c]={owner:{n:0,d:{}},unattended:{n:0,d:{}}});
  Object.keys(HPD).forEach(k=>{const r=HPD[k];if(!r.cfg||r.cfg.gate!=='on')return;r.runs.forEach(run=>run.steps.forEach(s=>{if(!s.tool||!C[s.cls])return;
    const o=run.origin==='owner'?'owner':'unattended',c=C[s.cls][o];c.n++;c.d[s.dec]=(c.d[s.dec]||0)+1}))});
  const H=n=>n?.06+1.5*n/45:0;
  const decCol=(P,c,o)=>c==='staged'||c==='irreversible'&&o==='owner'?P.c5:c==='irreversible'?P.bad:P.good;
  const word={read:'allowed',reversible:'allowed, undo logged',staged:'staged for review',irreversible:'held for Sam'};
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-4.4,4.8,-2.2,2.2,.5);
    // sources
    [['runs Sam started',ZO,'c1'],['heartbeat, schedule',ZU,'c5']].forEach(([t,z,c])=>{R.box([SRC,0,z],[.7,.45,.7],{fill:mix(P.paper,P[c],.4),a:k===0?1:.6});if(k<=2)R.label([SRC,.45,z],t,{fs:12.5,b:1,c:mix(P.ink,P[c],.4),dy:-10,a:k===0?1:.7,wide:1})});
    // the gate: decides from two facts, which tool and who started the run
    R.glass([GX,.04,-1.8],[0,0,3.6],[0,1.2,0],{c:P.acc,nu:6,nv:3});if(k<=2)R.label([GX,1.24,1.8],'the gate · plain code',{fs:13,b:1,c:P.acc,dy:-10});
    if(k===0){[ZO,ZU].forEach((z,i)=>R.flow([[SRC+.38,.3,z],[GX-.08,.5,z]],{c:i?P.c5:P.c1,r:.065,n:6,a:e}));R.label([(SRC+GX)/2,.5,0],'which tool? who started the run?',{fs:12.5,b:1,c:P.ink,a:e,wide:1})}
    // column headers on the floor
    CL.forEach((c,i)=>{const on=k===i+1||k===5&&i===3,a=on?1:.4;if(k>=i+1)R.label([CX[i],0,1.6],c==='staged'?'memory':c,{fs:12.5,b:on,c:P.ink,dy:14,a})});
    // the bar field
    CL.forEach((c,i)=>[['owner',ZO],['unattended',ZU]].forEach(([o,z])=>{const n=C[c][o].n,step=i+1,cur=k===step&&!(i===3&&o==='unattended')||k===5&&i===3&&o==='unattended',done=k>step||k===5&&i===3&&o==='owner';
      if(!(cur||done))return;const g=cur?e:1,a=cur?1:.38,col=decCol(P,c,o);
      if(n){R.box([CX[i],0,z],[.8,Math.max(.012,H(n)*g),.8],{fill:mix(P.paper,col,.55),a});
        if(cur)R.flow([[GX+.08,.5,z],[CX[i]-.42,Math.min(.6,H(n)*.6)+.05,z]],{c:col,r:.06,n:Math.max(3,Math.round(3+n/6)),a:e});
        if(cur||k===5)R.label([CX[i],H(n)*g,z],n+(cur&&!nar?' · '+(c==='reversible'&&o==='unattended'?'allowed (to Sam only)':word[c]):''),{fs:12.5,b:1,c:mix(P.ink,col,.5),dy:-10,a:cur?e:.8})}
      else if(cur&&c==='irreversible'){R.line([[CX[i]-.4,.01,z-.4],[CX[i]+.4,.01,z-.4],[CX[i]+.4,.01,z+.4],[CX[i]-.4,.01,z+.4],[CX[i]-.4,.01,z-.4]],{c:col,w:1.6,dash:[5,4],a:e});
        R.label([CX[i],.02,z],'0 proposed · would be refused',{fs:12.5,b:1,c:col,dy:-10,a:e})}}));
  }
  const full={cam:[.42,.62],bounds:[[-4.1,0,-1.8],[4.5,1.7,1.9]]};
  S3.stage({id:'stg-gate',list:'sx-gate',fig:'Fig. 7 · every gate-on action, recorded (both models)',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1400,hold:4800,draw,
    view:k=>k===0?{cam:[.45,.55],bounds:[[-4.2,0,-1.8],[.2,1.3,1.9]]}:k===1||k===2?{cam:[.45,.55],bounds:[[-1.8,0,-1.6],[2.2,1.7,1.9]]}:k>=3?{cam:[.42,.55],bounds:[[.6,0,-1.6],[4.6,1.3,1.9]]}:full,
    margin:w=>w<520?[16,10,14,10]:[28,16,16,16]});
})();
