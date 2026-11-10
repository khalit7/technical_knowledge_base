// ---- Scene (Fig. 3): inside Llama 4, layer by layer, from config.json (window.MODELS.mav and .sco, params() and kvBytes() in 11a_data.js).
// Each of the 48 layers is two slabs: attention below, the feed-forward part above. Steps: the tower; Maverick's FFN alternating MoE (128 routed
// + 1 shared expert) and dense (one block two experts wide), one of each exploded; Scout beside it, MoE throughout; iRoPE (every fourth layer global
// with no positional encoding, the rest RoPE in 8,192-token chunks); the cache each layer holds for a token at position 65,536. ----
(function(){
  if(!document.getElementById('stg-l4')||typeof MODELS==='undefined')return;const {lerp,mix}=S3,MV=MODELS.mav,SC=MODELS.sco,PM=params(MV),PS=params(SC);
  const NL=MV.L,DY=.072,S=1.3,XS=-2.9,POS=65536,CH=MV.win,SEG=.42;
  const isMoE=(m,i)=>m.moe.every===1||((i+1)%m.moe.every===0),isG=i=>(i+1)%4===0;
  const tw=(st,e,f)=>{const a=f(st.pk),b=f(st.k);return e>=1||a===b?b:lerp(a,b,e)};
  const la=(st,e,f)=>{const a=f(st.pk),b=f(st.k);if(e>=1||a===b)return b;return a>b?lerp(a,b,Math.min(1,4*e)):lerp(a,b,Math.max(0,2*e-1))};
  const M=v=>(v/1e6).toFixed(1)+'M',B=v=>(v/1e9).toFixed(1)+'B';
  const EX=3.3,EY=2.55,ES=.15,EG=.2,DX=3.3,DYB=.55; // the exploded MoE layer (16 × 8 experts) and dense layer beside the tower
  function tower(R,P,x,m,o){for(let i=0;i<NL;i++){const y=i*DY,moe=isMoE(m,i),g=isG(i);
      const ac=o.att===0?P.paper:g?mix(P.paper,P.bad,.75):mix(P.paper,P.c6,o.att===2?.5:0),fc=o.ffn===0?P.paper:moe?mix(P.paper,P.c1,.7):mix(P.paper,P.c5,.75);
      R.box([x,y,0],[S,.022,S],{fill:ac,a:o.a*(o.hiA&&!g?.8:1),shadow:i===0,lw:.5});
      R.box([x,y+.026,0],[S,.034,S],{fill:fc,a:o.a*o.fa,shadow:false,lw:.5})}}
  function draw(R,k,e,st){const P=R.P;R.grid(-4.6,4.6,-4.4,2.2,.5);
    const top=NL*DY,ma=1,sa=tw(st,e,s=>s===2?1:0),ffc=tw(st,e,s=>s>=1?1:0)>.5?1:0,att=k>=3?2:0,fa=tw(st,e,s=>s>=3?.22:1);
    tower(R,P,0,MV,{a:ma,att,ffn:k>=1||(k===0&&false)?1:0,fa,hiA:k>=3});
    // step 1: the bare tower, a token rising through every layer
    const l0=la(st,e,s=>s===0?1:0);
    if(l0>.01){R.label([S/2,top,-S/2],'48 layers',{al:'left',dx:10,fs:12.5,b:1,a:l0});R.label([S/2,0,S/2],'hidden width 5,120',{al:'left',dx:10,dy:10,fs:12.5,a:l0});
      R.label([-S/2,top*.55,S/2],'40 query heads share 8 KV heads of 128',{al:'right',dx:-10,fs:12.5,c:P.mute,a:l0,wide:1})}
    const ta=tw(st,e,s=>s<=1?1:0);if(ta>.01)R.flow([[0,-.02,S/2+.6],[0,.02,S/2+.12],[0,top,S/2+.12]],{c:P.ink,a:.6*ta,r:.05,n:20,speed:1.1});
    // step 2: Maverick's FFN alternates; one MoE layer and one dense layer exploded beside the tower
    const xa=tw(st,e,s=>s===1?1:0),xl=la(st,e,s=>s===1?1:0);
    if(xa>.01){const iM=33,iD=8,yM=iM*DY+.04,yD=iD*DY+.04,E=MV.moe.E,cols=16,rows=E/cols,w=cols*EG,d=rows*EG,x0=EX-w/2,z0=-d/2;
      // one MoE layer (layer 34) exploded high on the right: 128 routed experts on a blue glass plate, the shared expert in front
      R.glass([x0-.08,EY-.01,z0-.08],[w+.16,0,0],[0,0,d+.16],{c:P.c1,a:xa*.8,nu:cols,nv:rows,th:.02});
      const pick=45;for(let j=0;j<E;j++){const cx=x0+EG*(j%cols)+EG/2,cz=z0+EG*Math.floor(j/cols)+EG/2;R.box([cx,EY,cz],[ES,ES,ES],{fill:j===pick?P.c2:mix(P.paper,P.c1,.55),a:xa,shadow:false,lw:.4})}
      const sh=[EX,EY,d/2+.45];R.box(sh,[ES*1.4,ES*1.4,ES*1.4],{fill:mix(P.paper,P.c3,.8),a:xa,shadow:false,lw:.6});
      // one dense layer (layer 9) exploded low on the right: one block two experts wide
      R.box([DX,DYB,0],[ES*2.8,ES*1.4,ES*1.4],{fill:mix(P.paper,P.c5,.8),a:xa,shadow:false,lw:.6});
      R.flow([[S/2+.05,yM,0],[x0-.2,EY+.05,0]],{c:P.c1,a:xa*.7,r:.045,n:9,speed:1});R.flow([[S/2+.05,yD,0],[DX-ES*1.6,DYB+.1,0]],{c:P.c5,a:xa*.7,r:.045,n:9,speed:1});
      const pk=[x0+EG*(pick%cols)+EG/2,EY+ES,z0+EG*Math.floor(pick/cols)+EG/2];
      R.flowArc([x0-.2,EY+.05,0],pk,.4,{c:P.c2,a:xa,r:.05,n:9,speed:1.2});R.flowArc([x0-.2,EY+.05,0],[sh[0],sh[1]+ES*1.4,sh[2]],.3,{c:P.c3,a:xa,r:.05,n:9,speed:1.2});
      R.label([EX,EY+ES,z0-.08],'MoE layer: '+E+' routed experts, the token picks one',{dy:-26,fs:12.5,b:1,c:P.c1,a:xl});
      R.label([EX,EY,d/2+.45+ES*.7],'+ 1 shared expert, every token',{dy:16,fs:12.5,b:1,c:P.c3,a:xl});
      R.label([DX,DYB+ES*1.4,0],'dense layer: one block, two experts wide',{dy:-16,fs:12.5,b:1,c:P.c5,a:xl});
      R.label([DX,DYB,ES*.7],'3 × 5,120 × 16,384 = '+M(3*MV.h*MV.ff),{mono:true,dy:14,fs:12,c:P.mute,a:xl,wide:1})}
    // step 3: Scout beside Maverick, MoE in every layer; stored against active
    if(sa>.01){tower(R,P,XS,SC,{a:sa,att:0,ffn:1,fa:1});const sl=la(st,e,s=>s===2?1:0);
      R.label([XS,top,0],'Scout: '+PS.nMoE+' MoE layers × '+(SC.moe.E+1)+' experts',{dy:-30,fs:12.5,b:1,c:P.c1,a:sl,wide:1});R.label([XS,top,0],B(PS.text)+' stored · '+B(PS.active)+' active',{mono:true,dy:-13,fs:12,a:sl,wide:1});
      R.label([0,top,0],'Maverick: '+PM.nMoE+' MoE × '+(MV.moe.E+1)+' + '+(NL-PM.nMoE)+' dense',{dy:-30,fs:12.5,b:1,c:P.c1,a:sl,wide:1});R.label([0,top,0],B(PM.text)+' stored · '+B(PM.active)+' active',{mono:true,dy:-13,fs:12,a:sl,wide:1})}
    // step 4: iRoPE; step 5: the cache each layer keeps for one token at position 65,536
    const il=la(st,e,s=>s===3?1:0);
    if(il>.01){R.label([S/2,47*DY,-S/2],'12 global layers: no positional encoding, the whole context',{al:'left',dx:12,fs:12.5,b:1,c:P.bad,a:il});
      R.label([S/2,45*DY,-S/2],'36 chunked layers: RoPE, within 8,192-token chunks',{al:'left',dx:12,dy:16,fs:12.5,b:1,c:P.c6,a:il})}
    const ca=tw(st,e,s=>s===4?1:0),cl2=la(st,e,s=>s===4?1:0);
    if(ca>.01){const nS=POS/CH;for(let i=0;i<NL;i++){const y=i*DY,g=isG(i),n=g?nS:1;
        for(let j=0;j<n;j++){const z=-S/2-.05-SEG*(j+.5);R.box([0,y,z],[S*.82,.022,SEG-.04],{fill:g?mix(P.paper,P.bad,.6):mix(P.paper,P.c6,.55),a:ca*(j<n*Math.min(1,e*1.3)||k!==4?1:0),shadow:false,lw:.35})}
        if(g)R.flow([[0,y+.04,-S/2-SEG*nS],[0,y+.04,-S/2]],{c:P.bad,a:ca*.8,r:.04,n:10,speed:1.4});else if(i%4===1)R.flow([[0,y+.04,-S/2-SEG],[0,y+.04,-S/2]],{c:P.c6,a:ca*.6,r:.035,n:2,speed:.8})}
      R.label([0,top,-S/2-SEG*nS],'global: all 65,536 keys, 8 chunks',{al:'right',dx:-4,dy:-16,fs:12.5,b:1,c:P.bad,a:cl2});
      R.label([0,top,-S/2-SEG/2],'chunked: its own chunk, at most 8,192',{al:'right',dx:-2,dy:-34,fs:12.5,b:1,c:P.c6,a:cl2,wide:1})}
  }
  const V=[{cam:[.5,.32],bounds:[[-2.2,0,-1],[2.2,3.6,1]]},{cam:[.3,.55],bounds:[[-.8,0,-1.0],[5.0,3.4,1.3]]},{cam:[.36,.3],bounds:[[-4.0,0,-1],[1.4,4.0,1]]},
    {cam:[.4,.32],bounds:[[-1.2,0,-1],[3.6,3.6,1]]},{cam:[1.05,.36],bounds:[[-1.2,0,-4.2],[1.2,3.7,1.0]]}];
  S3.stage({id:'stg-l4',list:'sx-l4',fig:'Fig. 3 · Llama 4 Maverick, one slab per sub-layer, from config.json',cam:V[0].cam,bounds:V[0].bounds,aspect:.72,dur:1600,hold:5200,draw,
    margin:w=>w<520?[30,10,16,10]:[40,20,20,20],view:k=>V[k]});
})();
