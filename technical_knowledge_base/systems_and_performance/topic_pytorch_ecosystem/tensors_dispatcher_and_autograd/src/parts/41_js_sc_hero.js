// ---- Scene, Fig. 1 (2026-11-12, renderer v2): one torch.mm(x, w) through the three machines. Steps: #sx-hero.
// x's header and storage are the recorded (8, 256) float32 example (8,192 bytes, strides (256, 1)); the keys a plain CPU tensor carries and
// mm's slot kinds come from the installed wheel (window.TDA.dsp.tensor_keys and tables['aten::mm']); the storage is drawn as 8 rows of 256 floats.
(function(){
  if(!document.getElementById('stg-hero')||!window.S3||!window.TDA)return;const {at,off,lerp,mix}=S3,S=window.TDA.dsp,mm=S.tables['aten::mm'];
  const kind=k=>(mm[k]&&mm[k].kind)||'empty';
  // the keys, top to bottom: [key, y, step that is about it, what it does for mm]
  const KEYS=[['AutocastCPU',3.3,1,'excluded by the thread'],['AutogradCPU',2.45,2,'records MmBackward0'],['ADInplaceOrView',1.6,3,kind('ADInplaceOrView')]];
  const PX=0,PW=1.1,PD=.8,SX=-3.7,SZ=.2,NX=2.9,AX=4.55,KB=[1.0,.5,.9];
  function draw(R,k,e){const P=R.P,narrow=R.W<520,close=k===0||k===5; // close: the camera is in close on one end, so the other end's labels are not drawnR.grid(-5,5.6,-1.6,1.8,.5);
    // 1. x: a header over 8 rows of storage (each row 256 floats)
    const ha=k===0?1:k===4?1:.35;
    for(let r=0;r<8;r++)R.box([SX-1.05+r*.3,0,SZ],[.26,.18,.6],{fill:mix(P.paper,P.c2,.45),a:ha,shadow:r===0});
    R.glass([SX-1.2,.75,SZ-.45],[2.4,0,0],[0,0,.9],{c:P.c2,a:ha*.9,nu:8,nv:1,th:.04});
    if(k===0){for(let r=0;r<8;r++)R.flow([[SX-1.05+r*.3,.2,SZ],[SX-1.05+r*.3,.72,SZ]],{c:P.c2,r:.04,n:2,speed:.6,a:e})}
    if(k!==5&&(!narrow||k===0||k===4))R.label([SX,.78,SZ-.45],'x · (8, 256) float32',{mono:true,fs:12.5,b:k===0,c:k===0?P.c2:P.ink,dy:-12,a:Math.max(.5,ha)});
    if(k===0){R.label([SX,.78,SZ-.45],'strides (256, 1) · offset 0',{mono:true,fs:12,c:P.ink,dy:-28,a:e,wide:1});
      R.label([SX,0,SZ+.3],'storage: 8,192 bytes',{mono:true,fs:12,c:P.mute,dy:14,a:e})}
    // 2. the keys as glass plates; the ones a call skips are dashed
    KEYS.forEach(([nm,y,s,what])=>{const cur=k===s,skip=nm!=='AutogradCPU',c=nm==='AutogradCPU'?P.acc:P.c4;
      const a=k===0?.35:cur?1:k>s?.3:.22;R.glass([PX-PW,y,-PD],[2*PW,0,0],[0,0,2*PD],{c,a,nu:4,nv:3,th:.04});
      if(skip&&k>=s)R.line([[PX-PW,y,-PD],[PX+PW,y,-PD],[PX+PW,y,PD],[PX-PW,y,PD],[PX-PW,y,-PD]],{c,w:1.2,dash:[5,4],a:Math.max(a,.4)});
      if(!close)R.label([PX+PW,y,0],nm,{al:'left',dx:10,mono:true,fs:12.5,b:cur,c:cur?c:P.ink,a:Math.max(.45,a),wide:1});
      if(cur&&!narrow)R.label([PX+PW,y,0],what,{al:'left',dx:10,dy:16,mono:true,fs:12,b:1,c,a:e});
      if(cur&&narrow)R.label([PX,y+.25,0],nm+': '+what,{mono:true,fs:12,b:1,c})});
    // the CPU kernel on the floor
    const ka=k===4?1:k===0?.5:.35;R.box([PX,0,0],KB,{fill:mix(P.paper,P.c1,.45),a:ka});
    if(!close)R.label([PX,0,.5],'CPU kernel',{mono:true,fs:12.5,b:k===4,dy:14,c:k===4?P.ink:P.mute,a:Math.max(.5,ka)});
    // the call: a ball going down the keys, with dots on the path it has taken
    const TOP=4.1,ys=[TOP,3.3,2.45,1.6,KB[1]+.1];
    if(k>=1&&k<=4){const y0=ys[k-1],y1=ys[k],y=lerp(y0,y1,e);
      R.ball([PX,y+.12,0],.12,{c:P.c2,top:1});R.glow([PX,y+.12,0],.38,{c:P.c2,a:.6,top:1});
      R.flow([[PX,TOP,0],[PX,y+.1,0]],{c:P.c2,r:.055,speed:1.2,a:.7});
      if(k===1)R.label([PX,TOP,0],'torch.mm(x, w)',{mono:true,fs:13,b:1,c:P.c2,dx:16,al:'left',a:Math.max(.3,1-e)})}
    // 3. the node autograd records, and what it saves
    const na=at(k,e,2),nodeA=k===2||k===5?1:.45;
    if(na>0){R.box([NX,0,0],[1.1,.42,.8],{fill:mix(P.paper,P.acc,.35),a:na*nodeA});
      R.label([NX,0,.45],'MmBackward0',{mono:true,fs:12.5,b:1,dy:14,c:P.acc,a:Math.max(.5,na*nodeA)});
      const sv=k>=5?off(k,e,5):na;
      if(sv>0){R.box([NX-.24,.42,0],[.36,.3,.5],{fill:mix(P.paper,P.c2,.45),a:sv*nodeA,shadow:false});R.box([NX+.24,.42,0],[.36,.3,.5],{fill:mix(P.paper,P.c4,.35),a:sv*nodeA,shadow:false});
        if(k===2||k===5)R.label([NX,.75,0],k===5?'unpacks x, then frees both':'saves x and w',{mono:true,fs:12,c:P.acc,dy:-10,a:k===2?e:1-e*.3})}
      if(k===2){R.flowArc([PX+PW,2.45,0],[NX,.5,0],.6,{c:P.acc,r:.06,n:9,speed:1.2,a:e});R.flowArc([SX,.8,SZ],[NX-.24,.75,0],1.2,{c:P.c2,r:.05,n:10,speed:1,a:e*.8})}}
    // 4. y = x @ w, written by the CPU kernel; its grad_fn points at the node
    const ya=at(k,e,4);if(ya>0){const yx=1.45;R.box([yx,0,-.95],[.7,.32,.5],{fill:mix(P.paper,P.c3,.4),a:ya});
      R.label([yx,.32,-.95],'y = x @ w',{mono:true,fs:12.5,b:k===4,dy:-10,c:P.ink,a:Math.max(.5,ya)});
      if(k===4){R.flowArc([SX,.2,SZ],[PX-.3,.5,0],.9,{c:P.c2,r:.05,n:10,speed:1.1,a:e});R.flowArc([PX+.3,.3,0],[yx,.3,-.95],.35,{c:P.c3,r:.06,n:6,speed:1,a:e})}
      if(k>=4)R.line([[yx+.35,.2,-.95],[NX-.4,.2,-.3]],{c:P.acc,w:1.3,dash:[4,3],head:6,a:k===4?e:.5});
      if(k===4)R.label([(yx+NX)/2,.2,-.6],'grad_fn',{mono:true,fs:12,c:P.acc,dy:-8,a:e,wide:1})}
    // 5. backward: the gradient arrives, the node runs, AccumulateGrad writes w.grad
    const ba=at(k,e,5);if(ba>0){R.box([AX,0,0],[.9,.36,.7],{fill:P.paper,a:ba,ec:P.c3,lw:1.3});
      R.label([AX,0,.4],'AccumulateGrad',{mono:true,fs:12.5,b:1,dy:14,c:P.c3,a:ba});
      R.flow([[NX,1.9,0],[NX,.5,0]],{c:P.acc,r:.06,n:6,speed:1.1,a:ba});R.label([NX,1.9,0],'loss.backward()',{mono:true,fs:12.5,b:1,c:P.acc,dy:-10,a:ba});
      R.flowArc([NX+.5,.3,0],[AX-.4,.3,0],.45,{c:P.acc,r:.065,n:7,speed:1.2,a:ba});
      const g=Math.max(0,e*1.5-.5);R.box([AX,.36,0],[.5,.5*g+.01,.4],{fill:mix(P.paper,P.acc,.55),a:g,shadow:false});R.label([AX,.9,0],'w.grad',{mono:true,fs:12.5,b:1,c:P.acc,dy:-8,a:g})}
  }
  const full={cam:[.3,.5],bounds:[[-5,0,-1.1],[5.1,3.5,1.1]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one torch.mm through three machines',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:4600,draw,
    margin:w=>w<520?[16,10,14,10]:[18,40,14,20],
    // step 1 moves in close on the header and its storage; the backward step on the node
    view:k=>k===0?{cam:[.2,.6],bounds:[[-5.3,0,-.9],[-2.1,1.1,1.3]]}:k===5?{cam:[.42,.5],bounds:[[1,0,-1.3],[5.2,2.1,1]]}:full});
})();
