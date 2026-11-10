// ---- Scene (Attention stage, stg-at): what one decoded token stores, scores and reads, by release, one slab per layer from window.ZG.att
// (src/mk_data.py, from config.json). A slab's footprint area is the numbers its layer caches per token (blue: latent or key-value entries,
// gold: indexer key), so a tower's volume is the cache per token; KDA layers are green fixed-state slabs, not to scale.
// Steps: the four towers; GLM-4.5 against GLM-5 (a smaller entry); DSA on GLM-5 (the indexer sweeps a 1M-entry cache strip, attention reads 2,048);
// IndexShare on GLM-5.3 (21 indexers in 78 layers); Flash (34 KDA, 11 sparse, a pooled strip); totals. Selected positions are illustrative. ----
(function(){
  if(!document.getElementById('stg-at')||!window.ZG)return;const {lerp,mix}=S3,M=ZG.att,N=ZG.nums;
  const ORD=['g45','g5','g53','fl'],X={g45:-3.3,g5:-1.1,g53:1.1,fl:3.3},DY=.034,TH=.024,SQ=1.25;
  const side=n=>SQ*Math.sqrt(n/2048),F=v=>v.toLocaleString('en-GB');
  const A={g45:[1,1,.18,.18,.18,.4],g5:[1,1,1,.18,.18,.4],g53:[1,.18,.18,1,.18,1],fl:[1,.18,.18,.18,1,1]};
  const FOC=[null,null,'g5','g53','fl',null];
  const tw=(st,e,f)=>{const a=f(st.pk),b=f(st.k);return e>=1||a===b?b:lerp(a,b,e)};
  const la=(st,e,f)=>{const a=f(st.pk),b=f(st.k);if(e>=1||a===b)return b;return a>b?lerp(a,b,Math.min(1,2*e)):lerp(a,b,Math.max(0,2*e-1))};
  // illustrative selected positions along a layer's cache strip (fixed, so every step and screenshot shows the same ones)
  const SEL=[.04,.11,.17,.26,.31,.38,.47,.52,.58,.66,.71,.79,.84,.9,.95,.985];
  const layers=id=>{const m=M[id];return [...m.pat].map((t,i)=>({t,i,lat:m.per[t][0],ix:m.per[t][1]}))};
  const L={};ORD.forEach(id=>L[id]=layers(id));
  const top=id=>M[id].pat.length*DY;
  window.ZG_AT={tot:id=>M[id].tot,ix:id=>[...M[id].pat].filter(t=>M[id].per[t][1]>0).length};
  function draw(R,k,e,st){const P=R.P;R.grid(-5,5,-1.4,2.6,.5);
    const lab=(p,t,o)=>{const q=R.p(p);if(q[2]<=0||q[0]<-30||q[0]>R.W+30||q[1]<-4||q[1]>R.H+4)return;R.label(p,t,o)};
    const CL={G:P.c2,F:P.c1,s:mix(P.paper,P.c1,.62),S:P.c1};
    ORD.forEach(id=>{const x=X[id],a=tw(st,e,s=>A[id][s]),m=M[id];if(a<=.01)return;
      L[id].forEach(l=>{const y=l.i*DY;
        if(l.t==='K'){R.box([x,y,0],[.95,TH,.95],{fill:mix(P.paper,P.c3,.5),fa:.16,ec:P.c3,ea:.7,a,shadow:false,lw:.5});return}
        const n=l.lat+l.ix,sd=side(n),hb=TH*l.lat/n;
        R.box([x,y,0],[sd,hb,sd],{fill:l.t==='s'?CL.s:mix(P.paper,CL[l.t],.92),a,shadow:l.i===0,lw:.45,ea:.45});
        if(l.ix>0)R.box([x,y+hb,0],[sd,Math.max(.004,TH-hb),sd],{fill:P.c5,a,shadow:false,lw:.35,ea:.4})});
      const cur=A[id][k]>=1,lo=Math.max(la(st,e,s=>A[id][s]>=1?1:0),a>.3?.5:0)*la(st,e,s=>FOC[s]===id?0:1);
      lab([x,0,.75],m.n,{fs:12.5,b:1,dy:14,c:cur?P.ink:P.mute,a:lo});lab([x,0,.75],m.sub,{fs:12,dy:30,c:P.mute,a:lo});
    });
    // totals above the towers (first and last steps), per-layer entries in step 2
    const t0=la(st,e,s=>s===0?1:0),t5=la(st,e,s=>s===5?1:0),t1=la(st,e,s=>s===1?1:0);
    ORD.forEach(id=>{const y=top(id),m=M[id];
      const kb=fmtBytes(m.tot*2).replace('.0 ',' ');if(t0>.01&&R.W>=520)lab([X[id],y,0],F(m.tot),{mono:true,fs:12.5,b:1,dy:-28,c:P.ink,a:t0});
      if(t0>.01)lab([X[id],y,0],R.W<520?kb:kb+' per token',{fs:12,dy:-12,c:R.W<520?P.ink:P.mute,b:R.W<520,a:t0})});
    if(t1>.01){lab([X.g45,top('g45'),0],'2,048 per layer',{mono:true,fs:12.5,b:1,dy:-30,c:P.c2,a:t1});lab([X.g45,top('g45'),0],'368 KiB per token',{fs:12,dy:-14,c:P.mute,a:t1});
      lab([X.g5,top('g5'),0],'576 + 128 per layer',{mono:true,fs:12.5,b:1,dy:-30,c:P.c1,a:t1});lab([X.g5,top('g5'),0],'107.3 KiB per token',{fs:12,dy:-14,c:P.mute,a:t1})}
    if(t5>.01){lab([X.g53,top('g53'),0],'47,616 numbers',{mono:true,fs:12.5,b:1,dy:-30,c:P.c1,a:t5});lab([X.g53,top('g53'),0],'93 GiB at 1M',{fs:12,dy:-14,c:P.mute,a:t5});
      lab([X.fl,top('fl'),0],'5,984 numbers',{mono:true,fs:12.5,b:1,dy:-30,c:P.c1,a:t5});lab([X.fl,top('fl'),0],'11.7 GiB + 68 MiB state',{fs:12,dy:-14,c:P.mute,a:t5});
      lab([(X.g53+X.fl)/2,top('g53')+.85,0],'GLM-5.3 to Flash: 8.0 times less cache per token',{fs:13,b:1,dy:-14,c:P.ink,a:t5,wide:1})}
    // step 2: the new token writes its entry into every layer of GLM-4.5 and GLM-5
    const wa=tw(st,e,s=>s===1?1:0);
    if(wa>.01)['g45','g5'].forEach(id=>{const z=id==='g45'?.72:.48;R.flow([[X[id],.01,z+.45],[X[id],.01,z],[X[id],top(id),z]],{c:id==='g45'?P.c2:P.c1,a:wa*.75,r:.05,n:16,speed:1.1})});
    // steps 3 to 5: one layer's cache as a glass strip in front of the tower in focus; the indexer (gold) sweeps it, attention reads the selected entries (blue)
    ORD.forEach(id=>{const sa=tw(st,e,s=>FOC[s]===id?1:0);if(sa<=.01)return;const x=X[id],z0=1.05,z1=1.55,zm=(z0+z1)/2,pool=id==='fl';
      R.glass([x-1.05,.02,z0],[2.1,0,0],[0,0,z1-z0],{c:P.mute,a:sa*.8,nu:pool?6:24,nv:1,th:.02});
      SEL.forEach(u=>R.box([x-1.05+2.1*u,.02,zm],[.035,.13,.4],{fill:P.c1,a:sa,shadow:false,lw:.4}));
      const tk=[x-.75,1.45,1.3];R.glow(tk,.28,{c:P.c1,a:sa*.6});R.ball(tk,.1,{c:P.c1,a:sa});
      SEL.forEach((u,j)=>{if(j%2)return;R.flowArc([x-1.05+2.1*u,.16,zm],tk,.12,{c:P.c1,a:sa*.85,r:.045,n:5,speed:1})});
      R.flow([[x-1.05,.06,z1+.06],[x+1.05,.06,z1+.06]],{c:P.c5,a:sa,r:.06,n:pool?6:20,speed:pool?.55:1.6});
      const ixl=L[id].filter(l=>l.ix>0),pick=ixl.filter((l,j)=>j%Math.max(1,Math.round(ixl.length/6))===0).slice(0,7);
      pick.forEach(l=>R.flow([[x+1.05,.06,z1+.06],[x+.3,l.i*DY+TH,side(l.lat+l.ix)/2]],{c:P.c5,a:sa*.8,r:.045,n:5,speed:1.1}));
      const sl=la(st,e,s=>FOC[s]===id?1:0);
      lab([x,.02,z1+.1],pool?'cache: 1,048,576 tokens, 262,144 pooled keys':'one layer\'s cache: 1,048,576 entries',{fs:12,dy:30,c:P.mute,a:sl});
      lab(tk,'one decoded token reads 2,048 (0.2%)',{fs:12.5,b:1,dy:-20,c:P.c1,a:sl});
      lab([x+1.05,.06,z1+.06],pool?'indexer: a quarter of the keys':'indexer scores all of them',{fs:12.5,b:1,al:'left',dx:8,dy:-16,c:mix(P.c5,P.ink,.3),a:sl,wide:1});
      if(id==='g53')lab([x,top(id),0],'indexer in 21 of 78 layers',{fs:12.5,b:1,dy:-14,c:mix(P.c5,P.ink,.3),a:sl});
      if(id==='g5')lab([x,top(id),0],'indexer in all 78 layers',{fs:12.5,b:1,dy:-14,c:mix(P.c5,P.ink,.3),a:sl});
      if(id==='fl'){lab([x,top(id),0],'34 KDA: fixed 64 × 128 × 128 states',{fs:12.5,b:1,dy:-30,c:P.c3,a:sl});lab([x,top(id),0],'11 sparse: 512 + 32 numbers',{fs:12,dy:-14,c:P.c1,a:sl})}});
  }
  const full={cam:[.32,.34],bounds:[[-4.4,0,-.9],[4.4,3.4,1.6]]};
  const close=id=>({cam:[.36,.62],bounds:[[X[id]-1.6,0,-.7],[X[id]+1.6,Math.max(2.0,top(id)+.2),1.9]]});
  S3.stage({id:'stg-at',list:'sx-at',fig:'Attention · one slab per layer, from config.json',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1600,hold:5600,draw,
    margin:w=>w<520?[34,8,48,8]:[40,16,52,16],
    view:k=>k===1?{cam:[.36,.34],bounds:[[-4.6,0,-.9],[.1,3.4,1.6]]}:FOC[k]?close(FOC[k]):full});
})();
