// ---- Scene (Fig. 6, gpt-oss, the one open window): gpt-oss-120b's 36 layers as a stack, each an attention slab (teal: banded, a 128-token window;
// orange: full attention, in the configuration's layer order, window.OSSCFG) over its MoE feed-forward slab; one layer pulled out as its 128 experts
// to scale in count, the router as a glass plate, the top 4 chosen; the bytes one token reads; the cache each layer keeps at 131,072 tokens; then
// gpt-oss-20b beside it. Parameter counts are the gpt-oss tab's accounting (OSS, 18_js_oss.js); router scores are illustrative (seeded). ----
window.OGOSS=(function(){
  if(typeof OSS==='undefined'||!window.OSSCFG)return null;const C=OSSCFG['120b'],D=OSSCFG['20b'];
  const EXP=OSS['120b'].expert,readMX=C.k*EXP*4.25/8,denseBF=C.E*EXP*2,kvTok=2*C.KV*C.hd*2,full=kvTok*C.ctx,band=kvTok*C.win;
  const nF=m=>[...OSSCFG[m].types].filter(x=>x==='F').length;
  return {C,D,EXP,readMX,denseBF,ratio:denseBF/readMX,kvTok,full,band,nF120:nF('120b'),nF20:nF('20b'),cache120:nF('120b')*full+(C.L-nF('120b'))*band,allFull120:C.L*full,
    act:{'120b':OSS['120b'].active,'20b':OSS['20b'].active},tot:{'120b':OSS['120b'].total,'20b':OSS['20b'].total}};
})();
(function(){
  if(!document.getElementById('stg-oss')||!window.OGOSS||!window.S3)return;const {lerp,mix}=S3,G=OGOSS,C=G.C,D=G.D;
  // router scores for one token (illustrative: seeded, as the page's earlier 2D animation drew them); softmax over the top 4
  const rnd=mulberry32(11),SC=Array.from({length:C.E},()=>{let u=0;for(let i=0;i<4;i++)u+=rnd();return (u-2)*1.6});
  const TOP=SC.map((s,i)=>[s,i]).sort((a,b)=>b[0]-a[0]).slice(0,C.k).map(x=>x[1]),ex=TOP.map(i=>Math.exp(SC[i])),es=ex.reduce((a,b)=>a+b,0),WT=ex.map(x=>x/es);
  const mn=Math.min(...SC),mxS=Math.max(...SC);
  // lit marks on the stack: four slots per layer (seeded, illustrative), drawn on 16 slots across the slab
  const r2=mulberry32(5),LIT=m=>Array.from({length:OSSCFG[m].L},()=>{const s=new Set();while(s.size<4)s.add(Math.floor(r2()*16));return [...s]});
  const LIT120=LIT('120b'),LIT20=LIT('20b');
  const XA=-2.7,XB=2.2,W=1.5,DP=1,PIT=.105,HA=.035,HM=.055,PITB=PIT;
  const GX=2.25,GZ=-.25,GP=.2,GC=.16,RZ=1.25,TOK=[GX,.3,2.1];
  const gpos=i=>[GX-1.5+(i%16)*GP,GZ-.7+Math.floor(i/16)*GP];
  const fK=(m,i)=>OSSCFG[m].types[i]==='F';
  function stack(R,m,x,a,lit,litA,cacheA){const P=R.P,n=OSSCFG[m].L;
    for(let i=0;i<n;i++){const y=i*PIT,f=fK(m,i);
      R.box([x,y,0],[W,HM,DP],{fill:mix(P.paper,P.c1,.16),a,shadow:i===0,lw:.45});
      R.box([x,y+HM,0],[W,HA,DP],{fill:f?P.c2:P.c6,a,shadow:false,lw:.45});
      if(litA>.01)lit[i].forEach(s=>R.box([x-W/2+(s+.5)*W/16,y+.008,DP/2+.012],[.07,HM-.016,.03],{fill:P.c1,a:a*litA,shadow:false,lw:.4}));
      if(cacheA>.01){const len=f?1.6:Math.max(.025,1.6*G.band/G.full);R.box([x-W/2-.06-len/2,y+HM,0],[len,HA,DP*.7],{fill:P.c5,a:a*cacheA,shadow:false,lw:.4})}}
    return n*PIT}
  function draw(R,k,e,st){const P=R.P,pk=st.pk,t=pk===k?1:e;R.grid(-5.4,5,-1.6,2.6,.5);
    const at=(f)=>lerp(f(pk),f(k),t),la=s=>{const a=k===s?t:pk===s?1-e:0;return a>.5?(a-.5)*2:0};
    // the 120b stack, and the exploded layer (layer 2, a full-attention layer) on the floor to its right
    const aA=at(s=>s===6?.55:1),litA=at(s=>s>=4?1:0),cA=at(s=>s===5?1:0);
    const hA=stack(R,'120b',XA,aA,LIT120,litA,cA);
    const gA=at(s=>s>=1&&s<=3?1:0);
    if(gA>.01){const sc=at(s=>s>=2&&s<=3?1:0),dim=at(s=>s===3?1:0);
      for(let i=0;i<C.E;i++){const [x,z]=gpos(i),top=TOP.includes(i),h=.05+sc*((SC[i]-mn)/(mxS-mn))*.45+(top?sc*.12:0);
        const on=top&&sc>.01;R.box([x,0,z],[GC,h,GC],{fill:on?mix(P.paper,P.c1,lerp(.2,1,sc)):P.paper,a:gA*(top?1:lerp(1,.22,dim)),shadow:false,lw:.4})}
      // the router, a glass plate between the token and the experts
      R.glass([GX-.8,.04,RZ],[1.6,0,0],[0,.4,0],{c:P.acc,a:gA,nu:8,nv:2});
      R.glow(TOK,.13,{c:P.ink,a:gA*.6});R.ball(TOK,.06,{c:P.ink,a:gA});
      // the link from the stack's layer 2 to the pulled-out layer
      R.line([[XA+W/2,PIT+HM/2,0],[GX-1.7,.05,GZ]],{c:P.mute,w:1,dash:[4,4],a:gA*.8})}
    // flows: the token through the router, to the four chosen experts, out of them; the residual stream up the stack
    const f1=at(s=>s===1?1:0),f2=at(s=>s===2?1:0),f3=at(s=>s===3?1:0),f4=at(s=>s===0||s===4?1:0),f20=at(s=>s===6?1:0);
    if(f1>.01)R.flow([TOK,[GX,.3,RZ+.03]],{c:P.ink,a:f1,r:.06,n:5,speed:.9});
    if(f2>.01)TOP.forEach((i,j)=>{const [x,z]=gpos(i);R.flowArc([GX,.4,RZ],[x,.7,z],.35,{c:P.c1,a:f2,r:.04+.06*WT[j],n:Math.round(3+10*WT[j]),speed:1.2})});
    const OUT=[GX+.9,1.35,GZ-1.0];
    if(f3>.01){TOP.forEach((i,j)=>{const [x,z]=gpos(i);R.flowArc([x,.7,z],OUT,.4,{c:P.c1,a:f3,r:.04+.06*WT[j],n:Math.round(3+10*WT[j]),speed:1.2})});R.glow(OUT,.16,{c:P.c1,a:f3*.8});R.ball(OUT,.07,{c:P.c1,a:f3})}
    if(f4>.01){const pts=[];for(let i=0;i<=C.L;i++)pts.push([XA+W/2+.12,Math.min(hA,i*PIT+.04),DP/2+.1]);R.flow(pts,{c:P.ink,a:f4*.8,r:.055,speed:1.1})}
    // step 4: the bytes one token reads in this layer against a dense BF16 layer of the same parameters, to scale
    const bA=at(s=>s===3?1:0),DX=GX+2.35,HD=2.4,hm=HD/G.ratio;
    if(bA>.01){R.box([DX,0,GZ-.2],[.7,HD,.7],{fill:P.mute,fa:.08,ea:.85,ec:P.mute,lw:1.1,a:bA,shadow:false});R.box([DX,0,GZ-.2],[.7,Math.max(.012,hm),.7],{fill:P.c1,a:bA,lw:.6})}
    // the 20b stack, step 7
    const bB=at(s=>s===6?1:0);if(bB>.01)stack(R,'20b',XB,bB,LIT20,1,0);
    // labels, one set per step
    const L1=(a)=>{R.label([XA-W/2,HM+HA/2,0],'banded · 128-token window',{al:'right',dx:-10,fs:12.5,b:1,c:P.c6,a,grp:'s0'});R.label([XA-W/2,PIT+HM+HA/2,0],'full attention',{al:'right',dx:-10,dy:8,fs:12.5,b:1,c:P.c2,a,grp:'s0'});
      R.label([XA-W/2,PIT*7+HM/2,0],'MoE feed-forward',{al:'right',dx:-10,fs:12.5,b:1,c:P.c1,a,grp:'s0'});R.label([XA,hA,-DP/2],'gpt-oss-120b · '+C.L+' layers',{dy:-16,fs:13,b:1,c:P.ink,a})};
    let a;
    if((a=la(0))>.01)L1(a);
    if((a=la(1))>.01){R.label([GX-1.6,.05,GZ+.8],C.E+' experts · '+fmt(G.EXP/1e6,1)+'M parameters each',{al:'right',dx:-10,fs:12.5,b:1,c:P.ink,a});R.label([GX+.8,.4,RZ],'router · '+fmt(C.d)+' × '+C.E,{al:'left',dx:8,fs:12.5,b:1,c:P.acc,a});R.label(TOK,'one token',{al:'left',dx:12,fs:12.5,c:P.ink,a})}
    if((a=la(2))>.01){TOP.forEach((i,j)=>{const [x,z]=gpos(i);R.label([x,.7,z],(j+1)+' · '+WT[j].toFixed(2),{mono:true,fs:12,b:1,dy:-12,c:P.c1,a,grp:'w'})});R.label([GX-1.6,.05,GZ+.8],'top 4 kept; softmax over them',{al:'right',dx:-10,fs:12.5,b:1,c:P.ink,a})}
    if((a=la(3))>.01){R.label([DX,HD,GZ-.2],'dense BF16 layer · '+(G.denseBF/1e9).toFixed(2)+' GB',{dy:-14,fs:12.5,b:1,c:P.mute,a});R.label([DX+.35,hm,GZ-.2],'read · '+(G.readMX/1e6).toFixed(1)+' MB',{al:'left',dx:8,fs:12.5,b:1,mono:true,c:P.c1,a});
      R.label(OUT,'Σ wᵢ · expertᵢ(h)',{wide:1,al:'left',dx:12,dy:-10,fs:12.5,mono:true,c:P.c1,a})}
    if((a=la(4))>.01){R.label([XA+W/2,hA*.55,DP/2],'4 experts lit in every layer',{al:'left',dx:14,fs:12.5,b:1,c:P.c1,a});R.label([XA,hA,-DP/2],fmt(G.act['120b']/1e9,2)+'B active of '+fmt(G.tot['120b']/1e9,2)+'B',{dy:-16,fs:13,b:1,mono:true,c:P.ink,a})}
    if((a=la(5))>.01){R.label([XA-W/2-1.66,PIT*(C.L-1)+HM+HA/2,0],'full layer · '+fmt(G.full/1e6,0)+' MB',{al:'right',dx:-8,fs:12.5,b:1,mono:true,c:P.c5,a});
      R.label([XA+W/2,PIT*(C.L-2)+HM+HA/2,DP/2],'banded layer · '+fmt(G.band/1e3,0)+' KB, too thin to see',{al:'left',dx:10,fs:12.5,b:1,mono:true,c:P.c6,a});
      R.label([XA-.6,hA,-DP/2],G.nF120+' full layers · '+(G.cache120/1e9).toFixed(2)+' GB at '+fmt(C.ctx)+' tokens',{dy:-18,fs:12.5,b:1,mono:true,c:P.c5,a})}
    if((a=la(6))>.01){R.label([XB,PIT*D.L,-DP/2],'gpt-oss-20b · '+D.L+' layers · '+D.E+' experts',{dy:-30,fs:13,b:1,c:P.ink,a});R.label([XB,PIT*D.L,-DP/2],fmt(G.act['20b']/1e9,2)+'B active of '+fmt(G.tot['20b']/1e9,2)+'B',{dy:-12,fs:12.5,mono:true,c:P.ink,a});
      R.label([XA,hA,-DP/2],'120b · '+fmt(G.act['120b']/1e9,2)+'B of '+fmt(G.tot['120b']/1e9,2)+'B',{dy:-14,fs:12.5,mono:true,c:P.mute,a})}
  }
  const full={cam:[.42,.36],bounds:[[-5.2,0,-1.1],[4.3,4.1,2.2]]};
  S3.stage({id:'stg-oss',list:'sx-oss',fig:'Fig. 6 · gpt-oss-120b: 36 layers, 128 experts each, 4 run',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1700,hold:5200,draw,
    margin:w=>w<520?[18,8,16,8]:[22,20,20,20],
    view:k=>k>=1&&k<=2?{cam:[.25,.72],bounds:[[GX-1.8,0,-1.2],[GX+1.9,1.1,2.3]]}:k===3?{cam:[.25,.55],bounds:[[GX-1.8,0,-1.3],[GX+3,2.6,2.3]]}:k===5?{cam:[.5,.32],bounds:[[-5.4,0,-1.1],[.4,4.1,1.2]]}:k===0||k===4?{cam:[.42,.36],bounds:[[-5.2,0,-1.1],[.8,4.1,1.4]]}:full});
})();
