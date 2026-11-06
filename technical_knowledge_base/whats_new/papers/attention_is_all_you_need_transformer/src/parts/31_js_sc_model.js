// ---- Scene: the whole model (the hero), Figure 1 in 3D: two stacks of six layers, stepped through in the order data flows ----
(function(){
  if(!$('stg-model'))return;const {at,lerp,mix}=S3;
  const W=3,D=1.9,SH=.26,NH=.07,G=.035,XE=-2.55,XD=2.55,Y0=.62;
  // build both towers bottom to top: {x,y,h,kind}
  const enc=[],dec=[];let y=Y0;
  for(let l=0;l<6;l++){[['att',SH],['nrm',NH],['ffn',SH],['nrm',NH]].forEach(([k,h])=>{enc.push({x:XE,y,h,k,l});y+=h+G});y+=.05}
  const encTop=y;y=Y0;
  for(let l=0;l<6;l++){[['msk',SH],['nrm',NH],['crs',SH],['nrm',NH],['ffn',SH],['nrm',NH]].forEach(([k,h])=>{dec.push({x:XD,y,h,k,l});y+=h+G});y+=.05}
  const decTop=y,LIN=decTop+.18;
  const SRC='the dog chased the cat'.split(' '),TGT='<s> der Hund jagte die'.split(' ');
  const COL={att:'c1',msk:'c1',crs:'c4',ffn:'c3',nrm:null};
  // which parts each step lights; the rest fades back
  const LIT=[null,{emb:1},{att:1,ffn:1,encOnly:1},{crs:1,encTopL:1},{msk:1,embD:1},{nrm:1},{lin:1}];
  function draw(R,k,e){const P=R.P,lit=LIT[k];R.grid(-5,5,-2.2,2.6,.5);
    const fade=on=>!lit||on?1:.22;
    const slab=(s,tw)=>{let on;if(!lit)on=1;else if(s.k==='nrm')on=lit.nrm;else if(lit.encOnly)on=tw==='e'&&lit[s.k];else on=lit[s.k];
      const c=COL[s.k],fill=c?mix(P.paper,P[c],on&&lit?.62:.36):P.paper;R.box([s.x,s.y,0],[W,s.h,D],{fill,a:fade(on)})};
    enc.forEach(s=>slab(s,'e'));dec.forEach(s=>slab(s,'d'));
    // embeddings and positions at the bottom of each tower
    const eon=!lit||lit.emb,don=!lit||lit.embD;
    R.box([XE,.18,0],[W,.3,D],{fill:mix(P.paper,P.c5,.3),a:fade(eon)});R.box([XD,.18,0],[W,.3,D],{fill:mix(P.paper,P.c5,.3),a:fade(don)});
    R.box([XD,LIN,0],[W,.32,D],{fill:mix(P.paper,P.c2,lit&&lit.lin?.6:.25),a:fade(!lit||lit.lin)});
    // tokens on the floor in front of each tower; they rise into the embedding on their step
    const tok=(words,x0,rise,a)=>words.forEach((w,i)=>{const x=x0-1.2+i*.6,yy=lerp(0,.18,rise),z=lerp(1.9,.0,rise);if(rise<1){R.box([x,yy,z],[.44,.3,.44],{a})}
      R.label([x,yy,z+.4],w,{fs:12.5,serif:true,dy:12,wide:1,a:a*(1-rise*.8)})});
    tok(SRC,XE,k===1?e*.0:0,eon?1:.35);tok(TGT,XD,0,don?1:.35);
    // titles and the bottom layer's labels (grouped so they never overlap)
    R.label([XE,encTop,-D/2],'Encoder × 6',{fs:14,serif:true,b:1,dy:-16});R.label([XD,LIN+.32,-D/2],'Decoder × 6',{fs:14,serif:true,b:1,dy:-16});
    R.label([XD+W/2,LIN+.16,D/2],'linear + softmax',{al:'left',dx:10,fs:12,mono:true,c:P.c2,a:fade(!lit||lit.lin)});
    const nm={att:'self-attention',msk:'masked self-attention',crs:'cross-attention',ffn:'feed-forward',nrm:'Add & Norm'};
    enc.filter(s=>s.l===0).slice(0,3).forEach(s=>R.label([XE-W/2,s.y+s.h/2,D/2],nm[s.k],{al:'right',dx:-26,fs:12,mono:true,grp:'eL',c:s.k==='nrm'?P.mute:P[COL[s.k]],a:fade(!lit||(s.k==='nrm'?lit.nrm:(lit.att||lit.ffn)))}));
    dec.filter(s=>s.l===0&&s.k!=='nrm').forEach(s=>R.label([XD+W/2,s.y+s.h/2,D/2],nm[s.k],{al:'left',dx:26,fs:12,mono:true,grp:'dL',c:P[COL[s.k]],a:fade(!lit||!lit.encOnly&&lit[s.k])}));
    R.label([XE-W/2,.33,D/2],'embedding + positions',{al:'right',dx:-26,fs:12,mono:true,grp:'eL',c:P.c5,a:fade(eon)});R.label([XD+W/2,.33,D/2],'embedding + positions',{al:'left',dx:26,fs:12,mono:true,grp:'dL',c:P.c5,a:fade(don)});
    // step-specific motion
    if(k===1){SRC.forEach((w,i)=>{const x=XE-1.2+i*.6;R.line([[x,.35,1.9],[x,.35,.95]],{c:P.c5,w:2,a:e,head:7})})}
    if(k===2||k===0&&false){const yy=lerp(.5,encTop-.1,e);R.glow([XE,yy,0],1.1,{c:P.c1,a:.9});R.glow([XE,yy,0],.35,{c:P.c1,a:1})}
    if(k===3){const a=[XE+W/2-.1,encTop-.05,0];dec.filter(s=>s.k==='crs').forEach((s,i)=>{R.arc(a,[XD-W/2,s.y+s.h/2,0],.55+i*.12,{c:P.c4,w:2.2,t:Math.min(1,e*1.15),top:1,a:.9});
      if(e>.95)R.ball([XD-W/2,s.y+s.h/2,0],.07,{c:P.c4,top:1})});R.glow(a,.7,{c:P.c4,a:.9,top:1});R.label([0,encTop+1.15,0],'keys and values from the encoder',{fs:12,mono:true,wide:1,c:P.c4,a:e})}
    if(k===4){const yy=lerp(.5,decTop-.1,e);R.glow([XD,yy,0],1.1,{c:P.c1,a:.9})}
    if(k===5){[[enc,XE-W/2,-1],[dec,XD+W/2,1]].forEach(([T,xe,sg])=>T.forEach((s,i)=>{if(s.k==='nrm')return;const nx=T[i+1];const x2=xe+sg*.32,z=D/2-.25,a=e;
      R.line([[xe,s.y-.01,z],[x2,s.y-.01,z],[x2,nx.y+nx.h/2,z],[xe,nx.y+nx.h/2,z]],{c:P.acc,w:1.8,a,head:6})}))}
    if(k===6){const yy=lerp(LIN+.35,LIN+1.35,e);R.glow([XD,yy,0],.6,{c:P.c2,a:1,top:1});R.label([XD,yy,0],'"Katze"',{fs:14,serif:true,b:1,dy:-22,a:e})}
  }
  const S=S3.stage({id:'stg-model',list:'sx-model',fig:'Fig. 1 · the base model in 3D',cam:[.55,.34],
    bounds:[[-4.7,0,-1.6],[4.7,LIN+1.5,2.2]],draw});
})();
