// ---- Scene (section 3, Fig. 3): the state each optimiser keeps beside one real weight matrix, drawn to scale (renderer v2) ----
// One expert FFN matrix of Kimi K2 (shape from its config.json, MEM_MODELS in 41_js_mem_data.js). Plates are drawn to scale: a slab the size of W
// is one state value per weight. Counting rules as in the memory table (42_js_mem.js); the step list's numbers are written from them (data-pr spans).
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-pre')||!window.S3||!window.MEM_MODELS)return;const {at,off,lerp,mix}=S3;
  const K=MEM_MODELS.find(m=>m.name==='Kimi K2');if(!K)return;const ex=K.mats.find(m=>/expert/.test(m[0]));if(!ex)return;
  const m=ex[1],n=ex[2],cnt=ex[3],mn=m*n,big=Math.max(m,n),sml=Math.min(m,n);
  // world size: the long side is 4.2 units, so a square factor on it is 4.2 x 4.2, to the same scale
  const U=4.2/big,LX=n*U,LZ=m*U,x0=-LX/2,z0=-LZ/2;
  const fmt=v=>v.toLocaleString('en-GB');
  const per={adam:2,muon:1,afac:(m+n)/mn,sham:(m*m+n*n)/mn};per.soap=2+2*per.sham;
  // the whole model under soap.py's defaults, counted exactly as the memory table counts it
  const soapAll=K.mats.reduce((s,[lab,r,c,k])=>s+(2*r*c+(r<=10000?2*r*r:0)+(c<=10000?2*c*c:0))*k,0)+2*K.vec;
  function writeList(){const set=(k,v)=>document.querySelectorAll('[data-pr="'+k+'"]').forEach(e=>e.textContent=v);
    set('big',fmt(big));set('sml',fmt(sml));set('w',(mn/1e6).toFixed(1));set('cnt',fmt(cnt));set('mn',fmt(m+n));set('af',per.afac.toFixed(4));
    set('sh',per.sham.toFixed(2));set('sp',per.soap.toFixed(2));set('all',(soapAll/K.total).toFixed(2));set('sq',(big*big/mn).toFixed(1))}
  const Y0=.12,DY=.34;
  // a flat slab the size of W at height y
  const slab=(R,y,c,a,nu)=>R.glass([x0,y,z0],[LX,0,0],[0,0,LZ],{c,a,nu:nu||14,nv:4,th:.03});
  function draw(R,k,e){const P=R.P,cW=P.c1,cM=P.c5,cV=P.c4,cF=P.c6,cQ=P.c2;R.grid(-3.6,3.6,-2.2,1.8,.5);
    // the weight matrix, always there
    slab(R,Y0,cW,1);R.label([x0,Y0,z0+LZ],'W · '+fmt(big)+' × '+fmt(sml),{mono:true,fs:12.5,b:1,c:cW,al:'right',dx:-10,dy:4,wide:1});
    // gradients arriving on W (every step)
    if(k===0){for(let i=0;i<5;i++){const x=x0+LX*(i+.5)/5;R.flow([[x,1.4,0],[x,Y0+.03,0]],{c:cW,a:e,r:.06,speed:1,n:4})}
      R.label([0,1.45,0],'one gradient per step, same shape as W',{fs:12.5,b:1,c:cW,dy:-10,a:e})}
    // 2. Adam: m and v, two more slabs the size of W
    const aA=k===1?e:k===2?1-e:0,aV=aA;
    if(aA>.01){slab(R,Y0+DY,cM,aA);slab(R,Y0+2*DY,cV,aV);R.label([x0+LX,Y0+DY,z0+LZ],'m',{mono:true,fs:13,b:1,c:cM,al:'left',dx:8,a:aA});R.label([x0+LX,Y0+2*DY,z0+LZ],'v',{mono:true,fs:13,b:1,c:cV,al:'left',dx:8,a:aA});
      for(let i=0;i<4;i++){const x=x0+LX*(i+.5)/4;R.flow([[x,Y0+.04,0],[x,Y0+2*DY,0]],{c:cV,a:aA*.8,r:.05,speed:.7,n:3})}
      R.label([0,Y0+2*DY,z0],'Adam, AdamW: 2 values per weight',{fs:12.5,b:1,c:P.ink,dy:-30,a:aA})}
    // 3. Muon: one momentum slab
    const aMu=k===2?e:k===3?1-e:0;
    if(aMu>.01){slab(R,Y0+DY,cM,aMu);R.label([x0+LX,Y0+DY,z0+LZ],'momentum',{mono:true,fs:13,b:1,c:cM,al:'left',dx:8,a:aMu});
      R.label([0,Y0+DY,z0],'Muon: 1 value per weight',{fs:12.5,b:1,c:P.ink,dy:-30,a:aMu})}
    // 4. Adafactor: v factored into one value per row and one per column
    const aF=k===3?e:k===4?1-e:0;
    if(aF>.01){R.box([x0-.12,Y0,0],[.1,.1,LZ],{fill:cV,a:aF,shadow:false});R.box([0,Y0,z0+LZ+.12],[LX,.1,.1],{fill:cV,a:aF,shadow:false});
      R.label([x0-.12,Y0+.1,z0],fmt(m)+' row sums',{mono:true,fs:12.5,b:1,c:cV,al:'right',dx:-6,dy:-10,a:aF});R.label([x0+LX*.75,Y0+.1,z0+LZ+.12],fmt(n)+' column sums',{mono:true,fs:12.5,b:1,c:cV,dy:16,a:aF});
      R.label([0,Y0,z0],'Adafactor: '+per.afac.toFixed(4)+' values per weight',{fs:12.5,b:1,c:P.ink,dy:-30,a:aF})}
    // 5. Shampoo: a factor per side, each as large as that side squared; gradients go in, the preconditioned step comes back
    const aS=k>=4?(k===4?e:1):0;
    if(aS>.01){const cR=[x0,Y0,z0-.25],cL=[x0+LX+.25,Y0,z0];
      R.glass(cR,[LX,0,0],[0,LX,0],{c:cF,a:aS*(k===5?lerp(1,.3,e):1),nu:14,nv:14,th:.03});R.glass(cL,[0,0,LZ],[0,LZ,0],{c:cF,a:aS*(k===5?lerp(1,.3,e):1),nu:4,nv:4,th:.03});
      R.label([x0,Y0+LX,z0-.25],(k===5?'R and its eigenbasis Q, each ':'R = Σ GᵀG · ')+fmt(n)+' × '+fmt(n),{mono:true,fs:12.5,b:1,c:cF,al:'left',dy:-12,a:aS,wide:1});
      R.label([x0+LX+.45,Y0+LZ*.5,z0+LZ/2],(k===5?'L and its Q · ':'L = Σ GGᵀ · ')+fmt(m)+' × '+fmt(m),{mono:true,fs:12.5,b:1,c:cF,al:'left',dx:14,a:aS,wide:1});
      R.flowArc([0,Y0+.05,0],[0,Y0+LX*.5,z0-.25],.4,{c:cF,a:aS*.85,r:.06,speed:1.2,n:7});R.flowArc([x0+LX*.8,Y0+.05,0],[x0+LX+.25,Y0+LZ*.5,0],.35,{c:cF,a:aS*.85,r:.06,speed:1.2,n:5});
      if(k===4)R.label([x0+LX,0,z0+LZ],'Shampoo: '+per.sham.toFixed(2)+' values per weight',{fs:12.5,b:1,c:P.ink,al:'left',dx:14,dy:24,a:e})}
    // 6. SOAP: each factor's eigenbasis as well, and Adam's m and v run in that basis
    if(k===5){const cR=[x0,Y0,z0-.45],cL=[x0+LX+.45,Y0,z0];R.glass(cR,[LX,0,0],[0,LX,0],{c:cQ,a:e*.8,nu:14,nv:14,th:.03});R.glass(cL,[0,0,LZ],[0,LZ,0],{c:cQ,a:e*.8,nu:4,nv:4,th:.03});
      
      slab(R,Y0+DY,cM,e);slab(R,Y0+2*DY,cV,e);R.label([x0+LX,Y0+DY,z0+LZ],'m',{mono:true,fs:13,b:1,c:cM,al:'left',dx:8,a:e});R.label([x0+LX,Y0+2*DY,z0+LZ],'v',{mono:true,fs:13,b:1,c:cV,al:'left',dx:8,a:e});
      R.label([x0+LX,0,z0+LZ],'SOAP: '+per.soap.toFixed(2)+' values per weight',{fs:12.5,b:1,c:P.ink,al:'left',dx:14,dy:24,a:e})}
  }
  const near={cam:[.5,.55],bounds:[[x0-.9,0,z0-.3],[x0+LX+.6,1.5,z0+LZ+.3]]},far={cam:[.55,.42],bounds:[[x0-.4,0,z0-.6],[x0+LX+2.8,Y0+LX+.2,z0+LZ+.3]]};
  S3.stage({id:'stg-pre',list:'sx-pre',fig:'Fig. 3 · optimiser state beside one Kimi K2 expert matrix, to scale',cam:near.cam,bounds:near.bounds,aspect:.6,dur:1600,hold:4800,draw,
    margin:w=>w<520?[18,10,18,10]:[26,24,26,170],view:k=>k>=4?far:near});
  writeList();
})();
