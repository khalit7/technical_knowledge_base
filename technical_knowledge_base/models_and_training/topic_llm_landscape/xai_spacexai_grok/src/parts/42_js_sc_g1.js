// ---- Scene (Fig. 4, stg-g1): Grok-1, the one published architecture, from the released code (window.XG1): 64 layers as a stack, each an attention
// slab over its MoE slab; one layer pulled out as its 8 experts (box height to scale with each expert's parameters), the router as a glass plate and
// attention as another; the router keeps 2; 2 lit in every layer; total against active parameters as columns to scale; then Grok 2 (config.json).
// Which experts the router picks is illustrative (seeded); every count is the calculator's. ----
(function(){
  if(!document.getElementById('stg-g1')||!window.S3||!window.XG1)return;const {lerp,mix}=S3,C=XG1.M.g1,G1=XG1.g1,G2=XG1.g2;
  const rnd=mulberry32(7),pick=()=>{const a=Math.floor(rnd()*8);let b=Math.floor(rnd()*7);if(b>=a)b++;return [a,b]};
  const LIT=Array.from({length:C.L},pick),TOP=[1,5];
  const XS=0,W=1.7,DP=1.1,PIT=.045,HM=.026,HA=.011;
  const GX=0,GP=.62,EH=.62,ES=.46,ZA=1.45,ZR=.7,TOK=[GX,.3,2.25];
  const gpos=i=>[GX-1.5*GP+(i%4)*GP,-.35-Math.floor(i/4)*GP];
  const HB=2.9/G1.tot; // column height per parameter: Grok-1's total is as tall as its stack
  function column(R,x,z,parts,a){let y=0;parts.forEach(([v,c])=>{const h=Math.max(.008,v*HB);R.box([x,y,z],[.62,h,.62],{fill:c,a,lw:.7,shadow:y===0});y+=h});return y}
  // three pictures share one place on the floor: the stack (steps 1 and 4), one layer (2 and 3), the columns (5 and 6); moving between
  // pictures fades the old one out fully before the new one fades in, while the camera glides
  const grp=k=>k===0||k===3?0:k<=2?1:2;
  function draw(R0,k,e,st){const pk=st.pk;R0.grid(-3.6,4.2,-2.3,2.6,.5);
    if(grp(k)!==grp(pk)&&e<1)return e<.5?scene(R0,pk,1,pk,1-2*e):scene(R0,k,1,k,2*e-1);
    scene(R0,k,e,pk,1)}
  function scene(R0,k,e,pk,G){const R=G>=1?R0:Object.create(R0),P=R0.P,t=pk===k?1:e;
    if(G<1)Object.entries({box:2,label:2,flow:1,flowArc:3,glow:2,ball:2,line:1,glass:3}).forEach(([m,ix])=>{const f=R0[m].bind(R0);
      R[m]=(...a)=>{const o=Object.assign({},a[ix]||{});o.a=(o.a==null?1:o.a)*G;a[ix]=o;return f(...a)}});
    const at=f=>lerp(f(pk),f(k),t),la=s=>{const a=k===s?t:pk===s?1-e:0;return a>.5?(a-.5)*2:0};
    // the stack
    const sA=at(s=>s===0||s===3?1:0),litA=at(s=>s===3?1:0),top=C.L*PIT;
    if(sA>.01)for(let i=0;i<C.L;i++){const y=i*PIT;
      R.box([XS,y,0],[W,HM,DP],{fill:mix(P.paper,P.c1,.38),a:sA,shadow:i===0,lw:.4});
      R.box([XS,y+HM,0],[W,HA,DP],{fill:P.c6,a:sA,shadow:false,lw:.35});
      if(litA>.01)LIT[i].forEach(s=>R.box([XS-W/2+(s+.5)*W/8,y+.004,DP/2+.01],[.12,HM-.008,.03],{fill:P.c2,a:litA,shadow:false,lw:.4}))}
    const f0=at(s=>s===0||s===3?1:0);if(f0>.01){const pts=[];for(let i=0;i<=8;i++)pts.push([XS+W/2+.14,i*top/8,DP/2+.1]);R.flow(pts,{c:P.ink,a:f0*.8,r:.055,speed:.9})}
    // one layer pulled out: attention plate, router plate, 8 experts to scale
    const gA=at(s=>s>=1&&s<=2?1:0);
    if(gA>.01){const sc=at(s=>s===2?1:0);
      R.glass([GX-1.15,.04,ZA],[2.3,0,0],[0,.42,0],{c:P.c6,a:gA,nu:12,nv:3});
      R.glass([GX-1.0,.04,ZR],[2.0,0,0],[0,.36,0],{c:P.acc,a:gA,nu:8,nv:2});
      for(let i=0;i<C.E;i++){const [x,z]=gpos(i),on=TOP.includes(i);R.box([x,0,z],[ES,EH,ES],{fill:on?mix(P.paper,P.c2,lerp(.15,.85,sc)):mix(P.paper,P.c1,.15),a:gA*(on?1:lerp(1,.28,sc)),lw:.7})}
      R.glow(TOK,.13,{c:P.ink,a:gA*.6});R.ball(TOK,.06,{c:P.ink,a:gA});
      const f1=at(s=>s===1?1:0),f2=at(s=>s===2?1:0);
      if(f1>.01){R.flow([TOK,[GX,.25,ZA+.03]],{c:P.ink,a:f1,r:.055,n:4,speed:.7});R.flow([[GX,.25,ZA-.03],[GX,.22,ZR+.03]],{c:P.c6,a:f1,r:.055,n:4,speed:.7})}
      if(f2>.01){const OUT=[GX+1.75,.95,-.7];TOP.forEach(i=>{const [x,z]=gpos(i);R.flowArc([GX,.4,ZR],[x,EH,z],.35,{c:P.c2,a:f2,r:.06,n:7,speed:1.1});R.flowArc([x,EH,z],OUT,.35,{c:P.c2,a:f2,r:.06,n:7,speed:1.1})});
        R.glow(OUT,.15,{c:P.c2,a:f2*.8});R.ball(OUT,.07,{c:P.c2,a:f2})}}
    // total against active, to scale
    const cA=at(s=>s===4?1:s===5?.3:0),dA=at(s=>s===5?1:0),PX=[-1.4,-.5,1.0,1.9],PZ=-.3;
    if(cA>.01){const ht=column(R,PX[0],PZ,[[G1.exp,P.c1],[G1.attn,P.c6],[G1.emb,P.c3]],cA),ha=column(R,PX[1],PZ,[[G1.expAct,P.c2],[G1.attn,P.c6],[G1.emb,P.c3]],cA);
      const q=.25*G1.tot*HB,qa=cA*at(s=>s===4?1:0);R.line([[PX[0]-.31,q,PZ+.32],[PX[0]+.31,q,PZ+.32],[PX[0]+.31,q,PZ-.32]],{c:P.ink,w:2,dash:[5,4],a:qa,top:1})}
    if(dA>.01){column(R,PX[2],PZ,[[G2.exp,P.c1],[G2.dense,P.c5],[G2.attn,P.c6],[G2.emb,P.c3]],dA);column(R,PX[3],PZ,[[G2.expAct,P.c2],[G2.dense,P.c5],[G2.attn,P.c6],[G2.emb,P.c3]],dA)}
    // labels, one set per step
    const b9=v=>(v/1e9).toFixed(1)+'B',pc=(a,b)=>(100*a/b).toFixed(1)+'%';let a;
    if((a=la(0))>.01){R.label([XS+W/2,HM+HA/2,DP/2],'attention · 48 query heads, 8 KV heads',{al:'left',dx:14,fs:12.5,b:1,c:P.c6,a,grp:'s0'});R.label([XS+W/2,PIT*6,DP/2],'MoE feed-forward · 8 experts',{al:'left',dx:14,fs:12.5,b:1,c:P.c1,a,grp:'s0'});
      R.label([XS,top,-DP/2],'Grok-1 · '+C.L+' layers · width '+fmt(C.d),{dy:-16,fs:13,b:1,c:P.ink,a})}
    if((a=la(1))>.01){const [x0,z0]=gpos(4);R.label([x0-ES/2,EH*.5,z0],'expert · '+(G1.one/1e6).toFixed(0)+'M parameters',{al:'right',dx:-8,fs:12.5,b:1,c:P.c1,a,wide:1});
      R.label([GX+1.0,.36,ZR],'router · '+fmt(C.d)+' × '+C.E,{al:'left',dx:8,fs:12.5,b:1,c:P.acc,a});R.label([GX+1.15,.42,ZA],'attention · 48 query heads, 8 KV heads',{al:'left',dx:8,fs:12.5,b:1,c:P.c6,a,wide:1});R.label(TOK,'one token',{al:'left',dx:12,fs:12.5,c:P.ink,a})}
    if((a=la(2))>.01){TOP.forEach((i,j)=>{const [x,z]=gpos(i);R.label([x,EH,z],'E'+(i+1),{mono:true,fs:12.5,b:1,dy:-12,c:P.c2,a})});R.label([GX+1.0,.36,ZR],'keeps 2 of 8',{al:'left',dx:8,fs:12.5,b:1,c:P.acc,a})}
    if((a=la(3))>.01){R.label([XS+W/2,top*.6,DP/2],'2 experts lit in every layer',{al:'left',dx:16,fs:12.5,b:1,c:P.c2,a});R.label([XS,top,-DP/2],b9(G1.act)+' active of '+b9(G1.tot),{dy:-16,fs:13,b:1,mono:true,c:P.ink,a})}
    if((a=la(4))>.01){R.label([PX[0],G1.tot*HB,PZ],'total '+b9(G1.tot),{dy:-14,fs:12.5,b:1,mono:true,c:P.ink,a});R.label([PX[1],G1.act*HB,PZ],'active '+b9(G1.act)+' · '+pc(G1.act,G1.tot),{al:'left',dx:-4,dy:-14,fs:12.5,b:1,mono:true,c:P.c2,a});
      R.label([PX[0]-.31,.25*G1.tot*HB,PZ+.32],'2 of 8 = 25%',{al:'right',dx:-6,fs:12.5,mono:true,c:P.ink,a});R.label([PX[0]-.31,G1.exp*HB*.5,PZ],'experts '+b9(G1.exp),{al:'right',dx:-6,fs:12.5,c:P.c1,a,grp:'s4'});
      R.label([PX[1]+.31,(G1.expAct+G1.attn*.5)*HB,PZ],'attention '+b9(G1.attn)+' + embeddings '+b9(G1.emb)+', every token',{al:'left',dx:8,fs:12.5,c:P.c6,a,wide:1})}
    if((a=la(5))>.01){R.label([PX[2],G2.tot*HB,PZ],'Grok 2 · '+b9(G2.tot),{dy:-14,fs:12.5,b:1,mono:true,c:P.ink,a});R.label([PX[3],G2.act*HB,PZ],'active '+b9(G2.act)+' · '+pc(G2.act,G2.tot),{al:'left',dx:-30,dy:-16,fs:12.5,b:1,mono:true,c:P.c2,a});
      R.label([PX[3]+.31,(G2.expAct+G2.dense*.5)*HB,PZ],'dense block '+b9(G2.dense),{al:'left',dx:8,fs:12.5,b:1,c:P.c5,a});R.label([PX[0],G1.tot*HB,PZ],'Grok-1 · '+b9(G1.tot),{dy:-14,fs:12.5,mono:true,c:P.mute,a})}
  }
  const full={cam:[.38,.42],bounds:[[-2.6,0,-1.9],[3.8,3.0,2.4]]};
  S3.stage({id:'stg-g1',list:'sx-g1',fig:'Fig. 4 · Grok-1: 64 layers, 8 experts each, 2 run',cam:full.cam,bounds:full.bounds,aspect:.7,dur:1600,hold:5000,draw,
    margin:w=>w<520?[18,8,16,8]:[24,20,20,20],
    view:k=>k===0||k===3?{cam:[.42,.36],bounds:[[-1.6,0,-.8],[3.2,3.0,1.0]]}:k>=1&&k<=2?{cam:[.28,.62],bounds:[[-1.6,0,-1.9],[2.4,1.0,2.4]]}:k===4?{cam:[.35,.3],bounds:[[-2.6,0,-1],[1.9,3.0,.5]]}:{cam:[.35,.3],bounds:[[-2.4,0,-1],[3.8,3.0,.5]]}});
})();
