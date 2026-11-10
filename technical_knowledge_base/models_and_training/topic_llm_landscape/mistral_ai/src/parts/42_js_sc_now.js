// ---- Scene (Fig. 3): the current line, Large 3 and Small 4 (granular MoE) beside Medium 3.5 (dense), from their params.json (window.MI.l3, .s4, .m35).
// Steps 1 to 3: one layer of each, every tile's area proportional to its parameters (one scale for all three); a token reads 4 routed + 1 shared
// experts in each MoE layer and the whole block in the dense one. Step 4: the whole models as towers, footprint per layer and height per layer to one
// scale, so volume is parameters (layers only), with the part a token reads as a solid column. Step 5: the 16-bit KV cache of one 256K sequence.
// Which experts a token picks is illustrative. ----
(function(){
  if(!document.getElementById('stg-now')||!window.MI)return;const {lerp,mix}=S3,L3=MI.l3,S4=MI.s4,M35=MI.m35;
  const tw=(st,e,f)=>{const a=f(st.pk),b=f(st.k);return e>=1||a===b?b:lerp(a,b,e)};
  const la=(st,e,f)=>{const a=f(st.pk),b=f(st.k);if(e>=1||a===b)return b;return a>b?lerp(a,b,Math.min(1,4*e)):lerp(a,b,Math.max(0,2*e-1))};
  const Mf=v=>Math.round(v/1e6).toLocaleString('en-GB')+'M',Lf=v=>v>=1e10?(v/1e9).toFixed(2)+'B':Mf(v),Bf=v=>(v/1e9).toFixed(1)+'B',G=v=>(v/2**30).toFixed(v<50*2**30?1:0)+' GiB';
  // one area scale for every tile in steps 1 to 3: a Large 3 expert (88.1M) is a 0.28-wide square
  const A=.28*.28/L3.ex,sd=p=>Math.sqrt(p*A),TH=.06;
  const plate=(m,x0,gap)=>{const s=sd(m.ex),cols=16,rows=8;return {s,gap,x0,w:cols*(s+gap)-gap,d:rows*(s+gap)-gap,at:j=>[x0+(j%cols)*(s+gap)+s/2,-(rows*(s+gap)-gap)/2+Math.floor(j/cols)*(s+gap)+s/2]}};
  const PL3=plate(L3,-5.3,.03),PS4=plate(S4,.0,.02),MX=3.55,MS=sd(M35.ex);
  const PK3=[9,38,77,116],PK4=[21,50,83,110]; // illustrative routed picks
  function moeLayer(R,P,pl,m,pk,o){const z1=pl.d/2;
    R.glass([pl.x0-.05,0,-z1-.05],[pl.w+.1,0,0],[0,0,pl.d+.1],{c:P.c1,a:o.a*.5,nu:16,nv:8,th:.015});
    for(let j=0;j<128;j++){const [x,z]=pl.at(j),on=o.read&&pk.includes(j);R.box([x,.02,z],[pl.s,TH,pl.s],{fill:on?mix(P.paper,P.c1,.85):P.paper,a:o.a*(o.read&&!on?.55:1),shadow:false,lw:.35})}
    const shx=pl.x0+pl.w/2,shz=z1+pl.s/2+.12;R.box([shx,.02,shz],[pl.s,TH,pl.s],{fill:mix(P.paper,P.c4,o.read?.85:.5),a:o.a,shadow:false,lw:.4});
    const as=sd(m.attn),ax=shx,az=shz+pl.s/2+as/2+.18;R.box([ax,.02,az],[as,TH,as],{fill:mix(P.paper,P.c2,.6),a:o.a,shadow:true,lw:.4});
    if(o.read>.01){pk.forEach(j=>{const [x,z]=pl.at(j);R.flowArc([ax,TH+.03,az],[x,TH+.03,z],.35+.04*Math.abs(x-ax),{c:P.c1,a:o.a*o.read,r:.045,n:7,speed:1.3})});
      R.flowArc([ax,TH+.03,az],[shx,TH+.03,shz],.2,{c:P.c4,a:o.a*o.read,r:.045,n:5,speed:1.2})}
    return {ax,az,shx,shz,as}}
  function draw(R,k,e,st){const P=R.P;R.grid(-5.8,5,-2.6,3.2,.5);
    const pa=tw(st,e,s=>s<=2?1:0);
    if(pa>.01){const r3=tw(st,e,s=>s===1?1:0),rm=tw(st,e,s=>s===2?1:0),dim=s=>s===2?.35:1;
      const a3=pa*tw(st,e,dim),a4=pa*tw(st,e,dim),am=pa*tw(st,e,s=>s===1?.35:1);
      const g3=moeLayer(R,P,PL3,L3,PK3,{a:a3,read:r3}),g4=moeLayer(R,P,PS4,S4,PK4,{a:a4,read:r3});
      // Medium 3.5: one dense feed-forward block and its attention, every parameter read
      R.box([MX,.02,0],[MS,TH,MS],{fill:mix(P.paper,P.c1,rm>.5?.85:.45),a:am,shadow:true,lw:.5});
      const mas=sd(M35.attn),maz=MS/2+mas/2+.18;R.box([MX,.02,maz],[mas,TH,mas],{fill:mix(P.paper,P.c2,.6),a:am,shadow:true,lw:.4});
      if(rm>.01)for(let i=0;i<5;i++)for(let j=0;j<2;j++){const x=MX-MS/2+MS*(i+.5)/5,z=-MS/2+MS*(j+.5)/2;R.flowArc([MX,TH+.03,maz],[x,TH+.03,z],.3,{c:P.c1,a:am*rm,r:.04,n:5,speed:1.2})}
      const l0=la(st,e,s=>s===0?1:0),l1=la(st,e,s=>s===1?1:0),l2=la(st,e,s=>s===2?1:0);
      const t3=[PL3.x0+PL3.w/2,TH,-PL3.d/2],t4=[PS4.x0+PS4.w/2,TH,-PS4.d/2],tm=[MX,TH,-MS/2];
      if(l0>.01){R.label([g3.ax,TH,g3.az+g3.as/2],'Large 3: 128 experts of 88.1M + 1 shared',{dy:32,fs:12.5,b:1,c:P.c1,a:l0,grp:'t'});
        R.label([g4.ax,TH,g4.az+g4.as/2],'Small 4: 128 of 25.2M + 1 shared',{dy:16,fs:12.5,b:1,c:P.c1,a:l0,grp:'t'});
        R.label([MX,TH,maz+mas/2],'Medium 3.5: one block, 1,057M',{dy:32,fs:12.5,b:1,c:P.c1,a:l0,grp:'t'});
        R.label([g3.ax,TH,g3.az+g3.as/2],'attention 187M',{dy:14,fs:12,c:P.c2,a:l0,wide:1});R.label([MX,TH,maz+mas/2],'attention 327M',{dy:14,fs:12,c:P.c2,a:l0,wide:1})}
      if(l1>.01){R.label(t3,'reads 5 of 129: '+Mf(L3.moeLayerA)+' of '+Lf(L3.moeLayerT),{dy:-14,fs:12.5,b:1,c:P.c1,a:l1});
        R.label(t4,'reads 5 of 129: '+Mf(S4.moeLayerA)+' of '+Lf(S4.moeLayerT),{dy:-14,fs:12.5,b:1,c:P.c1,a:l1});
        R.label([g3.shx,TH,g3.shz],'shared expert, every token',{al:'left',dx:14,fs:12,c:P.c4,a:l1,wide:1})}
      if(l2>.01){R.label(tm,'reads all '+Mf(M35.moeLayerA),{dy:-14,fs:12.5,b:1,c:P.c1,a:l2});
        R.label([MX,TH,maz+mas/2],(M35.moeLayerA/L3.moeLayerA).toFixed(1)+' times a Large 3 layer',{dy:14,fs:12.5,b:1,a:l2})}
    }
    // steps 4 and 5: whole models, one volume scale (layers only)
    const ta=tw(st,e,s=>s>=3?1:0);
    if(ta>.01){const B=2.42/L3.moeLayerT,H=.045,side=p=>Math.sqrt(p*B),T=[
        {m:L3,x:-3.6,nd:3,dl:L3.attn+2*L3.d+L3.dffn},{m:S4,x:-.3,nd:0},{m:M35,x:2.6,nd:0}];
      const ca=tw(st,e,s=>s===4?1:0),tl=la(st,e,s=>s===3?1:0),cl=la(st,e,s=>s===4?1:0);
      T.forEach(t=>{const m=t.m,w=side(m.moeLayerT)*Math.SQRT2,d=side(m.moeLayerT)/Math.SQRT2,nd=t.nd,hm=(m.L-nd)*H,hd=nd*H,dense=m.E===1;
        if(nd){const s=side(t.dl);R.box([t.x,0,0],[s,hd,s],{fill:mix(P.paper,P.c1,.8),a:ta,shadow:true,lw:.5})}
        if(dense)R.box([t.x,0,0],[w,hm,d],{fill:mix(P.paper,P.c1,.8),a:ta,shadow:true,lw:.5});
        else{R.box([t.x,hd,0],[w,hm,d],{fill:P.paper,a:ta*.9,fa:.28,shadow:!nd,lw:.5});const s=side(m.moeLayerA);R.box([t.x,hd,0],[s,hm,s],{fill:mix(P.paper,P.c1,.85),a:ta,shadow:false,lw:.5})}
        const top=(m.L)*H,tp=[t.x,top,-d/2];
        if(tl>.01){R.label(tp,m.name.replace('Mistral ',''),{dy:-44,fs:13,b:1,a:tl});R.label(tp,Bf(m.lt)+' stored',{dy:-28,fs:12.5,mono:true,a:tl});
          R.label(tp,Bf(m.la)+' read per token',{dy:-12,fs:12.5,mono:true,b:1,c:P.c1,a:tl})}
        // step 5: the cache one 256K sequence leaves, 16-bit, as a teal glass column beside the tower (height proportional to bytes)
        if(ca>.01){const ch=m.kv256/(88*2**30)*3.4,cx=t.x+w/2+.45,cz=0;R.glass([cx-.22,0,cz],[.44,0,0],[0,ch*Math.min(1,ca*1.2),0],{c:P.c6,a:ca,nu:1,nv:Math.max(1,Math.round(ch/.3))});
          R.flow([[t.x+w/2,.15,0],[cx-.22,.15,0]],{c:P.c6,a:ca*.8,r:.04,n:4,speed:.8});
          R.label([cx+.22,ch,cz],G(m.kv256)+' at 256K',{al:'left',dx:6,fs:12.5,b:1,c:P.c6,a:cl});
          R.label(tp,(m.kvTok/1024).toFixed(1).replace('.0','')+' KiB per token',{dy:-12,fs:12.5,mono:true,c:P.c6,a:cl})}
        if(cl>.01){R.label(tp,m.name.replace('Mistral ',''),{dy:-28,fs:13,b:1,a:cl})}});
    }
  }
  const V=[{cam:[.18,.95],bounds:[[-5.4,0,-1.4],[4.9,.4,2.2]]},{cam:[.2,.9],bounds:[[-5.4,0,-1.4],[2.8,.4,2.2]]},{cam:[.22,.85],bounds:[[1.6,0,-1],[5.2,.4,1.6]]},
    {cam:[.4,.38],bounds:[[-5,0,-1],[3.6,4.1,1]]},{cam:[.4,.38],bounds:[[-5,0,-1],[4.6,4.1,1]]}];
  S3.stage({id:'stg-now',list:'sx-now',fig:'Fig. 3 · granular MoE against dense, from the params.json files',cam:V[0].cam,bounds:V[0].bounds,aspect:.54,dur:1600,hold:5200,draw,
    margin:w=>w<520?[34,10,16,10]:[46,20,20,20],view:k=>V[k]});
})();
