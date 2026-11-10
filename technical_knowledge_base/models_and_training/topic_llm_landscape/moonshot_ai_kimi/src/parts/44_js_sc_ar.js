// ---- Scene (stg-ar): Attention Residuals across K3's depth (renderer v2), replacing the 2D source-weight widget of 2026-10-24.
// Each sublayer output (attention and MLP count separately) is an upright glass plate along the depth axis, the embedding gold; the reader is
// decoder layer 40's attention sublayer (its pseudo-query is a query: orange). Plain residual: a running sum that grows with depth; Full AttnRes:
// a softmax over all 79 earlier outputs; Block AttnRes: blocks of 12 layers (window.KM.k3.block) summed into summaries, 5 sources at layer 40;
// "trained" weights are illustrative (the widget's seeded generator); the last step is K3's whole stack, 8 blocks plus the embedding.
// window.KM_AR exposes the derived numbers for check_stages.mjs. ----
(function(){
  if(!document.getElementById('stg-ar')||!window.KM)return;const {lerp,mix}=S3,K=KM.k3,BS=K.block,D=K.d,L=K.layers,RL=40,f=v=>v.toLocaleString('en-GB');
  const NF=1+2*(RL-1),NB=Math.ceil(RL/BS),inB=RL-BS*(NB-1),NS=NB+(inB>=2?1:0),NBLK=Math.ceil(L/BS),LAST=L-BS*(NBLK-1);
  // the widget's illustrative "trained" weights over the block sources at layer 40
  const tw=(()=>{const r=mulberry32(1000+RL),lg=[...Array(NS)].map((_,j)=>(j===0?1.2:0)+(j===NS-1?1.6:0)+(r()*2-1)*0.9),mx=Math.max(...lg),ex=lg.map(x=>Math.exp(x-mx)),Z=ex.reduce((p,c)=>p+c,0);return ex.map(x=>x/Z)})();
  window.KM_AR={NF,NS,tw,need:[[0,'weight exactly 1'],[1,String(NF)],[1,'1/'+NF],[1,f(NF*D*2)],[2,BS+' layers'],[2,NS+' sources'],[2,f(NS*D*2)],[2,(1/NS).toFixed(1)],
    [3,Math.round(100*Math.max(...tw))+'%'],[4,NBLK+' blocks'],[4,String(LAST)],[4,(NBLK+1)+' sources']]};
  const LP=.17,SG=.075,BG=.28,X0=-4.0,SHOW=48,xL=i=>X0+(i-1)*LP+Math.floor((i-1)/BS)*BG;  // layer i's attention plate; its MLP plate at +SG
  const xE=X0-.5,xR=xL(RL),PD=.75,PHt=.7,TOP=.1+PHt;
  // sources at layer 40: embedding, then 39 layers x 2 sublayers
  const src=[xE];for(let i=1;i<RL;i++){src.push(xL(i),xL(i)+SG)}
  const bx=b=>{const a=xL(1+(b-1)*BS),z=xL(Math.min(RL-1,b*BS))+SG;return (a+z)/2};          // a block summary's position (block 4 so far: layers 37 to 39)
  const blk=[xE,...[...Array(NS-1)].map((_,j)=>bx(j+1))];
  const vis=(k,e,st,f)=>{const a=f(st.pk),b=f(k);return e>=1||a===b?b:lerp(a,b,e)};
  const lab=(k,e,st,f)=>{const a=f(st.pk),b=f(k);if(e>=1||a===b)return b;return a>b?Math.max(b,a*(1-2*e)):b*Math.max(0,2*e-1)};
  const plate=(R,x,c,a,th)=>R.glass([x,.1,-PD/2],[0,0,PD],[0,PHt,0],{c,a,nu:1,nv:2,th:th||.02});
  function draw(R,k,e,st){const P=R.P;R.grid(-5,5,-1.4,1.6,.5);
    const gA=lab(k,e,st,s=>s<=3?1:0),gB=lab(k,e,st,s=>s===4?1:0);
    if(gA>.01){
      const indiv=vis(k,e,st,s=>s<=1?1:.12)*gA;
      plate(R,xE,P.c5,gA);R.label([xE,.35,0],'embedding',{fs:12.5,b:1,c:mix(P.c5,P.ink,.35),a:gA,al:'right',dx:-12,wide:1});
      for(let i=1;i<=SHOW;i++){const later=i>RL||(i===RL),a=later?.12*gA:indiv;
        plate(R,xL(i),P.acc,i===RL?0:a);plate(R,xL(i)+SG,mix(P.acc,P.paper,.35),i>=RL?.12*gA:a)}
      // the reader: layer 40's attention sublayer
      plate(R,xR,P.q,gA,.05);R.label([xR+.08,TOP*.55,0],'layer '+RL+' reads',{fs:12.5,b:1,al:'left',dx:10,c:P.q,a:gA,wide:1});
      // block brackets on the floor
      for(let b=1;b<=4;b++){const a0=xL(1+(b-1)*BS)-.04,a1=xL(Math.min(SHOW,b*BS))+SG+.04;R.line([[a0,.01,PD/2+.12],[a1,.01,PD/2+.12]],{c:P.c4,w:2,a:gA*.8});
        R.label([(a0+a1)/2,0,PD/2+.12],'block '+b+(b===4&&k>=2&&k<=3?' so far':''),{fs:12,dy:14,c:mix(P.c4,P.ink,.2),a:gA*vis(k,e,st,s=>s>=2?1:.6)})}
      // step 1: the plain residual, a running sum that grows with every output added
      const ra=gA*vis(k,e,st,s=>s===0?1:0);
      if(ra>.01){const ZS=-PD/2-.35,hs=j=>.08+.018*j;src.forEach((x,j)=>R.box([x,0,ZS],[.06,hs(j),.12],{fill:mix(P.paper,P.ink,.4),a:ra,shadow:false,lw:.4}));
        R.flow([[xE,hs(0)+.05,ZS],[src[NF-1],hs(NF-1)+.05,ZS],[xR,TOP*.7,0]],{c:P.ink,a:ra*.7,r:.05,speed:1.4});
        R.label([src[54],hs(54),ZS],'the sum · weight 1 each',{al:'right',dx:-12,dy:-14,fs:12.5,b:1,c:P.ink,a:lab(k,e,st,s=>s===0?1:0)})}
      // steps 2 to 4: weights on each source, and the sources streaming into the reader in proportion
      const fa=gA*vis(k,e,st,s=>s===1?1:0),ba=gA*vis(k,e,st,s=>s>=2&&s<=3?1:0);
      if(fa>.01){src.forEach((x,j)=>{R.box([x,TOP+.02,0],[.05,Math.max(.02,2.5/NF),.3],{fill:P.q,a:fa,shadow:false,lw:.4});
          if(j%2===0)R.flowArc([x,TOP,0],[xR,TOP,0],.25+.25*(xR-x)/(xR-xE),{c:P.q,a:fa*.55,r:.035,n:2,speed:1.2})});
        R.label([src[0],TOP+.1,0],'1/'+NF+' each',{al:'left',dx:40,dy:-36,fs:12.5,b:1,c:P.q,a:lab(k,e,st,s=>s===1?1:0)})}
      if(ba>.01){const W=k===3||(k===2&&st.pk===3&&e<1)?(k===3?tw.map((w,j)=>lerp(1/NS,w,e)):tw.map((w,j)=>lerp(w,1/NS,e))):tw.map(()=>1/NS);
        blk.forEach((x,j)=>{if(j>0)plate(R,x,P.acc,ba,.14);
          R.box([x,TOP+.02,0],[.16,Math.max(.02,W[j]*2.2),.3],{fill:P.q,a:ba,shadow:false});
          R.label([x,TOP+.02+W[j]*2.2,0],(Math.round(W[j]*100))+'%',{mono:true,fs:12,dy:-10,c:P.ink,a:ba*lab(k,e,st,s=>s===2||s===3?1:0)});
          if(x<xR-.05)R.flowArc([x,TOP,0],[xR,TOP,0],.3+.2*(xR-x)/(xR-xE),{c:P.q,a:ba*(.3+.7*Math.min(1,W[j]*2.5)),r:.04+.05*W[j],n:Math.max(2,Math.round(2+W[j]*12)),speed:1.2})});
}
    }
    // step 5: K3's whole stack, 8 block summaries plus the embedding, and the draft model reading three of them
    if(gB>.01){const xs=j=>-3.6+j*.9;
      plate(R,xs(0),P.c5,gB);R.label([xs(0),TOP,0],'embedding',{fs:12.5,b:1,dy:-12,c:mix(P.c5,P.ink,.35),a:gB});
      for(let b=1;b<=NBLK;b++){const x=xs(b),eg=b===1||b===4||b===NBLK;plate(R,x,b===NBLK?mix(P.acc,P.paper,.3):P.acc,gB,.14);
        R.label([x,0,PD/2],b===NBLK?LAST+' layers':BS+' layers',{fs:12,dy:14,c:P.mute,a:gB});R.label([x,TOP,0],'B'+b,{fs:12.5,b:1,dy:-12,c:P.acc,a:gB});
        if(eg)R.flowArc([x,.4,PD/2],[0,.25,2.2],.4,{c:P.c5,a:gB*.9,r:.05,n:5,speed:1.1})}
      R.box([0,0,2.2],[1.2,.3,.4],{fill:mix(P.paper,P.c5,.6),a:gB});R.label([0,0,2.4],'EAGLE-3 draft · reads blocks 1, 4, 8',{fs:12.5,b:1,dy:16,c:mix(P.c5,P.ink,.4),a:gB})}
  }
  const vA={cam:[.06,.4],bounds:[[-4.8,0,-.6],[4.6,1.9,1.2]]},vB={cam:[.06,.45],bounds:[[-4.2,0,-.6],[4.2,1.4,2.6]]};
  S3.stage({id:'stg-ar',list:'sx-ar',fig:'Attention Residuals · K3, the input to layer '+RL,cam:vA.cam,bounds:vA.bounds,aspect:.44,dur:1700,hold:5200,draw,
    margin:w=>w<520?[14,8,14,8]:[24,24,18,24],
    view:k=>k===4?vB:vA});
})();
