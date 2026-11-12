// ---- Scene, Fig. 4 (section 13): two ways past one reticle. B200: two reticle-sized dies joined by NV-HBI (10 TB/s), eight HBM3e stacks.
// MI300X: four I/O dies (the Infinity Cache, the HBM3 controllers, two stacks each) with eight XCDs stacked on them, two per I/O die, 40 CUs each
// of which 38 are enabled (AMD CDNA 3 white paper). Counts written below and checked by check/check_stages.mjs; a schematic, not to area.
// Steps are explained by #sx-amd on the left. ----
(function(){
  if(!document.getElementById('stg-amd'))return;const {at,off,mix,lerp}=S3;
  const BX=-4.6,MX=3.6,IW=1.9,ID=1.55,CU=40,CUON=38;
  const IOD=[[-1,-1],[1,-1],[-1,1],[1,1]].map(([i,j])=>[MX+i*(IW/2+.05),j*(ID/2+.05)]);
  const XCD=[];IOD.forEach(([x,z],n)=>[-1,1].forEach(s=>XCD.push({x:x+s*.45,z,n})));
  window.GA_AMD={xcd:XCD.length,iod:IOD.length,cu:XCD.length*CUON,stacks:8}; // checked by check/check_stages.mjs
  const lab=(R,p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
  function draw(R,k,e){const P=R.P;R.grid(-8,7.5,-3.2,3.4,.5);
    // B200
    const ba=k===0?1:.25;R.box([BX,0,0],[5.6,.04,3.4],{fill:mix(P.paper,P.ink,.04),a:ba,dz:100});
    [-1,1].forEach(s=>{R.box([BX+s*1.2,.04,0],[2.1,.12,2.8],{fill:mix(P.paper,P.c3,.4),a:ba,dz:50});
      for(let i=0;i<4;i++)R.box([BX+s*2.6,0,-1.05+i*.7],[.5,.42,.6],{fill:mix(P.paper,P.c2,.55),a:ba})});
    R.box([BX,.04,0],[.3,.1,2.2],{fill:mix(P.paper,P.acc,.6),a:ba,shadow:false,dz:20});
    if(k===0){R.flow([[BX-1.2,.3,-.4],[BX+1.2,.3,.4]],{c:P.acc,r:.07,n:6,speed:1.3});R.flow([[BX+1.2,.3,-.6],[BX-1.2,.3,.2]],{c:P.acc,r:.07,n:6,speed:1.3});
      lab(R,[BX,.2,-1.2],'NV-HBI · 10 TB/s',{dy:-14,b:1,c:P.acc,a:e});lab(R,[BX,0,1.75],'B200 · 2 dies · 148 SMs',{dy:16,b:1,a:e});lab(R,[BX-2.6,.45,-1.05],'HBM3e',{dy:-12,c:P.c2,a:e})}
    else lab(R,[BX,0,1.75],'B200',{dy:16,c:P.mute});
    // MI300X: base dies, stacks, then the XCDs dropped on top
    const ma=k===0?.3:1;R.box([MX,0,0],[6.3,.04,3.6],{fill:mix(P.paper,P.ink,.04),a:ma,dz:100});
    IOD.forEach(([x,z])=>{R.box([x,.04,z],[IW,.16,ID],{fill:mix(P.paper,P.c4,.4),a:ma,dz:50});const s=x<MX?-1:1;
      [-.38,.38].forEach(dz=>R.box([MX+s*2.65,0,z+dz],[.5,.42,.66],{fill:mix(P.paper,P.c2,.55),a:ma}))});
    if(k===1){lab(R,[MX,.2,0],'256 MB Infinity Cache',{b:1,c:P.c4,a:e});lab(R,[MX,0,-1.85],'4 I/O dies · 6 nm',{dy:-14,b:1,c:P.c4,a:e});lab(R,[MX+2.65,.45,1.2],'8 HBM3 · 2 per I/O die',{dy:-14,c:P.c2,a:e,al:'right',dx:20})}
    const xa=k<2?0:k===2?Math.min(1,e*1.4):1,lift=k===2?(1-e)*1.4:0;
    if(xa>0)XCD.forEach((X,xi)=>{const y=.2+lift,hl=k===3&&(xi===0||xi===7),xa2=k===3&&!hl?xa*.35:xa;
      R.box([X.x,y,X.z],[.78,.1,1.36],{fill:mix(P.paper,P.c3,hl?.65:.45),a:xa2,shadow:false});
      for(let c=0;c<CU;c++){const on=c<CUON,cx=X.x-.3+(c%5)*.15,cz=X.z-.6+Math.floor(c/5)*.17;
        R.quad([[cx-.05,y+.105,cz-.06],[cx+.05,y+.105,cz-.06],[cx+.05,y+.105,cz+.06],[cx-.05,y+.105,cz+.06]],{fill:on?mix(P.paper,P.c3,.8):P.line,edge:false,a:xa2,dz:-1})}});
    if(k===2)lab(R,[MX,.35,1.95],'8 XCDs · 38 of 40 CUs each · 304',{dy:16,b:1,c:P.c3,a:e});
    // sharing: XCD 0 hands data to XCD 7 through the base dies' Infinity Cache
    if(k===3){const a=XCD[0],b=XCD[7];R.flow([[a.x,.35,a.z],[a.x,.12,a.z+.5],[MX,.12,0],[b.x,.12,b.z-.5],[b.x,.35,b.z]],{c:P.c4,a:e,r:.08,n:12,speed:1.2,top:1});
      lab(R,[a.x,.35,a.z-.7],'4 MB L2 per XCD',{dy:-14,b:1,c:P.c3,a:e});lab(R,[MX,.2,0],'via Infinity Cache',{dy:16,b:1,c:P.c4,a:e});lab(R,[MX,0,1.95],'MI300X',{dy:16,b:1})}
    else if(k>0&&k<2)lab(R,[MX,0,1.95],'MI300X',{dy:16,b:1});
  }
  const st=S3.stage({id:'stg-amd',list:'sx-amd',fig:'Fig. 4 · B200 against MI300X, drawn to counts',cam:[.15,.8],bounds:[[-7.6,0,-2.3],[7.2,1,2.4]],aspect:.5,dur:1600,hold:4800,draw,
    view:k=>k===0?null:{cam:[.3,.72],bounds:[[MX-3.4,0,-2.2],[MX+3.4,1.2,2.3]]},margin:w=>w<520?[16,10,16,10]:[24,24,24,24]});
  (window.GASTG=window.GASTG||{})['stg-amd']=st;
})();
