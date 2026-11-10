// ---- Scene (Fig. 3, stg-v41): V4.1-Flash, the cache argument reaching the network's shape. Its 40 layers from config.json (window.DS.v41):
// the encoder (layers 0 to 19) and the decoder (20 to 39) as two towers of slabs; teal dots for prompt positions, purple for a generated token,
// an orange glass plate for the decoder's shared global keys and values; then the slabs coloured by layer mode, with the four cache copies. ----
(function(){
  if(!document.getElementById('stg-v41')||!window.DS)return;const {lerp,mix}=S3,V=DS.v41;
  const XE=-1.7,XD=1.7,SW=1.5,SD=1.1,SH=.11,PI=.15,ZF=SD/2;
  const tx=i=>i<20?XE:XD,ty=i=>(i%20)*PI;
  // a label that belongs to one step: the outgoing one is gone by mid-transition, the incoming one appears after it
  const lab=(k,e,st,f)=>{const a=f(st.pk),b=f(k);if(e>=1||a===b)return b;return a>b?Math.max(b,a*(1-2*e)):b*Math.max(0,2*e-1)};
  const vis=(k,e,st,f)=>{const a=f(st.pk),b=f(k);return e>=1||a===b?b:lerp(a,b,e)};
  function draw(R,k,e,st){const P=R.P;R.grid(-4,4,-1.6,2,.5);
    const MC={swa:P.mute,full:P.c2,rein:P.c3,reuse:mix(P.paper,P.c1,.55)};
    const mo=vis(k,e,st,s=>s===4?1:0); // 0 neutral slabs, 1 coloured by mode
    const ea=vis(k,e,st,s=>s===1?1:s===2?.85:1),da=vis(k,e,st,s=>s===1?.25:s===2?.7:1);
    for(let i=0;i<40;i++){const m=V.mode(i),base=i<20?mix(P.paper,P.c6,.12):mix(P.paper,P.c4,.12),fill=mix(base,MC[m],mo*(m==='reuse'?.9:1));
      R.box([tx(i),ty(i),0],[SW,SH,SD],{fill,a:i<20?ea:da,shadow:i%20===0,lw:.6,ea:.55})}
    // tower names
    R.label([XE,20*PI,0],'encoder · layers 0 to 19',{fs:12.5,b:1,dy:-16,c:P.c6,wide:k>=2?1:0});
    R.label([XD,20*PI,0],'decoder · layers 20 to 39',{fs:12.5,b:1,dy:-16,c:P.c4,a:Math.max(.5,da),wide:k>=2?1:0});
    // prompt positions at the encoder's foot
    const pa=vis(k,e,st,s=>s===0||s===1||s===2?1:.35);
    for(let j=0;j<7;j++)R.ball([XE-.9+j*.3,.08,ZF+.9],.07,{c:P.c6,a:pa});
    // step 2: prompt positions flow up the encoder only
    const fa=vis(k,e,st,s=>s===1?1:0);
    if(fa>.01){[-.45,0,.45].forEach((dx,j)=>R.flow([[XE-.6+j*.6,.08,ZF+.9],[XE+dx,0,ZF+.05],[XE+dx,20*PI,ZF+.05]],{c:P.c6,a:fa,r:.07,speed:1.2}));
      R.label([XE+SW/2,20*PI*.6,ZF],'20 layers · about '+V.pre+' active',{al:'left',dx:10,fs:12.5,b:1,c:P.c6,a:lab(k,e,st,s=>s===1?1:0)})}
    // step 3: the encoder's last hidden state becomes the decoder's one shared cache (global keys and values)
    const ga=vis(k,e,st,s=>s===2?1:s===4?.45:s===3?.35:0),gy=20*PI+.35;
    if(ga>.01){R.glass([-.6,gy,-.45],[1.2,0,0],[0,.75,0],{c:P.c2,a:ga,nu:6,nv:4});
      R.label([0,gy+.75,-.45],'shared global K/V',{fs:12.5,b:1,dy:-12,c:P.c2,a:ga});
      if(k===2){R.flowArc([XE,19*PI+SH,0],[-.6,gy+.35,-.45],.25,{c:P.c6,a:ga,r:.07,speed:1.2});
        [20,24,28,32,36].forEach(i=>R.flowArc([.6,gy+.2,-.45],[XD-SW/2,ty(i)+SH/2,0],.15,{c:P.c2,a:ga*.9,r:.06,speed:1.1,n:5}));
}}
    // step 4: a generated token runs all 40 layers
    const da2=vis(k,e,st,s=>s===3?1:0);
    if(da2>.01){const tk=[XD,20*PI+.35,ZF+.3];
      R.flow([[XE,0,ZF+.05],[XE,20*PI,ZF+.05],[XD,.05,ZF+.05],[XD,20*PI,ZF+.05],tk],{c:P.c4,a:da2,r:.075,speed:1.5});
      R.glow(tk,.3,{c:P.c4,a:da2*.7});R.ball(tk,.1,{c:P.c4,a:da2});
      R.label([XD+SW/2,20*PI*.6,ZF],'40 layers · about '+V.dec+' active',{al:'left',dx:10,fs:12.5,b:1,c:P.c4,a:lab(k,e,st,s=>s===3?1:0)})}
    // step 5: the four cache copies (glass beside each full layer) and the layers that read each
    if(mo>.01){const ml=lab(k,e,st,s=>s===4?1:0);V.copies.forEach((c,j)=>{const x=tx(c.at),side=c.at<20?-1:1,xs=x+side*(SW/2+.2),y0=ty(c.at),y1=ty(c.to)+SH;
        R.glass([xs-.14,y0,-.3],[.28,0,0],[0,y1-y0,0],{c:P.c2,a:mo,nu:1,nv:Math.max(2,c.to-c.at+1),th:.03});
        if(side<0)R.label([xs-.14,y0+(y1-y0)/2,0],'copy '+(j+1)+' · layer '+c.at,{al:'right',dx:-8,mono:true,fs:12,b:1,c:P.c2,a:ml,grp:'L'})});
      V.eng.forEach(i=>{R.glow([XE,ty(i)+SH/2,ZF+.02],.2,{c:P.c5,a:mo});R.ball([XE,ty(i)+SH/2,ZF+.02],.06,{c:P.c5,a:mo})});
      const LL=(y,t,c,o)=>R.label([XE-SW/2-.4,y,0],t,Object.assign({al:'right',dx:-8,fs:12,b:1,c,a:ml,grp:'L'},o||{}));
      LL(PI*.9,'sliding window · layers 0, 1',P.mute);LL(ty(14)+SH/2,'Engram · layers 1, 14',mix(P.c5,P.ink,.25));
      const LR=(i,t,c)=>R.label([XD+SW/2+.42,ty(i)+SH/2,0],t,{al:'left',dx:10,fs:12,b:1,c,a:ml,grp:'R'});
      LR(20,'full · copy 4 · layer 20',P.c2);LR(28,'reindex · 24, 28, 32, 36',mix(P.c3,P.ink,.15));LR(34,'reuse · entries and top-k',mix(P.c1,P.ink,.25))}
  }
  const full={cam:[.42,.3],bounds:[[-3.9,0,-.6],[4.3,4.1,1.3]]};
  S3.stage({id:'stg-v41',list:'sx-v41',fig:'Fig. 3 · V4.1-Flash, 40 layers from config.json',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:5000,draw,
    margin:w=>w<520?[16,8,30,8]:[22,30,32,30],
    view:k=>k===1?{cam:[.5,.26],bounds:[[-3.2,0,-.8],[.4,3.4,1.6]]}:full});
})();
