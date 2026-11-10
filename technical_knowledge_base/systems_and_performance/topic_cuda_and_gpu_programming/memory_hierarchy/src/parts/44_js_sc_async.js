// ---- Scene, Fig. 5: the tile loop's copies against its math. HBM (blue), the registers a plain load parks data in (orange), one to four
// shared-memory buffers (green, the stages) and the SM's arithmetic (gold). Flows show what moves at once: with one buffer the copy and the
// math take turns; with S buffers, S - 1 copies stream in while the SM reads the remaining one. The cycle counts in the labels come from the
// page's pipeline model (window.MHM.pipeline, checked against code/reference.py) with the section's illustrative inputs: 479 cycles per copy
// (the H800 global-load latency, Luo et al.), 200 cycles of math per tile, 8 tiles. Steps: #sx-async. ----
(function(){
  if(!document.getElementById('stg-async'))return;const {mix}=S3,M=window.MHM;
  const L=479,C=200,N=8,STG=[1,1,2,3,4],RES=STG.map(s=>M.pipeline(s,L,C,N));
  const HX=-3.0,RX=-1.05,RY=.8,BY=1.25,bxp=i=>.15+i*1.08,SMX=.15,SMY=2.45;
  function draw(R,k,e){const P=R.P,S=STG[k],r=RES[k];R.grid(-5,4,-1.8,1.8,.5);
    // HBM
    R.glass([HX-1.0,.01,-1.0],[2.0,0,0],[0,0,2.0],{c:P.c1,a:1,nu:6,nv:6,th:.05});
    R.label([HX+.6,0,1.0],'HBM · the next tiles',{mono:true,fs:12.5,b:1,dy:16,c:P.c1,wide:1});
    // the registers a plain load passes through
    const ra=k===0?1:.18;R.glass([RX-.4,RY,-.4],[.8,0,0],[0,0,.8],{c:P.c2,a:ra,nu:4,nv:4,th:.05});
    if(k===0)R.label([RX,RY,-.4],'registers',{mono:true,fs:12.5,b:1,dy:-14,c:P.c2,wide:1});
    // the shared-memory buffers: one per stage; buffer 0 is being computed on, the others fill
    for(let i=0;i<4;i++){const on=i<S,a=on?(i<S-1||S===1?1:1):.14,x=bxp(i);
      R.glass([x-.46,BY,-.46],[.92,0,0],[0,0,.92],{c:P.c3,a:on?1:.14,nu:4,nv:4,th:.05});
      if(on)R.label([x,BY,.46],S===1?'one buffer':i===0?'computing':'filling',{mono:true,fs:12,dy:16,c:i===0&&S>1?P.c5:P.c3,a:e,wide:1})}
    R.label([bxp(1.5),BY,.46],S+(S===1?' tile buffer':' stages')+' · shared memory',{mono:true,fs:12.5,b:1,dy:46,c:P.c3,wide:1});
    // the SM's arithmetic
    R.box([SMX,SMY,0],[.95,.38,.7],{fill:mix(P.paper,P.c5,.45),shadow:false});
    R.label([SMX+.48,SMY+.2,0],'SM math',{mono:true,fs:12.5,b:1,al:'left',dx:10,c:P.c5,wide:1});
    // flows: copies in (through the registers on a plain load, straight into shared memory with LDGSTS), then the math reading its buffer
    if(k===0){R.flowArc([HX+.4,.12,0],[RX,RY,0],.3,{c:P.c1,a:e,r:.07,n:5});R.flowArc([RX+.3,RY+.05,0],[bxp(0),BY,0],.2,{c:P.c2,a:e,r:.07,n:4})}
    else{const fill=S===1?[0]:[...Array(S-1)].map((_,i)=>i+1);fill.forEach(i=>R.flowArc([HX+.4,.12,0],[bxp(i),BY,0],.7+.15*i,{c:P.c1,a:e,r:.07,n:7}))}
    R.flow([[bxp(0),BY+.08,0],[SMX,SMY,0]],{c:P.c3,a:S===1?.35*e:e,r:.07,n:6,speed:1.4});
    // the model's verdict for 8 tiles
    R.label(R.W<520?[SMX,SMY+.38,0]:[SMX+.48,SMY+.2,0],(R.W<520?S+(S===1?' buffer · ':' stages · '):'')+r.total.toLocaleString('en-GB')+' cycles · SM busy '+Math.round(100*r.busy)+'%',R.W<520?{mono:true,fs:12,b:1,dy:-14,c:P.ink,a:e}:{mono:true,fs:12.5,al:'left',dx:10,dy:18,c:P.ink,a:e});
  }
  const full={cam:[.3,.5],bounds:[[-4.0,0,-1.0],[3.6,2.85,1.0]]};
  const st=S3.stage({id:'stg-async',list:'sx-async',fig:'Fig. 5 · copying the next tile while computing this one',cam:full.cam,bounds:full.bounds,aspect:.48,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,40,40,16],
    // steps 1 and 2 lean in on the copy path through or around the registers; the stages need the whole row of buffers
    view:k=>k<=1?{cam:[.42,.5],bounds:[[-4.0,0,-1.0],[3.0,2.85,1.0]]}:full});
  (window.MHSTG=window.MHSTG||{})['stg-async']=st;
})();
