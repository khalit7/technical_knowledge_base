// ---- Scene: the KV cache as two stacks of plates, one K and one V tensor per layer (renderer v2) ----
// Sizes from the run (CL.v.n_ctx cells; 30 layers; 192 numbers per cell as 3 KV heads of 64, from the trace's {64, 3, 256} view) and the log's KV buffer size.
// Cells are drawn to scale along x; 5 prompt cells and one decoded token's cell, as in the run; which cells the cache picks is not shown (a fresh cache starts at the left).
// Layer 0 is a glass plate lifted above the others (attention reads it in step 4); layers 1 to 29 are a compact stack of outlines beneath it.
(function(){
  if(!document.getElementById('stg-kv')||!window.S3||!window.CLX||!CLX.CL.v)return;const {mix,cl}=S3;
  const v=CLX.CL.v,fmt=CLX.fmt,NC=v.n_ctx,NL=30,CW=6.4/NC,XA=-3.2,ZK=[-1.7,-1.0],ZV=[1.0,1.7],DY=.07;
  const Y=L=>L===0?1.55:1.15-(L-1)*.037,cx=c=>XA+c*CW;   // layer 0 lifted above the other 29, which sit as a compact stack
  function strip(R,L,c0,c1,z,col,a){if(c1<=c0||a<=.01)return;R.box([(cx(c0)+cx(c1))/2,Y(L),(z[0]+z[1])/2],[cx(c1)-cx(c0)-.003,.035,z[1]-z[0]-.01],{fill:col,a,shadow:false,lw:.5})}
  function plate(R,L,z,c,a){const y=Y(L);if(L===0)R.glass([XA,y,z[0]],[6.4,0,0],[0,0,z[1]-z[0]],{c,a:a*.9,nu:16,nv:3,th:.02,dz:20});
    else R.quad([[XA,y,z[0]],[XA+6.4,y,z[0]],[XA+6.4,y,z[1]],[XA,y,z[1]]],{fill:mix(R.P.card,c,.1),fa:.35,ec:c,lw:.8,ea:.55,a})}
  function draw(R,k,e){const P=R.P;R.grid(-4.4,4.4,-2.6,2.6,.5);
    const fillP=k===1?e:k>1?1:0,fillT=k===2?e:k>2?1:0;
    for(let L=NL-1;L>=0;L--){const a0=k===0?cl(e*1.8-((NL-1-L)/NL)*.8,0,1):1,rec=k===3&&L>0?.3:1;
      [[ZK,P.k],[ZV,P.v]].forEach(([z,c])=>{plate(R,L,z,c,a0*rec);strip(R,L,0,5*fillP,z,mix(P.paper,c,.8),a0*rec);strip(R,L,5,5+fillT,z,P.acc,a0*rec)})}
    // labels: the two stacks, the cell axis
    if(k!==3){R.label([XA,Y(0),(ZK[0]+ZK[1])/2],'K · one tensor per layer',{al:'right',dx:-8,mono:true,fs:12,b:1,c:P.k,grp:'kv'});
    R.label([XA,Y(0),(ZV[0]+ZV[1])/2],'V · one tensor per layer',{al:'right',dx:-8,mono:true,fs:12,b:1,c:P.v,grp:'kv'})}
    if(k===0||k===4){R.label([XA,Y(0),ZK[0]],'layer 0',{al:'right',dx:-8,mono:true,fs:12,c:P.mute,grp:'kv'});R.label([XA,Y(NL-1),ZV[1]],'layers 1 to 29 below',{al:'right',dx:-8,mono:true,fs:12,c:P.mute,grp:'kv'})}
    if(k===0){R.label([0,Y(0),ZK[0]],NC+' cells, to scale',{mono:true,fs:12,dy:-12,a:e});R.label([XA+6.4,Y(0),ZV[1]],'192 numbers per cell · F16',{al:'right',dy:16,mono:true,fs:12,a:e,wide:1})}
    // the prompt's K and V stream into 5 cells of every layer; then one token's into one more
    const src=[cx(14),Y(0)+.6,0];
    if(k===1||k===2){const c0=k===1?2.5:5.5;R.glow(src,.25,{c:P.acc,a:.8});R.ball(src,.1,{c:P.acc});
      [0,10,20,29].forEach(L=>{[ZK,ZV].forEach((z,j)=>R.flowArc(src,[cx(c0),Y(L)+.03,(z[0]+z[1])/2],L===0?.15:.05,{c:j?P.v:P.k,a:L===0?1:.5,r:.045,n:L===0?8:5,speed:1.3}))});
      R.label(src,k===1?'K, V of the 5 prompt tokens':'1 new token · one more cell',{al:'left',dx:14,mono:true,fs:12.5,b:1,c:k===2?P.acc:P.ink,a:e})}
    // attention in layer 0 reads K through a {64, 3, cells} view: three head bands, the query drawing on each
    if(k===3){const q=[cx(14),Y(0)+.2,(ZK[0]+ZK[1])/2];R.glow(q,.08,{c:P.q,a:e});R.ball(q,.035,{c:P.q,a:e});R.label(q,'query',{al:'left',dx:12,mono:true,fs:12.5,b:1,c:P.q,a:e});
      for(let h=0;h<3;h++){const z0=ZK[0]+(ZK[1]-ZK[0])*h/3,z1=z0+(ZK[1]-ZK[0])/3,zm=(z0+z1)/2;
        R.quad([[cx(0),Y(0)+.04,z0+.012],[cx(6),Y(0)+.04,z0+.012],[cx(6),Y(0)+.04,z1-.012],[cx(0),Y(0)+.04,z1-.012]],{fill:false,ec:P.q,lw:1.8,a:e,dz:-50});
        R.label([cx(0),Y(0),zm],'head '+h+' · 64 numbers',{al:'right',dx:-8,mono:true,fs:12,c:P.k,a:e,grp:'hd'});
        for(let c=0;c<6;c++)R.flowArc([cx(c+.5),Y(0)+.04,zm],q,.05,{c:P.k,a:e*.85,r:.012,n:3,speed:.3})}}
    // the whole allocation: 256 cells, 12 asked for
    if(k===4){[ZK,ZV].forEach(z=>R.quad([[cx(0),Y(0)+.045,z[0]],[cx(12),Y(0)+.045,z[0]],[cx(12),Y(0)+.045,z[1]],[cx(0),Y(0)+.045,z[1]]],{fill:false,ec:P.ink,dash:[4,3],lw:1.4,a:e,dz:-50}));
      R.label([cx(12),Y(0)+.05,ZK[0]],'12 cells asked for',{al:'left',dx:6,mono:true,fs:12,dy:-12,b:1,a:e});
      R.label([XA+6.4,Y(0),ZK[0]],fmt(v.kv_mib,2)+' MiB for '+NC+' cells × 30 layers × K and V',{al:'right',mono:true,fs:12.5,b:1,dy:-14,c:P.acc,a:e,wide:1})}
  }
  const full={cam:[.3,.85],bounds:[[-3.3,0,-1.8],[3.3,1.7,1.8]]};
  S3.stage({id:'stg-kv',list:'sx-kv',fig:'Fig. 4 · the KV cache of this run',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4600,draw,
    // the cell-level steps move in on the first cells; step 4 looks down on layer 0's K; the first and last show the whole allocation
    view:k=>k===1||k===2?{cam:[.4,.8],bounds:[[-3.3,0,-1.8],[-1.7,2.2,1.8]]}:k===3?{cam:[.3,1.0],bounds:[[-3.3,Y(0)-.05,-1.75],[-2.55,Y(0)+.25,-.95]]}:full,
    margin:w=>w<520?[16,10,16,10]:[18,16,18,180]});
})();
