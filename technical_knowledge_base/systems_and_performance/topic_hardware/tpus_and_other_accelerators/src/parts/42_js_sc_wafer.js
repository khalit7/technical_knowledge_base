// ---- Scene, Fig. 4 (section 8): Cerebras's wafer against an H100 die and Groq's first chip, drawn to scale from their areas, then weight
// streaming and inference across wafers (renderer v2) ----
// Areas: WSE-3 46,225 mm^2 (Cerebras, Mar 13 2024), H100 814 mm^2 (NVIDIA), Groq TSP 25 x 29 mm (ISCA 2020); each drawn as a square (a rectangle
// for the TSP) of its area, 1 unit = 20 mm. Cores: 970,000 built, 900,000 used, 44 GB of SRAM (section 8). Llama 3.1 70B: 70,553,706,496
// parameters x 2 bytes (the fit chart's count). The core patch of step 2 is illustrative and enlarged; MemoryX, SwarmX and the wafers in steps
// 3 to 6 are schematic (no timings or bandwidths are published).
(function(){
  if(!document.getElementById('stg-wafer'))return;const {at,off,mix,add,cl}=S3;
  const U=20,WSE=46225,H100=814,TSP=[25,29],SRAM=44,P70=70553706496,GB70=P70*2/1e9,NW=Math.ceil(GB70/SRAM);
  const sw=Math.sqrt(WSE)/U,sh=Math.sqrt(H100)/U,tw=TSP[0]/U,td=TSP[1]/U;
  window.TPU_WAFER={wse:WSE,h100:H100,tsp:TSP[0]*TSP[1],xH:WSE/H100,xT:WSE/(TSP[0]*TSP[1]),gb70:GB70,wafers:NW,kb:SRAM*1e6/900000,used:900000/970000};  // checked by check_stages.mjs
  const WX=-1.6,HX=6.4,f0=v=>Math.round(v).toLocaleString('en-US');
  const TW=[-3.4,0,3.4],TZ=2.3,WS=2.3,MX=[0,0,-4.4],SX=[0,0,-1.3],IW=[-4.65,-1.55,1.55,4.65];
  function slab(R,c,w,d,o){const P=R.P;R.box(c,[w,.1,d],{fill:o.fill||P.paper,a:o.a,shadow:o.shadow});
    if(o.grid)R.glass([c[0]-w/2,c[1]+.105,c[2]-d/2],[w,0,0],[0,0,d],{c:o.gc||P.c1,a:o.a*(o.ga||.5),nu:o.grid,nv:o.grid,th:.02})}
  function wafer(R,x,z,a,ga){slab(R,[x,0,z],WS,WS,{a,grid:8,ga:ga||.5})}
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    R.grid(-8,9,-6.5,6.5,.5);
    // steps 1 and 2: the dies to scale, then a patch of cores
    const dA=k<=1?1:k===2?1-cl(e*2,0,1):0;
    if(dA>0){
      slab(R,[WX,0,0],sw,sw,{fill:mix(P.paper,P.c1,.12),a:dA,grid:24,ga:.35});
      slab(R,[HX,0,-1.6],sh,sh,{fill:mix(P.paper,P.ink,.25),a:dA});
      slab(R,[HX,0,1.4],tw,td,{fill:mix(P.paper,P.c1,.3),a:dA,grid:3,ga:.6});
      if(k===0){lab([WX,.1,-sw/2],'Cerebras WSE-3 · '+f0(WSE)+' mm² · '+SRAM+' GB SRAM',{dy:-14,b:1,a:dA});
        lab([HX,.1,-1.6-sh/2],'H100 die · '+f0(H100)+' mm²',{dy:-14,b:1,a:dA});
        lab([HX,.1,1.4+td/2],'Groq TSP · '+TSP[0]+' × '+TSP[1]+' mm · 220 MiB SRAM',{dy:16,b:1,a:dA});
        lab([WX,.1,sw/2],'≈ '+Math.round(WSE/H100)+' H100 dies of silicon',{dy:18,c:P.mute,a:dA,wide:1})}
      if(k===1||k===2&&dA>0){const a=k===1?e:dA,n=9,cs=.26,c0=[WX-sw/2+1.8,1.3,sw/2-1.8],cp=(i,j)=>[c0[0]+(i-(n-1)/2)*cs,c0[1],c0[2]+(j-(n-1)/2)*cs],dead=[[3,4],[6,2]],isDead=(i,j)=>dead.some(d=>d[0]===i&&d[1]===j);
        // the spot on the wafer the patch magnifies
        const s0=[c0[0],.11,c0[2]],sq=.35;R.quad([[s0[0]-sq,.12,s0[2]-sq],[s0[0]+sq,.12,s0[2]-sq],[s0[0]+sq,.12,s0[2]+sq],[s0[0]-sq,.12,s0[2]+sq]],{ec:P.acc,a,lw:1.5});
        [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([u,v])=>R.line([[s0[0]+u*sq,.12,s0[2]+v*sq],[c0[0]+u*cs*n/2,c0[1],c0[2]+v*cs*n/2]],{c:P.acc,w:1,a:a*.5,dash:[3,3]}));
        for(let i=0;i<n;i++)for(let j=0;j<n;j++){const p=cp(i,j);R.box([p[0],p[1]-.04,p[2]],[cs*.62,.08,cs*.62],{fill:isDead(i,j)?P.bad:mix(P.paper,P.c1,.2),a,shadow:false,lw:.5});
          if(i<n-1&&!isDead(i,j)&&!isDead(i+1,j))R.line([p,cp(i+1,j)],{c:P.mute,w:.8,a:a*.5});if(j<n-1&&!isDead(i,j)&&!isDead(i,j+1))R.line([p,cp(i,j+1)],{c:P.mute,w:.8,a:a*.5})}
        // a message routed around the dead core at (3,4)
        const route=[cp(0,4),cp(2,4),cp(2,3),cp(4,3),cp(4,4),cp(8,4)];R.line(route,{c:P.c2,w:2.4,a});R.flow(route,{c:P.c2,r:.035,n:10,speed:.6,a});
        if(k===1){lab(cp(3,4),'dead core',{dx:4,dy:-16,c:P.bad,b:1,a});lab([c0[0],c0[1],c0[2]+cs*n/2],'patch of cores, enlarged (illustrative)',{dy:18,a,wide:1});
          lab([c0[0]+cs*n/2,c0[1],c0[2]-cs*2],'mesh routes around it',{al:'left',dx:10,c:P.c2,b:1,a,wide:1})}}
    }
    // steps 3 to 5: weight streaming
    const tA=k===2?cl(e*2-1,0,1):k===3||k===4?1:k===5?1-cl(e*2,0,1):0;
    if(tA>0){const L=6,lh=.3,hl=2;
      for(let i=0;i<L;i++)R.box([MX[0],.1+i*(lh+.08),MX[2]],[2.4,lh,1.4],{fill:i===hl?mix(P.paper,P.c1,k===4?.25+.4*Math.abs(Math.sin(e*3.14)):.55):P.paper,a:tA,shadow:i===0});
      R.box(SX,[6.4,.35,.8],{fill:mix(P.paper,P.ink,.1),a:tA});
      TW.forEach(x=>wafer(R,x,TZ,tA));
      const lay=[MX[0]+1.25,.1+hl*(lh+.08)+lh/2,MX[2]],sw0=[SX[0],.36,SX[2]];
      if(k===2||k===3){const a=k===2?tA:.35;R.flowArc(add(lay,[-1.2,0,.7]),sw0,.6,{c:P.c1,r:.07,n:8,speed:1.5,a});TW.forEach(x=>R.flowArc(sw0,[x,.12,TZ-WS/2+.2],.9,{c:P.c1,r:.07,n:8,speed:1.5,a}))}
      if(k===3)TW.forEach(x=>{const r=.55,pts=[];for(let i=0;i<=24;i++){const t=i/24*Math.PI*2;pts.push([x+r*Math.cos(t),.14,TZ+r*Math.sin(t)])}R.line(pts,{c:P.c2,w:1.6,a:.6});R.flow(pts,{c:P.c2,r:.06,n:8,speed:.9})});
      if(k===4){TW.forEach(x=>R.flowArc([x,.12,TZ-WS/2+.2],sw0,.9,{c:P.c4,r:.07,n:8,speed:1.5,a:tA}));R.flowArc(sw0,add(lay,[-1.2,0,.7]),.6,{c:P.c4,r:.09,n:6,speed:1.5,a:tA})}
      lab([MX[0],.1+L*(lh+.08),MX[2]],'MemoryX · all weights and optimizer state',{dy:-12,b:1,a:tA});
      lab([SX[0]+3.2,.35,SX[2]],'SwarmX',{al:'left',dx:8,b:1,a:tA});
      if(k===2)lab([-3.3,1.5,SX[2]],"one layer's weights to every wafer",{c:P.c1,b:1,a:tA});
      if(k===3)lab([0,.1,TZ+WS/2],'activations stay on each wafer',{dy:18,c:P.c2,b:1});
      if(k===4)lab([-3.3,1.5,SX[2]],'gradients summed, weights updated',{c:P.c4,b:1,a:tA});
      if(k>=2&&k<=4)TW.forEach((x,i)=>lab([x,.1,TZ+WS/2],'CS-3 '+(i+1)+' · batch shard '+(i+1),{dy:k===3?38:18,fs:12,a:tA,wide:1}))}
    // step 6: inference, the weights resident across wafers, activations passed along
    const iA=k===5?cl(e*2-1,0,1):0;
    if(iA>0){IW.forEach((x,i)=>{wafer(R,x,0,iA,.9);lab([x,.1,WS/2],'wafer '+(i+1)+' · '+SRAM+' GB',{dy:18,fs:12,a:iA});
        if(i<IW.length-1)R.flowArc([x+.6,.12,0],[IW[i+1]-.6,.12,0],.7,{c:P.c2,r:.07,n:6,speed:1.3,a:iA})});
      lab([0,1.5,-1.5],'Llama 3.1 70B in bf16 · '+GB70.toFixed(1)+' GB → '+NW+' wafers',{dy:-6,b:1,a:iA})}
  }
  const views=[{cam:[.3,.95],bounds:[[-7.2,0,-5.6],[7.8,.4,5.6]]},{cam:[.45,.62],bounds:[[-7,0,1.2],[-1.8,1.5,4.4]]},
    {cam:[.42,.55],bounds:[[-5,0,-5.4],[5,2.6,3.6]]},{cam:[.42,.55],bounds:[[-5,0,-5.4],[5,2.6,3.6]]},{cam:[.42,.55],bounds:[[-5,0,-5.4],[5,2.6,3.6]]},{cam:[.25,.62],bounds:[[-6.1,0,-1.9],[6.1,1.6,1.8]]}];
  const st=S3.stage({id:'stg-wafer',list:'sx-wafer',fig:'Fig. 4 · a wafer as one chip',cam:views[0].cam,bounds:views[0].bounds,aspect:.7,dur:1500,hold:4800,draw,
    view:k=>views[k],margin:w=>w<520?[14,10,14,10]:[22,22,22,22]});
  (window.TPUSTG=window.TPUSTG||{})['stg-wafer']=st;
})();
