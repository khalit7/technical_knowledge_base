// ---- Scene, section 1: the same eight requests under static batching (back) and continuous batching (front), four seats each.
// Data: BKD.scn.cb, from src/sched/gen_scenes.py (this page's simulator, Llama 3.1 8B FP8 on the calibrated H100 preset; the request
// lengths are illustrative). Time runs left to right at one scale for both; each request is a bar in the seat it held, from the step it
// started to its last token; a static seat that finished early stays held (red ghost) until its whole batch ends. ----
(function(){
  if(!document.getElementById('stg-cb')||!window.BKD||!BKD.scn)return;const {at,off,lerp,mix,rgb}=S3;
  const C=BKD.scn.cb,ST=C.modes.static,CO=C.modes.cont,TAB=['#4e79a7','#f28e2b','#59a14f','#b07aa1','#d4a72c','#76b7b2','#e15759','#9c755f'];
  const f=(v,d)=>v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const XS=2.9,X0=-4.4,x=t=>X0+t*XS,LW=.5,LP=.7,ZS=-3.0,ZC=.55,zs=(base,k)=>base+k*LP;
  // the numbers the step list quotes (checked by src/check_stages.mjs)
  window.BK_CB={static_span:ST.span,cont_span:CO.span,static_tps:ST.tps,cont_tps:CO.tps,static_mean:ST.mean_done,cont_mean:CO.mean_done,
    static_use:ST.seat_use,cont_use:CO.seat_use,idle:ST.idle_share,step0:ST.step0_ms,dstep:ST.dstep_ms,first_join:CO.reqs.filter(r=>r.start>0).sort((a,b)=>a.start-b.start)[0]};
  function lane(R,base,a,lab){const P=R.P;for(let k=0;k<C.seats;k++){const z=zs(base,k);
      R.quad([[x(0),.004,z-LW/2],[x(ST.span),.004,z-LW/2],[x(ST.span),.004,z+LW/2],[x(0),.004,z+LW/2]],{fill:mix(P.card,P.ink,.05),edge:false,a:a*.9,dz:300})}
    R.label([x(0),0,base+1.5*LP],lab,{al:'right',dx:-34,mono:true,fs:12.5,b:1,c:P.ink,a,grp:'rows'})}
  function bars(R,M,base,a,tEnd,ghost,flows){const P=R.P;
    M.reqs.forEach(r=>{if(r.start>tEnd)return;const z=zs(base,r.seat),c=rgb(TAB[r.id]),t1=Math.min(tEnd,r.last),pre=Math.min(t1,r.first);
      // the first step (prefill) as a taller slice, then one token a step
      if(pre>r.start)R.box([(x(r.start)+x(pre))/2,0,z],[Math.max(.03,x(pre)-x(r.start)),.42,LW*.9],{fill:mix(P.paper,c,.85),a,lw:.6,shadow:false});
      if(t1>pre)R.box([(x(pre)+x(t1))/2,0,z],[x(t1)-x(pre),.2,LW*.9],{fill:mix(P.paper,c,.55),a,lw:.6,shadow:false});
      R.label([x(r.start)+.12,.42,z],'R'+(r.id+1),{al:'left',fs:12,b:1,c:P.ink,a:a*(t1>r.start+.05?1:0)});
      if(ghost&&r.left>r.last+.01&&tEnd>r.last){const g=Math.min(tEnd,r.left);R.box([(x(r.last)+x(g))/2,0,z],[x(g)-x(r.last),.2,LW*.9],{fill:mix(P.paper,P.bad,.25),fa:.45,ec:P.bad,a:a*ghost,lw:.8,shadow:false})}
      if(flows&&t1<r.last+.001&&t1>r.start&&tEnd<M.span){R.flow([[x(r.start),.25,z],[x(t1),.25,z]],{c,r:.05,speed:1.6,a:a*.8})}})}
  function axis(R,a){const P=R.P,stp=R.W<520?1:.5;for(let t=0;t<=3.01;t+=stp){R.line([[x(t),.005,ZS-.45],[x(t),.005,zs(ZC,3)+.4]],{c:P.line,w:1,a:a*.8,dz:250});
      R.label([x(t),0,zs(ZC,3)+.4],f(t,1)+' s',{dy:14,fs:12,mono:true,c:P.mute,a})}}
  function endMark(R,M,base,a,txt){const P=R.P;R.line([[x(M.span),0,base-.4],[x(M.span),.6,base-.4],[x(M.span),.6,zs(base,3)+.3],[x(M.span),0,zs(base,3)+.3]],{c:P.acc,w:2,a});
    R.label([x(M.span),.6,base-.4],txt,{al:'left',dx:6,dy:-10,fs:12.5,b:1,c:P.acc,a})}
  // the waiting queue, left of a group of seats: one small box per request not yet started
  const qz=(base,j)=>base-.25+j*.34;
  function queue(R,ids,base,a){const P=R.P;ids.forEach((i,j)=>R.box([x(0)-.75,0,qz(base,j)],[.4,.26,.26],{fill:mix(P.paper,rgb(TAB[i]),.7),a,lw:.6}))}
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-3.6,4,.5);axis(R,1);
    const sa=k===0?1:k<=3?1:.28,ca=k>=4?1:k===0?.5:.12;
    lane(R,ZS,sa,'static');lane(R,ZC,Math.max(ca,.3),'continuous');
    if(k===0){queue(R,[0,1,2,3,4,5,6,7],ZS,e);R.label([x(0)-.75,.26,qz(ZS,0)],'8 requests queued',{dy:-14,fs:12.5,b:1,a:e})}
    // static: batch 1, its idle seats, batch 2
    const sEnd=k===1?lerp(0,ST.reqs[1].last,e):k===2?ST.reqs[1].last:k>=3?(k===3?lerp(ST.reqs[1].last,ST.span,e):ST.span):0;
    if(k>=1)bars(R,ST,ZS,sa,sEnd,k===2?e:k>=3?1:0,k<=3);
    if(k>=3)endMark(R,ST,ZS,sa*(k===3?e:1),'all done '+f(ST.span,2)+' s');
    if(k===2)R.label([(x(ST.reqs[2].last)+x(ST.reqs[1].last))/2,.2,zs(ZS,2)],'seat held, idle',{dy:-14,fs:12.5,b:1,c:P.bad,a:e});
    if(k===3)R.label([x(ST.reqs[4].start),.45,zs(ZS,0)],'batch 2 waits for batch 1',{al:'left',dy:-18,fs:12.5,b:1,a:e});
    // continuous: a seat is refilled at the next step after its request leaves
    const cEnd=k===4?lerp(0,CO.span,e):k>=5?CO.span:0;
    if(k>=4)bars(R,CO,ZC,ca,cEnd,0,true);
    if(k===4){const wait=CO.reqs.filter(r=>r.start>0);queue(R,wait.filter(r=>r.start>cEnd).map(r=>r.id),ZC,1);
      wait.forEach((r,j)=>{if(cEnd>=r.start)R.flowArc([x(0)-.75,.26,qz(ZC,j)],[x(r.start),.42,zs(ZC,r.seat)],.7,{c:rgb(TAB[r.id]),r:.05,n:6,speed:1.8,a:Math.max(0,1-(cEnd-r.start)*2.5)})})}
    if(k>=5){endMark(R,CO,ZC,e,'all done '+f(CO.span,2)+' s');R.line([[x(CO.span),.3,zs(ZC,0)-.4],[x(ST.span),.3,zs(ZC,0)-.4]],{c:P.good,w:2,a:e,head:7});
      R.label([(x(CO.span)+x(ST.span))/2,.3,zs(ZC,0)-.4],f(ST.span-CO.span,2)+' s sooner',{dy:14,fs:12.5,b:1,c:P.good,a:e})}
  }
  const full={cam:[.06,1.0],bounds:[[-5.5,0,-3.5],[6.4,.5,3.3]]};
  const back={cam:[.06,.95],bounds:[[-5.5,0,-3.5],[5.1,.5,-.4]]},front={cam:[.06,.95],bounds:[[-5.5,0,.1],[5.1,.5,3.3]]};
  const st=S3.stage({id:'stg-cb',list:'sx-cb',fig:'Fig. 2 · eight requests, four seats, two ways',cam:full.cam,bounds:full.bounds,aspect:.48,dur:1700,hold:5000,draw,view:k=>document.getElementById('stg-cb').clientWidth<520?{cam:[.95,.62],bounds:k>=1&&k<=3?back.bounds:k===4?front.bounds:full.bounds}:null, // phones: the lanes turned into depth, close on the lane each step is about
   
    margin:w=>w<520?[14,10,22,10]:[20,18,26,110]});
  (window.BKSTG=window.BKSTG||{})['stg-cb']=st;
})();
