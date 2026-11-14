// ---- Scene, Fig. 3 (section 4): the ladder test. The PyTorch twin (left) and a port (right) as the same six layer plates; each step runs one
// more part of training on both and drops the measured largest difference into a gauge between them (log scale, 1e-9 to 1), with the rung's
// threshold as a glass plate; the part a failing rung names turns red. Numbers: PJ.hunt.variants (pj_hunt.py: rungs, max_abs_loss_diff_vs_torch),
// the port chosen in #pj-lad-v; the correct port's own difference stands behind as a faint bar. Steps: #sx-lad; the grid and the verdict
// under the list follow it (PJL.draw, 25_js_pj_read2.js). ----
(function(){
  if(!document.getElementById('stg-lad')||!window.PJS||!window.PJL)return;const {at,off,mix}=S3,{lab,plate,tint,LAYERS,ly,legs,path}=PJS;
  const L=PJL,TX=-2.35,PX=2.35,PW=1.3,PD=.85,TOP=ly(5),GH=2.6,LO=-9;
  const gy=d=>d==null||!isFinite(d)?GH:Math.max(.02,Math.min(GH,(Math.log10(Math.max(d,1e-12))-LO)/(-LO)*GH));   // log10 height, 1e-9 at the floor, 1 at the top
  const s2=v=>v==null||!isFinite(v)?'NaN':PJU.fmt(v,'s2');
  function draw(R,k,e){const P=R.P,v=L.port(),c=L.correct();R.grid(-3.6,3.6,-2.2,2.4,.5);
    const r=k>0?L.RUNGS[k-1]:null,fv=r?L.val(v,r[0]):null,fc=r?L.val(c,r[0]):null,ok=r?L.pass(fv,r[2]):true,first=L.first(v),bad=!ok;
    const red=x=>mix(P.c1,P.bad,x);
    // the two twins: plates light while the step uses them; on a failing forward or backward rung the port's plates turn red
    const used=k===0||k===1||k===3||k===5,pa=used?1:.35;
    LAYERS.forEach((n,i)=>{plate(R,[TX,ly(i),0],PW,PD,{c:P.c1,a:pa});
      plate(R,[PX,ly(i),0],PW,PD,{c:bad&&(k===1||k===3||k===5)?red(.75*e):P.c1,a:pa});
      lab(R,[TX-PW/2,ly(i),0],n,{al:'right',dx:-8,fs:12,c:P.mute,a:Math.max(.4,pa),grp:'ll'})});
    lab(R,[TX,0,PD/2+.2],'PyTorch twin',{fs:13,b:1,dy:16});
    const nm=R.W<520?'':v.label.length>34?v.label.slice(0,32)+'...':v.label;lab(R,[PX,0,PD/2+.2],nm?'port: '+nm:'port',{fs:13,b:1,dy:16,c:first>=0?P.bad:P.good});
    // step 1: the same weights copied across, the same batch under both
    if(k===0){R.flowArc([TX+.4,ly(3),0],[PX-.4,ly(3),0],.6,{c:P.c1,r:.065,speed:1.2});lab(R,[0,ly(3)+.75,0],'same weights, same batch 0',{fs:12.5,b:1,dy:-6,a:e})}
    [TX,PX].forEach(x=>{R.box([x,0,PD/2+.55],[.7,.18,.4],{fill:tint(P,P.ink,.08),a:k<=1?1:.35});});
    // forward: up both stacks to the logits; loss: one ball each; backward: down both stacks; one step: the optimiser writes the weights
    if(k===1||k===5)[TX,PX].forEach(x=>R.flow(legs([[x,.18,PD/2+.55],[x-.3,ly(0),.15],[x-.3,TOP+.3,.15]]),{c:P.mute,r:.06,speed:1.3,a:k===5?.6:1}));
    const lgA=k>=1?(k===1?e:k===2?1:.4):0;
    [TX,PX].forEach(x=>{if(lgA>0)plate(R,[x,TOP+.32,0],PW*.8,.25,{c:x===PX&&bad&&k===1?P.bad:P.c5,a:lgA,nu:8,nv:1})});
    if(k===1)lab(R,[TX+PW/2,TOP+.32,0],'logits',{wide:1,mono:true,fs:12,al:'left',dx:8,c:P.c5});
    const lsA=k>=2?(k===2?e:k===3?.8:.4):0;
    [TX,PX].forEach(x=>{if(lsA>0)R.ball([x,TOP+.7,0],.1,{c:x===PX&&bad&&k===2?P.bad:P.c5,a:lsA})});
    if(k===2)lab(R,[TX+.15,TOP+.7,0],'loss',{wide:1,mono:true,fs:12,al:'left',dx:10,c:P.c5});
    if(k===3||k===5)[TX,PX].forEach(x=>R.flow(legs([[x,TOP+.7,0],[x+.35,TOP+.2,.1],[x+.35,ly(0),.1]]),{c:P.c2,r:.065,speed:1.1,a:k===5?.6:1}));
    if(k===3)lab(R,[TX+PW/2,ly(2),0],'gradients',{wide:1,mono:true,fs:12,al:'left',dx:8,c:P.c2});
    const oA=k===4?1:k===5?.7:.25;
    [TX,PX].forEach(x=>{R.box([x+PW/2+.45,0,.1],[.5,.45,.5],{fill:x===PX&&bad&&k===4?tint(P,P.bad,.6*e+.2):tint(P,P.c3,.45),a:oA});
      if(k===4||k===5)R.flow(legs([[x+PW/2+.45,.45,.1],[x+PW/2-.1,ly(2),.1],[x+PW/2-.1,TOP,.1]]),{c:P.c3,r:.065,speed:1.1,a:k===4?1:.6})});
    lab(R,[PX+PW/2+.45,.45,.1],'optimiser',{mono:true,fs:12,dy:-10,c:P.c3,a:oA,wide:1});
    if(k===5){[TX,PX].forEach(x=>R.flowArc([x-.5,TOP+.9,0],[x+.5,TOP+.9,0],.45,{c:P.acc,r:.06,speed:1.3}));lab(R,[0,TOP+1.2,0],'300 steps on the same batches',{fs:12.5,b:1,c:P.acc,a:e})}
    // the gauge: a log axis, the threshold plate, the port's difference (front) and the correct port's (behind, faint)
    const gA=k===0?.35:1;
    R.line([[0,0,.45],[0,GH,.45]],{c:P.mute,w:1,a:gA});
    [-9,-6,-3,0].forEach(t=>{const y=gy(Math.pow(10,t));R.line([[-.08,y,.45],[.08,y,.45]],{c:P.mute,w:1,a:gA});if(t===-9||t===0)lab(R,[.1,y,.45],t===0?'1':'1e'+t,{mono:true,fs:12,al:'left',dx:6,c:P.mute,a:gA})});
    if(r){const ty=gy(r[2]),h=gy(fv)*Math.min(1,e*1.3),hc=gy(fc)*Math.min(1,e*1.3);
      R.glass([-.45,ty,-.45],[.9,0,0],[0,0,.9],{c:ok?P.good:P.bad,a:.85,nu:3,nv:3});
      lab(R,[-.45,ty,-.45],'threshold '+r[2].toExponential().replace('e-','e-'),{wide:1,mono:true,fs:12,al:'right',dx:-8,c:P.mute});
      R.box([0,0,-.2],[.22,hc,.22],{fill:tint(P,P.mute,.35),a:.45,shadow:false});
      R.box([0,0,.15],[.3,h,.3],{fill:ok?mix(P.paper,P.good,.75):mix(P.paper,P.bad,.8),a:1});
      lab(R,[0,h,.15],s2(fv)+(ok?' pass':' fails'),{mono:true,fs:13,b:1,dy:-14,c:ok?P.good:P.bad,a:Math.min(1,e*1.6)});
      lab(R,[.12,hc,-.2],'correct port '+s2(fc),{mono:true,fs:12,al:'left',dx:10,c:P.mute,a:Math.min(1,e*1.6)*.9,wide:1})}
  }
  const full={cam:[.2,.5],bounds:[[-3.9,0,-.7],[3.9,TOP+1.1,1.5]]};
  const st=S3.stage({id:'stg-lad',list:'sx-lad',fig:'Fig. 3 · the ladder: one batch, five comparisons',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:5000,draw,
    margin:w=>w<520?[14,10,14,10]:[20,16,16,96],onStep:k=>L.draw(k)});
  // a new port replays the climb from the first rung (a mode toggle: the one exception to "stops for good")
  L.sel.addEventListener('change',()=>{st.list('sx-lad');L.draw(0)});
  (window.PJSTG=window.PJSTG||{})['stg-lad']=st;
})();
