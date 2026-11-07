// ---- Scene: array of structs against struct of arrays (section 3; renderer v2). 32 Token records of 8 four-byte fields (aos_soa.cpp's struct),
// 128-byte lines: as AoS four records per line, as SoA one field per line (the grid is its own transpose). Measured times from window.CB.aos (run 1).
(function(){
  if(!document.getElementById('stg-aos')||!window.CB||!CB.aos)return;const {at,off,cl,mix,lerp}=S3;
  const F=['id','logprob','user','pos','temp','top_p','seq','flags'],U=2,NR=32,SW=.2,X0=-3.2,ZR=.36,Z0=.1;
  const V=CB.aos.v,f3=v=>v.toFixed(3),f2=v=>v.toFixed(2);
  // slot (record r, field f): AoS line r>>2, slot (r&3)*8+f; SoA line f, slot r
  const pos=(r,f,soa)=>{const line=soa?f:r>>2,slot=soa?r:(r&3)*8+f;return [X0+(slot+.5)*SW,Z0+line*ZR]};
  const CORE=[0,1.55,-1.6];
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-2.6,3.4,.5);
    const COL=[P.c1,P.c6,P.c2,P.c3,P.c4,P.c5,P.mute,mix(P.ink,P.paper,.35)];
    const soaT=k<2?0:k===2?e:1;                         // AoS to SoA, rearranged during step 3
    const allF=k===4;                                     // step 5: every field summed
    // the core that runs s += t.user
    const ca=k===0?.25:1;R.box(CORE,[1.3,.5,.7],{fill:mix(P.paper,P.c2,.25),a:ca,shadow:false});
    R.label([CORE[0],CORE[1]+.5,CORE[2]],allF?'core: sum all 8 fields':'core: s += user',{mono:true,fs:12.5,b:1,dy:-10,a:ca});
    // which lines are fetched in this step
    const fetched=line=>k===0?false:soaT<.5?true:(allF||line===U);
    for(let r=0;r<NR;r++)for(let fi=0;fi<8;fi++){
      const a0=pos(r,fi,false),a1=pos(r,fi,true),x=lerp(a0[0],a1[0],soaT),z=lerp(a0[1],a1[1],soaT);
      const line=soaT<.5?(r>>2):fi,used=k>=1&&(fi===U||allF),lit=fetched(line);
      let alpha=k===0?(r<4?1:.35):lit?1:.2;if(k===0&&r===0)alpha=0;   // step 1 lifts record 0 out of the grid
      const y=used&&k>=1&&k!==2?.06:0;
      R.box([x,y,z],[SW-.03,.12,ZR-.1],{fill:used||k===0?mix(P.paper,COL[fi],.75):mix(P.paper,COL[fi],.25),a:alpha,shadow:false,lw:.6})}
    // step 1: record 0 exploded above its line, each field named
    if(k===0){const sp=.72,y=.55+.25*e;F.forEach((nm,fi)=>{const x=X0+.8+(fi-3.5)*sp+2.4,src=pos(0,fi,false);
        const xx=lerp(src[0],x,e),yy=lerp(0,y,e),zz=lerp(src[1],Z0-.2,e);R.box([xx,yy,zz],[.6,.22,.3],{fill:mix(P.paper,COL[fi],.75),shadow:false});
        R.label([xx,yy+.22,zz],nm,{mono:true,fs:12,dy:-9,a:e,c:fi===U?P.c2:P.ink,b:fi===U})});
      R.label([X0+.8+2.4+(-3.5)*.72-.4,.55+.25*e,Z0-.2],'one Token · 32 bytes',{fs:12.5,b:1,al:'right',dx:-6,dy:4,a:e,wide:1})}
    // row labels: lines in AoS, fields in SoA
    for(let l=0;l<8;l++){const z=Z0+l*ZR,t=soaT<.5?'line '+l+' · records '+(4*l)+' to '+(4*l+3):F[l]+'[0..31]';
      R.label([X0,0,z],t,{mono:true,fs:12,al:'right',dx:-8,grp:'ln',a:k===0?.6:fetched(l)?1:.4,c:soaT>=.5&&l===U?P.c2:P.ink,b:soaT>=.5&&l===U})}
    // flows: each fetched line streams to the core, thickness by bytes used
    if(k>=1&&k!==2||(k===2&&e>.85)){for(let l=0;l<8;l++){if(!fetched(l))continue;const z=Z0+l*ZR,src=[X0+6.4*.5+(l-3.5)*.25,.14,z];
      R.flowArc(src,[CORE[0]+(l-3.5)*.1,CORE[1],CORE[2]+.35],.6,{c:P.c2,a:.75,r:.05,n:7,speed:1.4})}}
    // counters under the grid
    const lines=k===0?0:soaT<.5?8:allF?8:1,usedB=k===0?0:allF?1024:128;
    if(k>=1){const t=lines+(lines===1?' line':' lines')+' fetched · '+(lines*128).toLocaleString('en-US')+' bytes moved · '+usedB.toLocaleString('en-US')+' used';
      R.label([0,0,Z0+8*ZR],t,{mono:true,fs:12.5,dy:18,b:1,c:usedB===lines*128?P.good:P.bad,a:k===2?Math.max(0,e*2-1):1})}
    // measured bars: ns per record, AoS against SoA
    if(k>=3){const pair=k===3?[V.i_aos.runs[0],V.i_soa.runs[0]]:[V.a_aos.runs[0],V.a_soa.runs[0]],sc=2/Math.max(V.a_aos.runs[0],V.i_aos.runs[0]),a=k===3?e:1;
      [['AoS',pair[0],P.bad],['SoA',pair[1],P.good]].forEach(([nm,v,c],i)=>{const x=4.0+i*1.25;R.box([x,0,1.2],[.55,Math.max(.02,v*sc*a),.55],{fill:mix(P.paper,c,.6)});
        R.label([x,v*sc*a,1.2],(k===3?f3(v):f2(v))+' ns',{mono:true,fs:12,dy:-10,a,b:1});R.label([x,0,1.2],nm,{fs:12.5,dy:16,a,b:1})});
      R.label([4.62,0,1.2],k===3?'one integer field':'all 8 fields',{fs:12,dy:34,c:P.mute,a})}
  }
  const full={cam:[.12,.72],bounds:[[-3.4,0,-1.9],[5,1.9,3.1]]};
  S3.stage({id:'stg-aos',list:'sx-aos',fig:'32 Token records in 128-byte lines',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    view:k=>k===0?{cam:[.1,.5],bounds:[[-3.4,0,-.6],[3.4,1.2,1.8]]}:k===2?{cam:[.12,.78],bounds:[[-3.4,0,-1.9],[3.4,1.9,3.1]]}:full,
    margin:w=>w<520?[14,10,22,10]:[16,14,24,190]});
})();
