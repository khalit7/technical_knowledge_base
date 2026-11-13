// ---- Scene (Fig. 2): Mistral 7B to Mixtral, from the two config.json files (window.MI.m7 and .x7 in 11a_data.js).
// Steps: Mistral 7B's 32 blocks (slab thickness to scale: attention 41.9M, feed-forward 176.2M); one block exploded (32 query heads over 8 shared
// key-value heads, a 4,096-position window over the cache); Mixtral's block (the feed-forward copied eight times, the window gone);
// the router sending one token to 2 of 8; both whole models to scale, stored against read. Which experts a token picks is illustrative. ----
(function(){
  if(!document.getElementById('stg-mix')||!window.MI)return;const {lerp,mix}=S3,M7=MI.m7,X7=MI.x7;
  const tw=(st,e,f)=>{const a=f(st.pk),b=f(st.k);return e>=1||a===b?b:lerp(a,b,e)};
  // labels fade out quickly and in late, so two steps' labels never share the screen
  const la=(st,e,f)=>{const a=f(st.pk),b=f(st.k);if(e>=1||a===b)return b;return a>b?lerp(a,b,Math.min(1,4*e)):lerp(a,b,Math.max(0,2*e-1))};
  const NL=32,U=.08/(M7.attn+M7.ex),HA=M7.attn*U,HF=M7.ex*U,S=.62,TX=-2.4; // one layer's height is .08; slab thickness proportional to parameters
  const Mf=v=>(v/1e6).toFixed(1)+'M',Bf=v=>(v/1e9).toFixed(v<10e9?2:1)+'B';
  // the exploded block: heads at the bottom, the feed-forward part above
  const QX=i=>.25+i*.42,ZQ=.38,ZK=-.25,ZC=-.95,YF=.95,CB=.36,EXX=i=>.25+i*.42+.21;
  const pickL=i=>{const a=(i*5+2)%8;let b=(i*3+5)%8;if(b===a)b=(b+1)%8;return [a,b]}; // illustrative: two experts per layer
  const PICK=[2,5];
  function tower(R,P,x,o){for(let i=0;i<NL;i++){const y=i*.08;
      R.box([x,y,0],[S,HA,S],{fill:mix(P.paper,P.c2,.85),a:o.a,shadow:i===0,lw:.5});
      if(!o.moe)R.box([x,y+HA,0],[S,HF,S],{fill:mix(P.paper,P.c1,o.lit?.75:.3),a:o.a,shadow:false,lw:.5});
      else{const p=pickL(i);for(let j=0;j<8;j++){const cx=x+S/2+.06+(j%4)*(S+.04)+S/2,cz=(j<4?-1:1)*(S/2+.02);
        R.box([cx,y+HA,cz],[S,HF,S],{fill:p.includes(j)?mix(P.paper,P.c1,.9):P.paper,a:o.a*(p.includes(j)?1:.55),shadow:false,lw:.4})}}}}
  function draw(R,k,e,st){const P=R.P;R.grid(-4,4.4,-2.4,2.4,.5);
    // the Mistral 7B tower stays on the left in every step; it recedes while the exploded block is the subject
    const ta=tw(st,e,s=>s===0||s===4?1:.22);tower(R,P,TX,{a:ta,lit:1});
    const l0=la(st,e,s=>s===0?1:0),top=NL*.08;
    if(l0>.01){R.label([TX+S/2,top,-S/2],'Mistral 7B: 32 identical blocks',{al:'left',dx:10,fs:12.5,b:1,a:l0});
      R.label([TX+S/2,14*.08+HA/2,S/2],'attention 41.9M (orange, thin)',{al:'left',dx:10,fs:12,c:P.c2,a:l0});
      R.label([TX+S/2,8*.08+HA+HF/2,S/2],'feed-forward 176.2M (blue)',{al:'left',dx:10,fs:12,c:P.c1,a:l0});
      R.label([TX,0,S/2],'width 4,096',{dy:16,fs:12,c:P.mute,a:l0,wide:1})}
    const fa=tw(st,e,s=>s===0?1:0);if(fa>.01)R.flow([[TX,-.02,S/2+.5],[TX,.02,S/2+.08],[TX,top,S/2+.08]],{c:P.ink,a:.55*fa,r:.045,n:18,speed:1.1});
    // steps 2 to 4: one block exploded to the right
    const xa=tw(st,e,s=>s>=1&&s<=3?1:0);
    if(xa>.01){
      // the cache over the sequence: 8 segments of 4,096 positions; Mistral 7B attends to the last one only, Mixtral to all
      const full=tw(st,e,s=>s>=2?1:0);
      for(let j=0;j<8;j++){const on=j===7?1:full;R.box([QX(j)+.08,0,ZC],[.38,.07,.34],{fill:mix(P.paper,P.c6,.15+.6*on),a:xa*(.35+.65*on),shadow:false,lw:.4})}
      // 8 key-value heads (teal), each shared by 4 of the 32 query heads (orange)
      for(let g=0;g<8;g++){R.box([QX(g)+.08,0,ZK],[.28,.22,.28],{fill:mix(P.paper,P.c6,.7),a:xa,shadow:true,lw:.5});
        for(let h=0;h<4;h++)R.box([QX(g)-.04+h*.08,0,ZQ],[.06,.3,.06],{fill:mix(P.paper,P.c2,.75),a:xa,shadow:false,lw:.4});
        R.flow([[QX(g)+.08,.2,ZQ-.04],[QX(g)+.08,.16,ZK+.16]],{c:P.c2,a:xa*.7,r:.035,n:3,speed:.8})}
      // each key-value head reads its window of the cache: the last segment only (Mistral 7B), every segment (Mixtral)
      for(let g=0;g<8;g++){const tx=QX(lerp(7,g,full))+.08;R.flow([[QX(g)+.08,.08,ZK-.16],[tx,.07,ZC+.18]],{c:P.c6,a:xa*.75,r:.035,n:4,speed:.9})}
      // the feed-forward part: one cube (Mistral 7B), then eight copies of it (Mixtral), on the router's glass plate
      const eight=tw(st,e,s=>s>=2?1:0),rt=tw(st,e,s=>s===3?1:0);
      if(eight>.01)R.glass([.1,YF-.04,-.3],[3.32,0,0],[0,0,.6],{c:P.c1,a:xa*eight*.7,nu:8,nv:1,th:.02});
      for(let j=0;j<8;j++){const one=j===3,show=one?1:eight;if(show<.01)continue;const picked=PICK.includes(j);
        const lit=rt>0?(picked?1:lerp(1,.2,rt)):1;
        R.box([EXX(j),YF,0],[CB,CB,CB],{fill:picked&&rt>.5?mix(P.paper,P.c1,.85):mix(P.paper,P.c1,.45),a:xa*show*lit,shadow:false,lw:.5})}
      const ax=1.62;R.flow([[ax,.32,0],[ax,YF-.05,0]],{c:P.ink,a:xa*.5,r:.04,n:5,speed:.9});
      if(rt>.01){PICK.forEach(j=>{R.flowArc([ax,YF,0],[EXX(j),YF+CB,0],.35,{c:P.c1,a:xa*rt,r:.05,n:7,speed:1.2});R.flowArc([EXX(j),YF+CB,0],[ax,YF+1,0],.2,{c:P.c1,a:xa*rt*.8,r:.045,n:6,speed:1.1})});
        R.ball([ax,YF+1,0],.07,{c:P.c1,a:xa*rt})}
      const b1=la(st,e,s=>s===1?1:0),b2=la(st,e,s=>s===2?1:0),b3=la(st,e,s=>s===3?1:0);
      if(b1>.01){R.label([QX(0)-.1,.3,ZQ],'32 query heads',{al:'right',dx:-8,fs:12.5,b:1,c:P.c2,a:b1,grp:'L'});
        R.label([QX(0)-.1,.2,ZK],'8 key-value heads, 4 queries each',{al:'right',dx:-8,fs:12.5,b:1,c:P.c6,a:b1,grp:'L'});
        R.label([QX(0)-.1,.05,ZC],'cache: 32,768 positions',{al:'right',dx:-8,fs:12,c:P.mute,a:b1,grp:'L'});
        R.label([QX(7)+.08,.07,ZC-.17],'window: the last 4,096',{dy:-14,fs:12.5,b:1,c:P.c6,a:b1});
        R.label([EXX(3),YF+CB,0],'one feed-forward network, 176.2M',{dy:-14,fs:12.5,b:1,c:P.c1,a:b1})}
      if(b2>.01){R.label([EXX(0)-.25,YF+CB/2,0],'8 copies, 176.2M each',{al:'right',dx:-8,fs:12.5,b:1,c:P.c1,a:b2,grp:'R'});
        R.label([QX(0)-.1,.05,ZC],'no window: all 32,768',{al:'right',dx:-8,fs:12.5,b:1,c:P.c6,a:b2,grp:'R'});
        R.label([QX(0)-.1,.2,ZK],'attention unchanged, 41.9M',{al:'right',dx:-8,fs:12,c:P.mute,a:b2,grp:'R'})}
      if(b3>.01){R.label([ax,YF+1,0],'2 of 8 read: 352.3M',{dy:-14,fs:12.5,b:1,c:P.c1,a:b3});
        R.label([EXX(7)+.2,YF+CB/2,0],'6 idle: 1,057M',{al:'left',dx:8,fs:12.5,c:P.mute,a:b3});
        R.label([.1,YF-.04,-.3],'router: 4,096 × 8',{al:'right',dx:-8,dy:-4,fs:12,c:P.mute,a:b3,wide:1})}
    }
    // step 5: Mixtral's whole tower beside Mistral 7B's, to scale
    const ma=tw(st,e,s=>s===4?1:0);
    if(ma>.01){const MX=-.9;tower(R,P,MX,{a:ma,moe:1});const ml=la(st,e,s=>s===4?1:0),xr=MX+S/2+.06+4*(S+.04);
      R.label([MX+S/2+2*(S+.04),top,-S],'Mixtral: '+Bf(X7.tot)+' stored',{dy:-30,fs:13,b:1,a:ml});
      R.label([MX+S/2+2*(S+.04),top,-S],Bf(X7.act)+' read per token (blue)',{dy:-13,fs:12.5,b:1,c:P.c1,a:ml});
      R.label([TX,top,0],'Mistral 7B: '+Bf(M7.tot),{dy:-13,fs:12.5,b:1,a:ml});
      R.label([MX,0,S/2],'attention, shared',{dy:16,fs:12,c:P.c2,a:ml,wide:1});R.label([xr,0,S],'two of eight per layer, illustrative',{al:'left',dx:6,dy:8,fs:12,c:P.mute,a:ml,wide:1})}
  }
  const V=[{cam:[.45,.42],bounds:[[-3,0,-.6],[-.2,2.7,.6]]},{cam:[.25,.62],bounds:[[-.8,0,-1.2],[3.6,1.4,.7]]},{cam:[.25,.6],bounds:[[-.8,0,-1.2],[3.6,1.5,.7]]},
    {cam:[.2,.5],bounds:[[-.4,0,-1.2],[3.6,2.1,.7]]},{cam:[.42,.4],bounds:[[-2.9,0,-1],[2.0,2.9,1]]}];
  S3.stage({id:'stg-mix',list:'sx-mix',fig:'Fig. 2 · Mistral 7B to Mixtral, from the two config.json files',cam:V[0].cam,bounds:V[0].bounds,aspect:.66,dur:1600,hold:5200,draw,
    margin:w=>w<520?[30,10,16,10]:[40,20,20,20],view:k=>V[k]});
})();
